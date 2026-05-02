import { HttpLink, split, ApolloLink, concat } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { ApolloClient, InMemoryCache } from '@apollo/client-integration-nextjs';
import { OperationDefinitionNode } from 'graphql';

export function makeApolloClient() {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql',
    credentials: 'include',
  });

  const authLink = setContext((_, { headers }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${token}` : '',
      }
    };
  });

  const wsLink =
    typeof window !== 'undefined'
      ? new GraphQLWsLink(
        createClient({
          url: process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:3001/graphql',
          connectionParams: () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
            return {
              Authorization: token ? `Bearer ${token}` : '',
            };
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
        concat(authLink, httpLink)
      )
      : concat(authLink, httpLink);

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: splitLink,
  });
}
