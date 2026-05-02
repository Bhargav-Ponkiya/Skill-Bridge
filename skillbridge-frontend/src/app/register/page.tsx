'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { REGISTER } from '@/graphql/mutations';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Lock, Loader2, Zap, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const loginStore = useAuthStore((s) => s.login);
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [register, { loading }] = useMutation(REGISTER, {
    onCompleted: (data: any) => {
      localStorage.setItem('accessToken', data.register.accessToken);
      loginStore(data.register.user);
      router.push('/dashboard');
    },
    onError: (err: any) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    register({ variables: { input: { email, password, name } } });
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
          <h1 className="text-2xl font-bold text-fg">Create your account</h1>
          <p className="text-sm text-muted mt-1">Start swapping skills with the community.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="label-base">Display name</span>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="input-base pl-10"
                placeholder="Your name"
              />
            </div>
          </label>

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
                placeholder="At least 6 characters"
              />
            </div>
          </label>

          {error && <p className="text-sm text-danger font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-accent font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
