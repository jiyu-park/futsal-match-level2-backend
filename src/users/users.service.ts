import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type pg from 'pg';
import { PG_POOL } from '../db/db.module.js';

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  // 공개 프로필: 이메일·연락 방법은 보여 주지 않는다
  async profile(id: number) {
    const user = await this.pool.query('SELECT id, nickname, created_at FROM users WHERE id = $1', [id]);
    if (!user.rowCount) throw new NotFoundException('찾을 수 없는 사용자입니다.');

    const att = await this.pool.query(
      `SELECT COUNT(*) FILTER (WHERE a.attendance = 'attended')::int AS attended,
              COUNT(*) FILTER (WHERE a.attendance = 'no_show')::int AS no_show
         FROM applications a WHERE a.user_id = $1`,
      [id],
    );
    const hosted = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM posts
        WHERE user_id = $1 AND (play_date + play_time) <= (now() AT TIME ZONE 'Asia/Seoul')`,
      [id],
    );
    const manner = await this.pool.query(
      `SELECT COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 1)::float AS average
         FROM reviews WHERE target_id = $1`,
      [id],
    );
    const recent = await this.pool.query(
      `SELECT r.rating, r.comment, r.created_at, ru.nickname AS reviewer_nickname, p.title AS post_title
         FROM reviews r JOIN users ru ON ru.id = r.reviewer_id JOIN posts p ON p.id = r.post_id
        WHERE r.target_id = $1 ORDER BY r.created_at DESC, r.id DESC LIMIT 5`,
      [id],
    );

    const { attended, no_show } = att.rows[0];
    const marked = attended + no_show;
    return {
      id: user.rows[0].id,
      nickname: user.rows[0].nickname,
      joined_at: user.rows[0].created_at,
      stats: {
        attended_count: attended,
        no_show_count: no_show,
        attendance_rate: marked ? Math.round((attended / marked) * 100) : null,
        hosted_count: hosted.rows[0].count,
        review_count: manner.rows[0].count,
        manner_average: manner.rows[0].average,
      },
      recent_reviews: recent.rows,
    };
  }

  // 내 기록: 내가 신청한 경기와 내가 올린 경기
  async history(userId: number) {
    const applied = await this.pool.query(
      `SELECT a.id AS application_id, a.attendance, p.id AS post_id, p.title, p.play_date,
              to_char(p.play_time, 'HH24:MI') AS play_time, s.name AS stadium_name,
              ((p.play_date + p.play_time) <= (now() AT TIME ZONE 'Asia/Seoul')) AS is_ended
         FROM applications a JOIN posts p ON p.id = a.post_id JOIN stadiums s ON s.id = p.stadium_id
        WHERE a.user_id = $1 ORDER BY p.play_date DESC, p.play_time DESC`,
      [userId],
    );
    const hosted = await this.pool.query(
      `SELECT p.id AS post_id, p.title, p.play_date, to_char(p.play_time, 'HH24:MI') AS play_time,
              s.name AS stadium_name,
              ((p.play_date + p.play_time) <= (now() AT TIME ZONE 'Asia/Seoul')) AS is_ended,
              (SELECT COUNT(*)::int FROM applications a WHERE a.post_id = p.id) AS applied_count
         FROM posts p JOIN stadiums s ON s.id = p.stadium_id
        WHERE p.user_id = $1 ORDER BY p.play_date DESC, p.play_time DESC`,
      [userId],
    );
    return { applied: applied.rows, hosted: hosted.rows };
  }
}
