import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

// 경기장 등록·수정·삭제는 관리자 비밀번호(x-admin-password)가 맞아야 한다
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const given = String(request.headers['x-admin-password'] ?? '');
    const expected = process.env.ADMIN_PASSWORD ?? '';
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('관리자 비밀번호가 맞지 않습니다.');
    }
    return true;
  }
}
