import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'rpc') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // For public routes: still try to authenticate so @CurrentUser() gets populated,
      // but don't block the request if auth fails (returns null for user).
      try {
        return (await super.canActivate(context)) as boolean;
      } catch {
        return true;
      }
    }

    return (await super.canActivate(context)) as boolean;
  }

  getRequest(context: ExecutionContext): unknown {
    if (context.getType().toString() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      const rawCtx: unknown = ctx.getContext();
      const gqlCtx = rawCtx as { req: unknown };
      return gqlCtx.req;
    }
    return context.switchToHttp().getRequest();
  }

  handleRequest<TUser = any>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      if (err || !user) return null as TUser;
      return user;
    }
    if (err || !user) {
      if (err instanceof Error) throw err;
      throw new UnauthorizedException();
    }
    return user;
  }
}
