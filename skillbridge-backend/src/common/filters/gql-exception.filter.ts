import { Catch, Logger } from '@nestjs/common';
import { GqlExceptionFilter as NestGqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { PulseBoardLogger } from '../../utils/pulseboard-logger';

@Catch()
export class GqlExceptionFilter implements NestGqlExceptionFilter {
  private readonly logger = new Logger(GqlExceptionFilter.name);

  catch(exception: unknown): GraphQLError {
    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof Error) {
      const exceptionWithResponse = exception as {
        getResponse?: () => unknown;
        status?: number;
      };
      const response = exceptionWithResponse.getResponse?.();
      let message = exception.message;

      if (typeof response === 'object' && response !== null) {
        const res = response as { message?: string | string[] };
        message = Array.isArray(res.message)
          ? res.message[0]
          : (res.message ?? exception.message);
      }

      this.logger.error(`Unhandled exception: ${message}`, exception.stack);
      PulseBoardLogger.error(`Unhandled GraphQL exception: ${message}`, {
        stack: exception.stack,
        status: exceptionWithResponse.status,
      });

      return new GraphQLError(message, {
        extensions: {
          code:
            exceptionWithResponse.status === 400
              ? 'BAD_USER_INPUT'
              : 'INTERNAL_SERVER_ERROR',
          response,
          timestamp: new Date().toISOString(),
        },
      });
    }

    this.logger.error('Unknown exception', String(exception));
    PulseBoardLogger.error('Unknown exception', { error: String(exception) });
    return new GraphQLError('An unexpected error occurred', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
