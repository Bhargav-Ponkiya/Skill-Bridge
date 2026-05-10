import { useState, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { UPDATE_SESSION } from '@/graphql/mutations';
import { toast } from 'sonner';
import { Calendar, Video, MessageSquare as Chat, MapPin, ExternalLink, Download, Loader2 } from 'lucide-react';
import { overlappingSlots, formatSlot } from '@/components/AvailabilityEditor';

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleCard({
  session,
  onSaved,
  isLocked,
  partnerName,
  skill1Title,
  skill2Title,
}: {
  session: any;
  onSaved: () => void;
  isLocked: boolean;
  partnerName?: string;
  skill1Title?: string;
  skill2Title?: string;
}) {
  const sessionActive = ['ACTIVE', 'COMPLETED', 'REVIEWED', 'CANCELLED'].includes(session.status);
  const [scheduledAt, setScheduledAt] = useState<string>(
    session.scheduledAt ? toLocalInput(session.scheduledAt) : '',
  );
  const [duration, setDuration] = useState<number>(session.duration ?? 60);
  const [format, setFormat] = useState<string>(session.format ?? 'VIDEO');
  const [meetingLink, setMeetingLink] = useState<string>(session.meetingLink ?? '');

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Local';
    }
  }, []);

  const [updateSession, { loading }] = useMutation(UPDATE_SESSION, {
    onCompleted: onSaved,
    onError: (err) => toast.error(err.message),
    optimisticResponse: {
      updateSession: {
        __typename: 'Session',
        id: session.id,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        duration: Number(duration),
        format,
        meetingLink: meetingLink.trim() || null,
        version: session.version + 1,
      },
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      toast.error('Please pick a date and time for the session.');
      return;
    }
    if (!duration || duration < 15) {
      toast.error('Session duration must be at least 15 minutes.');
      return;
    }
    if (format === 'VIDEO' && !meetingLink) {
      toast.error('Please provide a meeting link for the video call.');
      return;
    }

    updateSession({
      variables: {
        id: session.id,
        input: {
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          duration: Number(duration),
          format,
          meetingLink: meetingLink.trim() || undefined,
          version: session.version,
        },
      },
    });
  };

  const overlap = overlappingSlots(
    session.participant1?.availability ?? [],
    session.participant2?.availability ?? [],
  );

  return (
    <div className="surface border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-fg">Logistics</h3>
          <p className="text-[11px] text-muted">Pick a time and a format you both can attend.</p>
        </div>
      </div>
      {overlap.length > 0 && (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent-soft/40 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">
              You&apos;re both free during
            </p>
            <span className="text-[10px] font-medium text-accent/80 bg-surface border border-accent/20 rounded-full px-2 py-0.5">
              {timezone}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {overlap.slice(0, 8).map((s, i) => {
              const now = new Date();
              const diff = s.day - now.getDay();
              const slotDate = new Date(now);
              slotDate.setDate(now.getDate() + (diff >= 0 ? diff : diff + 7));
              slotDate.setHours(Math.floor(s.startMinute / 60), s.startMinute % 60, 0, 0);
              const localValue = toLocalInput(slotDate.toISOString());
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScheduledAt(localValue)}
                  className="text-xs font-medium text-fg bg-surface border border-border rounded-md px-2 py-0.5 hover:border-accent hover:bg-accent-soft/60 transition-colors cursor-pointer"
                >
                  {formatSlot(s)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block">
          <span className="label-base flex items-center gap-2">
            When
            <span className="text-[10px] font-medium text-muted bg-surface-2 border border-border rounded-full px-1.5 py-0.5">
              {timezone}
            </span>
          </span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={isLocked}
            className="input-base mt-2"
          />
        </label>
        <label className="block">
          <span className="label-base">Duration (min)</span>
          <input
            type="number"
            min={15}
            max={240}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isLocked}
            className="input-base mt-2"
          />
        </label>
        <label className="block">
          <span className="label-base">Format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={isLocked}
            className="input-base mt-2 appearance-none"
          >
            <option value="VIDEO">Video call</option>
            <option value="TEXT">Text-only</option>
            <option value="IN_PERSON">In-person</option>
          </select>
        </label>
        <label className="block">
          <span className="label-base">Meeting link</span>
          <input
            type="url"
            placeholder="https://meet.google.com/…"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            disabled={isLocked}
            className="input-base mt-2"
          />
        </label>
        <div className="md:col-span-2 lg:col-span-4 flex items-center justify-between pt-2">
          <p className="text-xs text-muted flex items-center gap-1.5">
            {format === 'VIDEO' ? (
              <Video className="w-3.5 h-3.5" />
            ) : format === 'TEXT' ? (
              <Chat className="w-3.5 h-3.5" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            {meetingLink ? (
              <a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Join link <ExternalLink className="inline w-3 h-3" />
              </a>
            ) : (
              'No meeting link yet'
            )}
          </p>
          <button
            type="submit"
            disabled={loading || isLocked}
            className="btn-primary !py-2 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {sessionActive ? 'Logistics locked' : 'Save logistics'}
          </button>
        </div>
        {session.status === 'SCHEDULED' && session.scheduledAt && (
          <div className="md:col-span-2 lg:col-span-4 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                const start = new Date(session.scheduledAt);
                const end = new Date(start.getTime() + (session.duration || 60) * 60000);
                const pad = (n: number) => String(n).padStart(2, '0');
                const fmt = (d: Date) =>
                  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

                const ics = [
                  'BEGIN:VCALENDAR',
                  'VERSION:2.0',
                  'METHOD:PUBLISH',
                  'PRODID:-//SkillBridge//NONSGML v1.0//EN',
                  'BEGIN:VEVENT',
                  `UID:skillbridge-${session.id}@skillbridge.local`,
                  `DTSTAMP:${fmt(new Date())}`,
                  `DTSTART:${fmt(start)}`,
                  `DTEND:${fmt(end)}`,
                  `SUMMARY:SkillBridge: ${skill1Title || 'Skill 1'} ↔ ${skill2Title || 'Skill 2'}`,
                  `DESCRIPTION:Skill exchange session with ${partnerName || 'your partner'}.\\nYou teach: ${skill1Title || '?'}\\nYou learn: ${skill2Title || '?'}`,
                  `LOCATION:${format === 'VIDEO' ? meetingLink : format === 'IN_PERSON' ? 'In Person' : 'Text-based'}`,
                  meetingLink ? `URL:${meetingLink}` : '',
                  'STATUS:CONFIRMED',
                  'SEQUENCE:0',
                  'END:VEVENT',
                  'END:VCALENDAR',
                ].filter(Boolean).join('\r\n');

                const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `skillbridge-session-${session.id}.ics`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success('Calendar event downloaded!');
              }}
              className="btn-secondary flex items-center gap-1.5 !py-2 w-full justify-center"
            >
              <Download className="w-4 h-4" />
              Add to Calendar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
