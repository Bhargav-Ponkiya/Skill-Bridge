import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { GqlExceptionFilter as NestGqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GqlExceptionFilter implements NestGqlExceptionFilter {
  private readonly logger = new Logger(GqlExceptionFilter.name);

  catch(exception: unknown, _host: ArgumentsHost): GraphQLError {
    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof Error) {
      const response = (exception as any).getResponse?.();
      let message = exception.message;
      if (typeof response === 'object' && response !== null) {
        // Extract clean message from NestJS exception response
        message = Array.isArray(response.message)
          ? response.message[0]
          : (response.message ?? exception.message);
      }
      
      this.logger.error(`Unhandled exception: ${message}`, exception.stack);
      
      return new GraphQLError(message, {
        extensions: {
          code: (exception as any).status === 400 ? 'BAD_USER_INPUT' : 'INTERNAL_SERVER_ERROR',
          response,
          timestamp: new Date().toISOString(),
        },
      });
    }

    this.logger.error('Unknown exception', String(exception));
    return new GraphQLError('An unexpected error occurred', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
