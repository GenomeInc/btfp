import { Module } from '@nestjs/common';
import { BreedsController } from './breeds.controller.js';
import { BreedsService } from './breeds.service.js';

@Module({
  controllers: [BreedsController],
  providers: [BreedsService],
  exports: [BreedsService],
})
export class BreedsModule {}
