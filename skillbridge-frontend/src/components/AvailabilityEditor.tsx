'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { SET_AVAILABILITY } from '@/graphql/mutations';
import { GET_ME } from '@/graphql/queries';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface AvailabilitySlot {
  day: number;
  startMinute: number;
  endMinute: number;
}

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function AvailabilityEditor({ initial }: { initial: AvailabilitySlot[] }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initial ?? []);
  const [save, { loading }] = useMutation(SET_AVAILABILITY, {
    refetchQueries: [{ query: GET_ME }],
    onError: (err) => toast.error(err.message),
  });

  const addSlot = (day: number) => {
    setSlots((s) => [...s, { day, startMinute: 18 * 60, endMinute: 19 * 60 }]);
  };

  const removeSlot = (idx: number) => {
    setSlots((s) => s.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, patch: Partial<AvailabilitySlot>) => {
    setSlots((s) => s.map((slot, i) => (i === idx ? { ...slot, ...patch } : slot)));
  };

  const handleSave = () => {
    const cleaned = slots
      .filter((s) => s.endMinute > s.startMinute)
      .map((s) => ({ day: s.day, startMinute: s.startMinute, endMinute: s.endMinute }));
    save({ variables: { slots: cleaned } });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {DAYS.map((label, day) => {
          const daySlots = slots
            .map((s, i) => ({ s, i }))
            .filter(({ s }) => s.day === day);
          return (
            <div
              key={day}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 flex flex-col md:flex-row md:items-center gap-2"
            >
              <span className="font-semibold text-fg w-10 shrink-0 text-xs uppercase tracking-wider">
                {label}
              </span>
              <div className="flex-1 flex flex-wrap gap-2">
                {daySlots.length === 0 && (
                  <span className="text-xs text-muted italic">Unavailable</span>
                )}
                {daySlots.map(({ s, i }) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-surface px-2 py-1 rounded-lg border border-border text-xs"
                  >
                    <input
                      type="time"
                      value={minutesToHHMM(s.startMinute)}
                      onChange={(e) =>
                        updateSlot(i, { startMinute: hhmmToMinutes(e.target.value) })
                      }
                      className="bg-transparent text-fg w-[64px] outline-none"
                    />
                    <span className="text-muted">–</span>
                    <input
                      type="time"
                      value={minutesToHHMM(s.endMinute)}
                      onChange={(e) =>
                        updateSlot(i, { endMinute: hhmmToMinutes(e.target.value) })
                      }
                      className="bg-transparent text-fg w-[64px] outline-none"
                    />
                    <button
                      onClick={() => removeSlot(i)}
                      className="text-muted hover:text-danger ml-1"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                onClick={() => addSlot(day)}
                className="text-xs text-accent hover:underline inline-flex items-center gap-1 self-start md:self-auto"
              >
                <Plus className="w-3 h-3" /> add
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className={cn('btn-primary !py-2 flex items-center gap-2', loading && 'opacity-60')}
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save availability
        </button>
      </div>
    </div>
  );
}

/**
 * Compute overlapping windows between two availability lists. Returns intersected slots
 * sorted by day/time. Used to suggest "you are both free on…" on the session page.
 */
export function overlappingSlots(
  a: AvailabilitySlot[],
  b: AvailabilitySlot[],
): AvailabilitySlot[] {
  const result: AvailabilitySlot[] = [];
  for (let day = 0; day < 7; day++) {
    const aDay = (a ?? []).filter((s) => s.day === day);
    const bDay = (b ?? []).filter((s) => s.day === day);
    for (const ax of aDay) {
      for (const bx of bDay) {
        const start = Math.max(ax.startMinute, bx.startMinute);
        const end = Math.min(ax.endMinute, bx.endMinute);
        if (end - start >= 30) {
          result.push({ day, startMinute: start, endMinute: end });
        }
      }
    }
  }
  return result;
}

export function formatSlot(slot: AvailabilitySlot): string {
  return `${DAYS[slot.day]} ${minutesToHHMM(slot.startMinute)}–${minutesToHHMM(slot.endMinute)}`;
}
