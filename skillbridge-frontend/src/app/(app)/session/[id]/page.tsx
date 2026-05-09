'use client';

import { use, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useSubscription } from '@apollo/client/react';
import {
  GET_SESSION,
  GET_ME,
  GET_USER_REVIEWS,
} from '@/graphql/queries';
import { SESSION_UPDATED_SUBSCRIPTION } from '@/graphql/subscriptions';
import { ChatWindow } from '@/components/ChatWindow';
import { SummaryPanel } from '@/components/SummaryPanel';
import { VideoRoom } from '@/components/VideoRoom';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  ArrowLeftRight,
  Video,
  MessageSquare as Chat,
  Award,
  Star,
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { StatusLadder } from './components/StatusLadder';
import { ExchangeSide } from './components/ExchangeSide';
import { ScheduleCard } from './components/ScheduleCard';
import { ActionRow } from './components/ActionRow';

const STATUS_TONE: Record<string, string> = {
  NEGOTIATING: 'bg-warning/10 text-warning border-warning/20',
  SCHEDULED: 'bg-accent-soft text-accent border-accent/20',
  ACTIVE: 'bg-success/10 text-success border-success/20',
  COMPLETED: 'bg-surface-2 text-fg-soft border-border',
  REVIEWED: 'bg-surface-2 text-muted border-border',
  CANCELLED: 'bg-danger/10 text-danger border-danger/20',
};

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default function SessionPage(props: SessionPageProps) {
  const { id } = use(props.params);
  const [showVideo, setShowVideo] = useState(false);
  const [takeawayNotes, setTakeawayNotes] = useState('');
  const [takeawayResult, setTakeawayResult] = useState('');
  const [isGeneratingTakeaways, setIsGeneratingTakeaways] = useState(false);
  const takeawayEsRef = useRef<EventSource | null>(null);

  const { data, loading, error, refetch } = useQuery<any>(GET_SESSION, { variables: { id } });
  const { data: meData } = useQuery<any>(GET_ME);
  const session = data?.session;
  const me = meData?.me;

  useEffect(() => {
    return () => {
      if (takeawayEsRef.current) {
        takeawayEsRef.current.close();
        takeawayEsRef.current = null;
      }
    };
  }, [id]);

  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => refetch(), 400);
  }, [refetch]);

  // Live updates: when the partner flips status, marks complete, or edits logistics, the
  // backend pushes a `sessionUpdated` event. We refetch to get the full ResolveField graph.
  useSubscription(SESSION_UPDATED_SUBSCRIPTION, {
    variables: { sessionId: id },
    onData: () => debouncedRefetch(),
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-12 h-12 mx-auto rounded-xl bg-danger/10 text-danger flex items-center justify-center">
          <Loader2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Failed to load session</h1>
        <p className="text-sm text-muted">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => refetch()} className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Try again
          </button>
          <Link href="/dashboard" className="btn-secondary inline-flex items-center gap-2">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <h1 className="text-2xl font-bold">Session not found</h1>
        <p className="text-sm text-muted">This session does not exist or has been removed.</p>
        <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const isP1 = session.participant1Id === me?.id;
  const partner = isP1 ? session.participant2 : session.participant1;
  const partnerId = isP1 ? session.participant2Id : session.participant1Id;

  // skill1 = sender's offered skill, skill2 = sender's wanted skill (= responder's teach)
  // I (whichever side) teach the skill that's "mine" in this exchange.
  const myTeachSkill = isP1 ? session.skill1 : session.skill2;
  const partnerTeachSkill = isP1 ? session.skill2 : session.skill1;
  const myCompletion = isP1 ? session.p1Completed : session.p2Completed;
  const partnerCompletion = isP1 ? session.p2Completed : session.p1Completed;

  const isLocked = ['ACTIVE', 'COMPLETED', 'REVIEWED', 'CANCELLED'].includes(session.status);
  const isReviewable = session.status === 'COMPLETED' || session.status === 'REVIEWED';

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      <div>
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to matches
        </Link>
      </div>

      {/* Header */}
      <header className="surface border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Skill exchange
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-fg mt-1 break-words">
            {session.skill1?.title} ↔ {session.skill2?.title}
          </h1>
          <p className="text-sm text-muted mt-1">
            {session.participant1?.name} & {session.participant2?.name}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('chip border', STATUS_TONE[session.status] || 'bg-surface-2')}>
            {session.status}
          </span>
          {session.scheduledAt && (
            <span className="chip">
              <Calendar className="w-3 h-3" />{' '}
              {new Date(session.scheduledAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
          {session.duration && (
            <span className="chip">
              <Clock className="w-3 h-3" /> {session.duration} min
            </span>
          )}
        </div>
      </header>

      <StatusLadder status={session.status} />

      {/* Two-sided exchange overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExchangeSide
            sessionId={id}
            label="You teach"
            skill={myTeachSkill}
            person={isP1 ? session.participant1 : session.participant2}
            completed={myCompletion}
            canToggle={!isLocked && (session.status === 'SCHEDULED' || session.status === 'ACTIVE')}
            onToggled={() => debouncedRefetch()}
            isMine
          />
        <ExchangeSide
          sessionId={id}
          label="You learn"
          skill={partnerTeachSkill}
          person={partner}
          completed={partnerCompletion}
          canToggle={false}
          partnerName={partner?.name}
        />
      </div>

      <ScheduleCard
        session={session}
        onSaved={() => debouncedRefetch()}
        isLocked={isLocked}
        partnerName={partner?.name}
        skill1Title={session.skill1?.title}
        skill2Title={session.skill2?.title}
      />

      <ActionRow
        session={session}
        myId={me?.id}
        onRefetch={debouncedRefetch}
        myTeachSkill={myTeachSkill}
        partnerTeachSkill={partnerTeachSkill}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Chat</h2>
            {session.status === 'ACTIVE' && !showVideo && (
              <button
                onClick={() => setShowVideo(true)}
                className="btn-primary !py-1.5 !px-3 flex items-center gap-1.5 text-xs"
              >
                <Video className="w-3.5 h-3.5" /> Join Video Session
              </button>
            )}
            {showVideo && (
              <button
                onClick={() => setShowVideo(false)}
                className="btn-secondary !py-1.5 !px-3 flex items-center gap-1.5 text-xs"
              >
                <Chat className="w-3.5 h-3.5" /> Back to Chat
              </button>
            )}
          </div>
          {showVideo ? (
            <VideoRoom sessionId={id} userName={me?.name} />
          ) : (
            <ChatWindow sessionId={id} />
          )}
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Summary & review
          </h2>
          <SummaryPanel
            sessionId={id}
            sessionStatus={session.status}
            partnerId={partnerId}
            partnerName={partner?.name}
            isReviewable={isReviewable}
            myId={me?.id}
            onReviewed={() => debouncedRefetch()}
          />
        </div>
      </div>

      {partnerId && <PartnerReputation userId={partnerId} name={partner?.name} />}

      {/* AI Takeaways - COMPLETED sessions */}
      {session.status === 'COMPLETED' && (
        <section className="surface border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-fg">AI Post-Session Takeaways</h2>
              <p className="text-xs text-muted">Drop your rough notes and get a polished summary.</p>
            </div>
          </div>

          {!takeawayResult ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!takeawayNotes.trim()) return;

                  if (takeawayEsRef.current) {
                    takeawayEsRef.current.close();
                    takeawayEsRef.current = null;
                  }

                  setIsGeneratingTakeaways(true);
                  setTakeawayResult('');

                  const url = `${process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT?.replace('/graphql', '') || 'http://localhost:3001'}/ai/session/${id}/takeaways/stream?notes=${encodeURIComponent(takeawayNotes)}`;

                  try {
                    takeawayEsRef.current = new EventSource(url);
                  } catch {
                    setIsGeneratingTakeaways(false);
                    toast.error('Failed to connect. Please try again.');
                    return;
                  }

                  takeawayEsRef.current.onmessage = (event) => {
                    if (event.data === '[DONE]') {
                      takeawayEsRef.current?.close();
                      takeawayEsRef.current = null;
                      setIsGeneratingTakeaways(false);
                      return;
                    }
                    setTakeawayResult((prev) => prev + event.data);
                  };

                  takeawayEsRef.current.onerror = () => {
                    if (!takeawayEsRef.current) return;
                    if (takeawayEsRef.current.readyState === 0) return;
                    takeawayEsRef.current.close();
                    takeawayEsRef.current = null;
                    setIsGeneratingTakeaways(false);
                    if (!takeawayResult) {
                      toast.error('Failed to generate takeaways. Please try again.');
                    }
                  };
                }}
              className="space-y-3"
            >
              <textarea
                value={takeawayNotes}
                onChange={(e) => setTakeawayNotes(e.target.value)}
                placeholder="Jot down what you learned, what worked, what didn't…"
                className="input-base min-h-[120px] resize-y"
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={!takeawayNotes.trim()}
                className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Generate Takeaways
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="prose prose-sm dark:prose-invert max-w-none text-fg-soft leading-relaxed bg-surface-2 rounded-xl p-4">
                <ReactMarkdown>{takeawayResult}</ReactMarkdown>
              </div>
              <button
                onClick={() => {
                  setTakeawayResult('');
                  setTakeawayNotes('');
                }}
                className="btn-secondary w-full text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {isGeneratingTakeaways && (
            <div className="flex items-center justify-center py-4 text-center space-y-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <p className="text-sm text-muted">AI is polishing your notes…</p>
            </div>
          )}
        </section>
      )}

      {/* AI Roadmap & Resources - Only show when completed */}
      {session.status === 'COMPLETED' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="surface border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-fg">AI Learning Roadmap</h2>
                <p className="text-xs text-muted">What to focus on next based on this exchange.</p>
              </div>
            </div>
            {session.roadmap ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-fg-soft leading-relaxed">
                <ReactMarkdown>{session.roadmap}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <p className="text-sm font-medium text-fg">Generating your personalized roadmap...</p>
                <p className="text-xs text-muted max-w-[200px]">Our AI is analyzing the exchange to map your next steps.</p>
              </div>
            )}
          </section>

          <section className="surface border rounded-2xl p-6 space-y-4">
             <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
                <LinkIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-fg">Recommended Resources</h2>
                <p className="text-xs text-muted">Top picks to help you master these skills.</p>
              </div>
            </div>
            {session.suggestedResources ? (
              <div className="space-y-4">
                {(() => {
                  let parsed = session.suggestedResources;
                  if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
                  }
                  if (!parsed || typeof parsed !== 'object') return null;
                  return Object.entries(parsed).map(([skill, resources]: [string, any]) => (
                  <div key={skill} className="space-y-2">
                    <p className="text-xs font-bold text-muted uppercase tracking-wider">{skill}</p>
                    <div className="space-y-2">
                       {resources.map((res: any, i: number) => (
                         <a
                           key={i}
                           href={res.url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="block p-3 rounded-xl border bg-surface-2 hover:border-accent group transition-all"
                         >
                           <div className="flex items-center justify-between mb-1">
                             <p className="text-sm font-semibold text-fg group-hover:text-accent transition-colors">{res.title}</p>
                             <ExternalLink className="w-3 h-3 text-muted" />
                           </div>
                           <p className="text-xs text-muted line-clamp-1">{res.description}</p>
                         </a>
                       ))}
                    </div>
                  </div>
                ));})()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <p className="text-sm font-medium text-fg">Finding relevant resources...</p>
                <p className="text-xs text-muted max-w-[200px]">AI is working its magic in the background. This usually takes 5-10 seconds.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function PartnerReputation({ userId, name }: { userId: string; name?: string }) {
  const { data } = useQuery<any>(GET_USER_REVIEWS, { variables: { userId } });
  const reviews = data?.userReviews ?? [];
  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    return (
      reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length
    );
  }, [reviews]);

  if (!reviews.length) return null;

  return (
    <div className="surface border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-fg">{name?.split(' ')[0]}'s reputation</h3>
        </div>
        <div className="flex items-center gap-1 text-warning text-sm font-bold">
          <Star className="w-4 h-4 fill-warning" /> {avg.toFixed(1)}
          <span className="text-muted font-normal text-xs">({reviews.length})</span>
        </div>
      </div>
      <ul className="space-y-3 max-h-48 overflow-y-auto">
        {reviews.slice(0, 4).map((r: any) => (
          <li key={r.id} className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-fg">{r.reviewer?.name}</span>
              <span className="flex items-center gap-0.5 text-warning">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-3 h-3',
                      i < r.rating ? 'fill-warning' : 'text-muted-2',
                    )}
                  />
                ))}
              </span>
            </div>
            {r.comment && <p className="text-muted leading-relaxed">"{r.comment}"</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

