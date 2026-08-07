import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { BreedsModule } from '../breeds/breeds.module.js';

@Module({
  imports: [BreedsModule],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
