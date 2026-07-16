import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller.js';
import { RobotsController } from './robots.controller.js';
import { SearchModule } from '../search/search.module.js';

@Module({
  imports: [SearchModule],
  controllers: [SitemapController, RobotsController],
})
export class SitemapModule {}
