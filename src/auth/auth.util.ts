import { UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export type AuthUser = { id: number; role: 'user' | 'admin' };

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 설정이 필요해요. (.env 또는 Render 환경 값)');
  return secret;
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret(), { expiresIn: '7d' });
}

// 요청 머리글의 "Authorization: Bearer 토큰"에서 로그인한 사람을 읽는다. 없거나 틀리면 null
export function readUser(request: any): AuthUser | null {
  const header = String(request?.headers?.authorization ?? '');
  if (!header.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret()) as any;
    return { id: Number(payload.sub), role: payload.role === 'admin' ? 'admin' : 'user' };
  } catch {
    return null;
  }
}

export function requireUser(user: AuthUser | null): AuthUser {
  if (!user) throw new UnauthorizedException('로그인이 필요해요. 로그인한 뒤 다시 시도해 주세요.');
  return user;
}
