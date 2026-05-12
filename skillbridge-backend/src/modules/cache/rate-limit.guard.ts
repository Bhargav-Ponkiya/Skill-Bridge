import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { CacheService } from './cache.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly LIMIT = 100;
  private readonly WINDOW_SECONDS = 60;

  constructor(private readonly cacheService: CacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'rpc') return true;

    interface RateLimitRequest {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
      connection?: { remoteAddress?: string };
      user?: { id?: string; sub?: string };
      req?: RateLimitRequest;
    }

    let req: RateLimitRequest | undefined;
    if (context.getType().toString() === 'graphql') {
      const rawCtx: unknown = GqlExecutionContext.create(context).getContext();
      const gqlCtx = rawCtx as RateLimitRequest;
      req = gqlCtx.req || gqlCtx;
    } else {
      req = context.switchToHttp().getRequest<RateLimitRequest>();
    }

    if (!req) {
      this.logger.warn('RateLimitGuard: No request object found in context');
      return true;
    }

    const ip =
      req.ip ||
      (Array.isArray(req.headers?.['x-forwarded-for'])
        ? req.headers?.['x-forwarded-for'][0]
        : req.headers?.['x-forwarded-for']) ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      'unknown';

    let identifier: string = ip;
    if (req.user?.id) {
      identifier = req.user.id;
    } else if (req.user?.sub) {
      identifier = req.user.sub;
    }

    const key = `ratelimit:${identifier}`;

    try {
      const redis = this.cacheService.client;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, this.WINDOW_SECONDS);
      }

      if (current > this.LIMIT) {
        throw new HttpException(
          'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Fail open if Redis is down
      return true;
    }
  }
}
