import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type pg from 'pg';
import { PG_POOL } from '../db/db.module.js';
import { FieldErrors, text, throwIfErrors } from '../common/validation.js';

export function buildMapUrl(address: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
}

@Injectable()
export class StadiumsService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async list() {
    const { rows } = await this.pool.query(
      `SELECT s.id, s.name, s.district, s.address, s.map_url, s.floor_type,
              COUNT(p.id)::int AS post_count
         FROM stadiums s LEFT JOIN posts p ON p.stadium_id = s.id
        GROUP BY s.id
        ORDER BY s.district, s.name`,
    );
    return rows;
  }

  private async validate(body: any, ignoreId?: number) {
    const name = text(body?.name);
    const district = text(body?.district);
    const address = text(body?.address);
    const floorType = text(body?.floor_type);
    const errors: FieldErrors = {};
    if (!name) errors.name = '경기장 이름을 적어 주세요.';
    else if (name.length > 100) errors.name = '경기장 이름은 100자 이내로 적어 주세요.';
    if (!district) errors.district = '구를 적어 주세요. (예: 마포구)';
    else if (district.length > 30) errors.district = '구 이름은 30자 이내로 적어 주세요.';
    if (!address) errors.address = '주소를 적어 주세요.';
    else if (address.length > 200) errors.address = '주소는 200자 이내로 적어 주세요.';
    if (floorType.length > 30) errors.floor_type = '바닥 종류는 30자 이내로 적어 주세요.';
    throwIfErrors(errors);

    const dup = await this.pool.query(
      'SELECT id FROM stadiums WHERE name = $1 AND address = $2 AND id <> $3',
      [name, address, ignoreId ?? 0],
    );
    if (dup.rowCount) {
      throwIfErrors({ name: '같은 이름과 주소의 경기장이 이미 있어요.' });
    }
    return { name, district, address, floorType: floorType || null };
  }

  async create(body: any) {
    const v = await this.validate(body);
    const { rows } = await this.pool.query(
      `INSERT INTO stadiums (name, district, address, map_url, floor_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [v.name, v.district, v.address, buildMapUrl(v.address), v.floorType],
    );
    return rows[0];
  }

  async update(id: number, body: any) {
    await this.ensureExists(id);
    const v = await this.validate(body, id);
    const { rows } = await this.pool.query(
      `UPDATE stadiums SET name = $1, district = $2, address = $3,
              map_url = $4, floor_type = $5 WHERE id = $6 RETURNING *`,
      [v.name, v.district, v.address, buildMapUrl(v.address), v.floorType, id],
    );
    return rows[0];
  }

  async remove(id: number) {
    await this.ensureExists(id);
    const { rows } = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM posts WHERE stadium_id = $1',
      [id],
    );
    if (rows[0].count > 0) {
      throw new BadRequestException(
        `이 경기장에 모집글이 ${rows[0].count}개 있어서 지울 수 없어요. 모집글을 먼저 정리해 주세요.`,
      );
    }
    await this.pool.query('DELETE FROM stadiums WHERE id = $1', [id]);
    return { deleted: true };
  }

  private async ensureExists(id: number) {
    const { rowCount } = await this.pool.query(
      'SELECT 1 FROM stadiums WHERE id = $1',
      [id],
    );
    if (!rowCount) throw new NotFoundException('찾을 수 없는 경기장입니다.');
  }
}
