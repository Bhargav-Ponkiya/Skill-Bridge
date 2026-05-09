import { cn } from '@/lib/utils';

const MAIN_PATH = ['NEGOTIATING', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'REVIEWED'] as const;
const CANCELLED = 'CANCELLED';

export function StatusLadder({ status }: { status: string }) {
  const steps = status === CANCELLED ? [...MAIN_PATH, CANCELLED] : MAIN_PATH;
  const idx = status === CANCELLED ? MAIN_PATH.length : MAIN_PATH.indexOf(status as any);
  const isCancelled = status === CANCELLED;

  return (
    <div className="surface border rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => {
          const reached = !isCancelled ? i <= idx : false;
          const current = s === status;
          const isCancelStep = s === CANCELLED;
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
                  isCancelStep
                    ? 'bg-danger text-white'
                    : reached || (isCancelled && i <= idx)
                      ? 'bg-accent text-white'
                      : 'bg-surface-2 text-muted-2 border border-border',
                  current && (isCancelStep ? 'ring-2 ring-danger/30' : 'ring-2 ring-accent/30'),
                )}
              >
                {isCancelStep ? '✕' : i + 1}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium uppercase tracking-wider hidden sm:block',
                  isCancelStep
                    ? 'text-danger'
                    : reached || (isCancelled && i <= idx)
                      ? 'text-fg'
                      : 'text-muted-2',
                )}
              >
                {s}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 rounded-full',
                    isCancelStep || (isCancelled && i < idx)
                      ? 'bg-danger/30'
                      : reached || (isCancelled && i < idx)
                        ? 'bg-accent/40'
                        : 'bg-border',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
