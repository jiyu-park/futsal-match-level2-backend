import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.util.js';
import { requireUser } from '../auth/auth.util.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // 내 참가 기록 (로그인 필요)
  @Get('me/history')
  history(@CurrentUser() user: AuthUser | null) {
    return this.users.history(requireUser(user).id);
  }

  // 누구나 볼 수 있는 프로필: 참가 횟수, 출석률, 매너 점수
  @Get('users/:id')
  profile(@Param('id', ParseIntPipe) id: number) {
    return this.users.profile(id);
  }
}
