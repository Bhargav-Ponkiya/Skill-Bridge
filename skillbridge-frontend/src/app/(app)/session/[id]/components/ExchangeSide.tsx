import { useMutation } from '@apollo/client/react';
import { TOGGLE_SESSION_PROGRESS } from '@/graphql/mutations';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Clock, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExchangeSide({
  sessionId,
  label,
  skill,
  person,
  completed,
  canToggle,
  onToggled,
  isMine,
  partnerName,
}: {
  sessionId: string;
  label: string;
  skill: any;
  person: any;
  completed: boolean;
  canToggle: boolean;
  onToggled?: () => void;
  isMine?: boolean;
  partnerName?: string;
}) {
  const [toggle, { loading }] = useMutation<any>(TOGGLE_SESSION_PROGRESS, {
    onCompleted: () => onToggled?.(),
    onError: (err) => toast.error(err.message),
  });

  return (
    <div
      className={cn(
        'surface border rounded-2xl p-5 transition-all',
        completed && 'border-success/40 bg-success/5',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">{label}</p>
          <h3 className="font-semibold text-fg mt-0.5 truncate">{skill?.title}</h3>
          {skill?.category && <p className="text-xs text-muted mt-0.5">{skill.category}</p>}
        </div>
        <span
          className={cn(
            'chip shrink-0 border',
            completed ? 'bg-success/10 text-success border-success/20' : 'bg-surface-2',
          )}
        >
          {completed ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {completed ? 'Delivered' : 'Pending'}
        </span>
      </div>
      {skill?.description && (
        <p className="text-sm text-muted line-clamp-2 mb-3">{skill.description}</p>
      )}
      {skill?.portfolios && skill.portfolios.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {skill.portfolios.map((p: any) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="chip hover:bg-surface-3 transition-colors"
              title={p.title}
            >
              <LinkIcon className="w-3 h-3" /> {p.type}
            </a>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-brand-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {person?.name?.charAt(0)?.toUpperCase()}
          </span>
          <span className="text-xs font-medium text-fg-soft truncate">
            {isMine ? 'You' : person?.name}
          </span>
        </div>
        {isMine && canToggle ? (
          <button
            onClick={() => toggle({ variables: { id: sessionId } })}
            disabled={loading}
            className={cn(
              'text-xs font-semibold transition-colors flex items-center gap-1.5',
              completed ? 'text-warning hover:underline' : 'text-success hover:underline',
            )}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : completed ? (
              <>Undo mark</>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as taught
              </>
            )}
          </button>
        ) : !isMine ? (
          <span className="text-xs text-muted">
            {completed
              ? `${partnerName?.split(' ')[0]} completed`
              : `Awaiting ${partnerName?.split(' ')[0] ?? 'partner'}`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
