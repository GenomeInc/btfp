import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { promises as dns } from 'node:dns';
import type { User } from '@btfp/shared-types';
import { UsersService } from '../auth/users.service.js';
import { BedrockClassifierService } from './bedrock-classifier.service.js';
import { EmailSenderService } from './email-sender.service.js';
import { isFreeEmailDomain } from './free-email-domains.js';

const CODE_TTL_MS = 15 * 60 * 1000;

interface UserAccountRef {
  provider: string;
  providerAccountId: string;
}

@Injectable()
export class ProfessionalVerificationService {
  constructor(
    private readonly users: UsersService,
    private readonly bedrock: BedrockClassifierService,
    private readonly emailSender: EmailSenderService,
  ) {}

  async request(user: UserAccountRef, email: string): Promise<{ orgClassification?: string }> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) throw new BadRequestException('Invalid email address');
    if (isFreeEmailDomain(domain)) {
      throw new BadRequestException(
        'Please use an organizational email address, not a personal/free provider.',
      );
    }

    try {
      const records = await dns.resolveMx(domain);
      if (records.length === 0) throw new Error('no MX records');
    } catch {
      throw new BadRequestException(`Couldn't verify that ${domain} can receive email — check for typos.`);
    }

    const classification = await this.bedrock.classifyDomain(domain);

    const code = String(randomInt(100000, 999999));
    await this.users.setProfessionalPending({
      provider: user.provider,
      providerAccountId: user.providerAccountId,
      email,
      domain,
      code,
      codeExpiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      orgClassification: classification?.classification,
      orgClassificationReasoning: classification?.reasoning,
    });

    await this.emailSender.sendVerificationCode(email, code);

    return { orgClassification: classification?.classification };
  }

  async confirm(user: UserAccountRef, code: string): Promise<boolean> {
    return this.users.confirmProfessionalCode(user.provider, user.providerAccountId, code);
  }

  async listPending(): Promise<User[]> {
    return this.users.listAwaitingReview();
  }

  async review(userId: string, approve: boolean, reviewerId: string, reason?: string): Promise<User> {
    return this.users.reviewProfessional(userId, approve, reviewerId, reason);
  }
}
