'use client';

import { ApolloNextAppProvider } from '@apollo/client-integration-nextjs';
import { makeApolloClient } from '@/lib/apollo-client';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@apollo/client/react';
import { GET_ME } from '@/graphql/queries';
import { useEffect, useState } from 'react';

function AuthSync({ children }: { children: React.ReactNode }) {
  const login = useAuthStore((s) => s.login);
  const setLoading = useAuthStore((s) => s.setLoading);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const { data, loading, error } = useQuery<any>(GET_ME, {
    skip: !mounted || !token,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (!mounted) return;

    if (!token) {
      setLoading(false);
      return;
    }

    if (data?.me) {
      login(data.me);
    } else if (error || (!loading && data && !data.me)) {
      setLoading(false);
    }
  }, [data, loading, error, login, setLoading, mounted, token]);

  return <>{children}</>;
}

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ApolloNextAppProvider makeClient={makeApolloClient}>
      <AuthSync>
        {children}
      </AuthSync>
    </ApolloNextAppProvider>
  );
}
