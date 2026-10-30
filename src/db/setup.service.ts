import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type pg from 'pg';
import { PG_POOL } from './db.module.js';
import { addDays, todayInSeoul } from '../common/validation.js';
import { buildMapUrl } from '../stadiums/stadiums.service.js';
import { STADIUM_SEED, POST_SEED, APPLICANT_NAMES, DEMO_USERS } from './seed-data.js';
import { jwtSecret } from '../auth/auth.util.js';

// 서버를 켤 때 테이블을 만들고, 비어 있으면 처음 보여 줄 데이터를 채운다
@Injectable()
export class SetupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SetupService.name);

  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationBootstrap() {
    const schema = process.env.DB_SCHEMA;
    if (schema && /^[a-z_][a-z0-9_]*$/.test(schema)) {
      await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    }
    jwtSecret(); // JWT_SECRET이 없으면 여기서 바로 알려 준다
    await this.createTables();
    await this.seedStadiums();
    await this.ensureDemoUsers();
    if (await this.seedPosts()) await this.seedApplications();
  }

  private async createTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS stadiums (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        district    VARCHAR(30)  NOT NULL,
        address     VARCHAR(200) NOT NULL,
        map_url     TEXT         NOT NULL,
        floor_type  VARCHAR(30),
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        UNIQUE (name, address)
      );
      CREATE TABLE IF NOT EXISTS posts (
        id             SERIAL PRIMARY KEY,
        stadium_id     INTEGER      NOT NULL REFERENCES stadiums(id) ON DELETE RESTRICT,
        sport          VARCHAR(20)  NOT NULL,
        title          VARCHAR(100) NOT NULL,
        play_date      DATE         NOT NULL,
        play_time      TIME         NOT NULL,
        capacity       INTEGER      NOT NULL CHECK (capacity >= 1),
        author_name    VARCHAR(30)  NOT NULL,
        contact        VARCHAR(200) NOT NULL,
        skill_level    VARCHAR(20)  NOT NULL,
        fee            INTEGER      NOT NULL CHECK (fee >= 0),
        description    TEXT,
        password_hash  VARCHAR(100) NOT NULL,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS applications (
        id                 SERIAL PRIMARY KEY,
        post_id            INTEGER      NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        applicant_name     VARCHAR(30)  NOT NULL,
        applicant_contact  VARCHAR(200) NOT NULL,
        contact_key        VARCHAR(200) NOT NULL,
        password_hash      VARCHAR(100) NOT NULL,
        created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
        UNIQUE (post_id, contact_key)
      );

      -- 로그인 기능에서 새로 생긴 테이블과 칸 (이미 있는 DB에도 안전하게 더해진다)
      CREATE TABLE IF NOT EXISTS users (
        id             SERIAL PRIMARY KEY,
        email          VARCHAR(100) NOT NULL UNIQUE,
        nickname       VARCHAR(20)  NOT NULL UNIQUE,
        password_hash  VARCHAR(100) NOT NULL,
        role           VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
      );
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE posts ALTER COLUMN password_hash DROP NOT NULL;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS attendance VARCHAR(10) NOT NULL DEFAULT 'pending';
      ALTER TABLE applications ALTER COLUMN applicant_contact DROP NOT NULL;
      ALTER TABLE applications ALTER COLUMN password_hash DROP NOT NULL;
      CREATE TABLE IF NOT EXISTS reviews (
        id           SERIAL PRIMARY KEY,
        post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        reviewer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment      VARCHAR(200),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (post_id, reviewer_id, target_id)
      );
    `);
  }

  private async seedStadiums() {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS count FROM stadiums');
    if (rows[0].count > 0) return;
    for (const s of STADIUM_SEED) {
      await this.pool.query(
        'INSERT INTO stadiums (name, district, address, map_url) VALUES ($1,$2,$3,$4)',
        [s.name, s.district, s.address, buildMapUrl(s.address)],
      );
    }
    this.logger.log(`경기장 ${STADIUM_SEED.length}곳을 넣었어요.`);
  }

  // 확인용 데모 계정 (관리자 1, 일반 3). 이미 있으면 그대로 둔다
  private async ensureDemoUsers() {
    for (const u of DEMO_USERS) {
      const found = await this.pool.query('SELECT 1 FROM users WHERE email = $1', [u.email]);
      if (found.rowCount) continue;
      await this.pool.query(
        'INSERT INTO users (email, nickname, password_hash, role) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [u.email, u.nickname, await bcrypt.hash(u.password, 10), u.role],
      );
    }
  }

  private async userId(email: string): Promise<number | null> {
    const { rows } = await this.pool.query('SELECT id FROM users WHERE email = $1', [email]);
    return rows[0]?.id ?? null;
  }

  private async seedPosts(): Promise<boolean> {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS count FROM posts');
    if (rows[0].count > 0) return false;
    const hash = await bcrypt.hash('1234', 10); // 가상 글의 비밀번호는 모두 1234
    const today = todayInSeoul();
    for (const p of POST_SEED) {
      const stadium = await this.pool.query('SELECT id FROM stadiums WHERE name = $1', [p.stadium]);
      if (!stadium.rowCount) continue;
      const ownerId = p.owner ? await this.userId(p.owner) : null;
      await this.pool.query(
        `INSERT INTO posts (stadium_id, sport, title, play_date, play_time, capacity,
                            author_name, contact, skill_level, fee, description, password_hash, user_id)
         VALUES ($1,'풋살',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [stadium.rows[0].id, p.title, addDays(today, p.daysFromNow), p.time, p.capacity,
         p.author, p.contact, p.level, p.fee, p.description, ownerId ? null : hash, ownerId],
      );
    }
    this.logger.log(`가상 모집글 ${POST_SEED.length}개를 넣었어요.`);
    return true;
  }

  // 모집글마다 신청자 몇 명을 가상으로 넣는다 (정원이 찬 글, 지난 글도 하나씩 섞여 있다)
  private async seedApplications() {
    const hash = await bcrypt.hash('1234', 10);
    const posts = await this.pool.query('SELECT id, title FROM posts');
    for (const p of POST_SEED) {
      const post = posts.rows.find((r) => r.title === p.title);
      if (!post) continue;
      for (let i = 1; i <= p.applicants; i++) {
        const name = APPLICANT_NAMES[(i + post.id) % APPLICANT_NAMES.length];
        await this.pool.query(
          `INSERT INTO applications (post_id, applicant_name, applicant_contact, contact_key, password_hash)
           VALUES ($1,$2,$3,$4,$5)`,
          [post.id, `${name}(가상)`, `가상연락처-${post.id}-${i}`, `가상연락처-${post.id}-${i}`, hash],
        );
      }
      // 로그인 계정으로 신청한 사람들 (참가 기록 예시)
      for (const ua of p.userApplicants ?? []) {
        const uid = await this.userId(ua.email);
        if (!uid) continue;
        const nick = await this.pool.query('SELECT nickname FROM users WHERE id = $1', [uid]);
        await this.pool.query(
          `INSERT INTO applications (post_id, user_id, applicant_name, contact_key, attendance)
           VALUES ($1,$2,$3,$4,$5)`,
          [post.id, uid, nick.rows[0].nickname, `user:${uid}`, ua.attendance],
        );
      }
      // 매너 후기 예시
      for (const r of p.reviews ?? []) {
        const from = await this.userId(r.from);
        const to = await this.userId(r.to);
        if (!from || !to) continue;
        await this.pool.query(
          `INSERT INTO reviews (post_id, reviewer_id, target_id, rating, comment) VALUES ($1,$2,$3,$4,$5)`,
          [post.id, from, to, r.rating, r.comment || null],
        );
      }
    }
    this.logger.log('가상 신청을 넣었어요.');
  }

  // 모집글·신청·후기를 지우고 가상 데이터로 다시 채운다 (경기장과 가입한 계정은 그대로 둔다)
  async resetDemo() {
    await this.pool.query('TRUNCATE reviews, applications, posts RESTART IDENTITY');
    await this.ensureDemoUsers();
    await this.seedPosts();
    await this.seedApplications();
    const posts = await this.pool.query('SELECT COUNT(*)::int AS count FROM posts');
    const apps = await this.pool.query('SELECT COUNT(*)::int AS count FROM applications');
    return { posts: posts.rows[0].count, applications: apps.rows[0].count };
  }
}
