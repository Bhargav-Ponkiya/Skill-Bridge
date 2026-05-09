'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_ME,
  GET_MY_SESSIONS,
  GET_MY_MATCH_REQUESTS,
  GET_SUGGESTED_MATCHES,
} from '@/graphql/queries';
import { SEND_MATCH_REQUEST } from '@/graphql/mutations';
import { useAuthStore } from '@/store/authStore';
import { Sparkles, Plus, ArrowRight, Inbox, Loader2, Zap, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { DashboardSkeleton } from '@/components/Skeletons';
import { cn } from '@/lib/utils';

interface SuggestedMatch {
  id: string;
  score: number;
  reason: string;
  matchedWantSkillTitle?: string;
  skill: {
    id: string;
    title: string;
    description?: string | null;
    category?: string;
    user: { id: string; name: string; avatar?: string | null };
  };
  affinityBreakdown: {
    semanticScore: number;
    categoryScore: number;
    depthBoost: number;
  };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: meData, error: meError } = useQuery<any>(GET_ME);
  const { data: sessionsData, error: sessionsError } = useQuery<any>(GET_MY_SESSIONS);
  const { data: requestsData, error: requestsError } = useQuery<any>(GET_MY_MATCH_REQUESTS, { variables: { type: 'received' } });
  const { data: suggestedData, error: suggestedError, refetch: refetchSuggested } = useQuery<any>(GET_SUGGESTED_MATCHES);

  const myOfferSkills = useMemo(
    () => (meData?.me?.skills ?? []).filter((s: any) => s.type === 'OFFER' && s.isActive !== false),
    [meData],
  );
  const sessions = useMemo(
    () => (sessionsData?.mySessions ?? []).filter((s: any) =>
      ['NEGOTIATING', 'SCHEDULED', 'ACTIVE'].includes(s.status),
    ),
    [sessionsData],
  );
  const requests = useMemo(
    () => (requestsData?.myMatchRequests?.items ?? []).filter((r: any) => r.status === 'PENDING'),
    [requestsData],
  );
  const suggested = useMemo(
    () => (suggestedData?.suggestedMatches ?? []) as SuggestedMatch[],
    [suggestedData],
  );

  const [swap, setSwap] = useState<SuggestedMatch | null>(null);
  const [offeredSkillId, setOfferedSkillId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isGeneratingIcebreaker, setIsGeneratingIcebreaker] = useState(false);

  const generateIcebreaker = async () => {
    if (!swap) return;
    const mySkill = myOfferSkills.find((s: any) => s.id === offeredSkillId);
    if (!mySkill) {
      toast.info('Select a skill you teach first, then generate.');
      return;
    }
    setIsGeneratingIcebreaker(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT?.replace('/graphql', '') || 'http://localhost:3001';
      const res = await fetch(
        `${baseUrl}/ai/icebreaker?wanted=${encodeURIComponent(swap.skill.title)}&offered=${encodeURIComponent(mySkill.title)}&partner=${encodeURIComponent(swap.skill.user.name)}`,
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMessage(data.message);
    } catch {
      toast.error('Could not generate icebreaker. Try again.');
    } finally {
      setIsGeneratingIcebreaker(false);
    }
  };

  const [sendMatchRequest, { loading: sending }] = useMutation(SEND_MATCH_REQUEST, {
    onCompleted: () => {
      setSwap(null);
      setOfferedSkillId('');
      setMessage('');
      toast.success('Swap request sent!');
      refetchSuggested();
    },
    onError: (err) => toast.error(err.message),
  });

  const hasError = meError || sessionsError || requestsError || suggestedError;
  const isLoading = !sessionsData || !requestsData || !meData || !suggestedData;

  if (hasError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <p className="text-danger font-semibold">Something went wrong loading your dashboard.</p>
        <p className="text-sm text-muted">Please try refreshing the page.</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Refresh page
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const submitSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swap || !offeredSkillId) return;
    sendMatchRequest({
      variables: {
        input: {
          toUserId: swap.skill.user.id,
          wantedSkillId: swap.skill.id,
          offeredSkillId,
          message:
            message.trim() ||
            `Hi ${swap.skill.user.name}, I'd love to swap my skill for your "${swap.skill.title}".`,
        },
      },
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Hero */}
      <header className="surface rounded-2xl border p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-end justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Today on SkillBridge
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-fg tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-muted max-w-full lg:max-w-2xl">
              {requests.length > 0
                ? `You have ${requests.length} new match ${requests.length === 1 ? 'request' : 'requests'} waiting.`
                : `Browse curated matches below or open Explore to discover more skills.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore" className="btn-primary flex items-center gap-2">
              Open Explore <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/profile" className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add a skill
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
          <Stat label="Pending requests" value={requests.length} />
          <Stat label="Active sessions" value={sessions.length} />
          <Stat label="Skills you teach" value={myOfferSkills.length} />
          <Stat label="AI matches" value={suggested.length} />
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main feed */}
        <div className="xl:col-span-2 space-y-6">
          <Section
            title="AI-recommended matches"
            description="Ranked by semantic similarity to your 'Skills I want' list."
          >
            {suggested.length === 0 ? (
              <EmptyCard
                title="No recommendations yet"
                description="Add a 'Skill I want' on your profile so we can match you with experts."
                cta={{ href: '/profile', label: 'Add a wanted skill' }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggested.slice(0, 6).map((m) => (
                  <MatchSuggestionCard
                    key={m.id}
                    match={m}
                    canConnect={myOfferSkills.length > 0}
                    onConnect={() => setSwap(m)}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title="Ongoing sessions" action={{ href: '/matches', label: 'View all →' }}>
            {sessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map((session: any) => (
                  <Link
                    key={session.id}
                    href={`/session/${session.id}`}
                    className="surface border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="chip bg-accent-soft text-accent border-accent/20">{session.status}</span>
                      <MessageCircle className="w-4 h-4 text-muted" />
                    </div>
                    <p className="font-semibold text-fg">
                      {session.skill1?.title} ↔ {session.skill2?.title}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      with {session.participant1?.name} & {session.participant2?.name}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyCard
                title="No ongoing sessions"
                description="Sessions appear here when both sides accept a swap."
              />
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="surface border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-fg">Pending requests</h3>
              {requests.length > 0 && <span className="chip bg-warning/10 text-warning border-warning/20">{requests.length}</span>}
            </div>
            {requests.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted">
                <Inbox className="w-6 h-6 mx-auto mb-2 text-muted-2" />
                Nothing waiting on you.
              </div>
            ) : (
              <ul className="space-y-3">
                {requests.slice(0, 4).map((req: any) => (
                  <li key={req.id}>
                    <Link
                      href="/matches"
                      className="flex items-center gap-3 -mx-2 p-2 rounded-lg hover:bg-surface-2 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-brand-700 flex items-center justify-center text-white text-sm font-semibold">
                        {req.fromUser?.name?.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-fg truncate">{req.fromUser?.name}</p>
                        <p className="text-xs text-muted truncate">
                          {req.offeredSkill?.title} ↔ {req.wantedSkill?.title}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/matches"
              className="mt-4 block text-center text-sm font-semibold text-accent hover:underline"
            >
              View all matches →
            </Link>
          </div>

          <div className="surface border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-accent" />
              <h3 className="font-semibold text-fg">How matching works</h3>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Add what you teach and what you want to learn. We use Gemini embeddings to score offers
              against your goals — cosine similarity becomes your affinity score.
            </p>
            <Link href="/profile" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
              Tune your skills →
            </Link>
          </div>
        </aside>
      </div>

      {/* Swap modal */}
      <Modal
        open={!!swap}
        onClose={() => setSwap(null)}
        title="Propose a swap"
        description={
          swap
            ? `Pick which of your skills you'll teach in exchange for ${swap.skill.user.name}'s ${swap.skill.title}.`
            : ''
        }
      >
        {swap && (
          <form onSubmit={submitSwap} className="space-y-5">
            <div className="p-4 rounded-xl bg-accent-soft border border-accent/20">
              <p className="label-base">You want to learn</p>
              <p className="font-semibold text-fg mt-1">{swap.skill.title}</p>
              <p className="text-xs text-muted mt-1">From {swap.skill.user.name}</p>
            </div>

            <div className="space-y-2">
              <p className="label-base">What you'll teach in return</p>
              {myOfferSkills.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface-2 border border-dashed text-sm text-muted">
                  You don't have any "I teach" skills yet.{' '}
                  <Link href="/profile" className="font-semibold text-accent hover:underline">
                    Add one →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                  {myOfferSkills.map((skill: any) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => setOfferedSkillId(skill.id)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                        offeredSkillId === skill.id
                          ? 'border-accent bg-accent-soft'
                          : 'border-border hover:border-border-strong',
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold text-fg">{skill.title}</p>
                        <p className="text-xs text-muted">{skill.category} • {skill.proficiencyLevel}</p>
                      </div>
                      {offeredSkillId === skill.id && <Zap className="w-4 h-4 text-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="block space-y-2">
              <div className="flex items-center justify-between">
                <span className="label-base">Personal note (optional)</span>
                <button
                  type="button"
                  onClick={generateIcebreaker}
                  disabled={isGeneratingIcebreaker}
                  className="text-[10px] font-semibold text-accent hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  {isGeneratingIcebreaker ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Generate AI Icebreaker
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Why this swap interests you…"
                className="input-base"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setSwap(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!offeredSkillId || sending}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                Send swap request
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-fg">{value}</p>
      <p className="text-xs text-muted uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">{title}</h2>
          {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
        </div>
        {action && (
          <Link href={action.href} className="text-xs font-semibold text-accent hover:underline shrink-0">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyCard({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="surface border border-dashed rounded-2xl p-8 text-center space-y-3">
      <h3 className="font-semibold text-fg">{title}</h3>
      <p className="text-sm text-muted max-w-md mx-auto">{description}</p>
      {cta && (
        <Link href={cta.href} className="btn-primary inline-flex">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function MatchSuggestionCard({
  match,
  canConnect,
  onConnect,
}: {
  match: SuggestedMatch;
  canConnect: boolean;
  onConnect: () => void;
}) {
  const score = Math.round(match.score);
  const tone =
    score >= 85
      ? { bar: 'bg-success', text: 'text-success', label: 'Excellent match' }
      : score >= 70
        ? { bar: 'bg-accent', text: 'text-accent', label: 'Strong match' }
        : { bar: 'bg-warning', text: 'text-warning', label: 'Possible match' };

  return (
    <div className="surface border rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-fg truncate">{match.skill.title}</h3>
          <p className="text-xs text-muted">{match.skill.category}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn('text-lg font-bold tabular-nums', tone.text)}>{score}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted">affinity</p>
        </div>
      </div>

      <div className="h-1 rounded-full bg-surface-2 overflow-hidden mb-3 group/bar relative">
        <div className={cn('h-full transition-all', tone.bar)} style={{ width: `${Math.max(8, score)}%` }} />
        
        {/* Tooltip for breakdown */}
        <div className="absolute top-4 left-0 w-48 p-3 surface border shadow-xl rounded-xl opacity-0 hover:opacity-100 group-hover/bar:opacity-100 transition-opacity z-50 pointer-events-none">
          <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-2">Match Ingredients</p>
          <div className="space-y-2">
            <BreakdownRow label="Semantic fit" value={match.affinityBreakdown.semanticScore} weight="70%" />
            <BreakdownRow label="Category match" value={match.affinityBreakdown.categoryScore} weight="25%" />
            {match.affinityBreakdown.depthBoost > 0 && (
              <BreakdownRow label="In-depth boost" value={match.affinityBreakdown.depthBoost} weight="5%" />
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted line-clamp-2 mb-4 flex-1">{match.reason}</p>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <Link
          href={`/${encodeURIComponent(match.skill.user.name)}`}
          className="flex items-center gap-2 min-w-0 hover:opacity-80"
        >
          <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent to-brand-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {match.skill.user.name?.charAt(0).toUpperCase()}
          </span>
          <span className="text-xs font-medium text-fg-soft truncate">{match.skill.user.name}</span>
        </Link>
        <button
          type="button"
          onClick={onConnect}
          disabled={!canConnect}
          className="text-xs font-semibold text-accent hover:underline disabled:opacity-40 disabled:no-underline"
          title={canConnect ? 'Propose a swap' : 'Add a teachable skill first'}
        >
          Propose swap →
        </button>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] text-fg font-medium truncate">{label}</p>
        <p className="text-[9px] text-muted">{weight} weight</p>
      </div>
      <span className="text-[10px] font-bold text-accent tabular-nums">{Math.round(value)}</span>
    </div>
  );
}
