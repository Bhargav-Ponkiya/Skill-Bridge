'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface SkillFormValues {
  title: string;
  description: string;
  category: string;
  type: 'OFFER' | 'WANT';
  proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  isActive?: boolean;
}

interface SkillFormProps {
  initialValues?: Partial<SkillFormValues>;
  onSubmit: (values: SkillFormValues) => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
  showActiveToggle?: boolean;
}

const CATEGORIES = ['Technology', 'Design', 'Business', 'Music', 'Cooking', 'Language', 'Lifestyle', 'Fitness', 'Writing'];

const DEFAULT: SkillFormValues = {
  title: '',
  description: '',
  category: 'Technology',
  type: 'OFFER',
  proficiencyLevel: 'INTERMEDIATE',
  isActive: true,
};

export function SkillForm({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Save skill',
  showActiveToggle = false,
}: SkillFormProps) {
  const [values, setValues] = useState<SkillFormValues>({ ...DEFAULT, ...initialValues });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues({ ...DEFAULT, ...initialValues });
  }, [initialValues]);

  const update = <K extends keyof SkillFormValues>(key: K, val: SkillFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.title.trim()) return setError('Skill title is required.');
    if (values.title.length > 80) return setError('Title must be 80 characters or fewer.');
    await onSubmit({ ...values, title: values.title.trim(), description: values.description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Skill title">
          <input
            type="text"
            className="input-base"
            placeholder="e.g. React Native"
            value={values.title}
            maxLength={80}
            onChange={(e) => update('title', e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Category">
          <select
            className="input-base appearance-none"
            value={values.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description (optional)">
        <textarea
          className="input-base min-h-[88px] resize-y"
          placeholder="What you can teach, your style, level of detail…"
          value={values.description}
          maxLength={400}
          onChange={(e) => update('description', e.target.value)}
        />
        <p className="mt-1 text-[11px] text-muted-2">{values.description.length}/400</p>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <div className="flex bg-surface-2 p-1 rounded-xl border border-border">
            {(['OFFER', 'WANT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update('type', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  values.type === t
                    ? 'bg-surface text-fg shadow-sm border border-border'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {t === 'OFFER' ? 'I teach' : 'I want to learn'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Proficiency">
          <select
            className="input-base appearance-none"
            value={values.proficiencyLevel}
            onChange={(e) => update('proficiencyLevel', e.target.value as SkillFormValues['proficiencyLevel'])}
          >
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="EXPERT">Expert</option>
          </select>
        </Field>
      </div>

      {showActiveToggle && (
        <label className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-border cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-fg">Visible to others</p>
            <p className="text-xs text-muted">Inactive skills are hidden from search and matching.</p>
          </div>
          <input
            type="checkbox"
            checked={values.isActive ?? true}
            onChange={(e) => update('isActive', e.target.checked)}
            className="w-5 h-5 accent-accent"
          />
        </label>
      )}

      {error && (
        <p className="text-sm text-danger font-medium">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="label-base">{label}</span>
      {children}
    </label>
  );
}
