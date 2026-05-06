'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_USER_REVIEWS } from '@/graphql/queries';
import { CREATE_REVIEW } from '@/graphql/mutations';
import { Stars, Sparkles, Play, Star, CheckCircle2, Loader2, MessageSquare, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SummaryPanelProps {
  sessionId: string;
  sessionStatus: string;
  partnerId?: string;
  partnerName?: string;
  isReviewable: boolean;
  onReviewed?: () => void;
}

export function SummaryPanel({
  sessionId,
  sessionStatus,
  partnerId,
  partnerName,
  isReviewable,
  onReviewed,
}: SummaryPanelProps) {
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const { data: reviewsData, refetch: refetchReviews } = useQuery<any>(GET_USER_REVIEWS, {
    variables: { userId: partnerId ?? '' },
    skip: !partnerId,
  });

  // Has the current session already been reviewed by me? Heuristic: any review for this partner
  // tied to this sessionId. We rely on the server's REVIEWED status as the canonical signal.
  const hasReviewed = sessionStatus === 'REVIEWED';

  const [createReview, { loading: reviewing }] = useMutation(CREATE_REVIEW, {
    onCompleted: () => {
      refetchReviews();
      onReviewed?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setSummary('');
    setRetryCount(0);

    const url = `${process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT?.replace('/graphql', '') || 'http://localhost:3001'}/ai/session/${sessionId}/summary/stream`;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(url);
    } catch (err) {
      toast.error('Unable to connect to the AI summary service.');
      setIsGenerating(false);
      return;
    }

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource?.close();
        setIsGenerating(false);
        return;
      }
      setSummary((prev) => prev + event.data);
    };

    eventSource.onerror = () => {
      if (!eventSource) return;

      const readyState = eventSource.readyState;

      if (readyState === 0) return;

      if (readyState === 2) {
        eventSource.close();
        eventSource = null;
        setIsGenerating(false);

        if (retryCount < MAX_RETRIES) {
          setRetryCount((prev) => prev + 1);
          toast.info(`Reconnecting... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            if (!isGenerating) return;
            try {
              eventSource = new EventSource(url);
            } catch {
              toast.error('Connection to AI summary service failed.');
              setIsGenerating(false);
            }
          }, 2000);
        } else {
          toast.error('AI summary service is unavailable. Please try again later.');
        }
        return;
      }

      eventSource.close();
      eventSource = null;
      setIsGenerating(false);

      if (summary.length < 10) {
        toast.error('Session expired or unauthorized. Please log in again.');
      }
    };

    eventSource.addEventListener('close', () => {
      eventSource?.close();
      eventSource = null;
      setIsGenerating(false);
      setRetryCount(0);
    });
  };

  useEffect(() => {
    return () => setSummary('');
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

      {/* Mini review feed for partner */}
      {reviews.length > 0 && (
        <div className="surface border rounded-2xl p-5">
          <h3 className="font-semibold text-fg mb-3 text-sm">
            What others said about {partnerName?.split(' ')[0] ?? 'them'}
          </h3>
          <ul className="space-y-3 text-sm">
            {reviews.slice(0, 3).map((r: any) => (
              <li key={r.id}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-fg">{r.reviewer?.name}</span>
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
                {r.comment && <p className="text-muted text-xs leading-relaxed">"{r.comment}"</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
