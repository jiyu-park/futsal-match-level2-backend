import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.posts.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.posts.get(id);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.posts.create(body);
  }

  // 비밀번호(body.password)가 맞을 때만 수정·삭제한다
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.posts.update(id, body);
  }

  @Post(':id/check-password')
  @HttpCode(200)
  async checkPassword(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    await this.posts.verifyPassword(id, body);
    return { ok: true };
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.posts.remove(id, body);
  }
}
