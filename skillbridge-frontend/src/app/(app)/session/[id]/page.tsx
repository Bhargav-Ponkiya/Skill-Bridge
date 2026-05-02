'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import {
  GET_SESSION,
  GET_ME,
  GET_USER_REVIEWS,
} from '@/graphql/queries';
import {
  UPDATE_SESSION,
  CHANGE_SESSION_STATUS,
  TOGGLE_SESSION_PROGRESS,
} from '@/graphql/mutations';
import { SESSION_UPDATED_SUBSCRIPTION } from '@/graphql/subscriptions';
import { overlappingSlots, formatSlot } from '@/components/AvailabilityEditor';
import { ChatWindow } from '@/components/ChatWindow';
import { SummaryPanel } from '@/components/SummaryPanel';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Video,
  MessageSquare as Chat,
  MapPin,
  Link as LinkIcon,
  Award,
  Play,
  Star,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const STATUS_TONE: Record<string, string> = {
  NEGOTIATING: 'bg-warning/10 text-warning border-warning/20',
  SCHEDULED: 'bg-accent-soft text-accent border-accent/20',
  ACTIVE: 'bg-success/10 text-success border-success/20',
  COMPLETED: 'bg-surface-2 text-fg-soft border-border',
  REVIEWED: 'bg-surface-2 text-muted border-border',
};

const STATUSES = ['NEGOTIATING', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'REVIEWED'] as const;

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default function SessionPage(props: SessionPageProps) {
  const { id } = use(props.params);

  const { data, loading, refetch } = useQuery<any>(GET_SESSION, { variables: { id } });
  const { data: meData } = useQuery<any>(GET_ME);
  const session = data?.session;
  const me = meData?.me;

  // Live updates: when the partner flips status, marks complete, or edits logistics, the
  // backend pushes a `sessionUpdated` event. We refetch to get the full ResolveField graph.
  useSubscription(SESSION_UPDATED_SUBSCRIPTION, {
    variables: { sessionId: id },
    onData: () => refetch(),
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <h1 className="text-2xl font-bold">Session not found</h1>
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

  const isLocked = session.status === 'COMPLETED' || session.status === 'REVIEWED';
  const isReviewable = session.status === 'COMPLETED' || session.status === 'REVIEWED';

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
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
          <h1 className="text-2xl font-bold text-fg mt-1 truncate">
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
          onToggled={() => refetch()}
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

      <ScheduleCard session={session} onSaved={() => refetch()} isLocked={isLocked} />

      <ActionRow session={session} myId={me?.id} onRefetch={refetch} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Chat</h2>
          <ChatWindow sessionId={id} />
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
            onReviewed={() => refetch()}
          />
        </div>
      </div>

      {partnerId && <PartnerReputation userId={partnerId} name={partner?.name} />}

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
                {Object.entries(
                  typeof session.suggestedResources === 'string'
                    ? JSON.parse(session.suggestedResources)
                    : session.suggestedResources
                ).map(([skill, resources]: [string, any]) => (
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
                ))}
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

function StatusLadder({ status }: { status: string }) {
  const idx = STATUSES.indexOf(status as any);
  return (
    <div className="surface border rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        {STATUSES.map((s, i) => {
          const reached = i <= idx;
          const current = i === idx;
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
                  reached ? 'bg-accent text-white' : 'bg-surface-2 text-muted-2 border border-border',
                  current && 'ring-2 ring-accent/30',
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium uppercase tracking-wider hidden sm:block',
                  reached ? 'text-fg' : 'text-muted-2',
                )}
              >
                {s}
              </span>
              {i < STATUSES.length - 1 && (
                <div
                  className={cn('flex-1 h-0.5 rounded-full', reached ? 'bg-accent/40' : 'bg-border')}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExchangeSide({
  sessionId,
  label,
  skill,
  person,
  completed,
  canToggle,
  onToggled,
  isMine,
  partnerName,
}: {
  sessionId: string;
  label: string;
  skill: any;
  person: any;
  completed: boolean;
  canToggle: boolean;
  onToggled?: () => void;
  isMine?: boolean;
  partnerName?: string;
}) {
  const [toggle, { loading }] = useMutation(TOGGLE_SESSION_PROGRESS, {
    onCompleted: () => onToggled?.(),
    onError: (err) => toast.error(err.message),
  });
  return (
    <div
      className={cn(
        'surface border rounded-2xl p-5 transition-all',
        completed && 'border-success/40 bg-success/5',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">{label}</p>
          <h3 className="font-semibold text-fg mt-0.5 truncate">{skill?.title}</h3>
          {skill?.category && <p className="text-xs text-muted mt-0.5">{skill.category}</p>}
        </div>
        <span
          className={cn(
            'chip shrink-0 border',
            completed ? 'bg-success/10 text-success border-success/20' : 'bg-surface-2',
          )}
        >
          {completed ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {completed ? 'Delivered' : 'Pending'}
        </span>
      </div>
      {skill?.description && (
        <p className="text-sm text-muted line-clamp-2 mb-3">{skill.description}</p>
      )}
      {skill?.portfolios && skill.portfolios.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {skill.portfolios.map((p: any) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="chip hover:bg-surface-3 transition-colors"
              title={p.title}
            >
              <LinkIcon className="w-3 h-3" /> {p.type}
            </a>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-brand-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {person?.name?.charAt(0)?.toUpperCase()}
          </span>
          <span className="text-xs font-medium text-fg-soft truncate">
            {isMine ? 'You' : person?.name}
          </span>
        </div>
        {isMine && canToggle ? (
          <button
            onClick={() => toggle({ variables: { id: sessionId } })}
            disabled={loading}
            className={cn(
              'text-xs font-semibold transition-colors flex items-center gap-1.5',
              completed ? 'text-warning hover:underline' : 'text-success hover:underline',
            )}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : completed ? (
              <>Undo mark</>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as taught
              </>
            )}
          </button>
        ) : !isMine ? (
          <span className="text-xs text-muted">
            {completed
              ? `${partnerName?.split(' ')[0]} completed`
              : `Awaiting ${partnerName?.split(' ')[0] ?? 'partner'}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ScheduleCard({
  session,
  onSaved,
  isLocked,
}: {
  session: any;
  onSaved: () => void;
  isLocked: boolean;
}) {
  const [scheduledAt, setScheduledAt] = useState<string>(
    session.scheduledAt ? toLocalInput(session.scheduledAt) : '',
  );
  const [duration, setDuration] = useState<number>(session.duration ?? 60);
  const [format, setFormat] = useState<string>(session.format ?? 'VIDEO');
  const [meetingLink, setMeetingLink] = useState<string>(session.meetingLink ?? '');

  const [updateSession, { loading }] = useMutation(UPDATE_SESSION, {
    onCompleted: onSaved,
    onError: (err) => toast.error(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      toast.error('Please pick a date and time for the session.');
      return;
    }
    if (!duration || duration < 15) {
      toast.error('Session duration must be at least 15 minutes.');
      return;
    }
    if (format === 'VIDEO' && !meetingLink) {
      toast.error('Please provide a meeting link for the video call.');
      return;
    }

    updateSession({
      variables: {
        id: session.id,
        input: {
          scheduledAt: new Date(scheduledAt).toISOString(),
          duration: Number(duration),
          format,
          meetingLink: meetingLink.trim() || undefined,
        },
      },
    });
  };

  const overlap = overlappingSlots(
    session.participant1?.availability ?? [],
    session.participant2?.availability ?? [],
  );

  return (
    <div className="surface border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-fg">Logistics</h3>
          <p className="text-[11px] text-muted">Pick a time and a format you both can attend.</p>
        </div>
      </div>
      {overlap.length > 0 && (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent-soft/40 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">
            You're both free during
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overlap.slice(0, 8).map((s, i) => (
              <span
                key={i}
                className="text-xs font-medium text-fg bg-surface border border-border rounded-md px-2 py-0.5"
              >
                {formatSlot(s)}
              </span>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block">
          <span className="label-base">When</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={isLocked}
            className="input-base mt-2"
          />
        </label>
        <label className="block">
          <span className="label-base">Duration (min)</span>
          <input
            type="number"
            min={15}
            max={240}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isLocked}
            className="input-base mt-2"
          />
        </label>
        <label className="block">
          <span className="label-base">Format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={isLocked}
            className="input-base mt-2 appearance-none"
          >
            <option value="VIDEO">Video call</option>
            <option value="TEXT">Text-only</option>
            <option value="IN_PERSON">In-person</option>
          </select>
        </label>
        <label className="block">
          <span className="label-base">Meeting link</span>
          <input
            type="url"
            placeholder="https://meet.google.com/…"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            disabled={isLocked}
            className="input-base mt-2"
          />
        </label>
        <div className="md:col-span-2 lg:col-span-4 flex items-center justify-between pt-2">
          <p className="text-xs text-muted flex items-center gap-1.5">
            {format === 'VIDEO' ? (
              <Video className="w-3.5 h-3.5" />
            ) : format === 'TEXT' ? (
              <Chat className="w-3.5 h-3.5" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            {meetingLink ? (
              <a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Join link <ExternalLink className="inline w-3 h-3" />
              </a>
            ) : (
              'No meeting link yet'
            )}
          </p>
          <button
            type="submit"
            disabled={loading || isLocked}
            className="btn-primary !py-2 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save logistics
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionRow({
  session,
  myId,
  onRefetch,
}: {
  session: any;
  myId?: string;
  onRefetch: () => void;
}) {
  const [changeStatus, { loading }] = useMutation(CHANGE_SESSION_STATUS, {
    onCompleted: () => onRefetch(),
    onError: (err) => toast.error(err.message),
  });
  const [toggleProgress, { loading: toggling }] = useMutation(TOGGLE_SESSION_PROGRESS, {
    onCompleted: () => onRefetch(),
    onError: (err) => toast.error(err.message),
  });

  const isP1 = session.participant1Id === myId;
  const myCompletion = isP1 ? session.p1Completed : session.p2Completed;

  return (
    <div className="surface border rounded-2xl p-5 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
        <div>
          <p className="text-sm font-semibold text-fg">Exchange controls</p>
          <p className="text-xs text-muted">
            Coordinate via chat, then mark each side complete when teaching is done.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {session.status === 'NEGOTIATING' && session.scheduledAt && session.format && (
          <button
            onClick={() => changeStatus({ variables: { id: session.id, status: 'SCHEDULED' } })}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 !py-2"
          >
            <Calendar className="w-3.5 h-3.5" /> Confirm schedule
          </button>
        )}
        {session.status === 'SCHEDULED' && (
          <button
            onClick={() => changeStatus({ variables: { id: session.id, status: 'ACTIVE' } })}
            disabled={loading}
            className="btn-primary flex items-center gap-1.5 !py-2"
          >
            <Play className="w-3.5 h-3.5" /> Start session
          </button>
        )}
        {(session.status === 'SCHEDULED' || session.status === 'ACTIVE') && (
          <button
            onClick={() => toggleProgress({ variables: { id: session.id } })}
            disabled={toggling}
            className={cn(
              'btn-secondary !py-2 flex items-center gap-1.5',
              myCompletion && 'border-success/40 text-success',
            )}
          >
            {toggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {myCompletion ? 'Undo my completion' : 'Mark my part complete'}
          </button>
        )}
      </div>
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

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
