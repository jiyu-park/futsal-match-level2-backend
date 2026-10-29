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

@Module({
  imports: [DbModule],
  controllers: [
    HealthController,
    StadiumsController,
    PostsController,
    ApplicationsController,
    StatsController,
    AdminController,
  ],
  providers: [SetupService, StadiumsService, PostsService, ApplicationsService],
})
export class AppModule {}
