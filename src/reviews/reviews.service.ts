import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type pg from 'pg';
import { PG_POOL } from '../db/db.module.js';
import { AuthUser, requireUser } from '../auth/auth.util.js';
import { FieldErrors, text, throwIfErrors, toWholeNumber } from '../common/validation.js';

// 이 경기에 "함께 뛴 사람": 글 주인 + 불참(노쇼)으로 표시되지 않은 로그인 신청자
const PARTICIPANTS_SQL = `
  SELECT u.id AS user_id, u.nickname, 'host' AS role, 'attended' AS attendance
    FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = $1
  UNION
  SELECT u.id, u.nickname, 'player', a.attendance
    FROM applications a JOIN users u ON u.id = a.user_id
   WHERE a.post_id = $1 AND a.attendance <> 'no_show'`;

@Injectable()
export class ReviewsService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  private async ensurePost(postId: number) {
    const { rows } = await this.pool.query(
      `SELECT id, ((play_date + play_time) <= (now() AT TIME ZONE 'Asia/Seoul')) AS is_ended
         FROM posts WHERE id = $1`,
      [postId],
    );
    if (!rows.length) throw new NotFoundException('찾을 수 없는 글입니다.');
    return rows[0];
  }

  async participants(postId: number) {
    await this.ensurePost(postId);
    const { rows } = await this.pool.query(PARTICIPANTS_SQL, [postId]);
    return rows;
  }

  async list(postId: number) {
    await this.ensurePost(postId);
    const { rows } = await this.pool.query(
      `SELECT r.id, r.reviewer_id, ru.nickname AS reviewer_nickname,
              r.target_id, tu.nickname AS target_nickname,
              r.rating, r.comment, r.created_at
         FROM reviews r
         JOIN users ru ON ru.id = r.reviewer_id
         JOIN users tu ON tu.id = r.target_id
        WHERE r.post_id = $1 ORDER BY r.created_at, r.id`,
      [postId],
    );
    return rows;
  }

  // 매너 후기: 경기가 끝난 뒤, 함께 뛴 사람만, 서로 한 번씩, 1~5점
  async create(postId: number, body: any, user: AuthUser | null) {
    const me = requireUser(user);
    const post = await this.ensurePost(postId);

    const targetId = toWholeNumber(body?.target_id);
    const rating = toWholeNumber(body?.rating);
    const comment = text(body?.comment);
    const errors: FieldErrors = {};
    if (targetId === null) errors.target_id = '후기를 남길 사람을 골라 주세요.';
    if (rating === null) errors.rating = '매너 점수를 1~5점으로 골라 주세요.';
    else if (rating < 1 || rating > 5) errors.rating = '매너 점수는 1~5점 중에서 골라 주세요.';
    if (comment.length > 200) errors.comment = '한마디는 200자 이내로 적어 주세요.';
    throwIfErrors(errors);

    if (!post.is_ended) {
      throw new ConflictException('경기가 끝난 뒤에 후기를 남길 수 있어요.');
    }
    if (targetId === me.id) {
      throw new ConflictException('나 자신에게는 후기를 남길 수 없어요.');
    }
    const { rows: people } = await this.pool.query(PARTICIPANTS_SQL, [postId]);
    const ids = new Set(people.map((p) => p.user_id));
    if (!ids.has(me.id)) {
      throw new ForbiddenException('이 경기에 함께 뛴 사람만 후기를 남길 수 있어요.');
    }
    if (!ids.has(targetId!)) {
      throw new ConflictException('이 경기에 함께 뛴 사람에게만 후기를 남길 수 있어요.');
    }
    const dup = await this.pool.query(
      'SELECT 1 FROM reviews WHERE post_id = $1 AND reviewer_id = $2 AND target_id = $3',
      [postId, me.id, targetId],
    );
    if (dup.rowCount) {
      throw new ConflictException('이미 이 사람에게 후기를 남겼어요. 한 경기에 한 번만 남길 수 있어요.');
    }
    const { rows } = await this.pool.query(
      `INSERT INTO reviews (post_id, reviewer_id, target_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, post_id, reviewer_id, target_id, rating, comment, created_at`,
      [postId, me.id, targetId, rating, comment || null],
    );
    return rows[0];
  }
}
