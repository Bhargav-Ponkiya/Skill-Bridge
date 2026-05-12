import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller()
export class HealthController {
  @Get()
  @Public()
  root() {
    return {
      message: 'SkillBridge API is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @Public()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}
