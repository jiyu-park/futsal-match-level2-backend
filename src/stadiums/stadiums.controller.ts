import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard.js';
import { StadiumsService } from './stadiums.service.js';

@Controller('stadiums')
export class StadiumsController {
  constructor(private readonly stadiums: StadiumsService) {}

  // 경기장 목록 (누구나)
  @Get()
  list() {
    return this.stadiums.list();
  }

  // 경기장 등록·수정·삭제는 관리자 비밀번호가 필요하다
  @Post()
  @UseGuards(AdminGuard)
  create(@Body() body: unknown) {
    return this.stadiums.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.stadiums.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stadiums.remove(id);
  }
}
