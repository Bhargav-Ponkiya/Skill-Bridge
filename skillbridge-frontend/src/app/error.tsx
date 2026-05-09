'use client';

import { useEffect } from 'react';
import { Zap, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-danger/10 text-danger flex items-center justify-center">
          <Zap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-fg">Something went wrong</h1>
        <p className="text-sm text-muted">
          An unexpected error occurred. Please try again.
        </p>
        <button onClick={reset} className="btn-primary inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    </div>
  );
}
