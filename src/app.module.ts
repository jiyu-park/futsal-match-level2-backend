import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module.js';
import { SetupService } from './db/setup.service.js';
import { HealthController } from './health.controller.js';
import { StadiumsController } from './stadiums/stadiums.controller.js';
import { StadiumsService } from './stadiums/stadiums.service.js';
import { PostsController } from './posts/posts.controller.js';
import { PostsService } from './posts/posts.service.js';
import { ApplicationsController } from './applications/applications.controller.js';
import { ApplicationsService } from './applications/applications.service.js';
import { StatsController } from './admin/stats.controller.js';
import { AdminController } from './admin/admin.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { ReviewsController } from './reviews/reviews.controller.js';
import { ReviewsService } from './reviews/reviews.service.js';
import { UsersController } from './users/users.controller.js';
import { UsersService } from './users/users.service.js';

@Module({
  imports: [DbModule],
  controllers: [
    HealthController,
    StadiumsController,
    PostsController,
    ApplicationsController,
    StatsController,
    AdminController,
    AuthController,
    ReviewsController,
    UsersController,
  ],
  providers: [
    SetupService,
    StadiumsService,
    PostsService,
    ApplicationsService,
    AuthService,
    ReviewsService,
    UsersService,
  ],
})
export class AppModule {}
