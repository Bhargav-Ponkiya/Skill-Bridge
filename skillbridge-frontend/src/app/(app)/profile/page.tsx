'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_ME, GET_USER_STATS, GET_USER_REVIEWS } from '@/graphql/queries';
import {
  ADD_SKILL,
  UPDATE_SKILL,
  DELETE_SKILL,
  TOGGLE_SKILL_ACTIVE,
  UPDATE_PROFILE,
  ADD_PORTFOLIO,
  REMOVE_PORTFOLIO,
  UPDATE_PORTFOLIO,
} from '@/graphql/mutations';
import {
  Plus,
  Pencil,
  Shield,
  MapPin,
  Sparkles,
  Loader2,
  Globe,
  LinkIcon,
  Trash2,
  ExternalLink,
  Award,
  Star,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { SkillForm, type SkillFormValues } from '@/components/SkillForm';
import { SkillCard, type SkillCardSkill } from '@/components/SkillCard';
import { Modal } from '@/components/Modal';
import { AvailabilityEditor } from '@/components/AvailabilityEditor';
import { Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReputationSummary } from '@/components/ReputationSummary';
import { toast } from 'sonner';

type Tab = 'offered' | 'wanted';
type Section = 'overview' | 'skills';

export default function MyProfilePage() {
  const storeUser = useAuthStore((s) => s.user);
  const { data, loading, refetch } = useQuery<any>(GET_ME, { fetchPolicy: 'cache-and-network' });

  const [section, setSection] = useState<Section>('skills');
  const [tab, setTab] = useState<Tab>('offered');
  const [skillModal, setSkillModal] = useState<{ mode: 'create' | 'edit'; skill?: SkillCardSkill } | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SkillCardSkill | null>(null);
  const [portfolioSkillId, setPortfolioSkillId] = useState<string | null>(null);

  const [addSkill, { loading: adding }] = useMutation(ADD_SKILL, {
    onCompleted: () => {
      setSkillModal(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [updateSkill, { loading: updating }] = useMutation(UPDATE_SKILL, {
    onCompleted: () => {
      setSkillModal(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [deleteSkill, { loading: deleting }] = useMutation(DELETE_SKILL, {
    onCompleted: () => {
      setConfirmDelete(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [toggleSkill] = useMutation(TOGGLE_SKILL_ACTIVE, {
    onError: (err) => toast.error(err.message),
    onCompleted: () => refetch(),
  });

  const [updateProfile, { loading: savingProfile }] = useMutation(UPDATE_PROFILE, {
    onCompleted: () => {
      setProfileModalOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const user = data?.me ?? storeUser;
  const skills: SkillCardSkill[] = user?.skills ?? [];
  const offered = skills.filter((s) => s.type === 'OFFER');
  const wanted = skills.filter((s) => s.type === 'WANT');
  const visibleSkills = tab === 'offered' ? offered : wanted;

  const { data: statsData } = useQuery<any>(GET_USER_STATS, {
    variables: { userId: user?.id ?? '' },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
  });
  const stats = statsData?.userStats;

  const { data: reviewsData } = useQuery<any>(GET_USER_REVIEWS, {
    variables: { userId: user?.id ?? '' },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
  });
  const myReviews = reviewsData?.userReviews ?? [];

  const handleSkillSubmit = async (values: SkillFormValues) => {
    if (skillModal?.mode === 'edit' && skillModal.skill) {
      await updateSkill({
        variables: {
          id: skillModal.skill.id,
          input: values,
        },
      });
    } else {
      await addSkill({ variables: { input: values } });
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Profile header */}
      <header className="surface rounded-2xl border p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-brand-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-fg">{user?.name || 'Your name'}</h1>
              {user?.isVerified && (
                <span className="chip text-success border-success/20 bg-success/10">
                  <Shield className="w-3.5 h-3.5" /> Verified
                </span>
              )}
              {user?.isGuest && (
                <span className="chip text-warning border-warning/20 bg-warning/10">Guest account</span>
              )}
            </div>
            <p className="text-sm text-muted mb-2">{user?.email}</p>
            <p className="text-sm text-fg-soft max-w-2xl leading-relaxed">
              {user?.bio || (
                <span className="italic text-muted">
                  No bio yet — share what you teach and what you'd like to learn.
                </span>
              )}
            </p>
            {user?.timezone && (
              <p className="text-xs text-muted mt-2 inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {user.timezone}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              onClick={() => setProfileModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Edit profile
            </button>
            <button
              onClick={() => {
                setSection('skills');
                setSkillModal({ mode: 'create' });
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add skill
            </button>
          </div>
        </div>

        {/* Section switcher: Overview vs Skills */}
        <div className="flex bg-surface-2 p-1 rounded-xl border border-border w-full md:w-fit mt-6">
          <SectionButton active={section === 'overview'} onClick={() => setSection('overview')}>
            Overview
          </SectionButton>
          <SectionButton active={section === 'skills'} onClick={() => setSection('skills')}>
            Skills
          </SectionButton>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-border">
          <Stat
            label="Trust score"
            value={stats?.trustScore ?? 0}
            icon={TrendingUp}
            accent
          />
          <Stat
            label="Avg rating"
            value={
              !stats || stats.reviewCount === 0
                ? '—'
                : stats.averageRating.toFixed(1)
            }
            icon={Star}
          />
          <Stat label="Sessions done" value={stats?.sessionsCompleted ?? 0} />
          <Stat label="Skills offered" value={offered.length} />
          <Stat label="Skills wanted" value={wanted.length} />
        </div>
      </header>

      {/* Trust + reviews panel — Overview only */}
      {section === 'overview' && stats && (
        <section className="surface border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-fg">Earned trust</h2>
              <p className="text-xs text-muted">
                Boost your score by completing sessions, gathering 5-star reviews, and adding portfolio evidence.
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                stats.trustScore >= 70
                  ? 'bg-success'
                  : stats.trustScore >= 40
                    ? 'bg-accent'
                    : 'bg-warning',
              )}
              style={{ width: `${Math.max(4, stats.trustScore)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Pill
              label="Reviews"
              value={stats.reviewCount}
              sub={`${stats.trustBreakdown.reviewSignal} pts`}
              info="Review signal is based on rating and volume (max 40 pts)."
            />
            <Pill
              label="Sessions"
              value={stats.sessionsCompleted}
              sub={`${stats.trustBreakdown.sessionSignal} pts`}
              info="Session signal rewards consistent teaching/learning activity (max 30 pts)."
            />
            <Pill
              label="Portfolio"
              value={stats.portfolioCount}
              sub={`${stats.trustBreakdown.portfolioSignal} pts`}
              info="Portfolio signal validates your skills with external proof (max 30 pts)."
            />
            <Pill
              label="Total Trust"
              value={`${stats.trustScore}%`}
              sub="Combined"
              accent
            />
          </div>
        </section>
      )}

      {section === 'overview' && user?.id && (
        <ReputationSummary userId={user.id} />
      )}

      {section === 'overview' && (
        <section className="surface border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-fg">Weekly availability</h2>
              <p className="text-xs text-muted">
                Mark windows you're typically free. Partners will see overlapping slots when scheduling a session.
              </p>
            </div>
          </div>
          <AvailabilityEditor initial={user?.availability ?? []} />
        </section>
      )}

      {section === 'overview' && myReviews.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            What others said about you
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myReviews.slice(0, 4).map((r: any) => (
              <article key={r.id} className="surface border rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-brand-700 flex items-center justify-center text-white text-xs font-semibold">
                      {r.reviewer?.name?.charAt(0)?.toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold text-fg">{r.reviewer?.name}</span>
                  </div>
                  <span className="flex items-center gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-3.5 h-3.5',
                          i < r.rating ? 'fill-warning' : 'text-muted-2',
                        )}
                      />
                    ))}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-fg-soft leading-relaxed">"{r.comment}"</p>
                )}
                <p className="text-[11px] text-muted-2">
                  {new Date(r.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Skill management — Skills section only */}
      {section === 'skills' && (
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-surface-2 p-1 rounded-xl border border-border w-full sm:w-auto">
            <TabButton active={tab === 'offered'} onClick={() => setTab('offered')} count={offered.length}>
              Skills I teach
            </TabButton>
            <TabButton active={tab === 'wanted'} onClick={() => setTab('wanted')} count={wanted.length}>
              Skills I want
            </TabButton>
          </div>
          <button
            onClick={() => setSkillModal({ mode: 'create' })}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add skill
          </button>
        </div>

        {visibleSkills.length === 0 ? (
          <EmptyState
            title={tab === 'offered' ? 'List a skill you can teach' : 'Add a skill you want to learn'}
            description={
              tab === 'offered'
                ? 'Once you list what you teach, others can request swaps with you.'
                : "Add what you'd like to learn — we'll match you with experts who teach it."
            }
            actionLabel="Add skill"
            onAction={() => setSkillModal({ mode: 'create' })}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                variant="owner"
                onEdit={(s) => setSkillModal({ mode: 'edit', skill: s })}
                onDelete={(s) => setConfirmDelete(s)}
                onToggleActive={(s) => toggleSkill({ variables: { id: s.id } })}
                onManagePortfolio={(s) => setPortfolioSkillId(s.id)}
              />
            ))}
          </div>
        )}
      </section>
      )}

      {/* Add / Edit skill modal */}
      <Modal
        open={!!skillModal}
        onClose={() => setSkillModal(null)}
        title={skillModal?.mode === 'edit' ? 'Edit skill' : 'Add a new skill'}
        description={
          skillModal?.mode === 'edit'
            ? 'Update the details of this skill or change its visibility.'
            : 'Tell the community what you can teach or want to learn.'
        }
      >
        <SkillForm
          initialValues={
            skillModal?.skill
              ? {
                  title: skillModal.skill.title,
                  description: skillModal.skill.description ?? '',
                  category: skillModal.skill.category ?? 'Technology',
                  type: skillModal.skill.type,
                  proficiencyLevel: (skillModal.skill.proficiencyLevel as any) ?? 'INTERMEDIATE',
                  isActive: skillModal.skill.isActive ?? true,
                }
              : undefined
          }
          onSubmit={handleSkillSubmit}
          onCancel={() => setSkillModal(null)}
          loading={adding || updating}
          submitLabel={skillModal?.mode === 'edit' ? 'Save changes' : 'Create skill'}
          showActiveToggle={skillModal?.mode === 'edit'}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this skill?"
        description="This can't be undone. Active match requests for this skill will remain."
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-2 border border-border">
            <p className="font-semibold text-fg">{confirmDelete?.title}</p>
            <p className="text-xs text-muted mt-0.5">{confirmDelete?.category}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => confirmDelete && deleteSkill({ variables: { id: confirmDelete.id } })}
              disabled={deleting}
              className="btn-primary !bg-danger flex items-center gap-2"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete skill
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Edit profile"
        description="Update your public bio and timezone."
      >
        <ProfileForm
          initialValues={{ name: user?.name ?? '', bio: user?.bio ?? '', timezone: user?.timezone ?? '' }}
          loading={savingProfile}
          onCancel={() => setProfileModalOpen(false)}
          onSubmit={(values) => updateProfile({ variables: { input: values } })}
        />
      </Modal>

      {/* Portfolio management */}
      <Modal
        open={!!portfolioSkillId}
        onClose={() => setPortfolioSkillId(null)}
        title="Skill Evidence & Portfolio"
        description="Add links to GitHub, YouTube, or live demos to verify your expertise."
      >
        <PortfolioManager
          skillId={portfolioSkillId ?? ''}
          portfolios={skills.find((s) => s.id === portfolioSkillId)?.portfolios ?? []}
          onClose={() => setPortfolioSkillId(null)}
        />
      </Modal>
    </div>
  );
}



function PortfolioManager({ skillId, portfolios, onClose }: { skillId: string; portfolios: any[]; onClose: () => void }) {
  const [addPortfolio, { loading: adding }] = useMutation(ADD_PORTFOLIO, {
    refetchQueries: [{ query: GET_ME }],
  });
  const [updatePortfolio, { loading: updating }] = useMutation(UPDATE_PORTFOLIO, {
    refetchQueries: [{ query: GET_ME }],
  });
  const [removePortfolio] = useMutation(REMOVE_PORTFOLIO, {
    refetchQueries: [{ query: GET_ME }],
  });

  const [form, setForm] = useState({ title: '', url: '', type: 'other' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.url) return;
    
    if (editingId) {
      await updatePortfolio({
        variables: {
          id: editingId,
          input: { title: form.title, url: form.url, type: form.type },
        },
      });
    } else {
      await addPortfolio({
        variables: {
          input: { ...form, skillId },
        },
      });
    }
    
    setForm({ title: '', url: '', type: 'other' });
    setEditingId(null);
    onClose(); // Close modal on success as requested
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({ title: p.title, url: p.url, type: p.type });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {portfolios.length === 0 ? (
          <p className="text-sm text-muted text-center py-4 bg-surface-2 rounded-xl border border-dashed">
            No evidence added yet. Add a GitHub repo or a demo link below.
          </p>
        ) : (
          <div className="space-y-2">
            {portfolios.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border bg-surface-2 group">
                <div className="flex items-center gap-3">
                  <div className="text-accent">
                    {p.type === 'github' ? <Globe className="w-4 h-4" /> : p.type === 'video' ? <LinkIcon className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-fg">{p.title}</p>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-accent flex items-center gap-1">
                      {p.url.length > 30 ? p.url.substring(0, 30) + '...' : p.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(p)}
                    className="p-2 text-muted hover:text-accent"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removePortfolio({ variables: { id: p.id } })}
                    className="p-2 text-muted hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-surface-2 border space-y-4">
        <p className="text-xs font-bold text-muted uppercase tracking-wider">Add new evidence</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-muted ml-1">Title</span>
            <input
              className="input-base !bg-surface"
              placeholder="e.g. Project Repo"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-muted ml-1">Type</span>
            <select
              className="input-base !bg-surface appearance-none"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="other">Other Link</option>
              <option value="github">GitHub</option>
              <option value="video">Video/YouTube</option>
              <option value="demo">Live Demo</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold text-muted ml-1">URL</span>
          <input
            className="input-base !bg-surface"
            placeholder="https://..."
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
        </label>
        <button type="submit" disabled={adding || updating} className="btn-primary w-full flex items-center justify-center gap-2">
          {(adding || updating) && <Loader2 className="w-4 h-4 animate-spin" />}
          {editingId ? 'Update evidence' : 'Add evidence'}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ title: '', url: '', type: 'other' });
            }}
            className="btn btn-ghost w-full"
          >
            Cancel Edit
          </button>
        )}
      </form>

      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="btn-secondary">Done</button>
      </div>
    </div>
  );
}



function Stat({
  label,
  value,
  accent = false,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  icon?: any;
}) {
  return (
    <div>
      <p className={cn('text-2xl font-bold', accent ? 'text-accent' : 'text-fg')}>{value}</p>
      <p className="text-xs text-muted uppercase tracking-wider mt-0.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
    </div>
  );
}

function Pill({
  label,
  value,
  sub,
  info,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  info?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn('rounded-xl border p-3 flex flex-col justify-between transition-all group', accent ? 'bg-accent-soft border-accent/20' : 'bg-surface-2 border-border')}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</p>
        {info && (
          <div className="relative group/tooltip">
            <Info className="w-3 h-3 text-muted scale-90" />
            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-fg text-bg text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl leading-snug">
              {info}
            </div>
          </div>
        )}
      </div>
      <div className="mt-1">
        <p className={cn('font-bold text-lg leading-none', accent ? 'text-accent' : 'text-fg')}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-muted-2 mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

function SectionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 md:flex-initial px-5 py-2 rounded-lg text-sm font-semibold transition-all',
        active ? 'bg-surface text-fg shadow-sm border border-border' : 'text-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 sm:flex-initial px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
        active ? 'bg-surface text-fg shadow-sm border border-border' : 'text-muted hover:text-fg',
      )}
    >
      {children}
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold',
          active ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-muted',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="surface border border-dashed rounded-2xl p-10 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center mx-auto">
        <Sparkles className="w-6 h-6" />
      </div>
      <div className="max-w-sm mx-auto">
        <h3 className="text-lg font-semibold text-fg">{title}</h3>
        <p className="text-sm text-muted mt-1">{description}</p>
      </div>
      <button onClick={onAction} className="btn-primary">
        {actionLabel}
      </button>
    </div>
  );
}

function ProfileForm({
  initialValues,
  onSubmit,
  onCancel,
  loading,
}: {
  initialValues: { name: string; bio: string; timezone: string };
  onSubmit: (values: { name: string; bio: string; timezone: string }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [values, setValues] = useState(initialValues);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <label className="block space-y-2">
        <span className="label-base">Display name</span>
        <input
          className="input-base"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          maxLength={60}
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="label-base">Bio</span>
        <textarea
          className="input-base min-h-[96px] resize-y"
          value={values.bio}
          onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
          maxLength={280}
          placeholder="A short intro for your public profile."
        />
        <span className="text-[11px] text-muted-2">{values.bio.length}/280</span>
      </label>
      <label className="block space-y-2">
        <span className="label-base">Timezone (optional)</span>
        <input
          className="input-base"
          value={values.timezone}
          onChange={(e) => setValues((v) => ({ ...v, timezone: e.target.value }))}
          placeholder="e.g. Asia/Kolkata"
        />
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Save changes
        </button>
      </div>
    </form>
  );
}
