import { HttpLink, split, ApolloLink, concat, Observable } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { ApolloClient, InMemoryCache } from '@apollo/client-integration-nextjs';
import { OperationDefinitionNode } from 'graphql';
import { toast } from 'sonner';

function doRefreshToken(): Promise<string | null> {
  return fetch(
    process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation RefreshToken($token: String!) {
            refreshToken(token: $token) {
              accessToken
              user { id name email avatar isGuest }
            }
          }
        `,
        variables: { token: localStorage.getItem('refreshToken') },
      }),
    },
  )
    .then((res) => res.json())
    .then((json) => {
      const data = json?.data?.refreshToken;
      if (data?.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        return data.accessToken;
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    })
    .catch(() => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    });
}

let refreshPromise: Promise<string | null> | null = null;

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
    const { graphQLErrors, networkError, operation, forward } = options as any;
    if (graphQLErrors) {
      const isUnauthenticated = graphQLErrors.some(
        (e: any) => e.extensions?.code === 'UNAUTHENTICATED',
      );
      if (isUnauthenticated && operation?.operationName !== 'RefreshToken') {
        if (!refreshPromise) {
          refreshPromise = doRefreshToken();
        }
        return new Observable((observer) => {
          refreshPromise!
            .then(() => {
              const sub = forward(operation).subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              });
              return sub;
            })
            .catch(() => {
              observer.complete();
            })
            .finally(() => { refreshPromise = null; });
        });
      }
      graphQLErrors.forEach(({ message, extensions }: any) => {
        if (extensions?.code === 'UNAUTHENTICATED') return;
        if (operation?.operationName === 'GetMe') return;
        toast.error(message);
      });
    }
    if (networkError) {
      if (networkError.message?.includes('401') || networkError.message?.includes('UNAUTHENTICATED')) return;
      toast.error(networkError.message ?? 'A network error occurred');
    }
  });

  const wsLink =
    typeof window !== 'undefined'
      ? new GraphQLWsLink(
        createClient({
          url: process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:3001/graphql',
          retryAttempts: Infinity,
          shouldRetry: () => true,
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
