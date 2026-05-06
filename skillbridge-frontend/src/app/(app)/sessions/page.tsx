'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_SESSIONS } from '@/graphql/queries';
import { CHANGE_SESSION_STATUS, CANCEL_SESSION } from '@/graphql/mutations';
import { Briefcase, Loader2, Calendar, Clock, MessageCircle, ArrowRight, Play, Check, Star, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';

type Tab = 'all' | 'NEGOTIATING' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'REVIEWED' | 'CANCELLED';

const STATUS_CONFIG: Record<string, { tone: string; icon: React.ReactNode; description: string; nextAction?: { label: string; icon: React.ReactNode } }> = {
  NEGOTIATING: {
    tone: 'bg-warning/10 text-warning border-warning/20',
    icon: <Clock className="w-3.5 h-3.5" />,
    description: 'Planning details',
    nextAction: { label: 'Schedule', icon: <Calendar className="w-3.5 h-3.5" /> },
  },
  SCHEDULED: {
    tone: 'bg-accent-soft text-accent border-accent/20',
    icon: <Calendar className="w-3.5 h-3.5" />,
    description: 'Time set',
    nextAction: { label: 'Start session', icon: <Play className="w-3.5 h-3.5" /> },
  },
  ACTIVE: {
    tone: 'bg-success/10 text-success border-success/20',
    icon: <Play className="w-3.5 h-3.5" />,
    description: 'In progress',
    nextAction: { label: 'Complete', icon: <Check className="w-3.5 h-3.5" /> },
  },
  COMPLETED: {
    tone: 'bg-surface-2 text-fg-soft border-border',
    icon: <Check className="w-3.5 h-3.5" />,
    description: 'Finished',
    nextAction: { label: 'Leave review', icon: <Star className="w-3.5 h-3.5" /> },
  },
  REVIEWED: {
    tone: 'bg-surface-2 text-muted border-border',
    icon: <Star className="w-3.5 h-3.5" />,
    description: 'Reviewed',
  },
  CANCELLED: {
    tone: 'bg-danger/10 text-danger border-danger/20',
    icon: <X className="w-3.5 h-3.5" />,
    description: 'Cancelled',
  },
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'NEGOTIATING', label: 'Negotiating' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'REVIEWED', label: 'Reviewed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function SessionsPage() {
  const { data, loading, refetch } = useQuery<any>(GET_MY_SESSIONS, {
    fetchPolicy: 'cache-and-network',
  });

  const [tab, setTab] = useState<Tab>('all');
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');

  const allSessions = data?.mySessions ?? [];
  const filtered = tab === 'all' ? allSessions : allSessions.filter((s: any) => s.status === tab);

  const counts = useMemo(() => {
    return TABS.reduce((acc, t) => {
      acc[t.key] = t.key === 'all' ? allSessions.length : allSessions.filter((s: any) => s.status === t.key).length;
      return acc;
    }, {} as Record<Tab, number>);
  }, [allSessions]);

  const activeCount = counts.NEGOTIATING + counts.SCHEDULED + counts.ACTIVE;
  const completedCount = counts.COMPLETED + counts.REVIEWED;

  const [changeStatus, { loading: changingStatus }] = useMutation(CHANGE_SESSION_STATUS, {
    onCompleted: () => {
      refetch();
      toast.success('Session status updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const [cancelSession, { loading: cancelling }] = useMutation(CANCEL_SESSION, {
    onCompleted: () => {
      setCancelTarget(null);
      setCancelReason('');
      refetch();
      toast.success('Session cancelled');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Sessions
          </p>
          <h1 className="text-3xl font-bold text-fg mt-1">Your skill exchanges</h1>
          <p className="text-muted mt-1">Track and manage all your active and past sessions.</p>
        </div>

        <div className="flex gap-3">
          <StatCard label="Active" value={activeCount} color="accent" />
          <StatCard label="Completed" value={completedCount} color="muted" />
        </div>
      </header>

      <div className="flex bg-surface-2 p-1 rounded-xl border border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap',
              tab === t.key ? 'bg-surface text-fg shadow-sm border border-border' : 'text-muted hover:text-fg',
            )}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className="text-[10px] font-bold text-muted-2">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {loading && filtered.length === 0 ? (
        <div className="surface border rounded-2xl p-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface border border-dashed rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-fg">
            {tab === 'all' ? 'No sessions yet' : `No ${tab.toLowerCase()} sessions`}
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            {tab === 'all'
              ? 'Accept a match request to start your first session.'
              : `Sessions in ${tab.toLowerCase()} status will appear here.`}
          </p>
          <Link href="/matches" className="btn-primary inline-flex">
            View match requests
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((session: any) => (
            <SessionCard
              key={session.id}
              session={session}
              onAdvance={() => changeStatus({ variables: { id: session.id, status: getNextStatus(session.status) } })}
              onCancel={() => setCancelTarget(session)}
              changingStatus={changingStatus}
              cancelling={cancelling}
            />
          ))}
        </div>
      )}

      <Modal open={!!cancelTarget} onClose={() => { setCancelTarget(null); setCancelReason(''); }} title="Cancel session" description="This will notify your partner and cannot be undone.">
        {cancelTarget && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-danger/5 border border-danger/20">
              <p className="font-semibold text-fg">{cancelTarget.skill1?.title} ↔ {cancelTarget.skill2?.title}</p>
              <p className="text-xs text-muted mt-1">With {getPartnerName(cancelTarget)}</p>
            </div>
            <label className="block space-y-2">
              <span className="label-base">Reason (optional)</span>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Why are you cancelling?"
                className="input-base"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setCancelTarget(null); setCancelReason(''); }} className="btn-secondary">
                Back
              </button>
              <button
                type="button"
                onClick={() => cancelSession({ variables: { id: cancelTarget.id, reason: cancelReason } })}
                disabled={cancelling}
                className="bg-danger/10 text-danger border border-danger/20 px-5 py-2.5 rounded-xl font-semibold transition-all hover:opacity-90 hover:shadow-lg active:scale-95 flex items-center gap-2"
              >
                {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel session
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SessionCard({ session, onAdvance, onCancel, changingStatus, cancelling }: { session: any; onAdvance: () => void; onCancel: () => void; changingStatus: boolean; cancelling: boolean }) {
  const config = STATUS_CONFIG[session.status] || STATUS_CONFIG.NEGOTIATING;
  const partnerName = getPartnerName(session);
  const canCancel = ['NEGOTIATING', 'SCHEDULED'].includes(session.status);
  const hasAction = config.nextAction && !['COMPLETED', 'REVIEWED', 'CANCELLED'].includes(session.status);

  return (
    <div className="surface border rounded-2xl p-5 flex flex-col group">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-fg truncate">
            {session.skill1?.title} ↔ {session.skill2?.title}
          </p>
          <p className="text-xs text-muted mt-0.5">
            with {partnerName}
          </p>
        </div>
        <span className={cn('chip border shrink-0 flex items-center gap-1', config.tone)}>
          {config.icon}
          {session.status}
        </span>
      </header>

      <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted">
        {session.scheduledAt && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(session.scheduledAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        )}
        {session.duration && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {session.duration} min
          </span>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
        <Link
          href={`/session/${session.id}`}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Chat & details
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <div className="flex items-center gap-2">
          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="text-xs text-muted hover:text-danger transition-colors flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              Cancel
            </button>
          )}
          {hasAction && (
            <button
              type="button"
              onClick={onAdvance}
              disabled={changingStatus}
              className="btn-primary !py-1 !px-3 !text-xs flex items-center gap-1.5"
            >
              {changingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : config.nextAction!.icon}
              {config.nextAction!.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="surface border rounded-xl px-4 py-2 text-center">
      <p className={cn('text-xl font-bold', color === 'accent' ? 'text-accent' : 'text-fg')}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

function getPartnerName(session: any): string {
  // We don't know the current user's ID here, so show both
  if (session.participant1?.name && session.participant2?.name) {
    return session.participant1.name === session.participant2.name
      ? session.participant1.name
      : `${session.participant1.name} & ${session.participant2.name}`;
  }
  return 'Unknown';
}

function getNextStatus(current: string): string {
  switch (current) {
    case 'NEGOTIATING': return 'SCHEDULED';
    case 'SCHEDULED': return 'ACTIVE';
    case 'ACTIVE': return 'COMPLETED';
    default: return current;
  }
}
