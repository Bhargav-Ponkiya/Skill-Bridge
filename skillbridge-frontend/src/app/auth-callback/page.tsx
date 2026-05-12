'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('token');
    const refreshToken = searchParams.get('refresh');

    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      
      // The app will automatically fetch user info via the GetMe query 
      // once it sees the token in localStorage.
      router.push('/dashboard');
    } else {
      const error = searchParams.get('error');
      toast.error(error || 'Authentication failed');
      router.push('/login');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="surface border rounded-2xl p-8 flex flex-col items-center gap-4 animate-pulse">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
        <p className="text-lg font-medium text-fg">Finalising your login...</p>
        <p className="text-sm text-muted text-center max-w-xs">
          Securely synchronising your account details.
        </p>
      </div>
    </div>
  );
}
