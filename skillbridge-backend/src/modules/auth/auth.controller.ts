import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    
    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    const { accessToken, refreshToken } = this.authService.generateTokens(user);
    
    // Pass tokens to the frontend callback page
    // For better security, we could use a temporary code, but for this scale
    // query params with short-lived tokens are the standard for cross-origin social auth.
    const redirectUrl = new URL(`${frontendUrl}/auth-callback`);
    redirectUrl.searchParams.set('token', accessToken);
    if (refreshToken) redirectUrl.searchParams.set('refresh', refreshToken);

    return res.redirect(redirectUrl.toString());
  }
}
