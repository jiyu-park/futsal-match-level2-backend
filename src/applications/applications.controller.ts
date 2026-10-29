import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';

@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  // 이 모집글의 신청 명단 (이름만)
  @Get('posts/:postId/applications')
  list(@Param('postId', ParseIntPipe) postId: number) {
    return this.applications.listForPost(postId);
  }

  // 참가 신청: 신청 기간, 중복, 정원 규칙을 확인한다
  @Post('posts/:postId/applications')
  apply(@Param('postId', ParseIntPipe) postId: number, @Body() body: unknown) {
    return this.applications.apply(postId, body);
  }

  // 신청 취소: 신청할 때 정한 비밀번호가 필요하다
  @Delete('applications/:id')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.applications.cancel(id, body);
  }
}
