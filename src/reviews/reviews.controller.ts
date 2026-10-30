import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.util.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ReviewsService } from './reviews.service.js';

@Controller('posts/:postId')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // 이 경기에 함께 뛴 사람들 (로그인한 사람만 해당)
  @Get('participants')
  participants(@Param('postId', ParseIntPipe) postId: number) {
    return this.reviews.participants(postId);
  }

  @Get('reviews')
  list(@Param('postId', ParseIntPipe) postId: number) {
    return this.reviews.list(postId);
  }

  @Post('reviews')
  create(@Param('postId', ParseIntPipe) postId: number, @Body() body: unknown, @CurrentUser() user: AuthUser | null) {
    return this.reviews.create(postId, body, user);
  }
}
