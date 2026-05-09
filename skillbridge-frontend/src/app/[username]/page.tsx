'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import {
  GET_USER_BY_USERNAME,
  GET_USER_REVIEWS,
  GET_USER_STATS,
} from '@/graphql/queries';
import {
  Shield,
  ArrowLeft,
  Loader2,
  Sparkles,
  Star,
  Award,
  TrendingUp,
} from 'lucide-react';
import { SkillCard, type SkillCardSkill } from '@/components/SkillCard';
import { cn } from '@/lib/utils';

interface Params {
  params: Promise<{ username: string }>;
}

export default function PublicProfilePage(props: Params) {
  const params = use(props.params);
  const identifier = decodeURIComponent(params.username);

  const { data, loading, error } = useQuery<any>(GET_USER_BY_USERNAME, {
    variables: { identifier },
  });

  const user = data?.userByUsername;

  const { data: statsData } = useQuery<any>(GET_USER_STATS, {
    variables: { userId: user?.id ?? '' },
    skip: !user?.id,
  });
  const { data: reviewsData } = useQuery<any>(GET_USER_REVIEWS, {
    variables: { userId: user?.id ?? '' },
    skip: !user?.id,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-fg">User not found</h1>
        <p className="text-muted max-w-md">
          We couldn't find a SkillBridge member matching <span className="font-mono">{identifier}</span>.
        </p>
        <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const skills: SkillCardSkill[] = user.skills ?? [];
  const offered = skills.filter((s) => s.type === 'OFFER');
  const wanted = skills.filter((s) => s.type === 'WANT');
  const stats = statsData?.userStats;
  const reviews = reviewsData?.userReviews ?? [];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-fg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        <header className="surface rounded-2xl border p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-brand-700 flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-lg">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-fg break-words">{user.name}</h1>
                {user.isVerified && (
                  <span className="chip text-success border-success/20 bg-success/10">
                    <Shield className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
                {stats && stats.trustScore >= 60 && (
                  <span className="chip text-accent border-accent/20 bg-accent-soft">
                    <Award className="w-3.5 h-3.5" /> Trusted
                  </span>
                )}
              </div>
              <p className="text-sm text-muted">
                Joined{' '}
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {user.bio && (
                <p className="text-sm text-fg-soft mt-3 max-w-2xl leading-relaxed">{user.bio}</p>
              )}
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-border">
              <Stat label="Trust score" value={`${stats.trustScore}`} icon={TrendingUp} accent />
              <Stat
                label="Avg rating"
                value={stats.reviewCount === 0 ? '—' : stats.averageRating.toFixed(1)}
                suffix={stats.reviewCount > 0 ? <Star className="inline w-4 h-4 text-warning fill-warning" /> : undefined}
              />
              <Stat label="Reviews" value={stats.reviewCount} />
              <Stat label="Sessions done" value={stats.sessionsCompleted} />
              <Stat label="Portfolio items" value={stats.portfolioCount} />
            </div>
          )}
        </header>

        <SkillSection title="Teaches" skills={offered} />
        <SkillSection title="Wants to learn" skills={wanted} />

        {reviews.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-fg mb-3 flex items-center justify-between">
              Recent reviews
              <span className="text-sm font-medium text-muted">{reviews.length}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.slice(0, 6).map((r: any) => (
                <article key={r.id} className="surface border rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-brand-700 flex items-center justify-center text-white text-xs font-semibold">
                        {r.reviewer?.name?.charAt(0)?.toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-fg">{r.reviewer?.name}</span>
                    </div>
                    <span className="flex items-center gap-0.5 text-warning text-xs font-bold">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn('w-3.5 h-3.5', i < r.rating ? 'fill-warning' : 'text-muted-2')}
                        />
                      ))}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-fg-soft leading-relaxed">"{r.comment}"</p>
                  )}
                  <p className="text-[11px] text-muted-2">
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="surface rounded-2xl border p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-fg">Want to swap with {user.name?.split(' ')[0]}?</p>
            <p className="text-sm text-muted">Head to Explore and propose a skill exchange.</p>
          </div>
          <Link href="/explore" className="btn-primary shrink-0">
            Open Explore
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  suffix?: React.ReactNode;
  accent?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <p className={cn('text-2xl font-bold', accent ? 'text-accent' : 'text-fg')}>{value}</p>
        {suffix}
      </div>
      <p className="text-xs text-muted uppercase tracking-wider mt-0.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
    </div>
  );
}

function SkillSection({ title, skills }: { title: string; skills: SkillCardSkill[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-fg mb-3 flex items-center justify-between">
        {title}
        <span className="text-sm font-medium text-muted">{skills.length}</span>
      </h2>
      {skills.length === 0 ? (
        <div className="surface border border-dashed rounded-2xl p-6 text-center">
          <p className="text-sm text-muted">Nothing listed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((s) => (
            <SkillCard key={s.id} skill={s} variant="public" />
          ))}
        </div>
      )}
    </section>
  );
}
