'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_USER_REVIEWS } from '@/graphql/queries';
import { CREATE_REVIEW } from '@/graphql/mutations';
import { Sparkles, Play, Star, CheckCircle2, Loader2, MessageSquare, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SummaryPanelProps {
  sessionId: string;
  sessionStatus: string;
  partnerId?: string;
  partnerName?: string;
  isReviewable: boolean;
  myId?: string;
  onReviewed?: () => void;
}

export function SummaryPanel({
  sessionId,
  sessionStatus,
  partnerId,
  partnerName,
  isReviewable,
  myId,
  onReviewed,
}: SummaryPanelProps) {
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const { data: reviewsData, refetch: refetchReviews } = useQuery<any>(GET_USER_REVIEWS, {
    variables: { userId: partnerId ?? '' },
    skip: !partnerId,
  });

  const myReview = (reviewsData?.userReviews ?? []).find(
    (r: any) => r.sessionId === sessionId && r.reviewer?.id === myId,
  );
  const hasReviewed = sessionStatus === 'REVIEWED' || submitted || !!myReview;

  const [createReview, { loading: reviewing }] = useMutation(CREATE_REVIEW, {
    onCompleted: () => {
      setSubmitted(true);
      refetchReviews();
      onReviewed?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerate = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setIsGenerating(true);
    setSummary('');

    const url = `${process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT?.replace('/graphql', '') || 'http://localhost:3001'}/ai/session/${sessionId}/summary/stream`;

    try {
      esRef.current = new EventSource(url);
    } catch {
      toast.error('Unable to connect to the AI summary service.');
      setIsGenerating(false);
      return;
    }

    esRef.current.onmessage = (event) => {
      if (event.data === '[DONE]') {
        esRef.current?.close();
        esRef.current = null;
        setIsGenerating(false);
        return;
      }
      setSummary((prev) => prev + event.data);
    };

    esRef.current.onerror = () => {
      if (!esRef.current) return;
      const readyState = esRef.current.readyState;
      if (readyState === 0) return;
      esRef.current.close();
      esRef.current = null;
      setIsGenerating(false);
      if (summary.length < 10) {
        toast.error('Failed to generate summary. Please try again.');
      }
    };
  };

  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setSummary('');
    };
  }, [sessionId]);

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !partnerId) return;
    createReview({
      variables: { input: { sessionId, revieweeId: partnerId, rating, comment: comment.trim() || undefined } },
    });
  };

  const reviews = reviewsData?.userReviews ?? [];

  return (
    <div className="space-y-4">
      {/* AI summary */}
      <div className="surface border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-fg">AI summary</h3>
              <p className="text-[11px] text-muted">Streamed from Gemini</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-secondary !py-1.5 !px-3 flex items-center gap-1.5 text-xs"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isGenerating ? 'Generating' : 'Generate'}
          </button>
        </div>
        <div className="rounded-xl bg-surface-2 border border-border p-4 min-h-[120px] text-sm text-fg-soft whitespace-pre-wrap leading-relaxed">
          {summary || (
            <div className="flex flex-col items-center justify-center text-center py-4 space-y-2">
              <MessageSquare className="w-6 h-6 text-muted-2" />
              <p className="text-sm text-muted">
                Generate a recap once your session has enough chat history.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Review */}
      <div className="surface border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              isReviewable
                ? 'bg-success/10 text-success'
                : 'bg-surface-2 text-muted-2',
            )}
          >
            {isReviewable ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-semibold text-fg">Leave a review</h3>
            <p className="text-[11px] text-muted">
              {isReviewable
                ? `Rate your exchange with ${partnerName ?? 'your partner'}`
                : 'Unlocks once both sides mark the session complete'}
            </p>
          </div>
        </div>

        {!isReviewable ? (
          <div className="text-center py-6 space-y-2 text-muted">
            <Lock className="w-6 h-6 mx-auto" />
            <p className="text-sm">
              Mark your part complete to wrap up the swap, then come back to leave a review.
            </p>
          </div>
        ) : hasReviewed ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
            <p className="font-semibold text-fg">Thanks for your review</p>
            <p className="text-sm text-muted">
              Your feedback boosts {partnerName?.split(' ')[0] ?? 'their'}'s trust score.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReview} className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} stars`}
                >
                  <Star
                    className={cn(
                      'w-7 h-7 transition-colors',
                      rating >= star ? 'fill-warning text-warning' : 'text-muted-2 hover:text-warning',
                    )}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you learn? How was the exchange?"
              className="input-base min-h-[80px] resize-y"
              maxLength={400}
            />
            <button
              type="submit"
              disabled={rating === 0 || reviewing}
              className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {reviewing && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit review
            </button>
          </form>
        )}
      </div>

    </div>
  );
}
