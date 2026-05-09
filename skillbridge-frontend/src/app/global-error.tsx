'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg text-fg">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-2xl font-bold">Critical error</h1>
            <p className="text-sm text-muted">
              A critical error occurred. Please reload the page.
            </p>
            <button onClick={reset} className="btn-primary">
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
