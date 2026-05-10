'use client';

import { Pencil, Trash2, Eye, EyeOff, Award, LinkIcon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SkillCardSkill {
  id: string;
  title: string;
  description?: string | null;
  category?: string;
  type: 'OFFER' | 'WANT';
  proficiencyLevel?: string | null;
  isActive?: boolean;
  swappedCount?: number;
  user?: { 
    id: string; 
    name?: string; 
    avatar?: string | null;
    trustScore?: number;
    reviewCount?: number;
  } | null;
  portfolios?: Array<{ id: string; title: string; url: string; type: string }>;
}

interface SkillCardProps {
  skill: SkillCardSkill;
  variant?: 'owner' | 'public';
  onEdit?: (skill: SkillCardSkill) => void;
  onDelete?: (skill: SkillCardSkill) => void;
  onToggleActive?: (skill: SkillCardSkill) => void;
  onManagePortfolio?: (skill: SkillCardSkill) => void;
  onConnect?: (skill: SkillCardSkill) => void;
  footer?: React.ReactNode;
}

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  EXPERT: 'Expert',
};

export function SkillCard({
  skill,
  variant = 'public',
  onEdit,
  onDelete,
  onToggleActive,
  onManagePortfolio,
  onConnect,
  footer,
}: SkillCardProps) {
  const isOffer = skill.type === 'OFFER';

  return (
    <div
      className={cn(
        'surface p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5',
        skill.isActive === false && variant === 'owner' && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              'inline-flex items-center justify-center w-9 h-9 rounded-lg font-semibold text-xs shrink-0',
              isOffer ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-fg-soft',
            )}
          >
            {isOffer ? 'TEACH' : 'LEARN'}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-fg leading-tight truncate">{skill.title}</h3>
            {skill.category && <p className="text-xs text-muted">{skill.category}</p>}
          </div>
        </div>
        {skill.proficiencyLevel && (
          <span className="chip shrink-0">{LEVEL_LABEL[skill.proficiencyLevel] ?? skill.proficiencyLevel}</span>
        )}
      </div>

      {skill.description && (
        <p className="text-sm text-muted line-clamp-2 mb-3">{skill.description}</p>
      )}

      {skill.portfolios && skill.portfolios.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {skill.portfolios.slice(0, 3).map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded bg-surface-2 border border-border text-[10px] font-medium text-muted-2 flex items-center gap-1 hover:bg-surface-3 transition-colors"
              title={p.title}
            >
              <LinkIcon className="w-2.5 h-2.5" /> {p.type}
            </a>
          ))}
          {skill.portfolios.length > 3 && (
            <div className="px-2 py-1 rounded bg-surface-2 border border-border text-[10px] font-medium text-muted-2">
              +{skill.portfolios.length - 3} more
            </div>
          )}
        </div>
      )}

      {variant === 'owner' && (
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onToggleActive?.(skill)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-fg transition-colors"
            >
              {skill.isActive === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {skill.isActive === false ? 'Hidden' : 'Visible'}
            </button>
            <button
              type="button"
              onClick={() => onManagePortfolio?.(skill)}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              <Award className="w-3.5 h-3.5" /> Portfolio
            </button>
            {skill.swappedCount !== undefined && skill.swappedCount > 0 && (
              <span className="text-[10px] text-muted-2 flex items-center gap-1">
                <Star className="w-2.5 h-2.5" /> {skill.swappedCount} swap{skill.swappedCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit?.(skill)}
              className="p-2 rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(skill)}
              className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {variant === 'public' && skill.user && (
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent to-brand-700 flex items-center justify-center text-white font-semibold text-xs shrink-0">
              {skill.user.name?.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="text-sm font-medium text-fg-soft truncate block">{skill.user.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                {skill.user.trustScore !== undefined && (
                  <div className="flex items-center gap-0.5 text-[10px] font-bold text-warning">
                    <Award className="w-2.5 h-2.5 fill-warning" /> {Math.round(skill.user.trustScore)}
                  </div>
                )}
                {skill.swappedCount !== undefined && skill.swappedCount > 0 && (
                  <span className="text-[10px] text-muted-2">{skill.swappedCount} swap{skill.swappedCount !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onConnect && (
              <button
                type="button"
                onClick={() => onConnect(skill)}
                className="text-xs font-semibold text-accent hover:underline shrink-0"
              >
                Propose swap →
              </button>
            )}
          </div>
        </div>
      )}

      {footer && <div className="pt-3 border-t border-border mt-3">{footer}</div>}
    </div>
  );
}


