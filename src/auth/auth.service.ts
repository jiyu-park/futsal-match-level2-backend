import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type pg from 'pg';
import { PG_POOL } from '../db/db.module.js';
import { FieldErrors, text, throwIfErrors } from '../common/validation.js';
import { signToken } from './auth.util.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AuthService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  private publicUser(row: any) {
    return { id: row.id, email: row.email, nickname: row.nickname, role: row.role };
  }

  async signup(body: any) {
    const email = text(body?.email).toLowerCase();
    const nickname = text(body?.nickname);
    const password = typeof body?.password === 'string' ? body.password : '';
    const errors: FieldErrors = {};
    if (!email) errors.email = '이메일을 적어 주세요.';
    else if (!EMAIL.test(email) || email.length > 100) errors.email = '이메일 형식이 맞지 않아요. (예: name@example.com)';
    if (!nickname) errors.nickname = '닉네임을 적어 주세요.';
    else if (nickname.length < 2 || nickname.length > 20) errors.nickname = '닉네임은 2~20자로 적어 주세요.';
    if (!password) errors.password = '비밀번호를 적어 주세요.';
    else if (password.length < 8) errors.password = '비밀번호는 8자 이상으로 적어 주세요.';
    else if (password.length > 72) errors.password = '비밀번호는 72자 이하로 적어 주세요.';
    throwIfErrors(errors);

    const dup = await this.pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (dup.rowCount) throwIfErrors({ email: '이미 가입된 이메일이에요. 로그인해 주세요.' });
    const nickDup = await this.pool.query('SELECT 1 FROM users WHERE nickname = $1', [nickname]);
    if (nickDup.rowCount) throwIfErrors({ nickname: '이미 쓰고 있는 닉네임이에요. 다른 이름을 골라 주세요.' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await this.pool.query(
      `INSERT INTO users (email, nickname, password_hash, role)
       VALUES ($1, $2, $3, 'user') RETURNING id, email, nickname, role`,
      [email, nickname, hash],
    );
    return { token: signToken({ id: rows[0].id, role: rows[0].role }), user: this.publicUser(rows[0]) };
  }

  async login(body: any) {
    const email = text(body?.email).toLowerCase();
    const password = typeof body?.password === 'string' ? body.password : '';
    const errors: FieldErrors = {};
    if (!email) errors.email = '이메일을 적어 주세요.';
    if (!password) errors.password = '비밀번호를 적어 주세요.';
    throwIfErrors(errors);

    const { rows } = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    // 이메일이 없는지 비밀번호가 틀린지는 알려 주지 않는다
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 맞지 않아요.');
    }
    return { token: signToken({ id: rows[0].id, role: rows[0].role }), user: this.publicUser(rows[0]) };
  }

  async me(userId: number) {
    const { rows } = await this.pool.query('SELECT id, email, nickname, role FROM users WHERE id = $1', [userId]);
    if (!rows.length) throw new NotFoundException('계정을 찾을 수 없어요. 다시 로그인해 주세요.');
    return this.publicUser(rows[0]);
  }
}
