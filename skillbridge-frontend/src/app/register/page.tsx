'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { REGISTER } from '@/graphql/mutations';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Lock, Loader2, Zap, ArrowRight } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const loginStore = useAuthStore((s) => s.login);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const password = watch('password', '');

  const passwordStrength = useMemo(() => {
    if (!password) return { label: '', color: '', score: 0 };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    if (score <= 1) return { label: 'Weak', color: 'text-danger', score };
    if (score <= 2) return { label: 'Medium', color: 'text-warning', score };
    return { label: 'Strong', color: 'text-success', score };
  }, [password]);

  const [registerMutation, { loading }] = useMutation(REGISTER, {
    onCompleted: (data: any) => {
      loginStore(data.register.user);
      router.push('/dashboard');
    },
    onError: (err: any) => setError(err.message),
  });

  const onSubmit = (data: RegisterForm) => {
    setError(null);
    registerMutation({ variables: { input: data } });
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <label className="block space-y-1.5">
            <span className="label-base">Display name</span>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                {...register('name')}
                maxLength={60}
                className={`input-base pl-10 ${errors.name ? 'border-danger focus:border-danger' : ''}`}
                placeholder="Your name"
              />
            </div>
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </label>

          <label className="block space-y-1.5">
            <span className="label-base">Email</span>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="email"
                {...register('email')}
                className={`input-base pl-10 ${errors.email ? 'border-danger focus:border-danger' : ''}`}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </label>

          <label className="block space-y-1.5">
            <span className="label-base">Password</span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="password"
                {...register('password')}
                className={`input-base pl-10 ${errors.password ? 'border-danger focus:border-danger' : ''}`}
                placeholder="At least 8 characters"
              />
            </div>
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </label>

          {password && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      passwordStrength.score >= i
                        ? passwordStrength.color === 'text-danger'
                          ? 'bg-danger'
                          : passwordStrength.color === 'text-warning'
                            ? 'bg-warning'
                            : 'bg-success'
                        : 'bg-surface-2'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs font-medium ${passwordStrength.color}`}>
                {passwordStrength.label}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-danger font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading || isSubmitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading || isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
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
