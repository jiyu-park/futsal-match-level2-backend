import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard.js';
import { SetupService } from '../db/setup.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly setup: SetupService) {}

  // 모집글과 신청을 지우고 가상 데이터로 다시 채운다 (관리자 비밀번호 필요)
  @Post('reset-demo')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  async resetDemo() {
    return this.setup.resetDemo();
  }
}
