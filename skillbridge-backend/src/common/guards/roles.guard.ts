import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() === 'rpc') return true;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const ctx = GqlExecutionContext.create(context);
    const rawCtx: unknown = ctx.getContext();
    const gqlCtx = rawCtx as {
      req: { user?: { role?: Role } };
    };
    const req = gqlCtx.req;
    if (!req || !req.user) return false;

    const userRole = req.user.role || Role.USER;
    return requiredRoles.some((role) => userRole === role);
  }
}
