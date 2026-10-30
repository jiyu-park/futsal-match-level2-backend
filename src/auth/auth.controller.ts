import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { requireUser } from './auth.util.js';
import type { AuthUser } from './auth.util.js';
import { CurrentUser } from './current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  signup(@Body() body: unknown) {
    return this.auth.signup(body);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  // 지금 로그인한 사람의 정보
  @Get('me')
  me(@CurrentUser() user: AuthUser | null) {
    return this.auth.me(requireUser(user).id);
  }
}
