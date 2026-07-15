import { Module } from '@nestjs/common';
import { ThingsController } from './things.controller.js';
import { ThingsService } from './things.service.js';
import { SearchModule } from '../search/search.module.js';

@Module({
  imports: [SearchModule],
  controllers: [ThingsController],
  providers: [ThingsService],
  exports: [ThingsService],
})
export class ThingsModule {}
