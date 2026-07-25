import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';
import { SearchModule } from '../search/search.module.js';

// No `imports: [MycotaAuthModule]` needed — it's registered `global: true`.
@Module({
  imports: [SearchModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
