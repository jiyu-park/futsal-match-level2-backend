import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { readUser } from '../auth/auth.util.js';

// 관리자만 통과한다: 관리자 계정으로 로그인했거나, 관리자 비밀번호(x-admin-password)가 맞을 때
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (readUser(request)?.role === 'admin') return true;

    const given = String(request.headers['x-admin-password'] ?? '');
    const expected = process.env.ADMIN_PASSWORD ?? '';
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('관리자만 할 수 있어요. 관리자 계정으로 로그인하거나 관리자 비밀번호를 입력해 주세요.');
    }
    return true;
  }
}
