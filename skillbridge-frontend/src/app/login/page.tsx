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
      loginStore(data.login.user);
      router.push('/dashboard');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [guestLogin, { loading: guestLoading }] = useMutation(GUEST_LOGIN, {
    onCompleted: (data: any) => {
      localStorage.setItem('accessToken', data.guestLogin.accessToken);
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
