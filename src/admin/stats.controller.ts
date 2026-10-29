import { Controller, Get, Inject } from '@nestjs/common';
import type pg from 'pg';
import { PG_POOL } from '../db/db.module.js';

@Controller('stats')
export class StatsController {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  // 현황 숫자 3개: 오늘 들어온 신청 수, 신청 가능한 모집글 수, 남은 자리 합계
  @Get()
  async stats() {
    const today = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM applications
        WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`,
    );
    const open = await this.pool.query(
      `SELECT COUNT(*)::int AS posts, COALESCE(SUM(remaining), 0)::int AS seats
         FROM (
           SELECT p.capacity - (SELECT COUNT(*) FROM applications a WHERE a.post_id = p.id) AS remaining
             FROM posts p
            WHERE (p.play_date + p.play_time) > (now() AT TIME ZONE 'Asia/Seoul')
         ) t WHERE remaining > 0`,
    );
    return {
      today_applications: today.rows[0].count,
      open_posts: open.rows[0].posts,
      remaining_seats: open.rows[0].seats,
    };
  }
}
