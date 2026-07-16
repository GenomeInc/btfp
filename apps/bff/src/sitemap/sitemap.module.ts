import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller.js';
import { SearchModule } from '../search/search.module.js';

@Module({
  imports: [SearchModule],
  controllers: [SitemapController],
})
export class SitemapModule {}
