'use client';

import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_MY_NOTIFICATIONS,
} from '@/graphql/queries';
import { MARK_NOTIFICATION_READ } from '@/graphql/mutations';
import {
  Bell,
  Inbox,
  MessageCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';

type Item = {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  meta: string;
  href: string;
  createdAt: string;
  isRead: boolean;
  notificationId?: string;
};

export default function NotificationsPage() {
  const { data: notificationsData, loading, error, refetch: refetchNotifications } = useQuery<any>(
    GET_MY_NOTIFICATIONS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [markRead] = useMutation(MARK_NOTIFICATION_READ, {
    onCompleted: () => refetchNotifications(),
  });

  const items: Item[] = [];

  for (const n of notificationsData?.myNotifications ?? []) {
    items.push({
      id: `notif-${n.id}`,
      notificationId: n.id,
      icon: typeIcon(n.type),
      title: n.title,
      meta: n.message,
      href: hrefFor(n),
      createdAt: n.createdAt,
      isRead: n.isRead,
    });
  }

  const sorted = items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const unreadCount = sorted.filter((i) => !i.isRead).length;

  if (loading && items.length === 0) {
    return (
      <div className="w-full lg:max-w-4xl space-y-6 animate-fade-in">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Notifications
            </p>
            <h1 className="text-3xl font-bold text-fg mt-1">Activity feed</h1>
          </div>
        </header>
        <div className="surface border rounded-2xl p-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full lg:max-w-4xl space-y-6 animate-fade-in">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Notifications
            </p>
            <h1 className="text-3xl font-bold text-fg mt-1">Activity feed</h1>
          </div>
        </header>
        <div className="surface border border-danger/20 rounded-2xl p-12 text-center space-y-3">
          <p className="text-danger font-semibold">Failed to load notifications</p>
          <p className="text-sm text-muted">{error.message}</p>
          <button onClick={() => refetchNotifications()} className="btn-primary">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:max-w-4xl space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Notifications
          </p>
          <h1 className="text-3xl font-bold text-fg mt-1">Activity feed</h1>
          <p className="text-muted mt-1">
            {unreadCount > 0
              ? `${unreadCount} new ${unreadCount === 1 ? 'item' : 'items'} for you.`
              : 'You\'re all caught up.'}
          </p>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="surface border border-dashed rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-fg">Nothing waiting on you</h3>
          <p className="text-sm text-muted">
            Match requests, session updates and review prompts will appear here.
          </p>
        </div>
      ) : (
        <ul className="surface border rounded-2xl divide-y divide-border overflow-hidden">
          {sorted.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <div
                  className={cn(
                    'flex items-start gap-3 p-4 transition-colors',
                    !item.isRead && 'bg-accent-soft/30',
                  )}
                >
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (item.notificationId && !item.isRead) {
                        markRead({ variables: { id: item.notificationId } });
                      }
                    }}
                    className="flex items-start gap-3 flex-1 min-w-0 hover:bg-surface-2 -m-2 p-2 rounded-lg transition-colors"
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        item.isRead
                          ? 'bg-surface-2 text-muted'
                          : 'bg-accent-soft text-accent',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm leading-snug',
                          item.isRead ? 'text-fg-soft font-medium' : 'text-fg font-semibold',
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {item.meta} •{' '}
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </Link>
                  {item.notificationId && !item.isRead && (
                    <button
                      onClick={() =>
                        item.notificationId &&
                        markRead({ variables: { id: item.notificationId } })
                      }
                      className="text-xs text-muted hover:text-accent flex items-center gap-1 shrink-0"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function typeIcon(type: string) {
  switch (type) {
    case 'MATCH_REQUEST':
      return Inbox;
    case 'MATCH_ACCEPTED':
      return CheckCircle2;
    case 'SESSION_REMINDER':
    case 'SESSION_COMPLETED':
      return MessageCircle;
    case 'NEW_MESSAGE':
      return MessageCircle;
    default:
      return Bell;
  }
}

function hrefFor(n: any): string {
  switch (n.type) {
    case 'MATCH_REQUEST':
    case 'MATCH_ACCEPTED':
      return '/matches';
    case 'SESSION_REMINDER':
    case 'SESSION_COMPLETED':
    case 'NEW_MESSAGE':
      return n.relatedId ? `/session/${n.relatedId}` : '/dashboard';
    default:
      return '/dashboard';
  }
}
