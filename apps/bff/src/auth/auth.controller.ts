import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedUser, OAuthProfile } from './auth.types.js';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'btfp_session';
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly users: UsersService,
  ) {}

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin(): void {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    await this.completeLogin(req, res);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    await this.completeLogin(req, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    // Live DB state, not the JWT's claims — those go stale the moment the
    // quiz is passed or a professional verification is approved, since
    // neither reissues the session token. See VerifiedGuard for the same fix.
    const account = await this.users.getByProviderAccount(user.provider, user.providerAccountId);
    return account ?? user;
  }

  @Get('logout')
  logout(@Res() res: FastifyReply) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.redirect(WEB_ORIGIN);
  }

  private async completeLogin(req: FastifyRequest, res: FastifyReply) {
    const profile = req.user as unknown as OAuthProfile;
    const user = await this.users.upsertFromOAuth(profile);
    const token = this.authService.issueSessionToken(user);

    res.setCookie(COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    });
    res.redirect(`${WEB_ORIGIN}/?signedIn=1`);
  }
}
