import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.util.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ApplicationsService } from './applications.service.js';

@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  // 이 모집글의 신청 명단 (이름·출석 상태만)
  @Get('posts/:postId/applications')
  list(@Param('postId', ParseIntPipe) postId: number) {
    return this.applications.listForPost(postId);
  }

  // 참가 신청 (로그인 필요): 신청 기간, 중복, 정원 규칙을 확인한다
  @Post('posts/:postId/applications')
  apply(@Param('postId', ParseIntPipe) postId: number, @CurrentUser() user: AuthUser | null) {
    return this.applications.apply(postId, user);
  }

  // 신청 취소: 본인이나 관리자
  @Delete('applications/:id')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() body: unknown, @CurrentUser() user: AuthUser | null) {
    return this.applications.cancel(id, body, user);
  }

  // 참석 여부 표시 (모집글 주인이나 관리자, 경기 시작 후)
  @Patch('applications/:id/attendance')
  attendance(@Param('id', ParseIntPipe) id: number, @Body() body: unknown, @CurrentUser() user: AuthUser | null) {
    return this.applications.markAttendance(id, body, user);
  }
}
