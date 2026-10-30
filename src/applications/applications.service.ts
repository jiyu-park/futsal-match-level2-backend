import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type pg from 'pg';
import { PG_POOL } from '../db/db.module.js';
import { AuthUser, requireUser } from '../auth/auth.util.js';
import { throwIfErrors } from '../common/validation.js';

export const ATTENDANCE = ['pending', 'attended', 'no_show'];

@Injectable()
export class ApplicationsService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  // 신청 명단: 이름·출석 상태만 보여 준다 (연락 방법·이메일·비밀번호는 숨김)
  async listForPost(postId: number) {
    const post = await this.pool.query('SELECT 1 FROM posts WHERE id = $1', [postId]);
    if (!post.rowCount) throw new NotFoundException('찾을 수 없는 글입니다.');
    const { rows } = await this.pool.query(
      `SELECT id, user_id, applicant_name, attendance, created_at FROM applications
        WHERE post_id = $1 ORDER BY created_at, id`,
      [postId],
    );
    return rows;
  }

  // 참가 신청: 로그인한 사람만 할 수 있다
  async apply(postId: number, user: AuthUser | null) {
    const me = requireUser(user);
    const who = await this.pool.query('SELECT nickname FROM users WHERE id = $1', [me.id]);
    if (!who.rowCount) requireUser(null);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // 같은 글에 동시에 신청해도 정원을 넘기지 않도록 글 한 줄을 잠그고 확인한다
      const post = await client.query(
        `SELECT id, capacity,
                ((play_date + play_time) <= (now() AT TIME ZONE 'Asia/Seoul')) AS is_ended
           FROM posts WHERE id = $1 FOR UPDATE`,
        [postId],
      );
      if (!post.rowCount) throw new NotFoundException('찾을 수 없는 글입니다.');

      // 규칙 1: 신청 기간
      if (post.rows[0].is_ended) {
        throw new ConflictException('경기가 이미 시작되었거나 끝나서 신청할 수 없어요.');
      }
      // 규칙 2: 같은 사람의 중복 신청 금지
      const dup = await client.query(
        'SELECT 1 FROM applications WHERE post_id = $1 AND contact_key = $2',
        [postId, `user:${me.id}`],
      );
      if (dup.rowCount) {
        throw new ConflictException('이미 이 모집글에 신청하셨어요. 한 글에는 한 번만 신청할 수 있어요.');
      }
      // 규칙 3: 정원
      const count = await client.query(
        'SELECT COUNT(*)::int AS count FROM applications WHERE post_id = $1',
        [postId],
      );
      if (count.rows[0].count >= post.rows[0].capacity) {
        throw new ConflictException('정원이 다 찼어요. 다른 모집글을 찾아보세요.');
      }

      const inserted = await client.query(
        `INSERT INTO applications (post_id, user_id, applicant_name, contact_key)
         VALUES ($1, $2, $3, $4)
         RETURNING id, post_id, user_id, applicant_name, created_at`,
        [postId, me.id, who.rows[0].nickname, `user:${me.id}`],
      );
      await client.query('COMMIT');
      return inserted.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // 신청 취소: 신청한 본인이나 관리자만. 로그인 도입 전의 예전 신청은 신청할 때 정한 비밀번호로 한다
  async cancel(id: number, body: any, user: AuthUser | null) {
    const { rows } = await this.pool.query(
      `SELECT a.id, a.user_id, a.password_hash,
              ((p.play_date + p.play_time) <= (now() AT TIME ZONE 'Asia/Seoul')) AS is_ended
         FROM applications a JOIN posts p ON p.id = a.post_id
        WHERE a.id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('찾을 수 없는 신청입니다.');
    const app = rows[0];

    if (user && (user.role === 'admin' || user.id === app.user_id)) {
      // 허용
    } else if (app.user_id === null) {
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!password) throwIfErrors({ password: '신청할 때 정한 비밀번호를 적어 주세요.' });
      const ok = app.password_hash ? await bcrypt.compare(password, app.password_hash) : false;
      if (!ok) throw new ForbiddenException('비밀번호가 맞지 않습니다.');
    } else {
      if (!user) requireUser(null);
      throw new ForbiddenException('내가 신청한 것만 취소할 수 있어요.');
    }
    if (app.is_ended) {
      throw new ConflictException('경기가 이미 시작되었거나 끝나서 취소할 수 없어요.');
    }
    await this.pool.query('DELETE FROM applications WHERE id = $1', [id]);
    return { cancelled: true };
  }

  // 참가 기록: 경기가 시작된 뒤에 글 주인(또는 관리자)이 "참석 / 불참(노쇼)"을 표시한다
  async markAttendance(id: number, body: any, user: AuthUser | null) {
    const me = requireUser(user);
    const { rows } = await this.pool.query(
      `SELECT a.id, p.user_id AS owner_id,
              ((p.play_date + p.play_time) <= (now() AT TIME ZONE 'Asia/Seoul')) AS is_ended
         FROM applications a JOIN posts p ON p.id = a.post_id
        WHERE a.id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('찾을 수 없는 신청입니다.');
    if (me.role !== 'admin' && rows[0].owner_id !== me.id) {
      throw new ForbiddenException('모집글을 올린 사람만 참석 여부를 표시할 수 있어요.');
    }
    if (!rows[0].is_ended) {
      throw new ConflictException('경기가 시작된 뒤에 참석 여부를 표시할 수 있어요.');
    }
    const status = typeof body?.status === 'string' ? body.status : '';
    if (!ATTENDANCE.includes(status)) {
      throw new BadRequestException({
        message: '입력한 내용을 다시 확인해 주세요.',
        errors: { status: '참석, 불참, 미정 중에서 골라 주세요.' },
      });
    }
    await this.pool.query('UPDATE applications SET attendance = $1 WHERE id = $2', [status, id]);
    return { id, attendance: status };
  }
}
