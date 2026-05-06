import { cn } from '@/lib/utils';

const STATUSES = ['NEGOTIATING', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'REVIEWED', 'CANCELLED'] as const;

export function StatusLadder({ status }: { status: string }) {
  const idx = STATUSES.indexOf(status as any);
  return (
    <div className="surface border rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        {STATUSES.map((s, i) => {
          const reached = i <= idx;
          const current = i === idx;
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
                  reached ? 'bg-accent text-white' : 'bg-surface-2 text-muted-2 border border-border',
                  current && 'ring-2 ring-accent/30',
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium uppercase tracking-wider hidden sm:block',
                  reached ? 'text-fg' : 'text-muted-2',
                )}
              >
                {s}
              </span>
              {i < STATUSES.length - 1 && (
                <div
                  className={cn('flex-1 h-0.5 rounded-full', reached ? 'bg-accent/40' : 'bg-border')}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
