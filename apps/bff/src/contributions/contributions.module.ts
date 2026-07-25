import { Module } from '@nestjs/common';
import { ContributionsController } from './contributions.controller.js';
import { ContributionsService } from './contributions.service.js';
import { ThingsModule } from '../things/things.module.js';

// No `imports: [MycotaAuthModule]` needed — it's registered `global: true`.
@Module({
  imports: [ThingsModule],
  controllers: [ContributionsController],
  providers: [ContributionsService],
})
export class ContributionsModule {}
