'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { GET_MY_MATCH_REQUESTS, GET_MY_SESSIONS, GET_ME } from '@/graphql/queries';
import { RESPOND_TO_MATCH_REQUEST } from '@/graphql/mutations';
import { MATCH_REQUEST_UPDATED_SUBSCRIPTION } from '@/graphql/subscriptions';
import { Inbox, Send, Loader2, ArrowRight, Check, X, ExternalLink, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'received' | 'sent';

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  ACCEPTED: 'bg-success/10 text-success border-success/20',
  DECLINED: 'bg-danger/10 text-danger border-danger/20',
};

export default function MatchesPage() {
  const [tab, setTab] = useState<Tab>('received');
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  const { data, loading, refetch } = useQuery<any>(GET_MY_MATCH_REQUESTS, {
    variables: { type: tab, pagination: { page, limit: LIMIT } },
    fetchPolicy: 'cache-and-network',
  });

  const { data: meData } = useQuery<any>(GET_ME);
  const myId = meData?.me?.id;

  // Live: refetch the inbox the moment any of our requests get responded to or arrive new.
  useSubscription(MATCH_REQUEST_UPDATED_SUBSCRIPTION, {
    variables: { userId: myId ?? '' },
    skip: !myId,
    onData: () => refetch(),
  });

  const [respond, { loading: responding }] = useMutation(RESPOND_TO_MATCH_REQUEST, {
    onCompleted: () => refetch(),
    refetchQueries: [{ query: GET_MY_SESSIONS }],
    onError: (err) => alert(err.message),
  });

  const requests = data?.myMatchRequests?.items ?? [];
  const meta = data?.myMatchRequests?.meta;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Match requests
          </p>
          <h1 className="text-3xl font-bold text-fg mt-1">Your collaboration inbox</h1>
          <p className="text-muted mt-1">Accept or decline incoming swaps and review what you've sent out.</p>
        </div>

        <div className="flex bg-surface-2 p-1 rounded-xl border border-border w-full md:w-auto">
          <TabButton
            active={tab === 'received'}
            onClick={() => {
              setTab('received');
              setPage(1);
            }}
            icon={Inbox}
          >
            Received
          </TabButton>
          <TabButton
            active={tab === 'sent'}
            onClick={() => {
              setTab('sent');
              setPage(1);
            }}
            icon={Send}
          >
            Sent
          </TabButton>
        </div>
      </header>

      {loading && requests.length === 0 ? (
        <div className="surface border rounded-2xl p-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : requests.length === 0 ? (
        <div className="surface border border-dashed rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center mx-auto">
            {tab === 'received' ? <Inbox className="w-6 h-6" /> : <Send className="w-6 h-6" />}
          </div>
          <h3 className="font-semibold text-fg">
            {tab === 'received' ? 'No requests yet' : 'You haven\'t sent any requests'}
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            {tab === 'received'
              ? 'When someone proposes a swap with you, it will land here.'
              : 'Browse Explore or your AI matches to start a swap.'}
          </p>
          <Link href={tab === 'sent' ? '/explore' : '/dashboard'} className="btn-primary inline-flex">
            {tab === 'sent' ? 'Find skills' : 'Back to dashboard'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req: any) => {
            const counterpart = tab === 'received' ? req.fromUser : req.toUser;
            return (
              <article key={req.id} className="surface border rounded-2xl p-5 flex flex-col">
                <header className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-brand-700 flex items-center justify-center text-white font-semibold shrink-0">
                      {counterpart?.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-fg truncate">{counterpart?.name}</p>
                      <p className="text-xs text-muted">
                        {new Date(req.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={cn('chip border', STATUS_TONE[req.status] || 'bg-surface-2')}>
                    {req.status}
                  </span>
                </header>

                <div className="bg-surface-2 rounded-xl p-3 my-2 border border-border">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-2">
                        {tab === 'received' ? 'They offer' : 'You offer'}
                      </p>
                      <p className="font-semibold text-fg truncate">{req.offeredSkill?.title}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted shrink-0" />
                    <div className="min-w-0 text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-2">
                        {tab === 'received' ? 'They want' : 'You want'}
                      </p>
                      <p className="font-semibold text-fg truncate">{req.wantedSkill?.title}</p>
                    </div>
                  </div>
                </div>

                {req.message && (
                  <p className="text-sm text-fg-soft italic border-l-2 border-border pl-3 my-2">
                    "{req.message}"
                  </p>
                )}

                <footer className="mt-auto pt-3 border-t border-border">
                  {tab === 'received' && req.status === 'PENDING' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => respond({ variables: { requestId: req.id, accept: false } })}
                        disabled={responding}
                        className="btn-secondary !py-2 flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => respond({ variables: { requestId: req.id, accept: true } })}
                        disabled={responding}
                        className="btn-primary !py-2 flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Accept
                      </button>
                    </div>
                  ) : req.status === 'ACCEPTED' && req.session?.id ? (
                    <Link
                      href={`/session/${req.session.id}`}
                      className="btn-primary w-full !py-2 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> Open session
                    </Link>
                  ) : req.status === 'ACCEPTED' ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating session…
                    </div>
                  ) : (
                    <p className="text-xs text-muted text-center">
                      {req.status === 'DECLINED' ? 'This request was declined.' : 'Awaiting response.'}
                    </p>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-secondary !py-2 !px-4 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-muted">
            Page {meta.currentPage} of {meta.totalPages}
          </span>
          <button
            disabled={page === meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary !py-2 !px-4 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all',
        active ? 'bg-surface text-fg shadow-sm border border-border' : 'text-muted hover:text-fg',
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}
