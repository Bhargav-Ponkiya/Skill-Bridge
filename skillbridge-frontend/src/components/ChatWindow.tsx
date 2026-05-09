'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { GET_MESSAGES, GET_ME } from '@/graphql/queries';
import { SEND_MESSAGE, SET_TYPING, MARK_SESSION_READ } from '@/graphql/mutations';
import {
  MESSAGE_ADDED_SUBSCRIPTION,
  TYPING_CHANGED_SUBSCRIPTION,
} from '@/graphql/subscriptions';
import { Loader2, MessageSquare, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChatInput } from './ChatInput';

interface ChatWindowProps {
  sessionId: string;
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
  const [partnerTyping, setPartnerTyping] = useState<{ name?: string } | null>(null);
  const [wsReconnected, setWsReconnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const partnerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: meData } = useQuery<any>(GET_ME);
  const { data: messagesData, loading, error: messagesError, subscribeToMore } = useQuery<any>(GET_MESSAGES, {
    variables: { sessionId },
  });

  const [setTyping] = useMutation(SET_TYPING);
  const [markSessionRead] = useMutation(MARK_SESSION_READ);

  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { sessionId },
    skip: !sessionId,
    onComplete: () => setWsReconnected(true),
    onError: () => setWsReconnected(true),
  });

  useEffect(() => {
    if (wsReconnected) {
      const t = setTimeout(() => setWsReconnected(false), 4000);
      return () => clearTimeout(t);
    }
  }, [wsReconnected]);

  useSubscription(TYPING_CHANGED_SUBSCRIPTION, {
    variables: { sessionId },
    onData: ({ data }) => {
      const evt = (data.data as any)?.typingChanged;
      if (!evt) return;
      if (evt.userId === meData?.me?.id) return;
      if (evt.isTyping) {
        setPartnerTyping({ name: evt.userName });
        if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
        partnerTypingTimeoutRef.current = setTimeout(() => setPartnerTyping(null), 4000);
      } else {
        setPartnerTyping(null);
        if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
      }
    },
  });

  useEffect(() => {
    return () => {
      if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
      if (isTypingRef.current) {
        setTyping({ variables: { sessionId, isTyping: false } }).catch(() => {});
      }
    };
  }, [sessionId, setTyping]);

  const announceTyping = useCallback((typing: boolean) => {
    if (isTypingRef.current === typing) return;
    isTypingRef.current = typing;
    setTyping({ variables: { sessionId, isTyping: typing } }).catch(() => {});
  }, [sessionId, setTyping]);

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    },
    update: (cache, { data }: any) => {
      const newMessage = data?.sendMessage;
      const existing: any = cache.readQuery({
        query: GET_MESSAGES,
        variables: { sessionId },
      });
      if (existing && newMessage) {
        if (!existing.messages.find((m: any) => m.id === newMessage.id)) {
          cache.writeQuery({
            query: GET_MESSAGES,
            variables: { sessionId },
            data: {
              messages: [...existing.messages, newMessage],
            },
          });
        }
      }
    },
  });

  useEffect(() => {
    const unsubscribe = subscribeToMore({
      document: MESSAGE_ADDED_SUBSCRIPTION,
      variables: { sessionId },
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newMessage = subscriptionData.data.messageAdded;

        if (prev.messages.find((m: any) => m.id === newMessage.id)) {
          return prev;
        }

        return {
          ...prev,
          messages: [...prev.messages, newMessage],
        };
      },
    });
    return () => unsubscribe();
  }, [sessionId, subscribeToMore]);

  const me = meData?.me;
  const messages = useMemo(() => messagesData?.messages ?? [], [messagesData?.messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!me?.id) return;
    const hasUnreadFromPartner = messages.some(
      (m: any) => m.senderId !== me.id && m.isRead === false,
    );
    if (hasUnreadFromPartner) {
      markSessionRead({ variables: { sessionId } }).catch(() => {});
    }
  }, [messages, me?.id, sessionId, markSessionRead]);

  const handleSend = useCallback((content: string) => {
    if (sending) return;
    sendMessage({ variables: { input: { sessionId, content } } });
  }, [sessionId, sending, sendMessage]);

  return (
    <div className="surface border rounded-2xl flex flex-col h-[600px] overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-bg">
        {messagesError ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-6">
            <p className="text-danger font-semibold">Failed to load messages</p>
            <p className="text-sm text-muted">{messagesError.message}</p>
          </div>
        ) : loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="max-w-xs">
              <p className="font-semibold text-fg">Start the conversation</p>
              <p className="text-sm text-muted mt-1">
                Introduce yourself and pick a time to kick off the exchange.
              </p>
            </div>
          </div>
        ) : (
          messages.map((m: any) => {
            const isMe = m.senderId === me?.id;
            return (
              <div key={m.id} className={cn('flex flex-col max-w-[80%]', isMe ? 'self-end items-end ml-auto' : 'self-start items-start')}>
                <div
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm',
                    isMe
                      ? 'bg-accent text-white rounded-tr-sm'
                      : 'bg-surface-2 text-fg border border-border rounded-tl-sm',
                  )}
                >
                  {m.content}
                </div>
                <span className="text-[11px] text-muted mt-1 px-1 flex items-center gap-1">
                  {isMe ? 'You' : m.sender?.name} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && (
                    m.isRead ? (
                      <CheckCheck className="w-3 h-3 text-accent" />
                    ) : (
                      <Check className="w-3 h-3 text-muted-2" />
                    )
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      {wsReconnected && (
        <div className="px-5 py-1.5 text-[11px] text-accent font-medium flex items-center gap-2 border-t border-border bg-accent-soft/50">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Reconnected
        </div>
      )}

      {partnerTyping && (
        <div className="px-5 py-1.5 text-[11px] text-muted flex items-center gap-2 border-t border-border bg-surface">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
              style={{ animationDelay: '120ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
              style={{ animationDelay: '240ms' }}
            />
          </span>
          {partnerTyping.name?.split(' ')[0] ?? 'Partner'} is typing…
        </div>
      )}

      <ChatInput disabled={sending} onSendMessage={handleSend} onTypingChange={announceTyping} />
    </div>
  );
}
