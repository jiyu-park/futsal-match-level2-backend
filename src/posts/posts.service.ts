import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type pg from 'pg';
import { PG_POOL } from '../db/db.module.js';
import { AuthUser, requireUser } from '../auth/auth.util.js';
import {
  FieldErrors,
  isRealDate,
  text,
  throwIfErrors,
  todayInSeoul,
  toWholeNumber,
} from '../common/validation.js';

export const SPORTS = ['풋살'];
export const SKILL_LEVELS = ['입문', '중급', '상급', '상관없음'];

// 신청 수(applied_count), 남은 자리(remaining), 경기 시작 여부(is_ended)를 함께 계산해서 돌려준다
const SELECT_POST = `
  SELECT p.id, p.stadium_id, p.sport, p.title, p.play_date,
         to_char(p.play_time, 'HH24:MI') AS play_time,
         p.capacity, p.author_name, p.contact, p.skill_level, p.fee,
         p.description, p.created_at,
         s.name AS stadium_name, s.district AS stadium_district,
         s.address AS stadium_address, s.map_url AS stadium_map_url,
         (SELECT COUNT(*)::int FROM applications a WHERE a.post_id = p.id) AS applied_count,
         ((p.play_date + p.play_time) <= (now() AT TIME ZONE 'Asia/Seoul')) AS is_ended,
         p.play_time AS play_time_raw,
         p.user_id AS owner_id, u.nickname AS owner_nickname
    FROM posts p JOIN stadiums s ON s.id = p.stadium_id
    LEFT JOIN users u ON u.id = p.user_id`;

const WITH_STATUS = `
  SELECT t.*, GREATEST(t.capacity - t.applied_count, 0) AS remaining
    FROM (${SELECT_POST}) t`;

export const POST_STATUS = ['open', 'full', 'ended'];

@Injectable()
export class PostsService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  // 검색어(q), 구(district), 실력 수준(skill_level), 상태(status: open 신청 가능 / full 정원 마감 / ended 경기 시작 후)로 골라 볼 수 있다
  async list(query: Record<string, unknown> = {}) {
    const where: string[] = [];
    const params: unknown[] = [];
    const q = text(query.q);
    if (q) {
      params.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
      const n = params.length;
      where.push(
        `(t.title ILIKE $${n} OR t.stadium_name ILIKE $${n} OR t.stadium_address ILIKE $${n} OR t.author_name ILIKE $${n} OR COALESCE(t.description, '') ILIKE $${n})`,
      );
    }
    const district = text(query.district);
    if (district) {
      params.push(district);
      where.push(`t.stadium_district = $${params.length}`);
    }
    const skill = text(query.skill_level);
    if (skill) {
      params.push(skill);
      where.push(`t.skill_level = $${params.length}`);
    }
    const status = text(query.status);
    if (status === 'open') where.push('(NOT t.is_ended AND t.remaining > 0)');
    else if (status === 'full') where.push('(NOT t.is_ended AND t.remaining = 0)');
    else if (status === 'ended') where.push('t.is_ended');
    const { rows } = await this.pool.query(
      `SELECT * FROM (${WITH_STATUS}) t
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY t.is_ended, t.play_date, t.play_time_raw, t.id`,
      params,
    );
    return rows.map(({ play_time_raw, ...rest }) => rest);
  }

  async get(id: number) {
    const { rows } = await this.pool.query(`${WITH_STATUS} WHERE t.id = $1`, [id]);
    if (!rows.length) throw new NotFoundException('찾을 수 없는 글입니다.');
    const { play_time_raw, ...rest } = rows[0];
    return rest;
  }

  // 등록과 수정에서 같은 규칙을 쓴다
  private async validate(body: any, fallbackAuthor = '') {
    const errors: FieldErrors = {};

    const stadiumId = toWholeNumber(body?.stadium_id);
    if (stadiumId === null) {
      errors.stadium_id = '경기장을 골라 주세요.';
    } else {
      const found = await this.pool.query('SELECT 1 FROM stadiums WHERE id = $1', [stadiumId]);
      if (!found.rowCount) errors.stadium_id = '없는 경기장이에요. 목록에서 다시 골라 주세요.';
    }

    const sport = text(body?.sport);
    if (!sport) errors.sport = '종목을 골라 주세요.';
    else if (!SPORTS.includes(sport)) errors.sport = `종목은 ${SPORTS.join(', ')} 중에서 골라 주세요.`;

    const title = text(body?.title);
    if (!title) errors.title = '제목을 적어 주세요.';
    else if (title.length > 100) errors.title = '제목은 100자 이내로 적어 주세요.';

    const playDate = text(body?.play_date);
    if (!playDate) errors.play_date = '경기 날짜를 골라 주세요.';
    else if (!isRealDate(playDate)) errors.play_date = '날짜 형식이 맞지 않아요. 달력에서 골라 주세요.';
    else if (playDate < todayInSeoul()) errors.play_date = '경기 날짜는 오늘 이후로 골라 주세요.';

    const playTime = text(body?.play_time);
    if (!playTime) errors.play_time = '시작 시간을 골라 주세요.';
    else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(playTime)) errors.play_time = '시간 형식이 맞지 않아요. (예: 19:30)';

    const capacity = toWholeNumber(body?.capacity);
    if (text(String(body?.capacity ?? '')) === '') errors.capacity = '모집 인원을 적어 주세요.';
    else if (capacity === null) errors.capacity = '모집 인원은 숫자로 적어 주세요.';
    else if (capacity < 1) errors.capacity = '모집 인원은 1명 이상으로 적어 주세요.';
    else if (capacity > 100000) errors.capacity = '모집 인원이 너무 많아요. 다시 확인해 주세요.';

    const authorName = text(body?.author_name) || fallbackAuthor;
    if (!authorName) errors.author_name = '작성자 이름을 적어 주세요.';
    else if (authorName.length > 30) errors.author_name = '작성자 이름은 30자 이내로 적어 주세요.';

    const contact = text(body?.contact);
    if (!contact) errors.contact = '연락 방법을 적어 주세요. (예: 오픈채팅 링크)';
    else if (contact.length > 200) errors.contact = '연락 방법은 200자 이내로 적어 주세요.';

    const skillLevel = text(body?.skill_level);
    if (!skillLevel) errors.skill_level = '실력 수준을 골라 주세요.';
    else if (!SKILL_LEVELS.includes(skillLevel)) errors.skill_level = `실력 수준은 ${SKILL_LEVELS.join(', ')} 중에서 골라 주세요.`;

    const fee = toWholeNumber(body?.fee);
    if (text(String(body?.fee ?? '')) === '') errors.fee = '참가비를 적어 주세요. 무료면 0을 적어 주세요.';
    else if (fee === null) errors.fee = '참가비는 숫자로 적어 주세요. 무료면 0을 적어 주세요.';
    else if (fee > 10000000) errors.fee = '참가비가 너무 커요. 다시 확인해 주세요.';

    const description = text(body?.description);
    if (description.length > 2000) errors.description = '설명은 2000자 이내로 적어 주세요.';

    return { errors, values: { stadiumId, sport, title, playDate, playTime, capacity, authorName, contact, skillLevel, fee, description } };
  }

  // 로그인한 사람만 글을 올릴 수 있고, 그 사람이 글의 주인이 된다
  async create(body: any, user: AuthUser | null) {
    const me = requireUser(user);
    const nick = await this.pool.query('SELECT nickname FROM users WHERE id = $1', [me.id]);
    if (!nick.rowCount) requireUser(null);
    const { errors, values: v } = await this.validate(body, nick.rows[0].nickname);
    throwIfErrors(errors);
    const { rows } = await this.pool.query(
      `INSERT INTO posts (stadium_id, sport, title, play_date, play_time, capacity,
                          author_name, contact, skill_level, fee, description, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [v.stadiumId, v.sport, v.title, v.playDate, v.playTime, v.capacity,
       v.authorName, v.contact, v.skillLevel, v.fee, v.description || null, me.id],
    );
    return this.get(rows[0].id);
  }

  async update(id: number, body: any, user: AuthUser | null) {
    await this.authorize(id, body, user);
    // 작성자 이름을 비워 보내면 기존 이름을 그대로 둔다
    const current = await this.pool.query('SELECT author_name FROM posts WHERE id = $1', [id]);
    const { errors, values: v } = await this.validate(body, current.rows[0].author_name);
    throwIfErrors(errors);
    // 이미 신청한 사람보다 모집 인원을 줄일 수 없다
    const applied = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM applications WHERE post_id = $1',
      [id],
    );
    if (v.capacity! < applied.rows[0].count) {
      throwIfErrors({
        capacity: `이미 ${applied.rows[0].count}명이 신청해서 모집 인원을 그보다 적게 줄일 수 없어요.`,
      });
    }
    await this.pool.query(
      `UPDATE posts SET stadium_id=$1, sport=$2, title=$3, play_date=$4, play_time=$5,
              capacity=$6, author_name=$7, contact=$8, skill_level=$9, fee=$10, description=$11
        WHERE id=$12`,
      [v.stadiumId, v.sport, v.title, v.playDate, v.playTime, v.capacity,
       v.authorName, v.contact, v.skillLevel, v.fee, v.description || null, id],
    );
    return this.get(id);
  }

  async remove(id: number, body: any, user: AuthUser | null) {
    await this.authorize(id, body, user);
    await this.pool.query('DELETE FROM posts WHERE id = $1', [id]);
    return { deleted: true };
  }

  // 수정·삭제는 글 주인이나 관리자만 할 수 있다.
  // 주인이 없는 예전 글(로그인 도입 전)은 글을 쓸 때 정한 4자리 비밀번호로 한다.
  async authorize(id: number, body: any, user: AuthUser | null) {
    const { rows } = await this.pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException('찾을 수 없는 글입니다.');
    const ownerId = rows[0].user_id;
    if (user && (user.role === 'admin' || user.id === ownerId)) return;
    if (ownerId === null) return this.verifyPassword(id, body);
    if (!user) requireUser(null);
    throw new ForbiddenException('내가 올린 글만 고치거나 지울 수 있어요.');
  }

  // 주인이 없는 예전 글의 비밀번호가 맞는지 확인한다
  async verifyPassword(id: number, body: any) {
    const { rows } = await this.pool.query('SELECT password_hash FROM posts WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException('찾을 수 없는 글입니다.');
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) throwIfErrors({ password: '비밀번호를 적어 주세요. (숫자 4자리)' });
    const ok = rows[0].password_hash ? await bcrypt.compare(password, rows[0].password_hash) : false;
    if (!ok) throw new ForbiddenException('비밀번호가 맞지 않습니다.');
  }
}
