import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { CacheService } from './cache.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly LIMIT = 100;
  private readonly WINDOW_SECONDS = 60;

  constructor(private readonly cacheService: CacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'rpc') return true;

    let req;
    if (context.getType().toString() === 'graphql') {
      req = GqlExecutionContext.create(context).getContext().req;
    } else {
      req = context.switchToHttp().getRequest();
    }

    if (!req) return true; // Fail open if no request object

    // In Express, req.ip or req.connection.remoteAddress exists
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    
    // Extract userId if logged in, otherwise default to IP
    let identifier = ip;
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
        throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }
      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Fail open if Redis is down
      return true;
    }
  }
}
