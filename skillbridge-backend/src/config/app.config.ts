import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET ?? 'fallback_secret_change_in_prod',
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ?? 'fallback_refresh_secret_change_in_prod',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ??
    'http://localhost:3001/auth/google/callback',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  // Comma-separated list of summary-model candidates, tried in order. The free tier on
  // some keys has `limit: 0` for specific models, so falling back lets us recover.
  geminiSummaryModels: (
    process.env.GEMINI_SUMMARY_MODELS ??
    'gemini-2.5-flash,gemini-flash-latest,gemini-pro-latest'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}));
