import { useState, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { CHANGE_SESSION_STATUS, TOGGLE_SESSION_PROGRESS, CANCEL_SESSION } from '@/graphql/mutations';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Loader2, Calendar, Play, CheckCircle2, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActionRow({
  session,
  myId,
  onRefetch,
  myTeachSkill,
  partnerTeachSkill,
}: {
  session: any;
  myId?: string;
  onRefetch: () => void;
  myTeachSkill: any;
  partnerTeachSkill: any;
}) {
  const [changeStatus, { loading: changing }] = useMutation(CHANGE_SESSION_STATUS, {
    onCompleted: () => onRefetch(),
    onError: (err) => toast.error(err.message),
  });
  const [toggleProgress, { loading: toggling }] = useMutation<any>(TOGGLE_SESSION_PROGRESS, {
    onCompleted: () => onRefetch(),
    onError: (err) => toast.error(err.message),
  });
  const [cancelSession, { loading: cancelling }] = useMutation(CANCEL_SESSION, {
    onCompleted: () => {
      setShowCancelModal(false);
      setCancelReason('');
      onRefetch();
      toast.success('Session cancelled.');
    },
    onError: (err) => toast.error(err.message),
  });

  const isP1 = session.participant1Id === myId;
  const myCompletion = isP1 ? session.p1Completed : session.p2Completed;
  const canCancel = ['NEGOTIATING', 'SCHEDULED'].includes(session.status);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [agendaContent, setAgendaContent] = useState('');
  const [agendaLoading, setAgendaLoading] = useState(false);
  const agendaEsRef = useRef<EventSource | null>(null);

  const handleGenerateAgenda = () => {
    if (agendaEsRef.current) {
      agendaEsRef.current.close();
      agendaEsRef.current = null;
    }

    setShowAgendaModal(true);
    setAgendaContent('');
    setAgendaLoading(true);

    const offered = myTeachSkill?.title || 'Skill A';
    const wanted = partnerTeachSkill?.title || 'Skill B';
    const duration = session.duration || 60;
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const params = new URLSearchParams({ offered, wanted, duration: String(duration) });
    const url = `${baseURL}/ai/agenda?${params.toString()}`;

    try {
      agendaEsRef.current = new EventSource(url);
    } catch {
      setAgendaLoading(false);
      toast.error('Failed to connect. Please try again.');
      return;
    }

    agendaEsRef.current.onmessage = (event) => {
      if (event.data === '[DONE]') {
        agendaEsRef.current?.close();
        agendaEsRef.current = null;
        setAgendaLoading(false);
        return;
      }
      setAgendaContent((prev) => prev + event.data);
    };
    agendaEsRef.current.onerror = () => {
      if (!agendaEsRef.current) return;
      if (agendaEsRef.current.readyState === 0) return;
      agendaEsRef.current.close();
      agendaEsRef.current = null;
      setAgendaLoading(false);
      toast.error('Failed to generate agenda. Please try again.');
    };
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancelling.');
      return;
    }
    cancelSession({
      variables: { id: session.id, reason: cancelReason.trim() },
    });
  };

  return (
    <>
    <div className="surface border rounded-2xl p-5 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
        <div>
          <p className="text-sm font-semibold text-fg">Exchange controls</p>
          <p className="text-xs text-muted">
            Coordinate via chat, then mark each side complete when teaching is done.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {session.status === 'NEGOTIATING' && session.scheduledAt && session.format && (
          <button
            onClick={() => changeStatus({
              variables: { id: session.id, status: 'SCHEDULED' },
            })}
            disabled={changing}
            className="btn-secondary flex items-center gap-1.5 !py-2"
          >
            <Calendar className="w-3.5 h-3.5" /> Confirm schedule
          </button>
        )}
        {session.status === 'SCHEDULED' && (
          <button
            onClick={() => changeStatus({
              variables: { id: session.id, status: 'ACTIVE' },
            })}
            disabled={changing}
            className="btn-primary flex items-center gap-1.5 !py-2"
          >
            <Play className="w-3.5 h-3.5" /> Start session
          </button>
        )}
        {(session.status === 'SCHEDULED' || session.status === 'ACTIVE') && (
          <button
            onClick={() => toggleProgress({
              variables: { id: session.id },
            })}
            disabled={toggling}
            className={cn(
              'btn-secondary !py-2 flex items-center gap-1.5',
              myCompletion && 'border-success/40 text-success',
            )}
          >
            {toggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {myCompletion ? 'Undo my completion' : 'Mark my part complete'}
          </button>
        )}
        {(session.status === 'NEGOTIATING' || session.status === 'SCHEDULED') && (
          <button
            onClick={handleGenerateAgenda}
            className="btn-secondary !py-2 flex items-center gap-1.5 text-accent border-accent/30 hover:bg-accent/10"
          >
            <Sparkles className="w-3.5 h-3.5" /> Generate AI Agenda
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="btn-secondary !py-2 flex items-center gap-1.5 text-danger border-danger/30 hover:bg-danger/10"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Cancel session
          </button>
        )}
      </div>
    </div>

    <Modal
      open={showCancelModal}
      onClose={() => { setShowCancelModal(false); setCancelReason(''); }}
      title="Cancel session"
      description="This will notify your partner and close the session."
      size="sm"
    >
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="label-base">Reason for cancellation</span>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="e.g., Scheduling conflict, already learned the skill..."
            className="input-base"
            maxLength={300}
          />
        </label>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
            className="btn-secondary"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="btn-primary flex items-center gap-2 bg-danger hover:bg-danger/90 border-danger"
          >
            {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm cancel
          </button>
        </div>
      </div>
    </Modal>

    <Modal
      open={showAgendaModal}
      onClose={() => { setShowAgendaModal(false); setAgendaContent(''); }}
      title="AI Session Agenda"
      description={`Suggested structure for your ${session.duration || 60}-minute exchange.`}
      size="md"
    >
      <div className="space-y-4">
        {agendaLoading && !agendaContent && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <p className="text-sm text-muted">Crafting your agenda...</p>
          </div>
        )}
        {agendaContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{agendaContent}</p>
          </div>
        )}
        {agendaLoading && agendaContent && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="w-3 h-3 animate-spin" />
            Streaming...
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setShowAgendaModal(false); setAgendaContent(''); }}
            className="btn-secondary"
          >
            Close
          </button>
          {agendaContent && !agendaLoading && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(agendaContent);
                toast.success('Agenda copied to clipboard!');
              }}
              className="btn-primary flex items-center gap-1.5"
            >
              Copy to Clipboard
            </button>
          )}
        </div>
      </div>
    </Modal>
    </>
  );
}
