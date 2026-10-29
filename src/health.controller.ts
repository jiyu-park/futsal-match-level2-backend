import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type pg from 'pg';
import { PG_POOL } from './db/db.module.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  // 서버가 살아 있는지, DB에 연결되는지 보여 준다
  @Get()
  async check() {
    try {
      await this.pool.query('SELECT 1');
      return { status: 'ok', server: '정상', database: '연결됨' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        server: '정상',
        database: '연결 안 됨',
      });
    }
  }
}
