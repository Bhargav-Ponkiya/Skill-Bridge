import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const rawCtx: unknown = ctx.getContext();
    const gqlCtx = rawCtx as {
      req: { user?: unknown };
    };
    return gqlCtx.req.user;
  },
);
