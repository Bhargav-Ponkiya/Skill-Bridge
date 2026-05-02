import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReputationSummaryProps {
  userId: string;
}

export function ReputationSummary({ userId }: ReputationSummaryProps) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setSummary('');
    setError(null);

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/ai/user/${userId}/reviews/summary/stream`
    );

    eventSource.onmessage = (event) => {
      setLoading(false);
      setSummary((prev) => prev + event.data);
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setError('AI summary is temporarily unavailable.');
      setLoading(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="surface border rounded-2xl p-6 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Sparkles className="w-24 h-24 text-accent" />
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-fg">AI Reputation Digest</h2>
          <p className="text-xs text-muted">
            Synthesized from recent partner reviews to give you a quick vibe check.
          </p>
        </div>
      </div>

      <div className="relative z-10">
        {loading && !summary ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating summary...
          </div>
        ) : error ? (
          <p className="text-sm text-fg-soft italic border-l-2 border-border pl-4 py-2">
            {error}
          </p>
        ) : (
          <div className="space-y-3">
             <Quote className="w-4 h-4 text-accent opacity-40" />
             <p className="text-sm text-fg-soft leading-relaxed pr-8 italic">
               {summary}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
