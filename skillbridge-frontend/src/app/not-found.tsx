import Link from 'next/link';
import { Zap, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
          <Zap className="w-8 h-8" />
        </div>
        <h1 className="text-5xl font-bold text-fg">404</h1>
        <p className="text-xl font-semibold text-fg">Page not found</p>
        <p className="text-sm text-muted">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Home className="w-4 h-4" /> Go home
        </Link>
      </div>
    </div>
  );
}
