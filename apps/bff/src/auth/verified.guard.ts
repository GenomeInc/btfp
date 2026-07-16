import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';
import type { AuthenticatedUser } from './auth.types.js';

@Injectable()
export class VerifiedGuard extends JwtAuthGuard {
  constructor(
    auth: AuthService,
    private readonly users: UsersService,
  ) {
    super(auth);
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = super.canActivate(context);
    if (!isAuthenticated) return false;

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    if (!request.user) return false;

    // The JWT's verifiedContributor claim is stale until next login — it's
    // set once at sign-in and never reissued when the quiz is passed or a
    // professional verification is approved (that can even happen from a
    // different session, the reviewer's). Re-check the current DB state
    // rather than trust the token.
    const account = await this.users.getByProviderAccount(
      request.user.provider,
      request.user.providerAccountId,
    );
    if (!account?.verifiedContributor) {
      throw new ForbiddenException('Complete the contributor quiz before submitting');
    }
    return true;
  }
}
