import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(protected readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'btfp_session';
    const token = request.cookies?.[cookieName];
    if (!token) throw new UnauthorizedException('Sign in required');

    try {
      const payload = this.auth.verifySessionToken(token);
      request.user = {
        id: payload.sub,
        provider: payload.provider,
        providerAccountId: payload.providerAccountId,
        displayName: payload.displayName,
        verifiedContributor: payload.verifiedContributor,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
