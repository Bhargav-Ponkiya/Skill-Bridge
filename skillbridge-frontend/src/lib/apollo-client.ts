import { HttpLink, split, ApolloLink, concat } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { ApolloClient, InMemoryCache } from '@apollo/client-integration-nextjs';
import { OperationDefinitionNode } from 'graphql';
import { toast } from 'sonner';

export function makeApolloClient() {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql',
    credentials: 'include',
  });

  const authLink = setContext((_, { headers }) => {
    if (typeof window === 'undefined') return { headers };
    const token = localStorage.getItem('accessToken');
    return {
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  const errorLink = onError((options) => {
    const { graphQLErrors, networkError } = options as {
      graphQLErrors?: { message: string }[];
      networkError?: Error | null;
    };
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message }) => toast.error(message));
    }
    if (networkError) {
      toast.error(networkError.message ?? 'A network error occurred');
    }
  });

  const wsLink =
    typeof window !== 'undefined'
      ? new GraphQLWsLink(
        createClient({
          url: process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:3001/graphql',
          connectionParams: () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
            return token ? { authorization: `Bearer ${token}` } : {};
          },
        })
      )
      : null;

  const splitLink: ApolloLink =
    typeof window !== 'undefined' && wsLink != null
      ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === 'OperationDefinition' &&
            (definition as OperationDefinitionNode).operation === 'subscription'
          );
        },
        wsLink,
        concat(errorLink, concat(authLink, httpLink))
      )
      : concat(errorLink, concat(authLink, httpLink));

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: splitLink,
  });
}
