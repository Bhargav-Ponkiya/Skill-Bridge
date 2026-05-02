import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RateLimitGuard } from './rate-limit.guard';

@Global()
@Module({
  providers: [CacheService, RateLimitGuard],
  exports: [CacheService, RateLimitGuard],
})
export class CacheModule {}
