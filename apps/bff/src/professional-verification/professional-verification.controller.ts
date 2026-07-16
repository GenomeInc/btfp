import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { VerifiedGuard } from '../auth/verified.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ProfessionalVerificationService } from './professional-verification.service.js';
import { RequestProfessionalVerificationDto } from './dto/request-professional-verification.dto.js';
import { ConfirmProfessionalVerificationDto } from './dto/confirm-professional-verification.dto.js';
import { ReviewProfessionalVerificationDto } from './dto/review-professional-verification.dto.js';

@Controller('verification/professional')
export class ProfessionalVerificationController {
  constructor(private readonly service: ProfessionalVerificationService) {}

  @Post('request')
  @UseGuards(JwtAuthGuard)
  async request(@Body() dto: RequestProfessionalVerificationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.request(user, dto.email);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  async confirm(@Body() dto: ConfirmProfessionalVerificationDto, @CurrentUser() user: AuthenticatedUser) {
    const confirmed = await this.service.confirm(user, dto.code);
    return { confirmed };
  }

  @Get('pending')
  @UseGuards(VerifiedGuard)
  async pending() {
    // MVP: any verified contributor can review, same pattern as contribution
    // moderation. Both need a real admin role before this is public at scale.
    return this.service.listPending();
  }

  @Post(':userId/review')
  @UseGuards(VerifiedGuard)
  async review(
    @Param('userId') userId: string,
    @Body() dto: ReviewProfessionalVerificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.review(userId, dto.approve, user.id, dto.reason);
  }
}
