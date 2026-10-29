import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type pg from 'pg';
import { PG_POOL } from '../db/db.module.js';
import { FieldErrors, text, throwIfErrors } from '../common/validation.js';

// 연락 방법을 비교용으로 정리한다 (대소문자·공백이 달라도 같은 사람으로 본다)
const contactKey = (contact: string) => contact.toLowerCase().replace(/\s+/g, '');

@Injectable()
export class ApplicationsService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  // 신청 명단: 이름과 신청 시각만 보여 준다 (연락 방법·비밀번호는 숨김)
  async listForPost(postId: number) {
    const post = await this.pool.query('SELECT 1 FROM posts WHERE id = $1', [postId]);
    if (!post.rowCount) throw new NotFoundException('찾을 수 없는 글입니다.');
    const { rows } = await this.pool.query(
      `SELECT id, applicant_name, created_at FROM applications
        WHERE post_id = $1 ORDER BY created_at, id`,
      [postId],
    );
    return rows;
  }

  async apply(postId: number, body: any) {
    const name = text(body?.applicant_name);
    const contact = text(body?.applicant_contact);
    const password = typeof body?.password === 'string' ? body.password : '';
    const errors: FieldErrors = {};
    if (!name) errors.applicant_name = '이름을 적어 주세요.';
    else if (name.length > 30) errors.applicant_name = '이름은 30자 이내로 적어 주세요.';
    if (!contact) errors.applicant_contact = '연락 방법을 적어 주세요. (예: 오픈채팅 아이디)';
    else if (contact.length > 200) errors.applicant_contact = '연락 방법은 200자 이내로 적어 주세요.';
    if (!password) errors.password = '비밀번호를 적어 주세요. (숫자 4자리)';
    else if (!/^\d{4}$/.test(password)) errors.password = '비밀번호는 숫자 4자리로 적어 주세요.';
    throwIfErrors(errors);

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
        [postId, contactKey(contact)],
      );
      if (dup.rowCount) {
        throw new ConflictException('이미 이 모집글에 신청하셨어요. 같은 연락 방법으로는 한 번만 신청할 수 있어요.');
      }
      // 규칙 3: 정원
      const count = await client.query(
        'SELECT COUNT(*)::int AS count FROM applications WHERE post_id = $1',
        [postId],
      );
      if (count.rows[0].count >= post.rows[0].capacity) {
        throw new ConflictException('정원이 다 찼어요. 다른 모집글을 찾아보세요.');
      }

      const hash = await bcrypt.hash(password, 10);
      const inserted = await client.query(
        `INSERT INTO applications (post_id, applicant_name, applicant_contact, contact_key, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, post_id, applicant_name, created_at`,
        [postId, name, contact, contactKey(contact), hash],
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

  async cancel(id: number, body: any) {
    const { rows } = await this.pool.query(
      `SELECT a.id, a.password_hash,
              ((p.play_date + p.play_time) <= (now() AT TIME ZONE 'Asia/Seoul')) AS is_ended
         FROM applications a JOIN posts p ON p.id = a.post_id
        WHERE a.id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('찾을 수 없는 신청입니다.');
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) throwIfErrors({ password: '신청할 때 정한 비밀번호를 적어 주세요.' });
    if (!(await bcrypt.compare(password, rows[0].password_hash))) {
      throw new ForbiddenException('비밀번호가 맞지 않습니다.');
    }
    if (rows[0].is_ended) {
      throw new ConflictException('경기가 이미 시작되었거나 끝나서 취소할 수 없어요.');
    }
    await this.pool.query('DELETE FROM applications WHERE id = $1', [id]);
    return { cancelled: true };
  }
}
