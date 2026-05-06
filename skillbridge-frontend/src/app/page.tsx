'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Zap,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Matching',
    description:
      'Our Gemini-powered engine understands semantic skill relationships, pairing you with the perfect learning partner based on affinity scores, not just keywords.',
    color: 'from-accent to-blue-500',
  },
  {
    icon: MessageSquare,
    title: 'Real-time Chat',
    description:
      'Negotiate session details, share resources, and coordinate schedules with instant messaging powered by Socket.IO and Redis pub/sub.',
    color: 'from-brand-500 to-purple-500',
  },
  {
    icon: ShieldCheck,
    title: 'Trust System',
    description:
      'Build your reputation with verified reviews, completion tracking, and a composite trust score that helps you choose reliable partners.',
    color: 'from-emerald-500 to-teal-500',
  },
];

const STATS = [
  { value: '500+', label: 'Skills available' },
  { value: '100%', label: 'Free to use' },
  { value: '24/7', label: 'AI assistance' },
];

function FloatingOrb({ className }: { className: string }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
  );
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-fg">
      {/* Ambient background orbs */}
      <FloatingOrb
        className="w-96 h-96 bg-accent -top-48 -left-48 animate-pulse"
      />
      <FloatingOrb
        className="w-80 h-80 bg-brand-500 top-1/3 right-0 animate-pulse animate-delay-200"
      />
      <FloatingOrb
        className="w-72 h-72 bg-purple-500 bottom-24 left-1/3 animate-pulse animate-delay-300"
      />

      {/* Nav bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">SkillBridge</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">
            Sign In
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div
          className="transition-transform duration-100"
          style={{ transform: `translateY(${scrollY * 0.15}px)` }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-soft text-accent text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Skill Matching
          </div>
        </div>

        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-center leading-[1.1] max-w-4xl"
          style={{ transform: `translateY(${scrollY * 0.08}px)` }}
        >
          Learn anything,{' '}
          <span className="bg-gradient-to-r from-accent via-blue-500 to-purple-500 bg-clip-text text-transparent">
            teach everything
          </span>
        </h1>

        <p
          className="mt-6 text-lg sm:text-xl text-muted max-w-2xl text-center leading-relaxed"
          style={{ transform: `translateY(${scrollY * 0.04}px)` }}
        >
          Swap skills with real people. Our AI finds the perfect match, you set the terms, and
          both of you grow together. No money changes hands — just knowledge.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          style={{ transform: `translateY(${scrollY * 0.02}px)` }}
        >
          <Link href="/register" className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 group">
            Get Started Free
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/login" className="btn-secondary text-base px-8 py-3.5 flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 sm:gap-16">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-extrabold text-fg">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-32 lg:px-12 lg:pb-40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">Built for serious learners</h2>
            <p className="mt-3 text-muted max-w-xl mx-auto">
              Everything you need to find a partner, plan sessions, and track progress — all in
              one place.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="surface border border-border rounded-2xl p-7 space-y-4 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-border-strong group"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="text-muted leading-relaxed text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works steps */}
      <section className="relative z-10 px-6 pb-32 lg:px-12 lg:pb-40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">
              Three steps
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">From zero to skill swap</h2>
          </div>

          <div className="space-y-12">
            {[
              {
                step: '01',
                title: 'List your skills',
                desc: 'Tell us what you can teach and what you want to learn. Our AI creates embeddings for each skill to understand semantic relationships.',
              },
              {
                step: '02',
                title: 'Get matched',
                desc: 'Browse AI-curated suggestions with affinity scores. Send a swap request with a personal message to start a conversation.',
              },
              {
                step: '03',
                title: 'Learn together',
                desc: 'Schedule sessions, chat in real-time, track progress with checkpoints, and leave reviews to build your trust score.',
              },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-6 group">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center text-lg font-extrabold group-hover:bg-accent group-hover:text-white transition-colors">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="mt-1 text-muted leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 pb-32 lg:px-12 lg:pb-40">
        <div className="max-w-3xl mx-auto surface border border-border rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-purple-500/5" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold">Ready to start swapping?</h2>
            <p className="mt-3 text-muted max-w-md mx-auto">
              Join SkillBridge today and turn your knowledge into someone else&apos;s breakthrough.
            </p>
            <Link
              href="/register"
              className="btn-primary mt-8 inline-flex items-center gap-2 px-8 py-3.5 text-base"
            >
              Create your account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-8 lg:px-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">SkillBridge</span>
          </div>
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} SkillBridge. Built for learners, by learners.
          </p>
        </div>
      </footer>
    </div>
  );
}
