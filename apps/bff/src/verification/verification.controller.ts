import { Body, Controller, ForbiddenException, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service.js';
import {
  UsersService,
  AuthService,
  JwtAuthGuard,
  CurrentUser,
  type AuthenticatedUser,
} from '@mycota/auth';
import type { SubmitQuizDto } from './dto/submit-quiz.dto.js';

const MIN_ACCOUNT_AGE_DAYS = Number(process.env.MIN_ACCOUNT_AGE_DAYS ?? 30);

@Controller('verification')
export class VerificationController {
  // TEMPORARY: diagnosing a prod-only "Internal server error" on quiz
  // submission (TypeError: Cannot read properties of undefined (reading
  // 'length') in gradeQuiz) — remove once root-caused.
  private readonly logger = new Logger(VerificationController.name);

  constructor(
    private readonly verification: VerificationService,
    private readonly users: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('quiz')
  @UseGuards(JwtAuthGuard)
  async getQuiz() {
    return this.verification.generateQuiz();
  }

  @Post('quiz')
  @UseGuards(JwtAuthGuard)
  async submitQuiz(@Body() dto: SubmitQuizDto, @CurrentUser() user: AuthenticatedUser) {
    const account = await this.users.getByProviderAccount(user.provider, user.providerAccountId);
    if (!account) throw new ForbiddenException('Account not found');

    if (account.provider !== 'github') {
      throw new ForbiddenException('Sign in with GitHub to become a verified contributor');
    }

    if (
      !this.authService.isAccountOldEnough(account.providerAccountCreatedAt, MIN_ACCOUNT_AGE_DAYS)
    ) {
      throw new ForbiddenException(
        `Your GitHub account needs to be at least ${MIN_ACCOUNT_AGE_DAYS} days old to contribute`,
      );
    }

    this.logger.warn(
      `submitQuiz dto: questions=${JSON.stringify(dto?.questions)} answers=${JSON.stringify(dto?.answers)} rawDto=${JSON.stringify(dto)}`,
    );
    const passed = this.verification.gradeQuiz(dto.questions, dto.answers);
    if (!passed) throw new ForbiddenException('Quiz not passed — give it another shot');

    await this.users.markVerified(account.provider, account.providerAccountId);
    return { verifiedContributor: true };
  }
}
