'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { LOGIN, GUEST_LOGIN } from '@/graphql/mutations';
import { useAuthStore } from '@/store/authStore';
import { Mail, Lock, Loader2, UserCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const loginStore = useAuthStore((s) => s.login);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [login, { loading: loginLoading }] = useMutation(LOGIN, {
    onCompleted: (data: any) => {
      localStorage.setItem('accessToken', data.login.accessToken);
      if (data.login.refreshToken) localStorage.setItem('refreshToken', data.login.refreshToken);
      loginStore(data.login.user);
      router.push('/dashboard');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [guestLogin, { loading: guestLoading }] = useMutation(GUEST_LOGIN, {
    onCompleted: (data: any) => {
      localStorage.setItem('accessToken', data.guestLogin.accessToken);
      if (data.guestLogin.refreshToken) localStorage.setItem('refreshToken', data.guestLogin.refreshToken);
      loginStore(data.guestLogin.user);
      router.push('/dashboard');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ variables: { input: { email, password } } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md surface border rounded-2xl p-8 animate-fade-in">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-fg">SkillBridge</span>
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-fg">Sign in</h1>
          <p className="text-sm text-muted mt-1">Continue your skill exchange journey.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="label-base">Email</span>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base pl-10"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="label-base">Password</span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base pl-10"
                placeholder="••••••••"
              />
            </div>
          </label>

          <button
            type="button"
            onClick={() => toast.info('Password reset coming soon')}
            className="text-xs text-muted hover:text-accent transition-colors -mt-2 block text-right"
          >
            Forgot password?
          </button>

          <button
            type="submit"
            disabled={loginLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          type="button"
          onClick={() => guestLogin()}
          disabled={guestLoading}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          {guestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCircle className="w-4 h-4" /> Continue as guest</>}
        </button>

        <div className="mt-4">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google`}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </a>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          New to SkillBridge?{' '}
          <Link href="/register" className="text-accent font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
