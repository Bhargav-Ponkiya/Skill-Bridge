'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';
import { cn } from '@/lib/utils';

const OPTIONS: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'Light' },
  { mode: 'dark', icon: Moon, label: 'Dark' },
  { mode: 'system', icon: Monitor, label: 'System' },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  if (compact) {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    const Icon = mode === 'dark' ? Sun : Moon;
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => setMode(next)}
        className="p-2 rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors"
      >
        <Icon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border">
      {OPTIONS.map(({ mode: m, icon: Icon, label }) => (
        <button
          key={m}
          type="button"
          aria-label={`Use ${label.toLowerCase()} theme`}
          onClick={() => setMode(m)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            mode === m
              ? 'bg-card text-fg shadow-sm border border-border'
              : 'text-muted hover:text-fg',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
