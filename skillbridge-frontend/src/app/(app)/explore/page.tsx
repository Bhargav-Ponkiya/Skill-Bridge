'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client/react';
import { SEARCH_SKILLS, GET_ME } from '@/graphql/queries';
import { SEND_MATCH_REQUEST } from '@/graphql/mutations';
import { Search, Loader2, Compass, Zap, ArrowRight } from 'lucide-react';
import { SkillCard, type SkillCardSkill } from '@/components/SkillCard';
import { SkillCardSkeleton } from '@/components/Skeletons';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'Technology', 'Design', 'Business', 'Music', 'Cooking', 'Language', 'Lifestyle', 'Fitness', 'Writing'];

type SkillTypeFilter = 'OFFER' | 'WANT' | 'ALL';

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState<SkillTypeFilter>('OFFER');
  const [swap, setSwap] = useState<SkillCardSkill | null>(null);
  const [offeredSkillId, setOfferedSkillId] = useState('');
  const [message, setMessage] = useState('');
  const LIMIT = 12;

  const { data: meData } = useQuery<any>(GET_ME);
  const { data, loading, error: searchError, fetchMore, refetch } = useQuery<any>(SEARCH_SKILLS, {
    variables: {
      query: query.trim() || null,
      category: category === 'All' ? null : category,
      type: type === 'ALL' ? null : type,
      pagination: { limit: LIMIT },
    },
    notifyOnNetworkStatusChange: true,
  });

  const myOfferSkills = useMemo(
    () => (meData?.me?.skills ?? []).filter((s: any) => s.type === 'OFFER' && s.isActive !== false),
    [meData],
  );
  const skills: SkillCardSkill[] = data?.searchSkills?.edges?.map((e: any) => e.node) ?? [];
  const pageInfo = data?.searchSkills?.pageInfo;
  const totalCount = data?.searchSkills?.totalCount;

  const [sendMatchRequest, { loading: sending }] = useMutation(SEND_MATCH_REQUEST, {
    onCompleted: () => {
      setSwap(null);
      setOfferedSkillId('');
      setMessage('');
      toast.success('Swap request sent! We notified your partner.');
    },
    onError: (err) => toast.error(err.message),
  });

  const submitSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swap || !swap.user || !offeredSkillId) return;
    sendMatchRequest({
      variables: {
        input: {
          toUserId: swap.user.id,
          wantedSkillId: swap.id,
          offeredSkillId,
          message:
            message.trim() ||
            `Hi ${swap.user.name}, I'd love to swap skills around "${swap.title}".`,
        },
      },
    });
  };

  // Infinite scroll: observe bottom sentinel.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMore = useRef(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pageInfo?.hasNextPage && !isLoadingMore.current && !loading) {
          isLoadingMore.current = true;
          fetchMore({
            variables: { pagination: { cursor: pageInfo.endCursor, limit: LIMIT } },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!fetchMoreResult?.searchSkills?.edges?.length) return prev;
              return {
                searchSkills: {
                  ...fetchMoreResult.searchSkills,
                  edges: [...(prev.searchSkills?.edges ?? []), ...fetchMoreResult.searchSkills.edges],
                },
              };
            },
          }).finally(() => {
            isLoadingMore.current = false;
          });
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageInfo, loading, fetchMore]);

  // Reset when filters change.
  const resetFilters = () => {
    refetch({
      query: null,
      category: null,
      type: 'OFFER',
      pagination: { limit: LIMIT },
    });
  };

  const handleFilterChange = (updates: { query?: string; category?: string; type?: SkillTypeFilter }) => {
    if (updates.query !== undefined) setQuery(updates.query);
    if (updates.category !== undefined) setCategory(updates.category);
    if (updates.type !== undefined) setType(updates.type);
    refetch({
      query: updates.query?.trim() || null,
      category: updates.category === 'All' ? null : updates.category,
      type: updates.type === 'ALL' ? null : updates.type,
      pagination: { limit: LIMIT },
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Search & Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-surface p-6 sm:p-8 md:p-12">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" /> Explorer Mode
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-fg tracking-tight leading-[1.1]">
            Learn anything, <br />
            <span className="text-accent underline decoration-accent/30 underline-offset-8">swap everything.</span>
          </h1>
          <p className="text-base text-muted leading-relaxed max-w-xl">
            Join the world's most active skill-swapping community. Find mentors, teaching partners, and collaborators across thousands of skills.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted group-focus-within:text-accent transition-colors" />
              <input
                type="text"
                placeholder="What do you want to learn today?"
                value={query}
                onChange={(e) => handleFilterChange({ query: e.target.value })}
                className="input-base !h-14 pl-12 !rounded-2xl !bg-surface/80 backdrop-blur-sm border-border shadow-sm focus:shadow-md transition-all text-base"
              />
            </div>
            <div className="flex bg-surface-2 p-1.5 rounded-2xl border border-border w-full sm:w-auto">
              {(['OFFER', 'WANT', 'ALL'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleFilterChange({ type: t })}
                  className={cn(
                    'flex-1 sm:flex-initial px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all',
                    type === t ? 'bg-surface text-accent shadow-sm border border-border' : 'text-muted hover:text-fg',
                  )}
                >
                  {t === 'OFFER' ? 'Teach' : t === 'WANT' ? 'Want' : 'Both'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category Scroller */}
      <div className="sticky top-[72px] z-20 bg-bg/80 backdrop-blur-md py-4 border-b border-transparent transition-all">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleFilterChange({ category: cat })}
              className={cn(
                'whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold border transition-all',
                category === cat
                  ? 'bg-accent border-accent text-white shadow-md'
                  : 'bg-surface border-border text-fg-soft hover:border-accent/40'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning" />
            <h2 className="text-lg font-bold text-fg">
              {category === 'All' ? 'Latest Opportunities' : `Top in ${category}`}
            </h2>
          </div>
          {totalCount != null && <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-md">{totalCount} results</span>}
        </div>

        {searchError && skills.length === 0 ? (
          <div className="surface border border-danger/20 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto">
            <p className="text-xl font-bold text-danger">Search failed</p>
            <p className="text-muted">{searchError.message}</p>
            <button onClick={() => refetch()} className="btn-primary">Try again</button>
          </div>
        ) : loading && skills.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <SkillCardSkeleton key={i} />
            ))}
          </div>
        ) : skills.length === 0 ? (
          <div className="surface border border-dashed rounded-3xl p-6 sm:p-10 lg:p-16 text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-2">
              <Search className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-xl font-bold text-fg">No direct matches found</h3>
            <p className="text-muted leading-relaxed">
              We couldn't find exactly what you're looking for. Try broadening your keywords or exploring other categories.
            </p>
            <button
              onClick={resetFilters}
              className="btn-primary !px-8"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  variant="public"
                  onConnect={skill.type === 'OFFER' ? () => setSwap(skill) : undefined}
                  footer={
                    <Link
                      href={`/${encodeURIComponent(skill.user?.name ?? '')}`}
                      className="text-[10px] font-bold text-muted-2 hover:text-accent uppercase tracking-widest flex items-center justify-between group"
                    >
                      Partner Portfolio <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  }
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="flex justify-center py-8">
              {pageInfo?.hasNextPage && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading more...
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Swap modal */}
      <Modal
        open={!!swap}
        onClose={() => setSwap(null)}
        title="Propose a swap"
        description={swap ? `Pick which of your skills you'll teach in return for "${swap.title}".` : ''}
      >
        {swap && swap.user && (
          <form onSubmit={submitSwap} className="space-y-5">
            <div className="p-4 rounded-xl bg-accent-soft border border-accent/20">
              <p className="label-base">You want to learn</p>
              <p className="font-semibold text-fg mt-1">{swap.title}</p>
              <p className="text-xs text-muted mt-1">From {swap.user.name}</p>
            </div>

            <div className="space-y-2">
              <p className="label-base">What you'll teach in return</p>
              {myOfferSkills.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface-2 border border-dashed text-sm text-muted">
                  You don't have any skills to teach yet.{' '}
                  <Link href="/profile" className="font-semibold text-accent hover:underline">
                    Add one →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                  {myOfferSkills.map((skill: any) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => setOfferedSkillId(skill.id)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                        offeredSkillId === skill.id
                          ? 'border-accent bg-accent-soft'
                          : 'border-border hover:border-border-strong',
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold text-fg">{skill.title}</p>
                        <p className="text-xs text-muted">{skill.category} • {skill.proficiencyLevel}</p>
                      </div>
                      {offeredSkillId === skill.id && <Zap className="w-4 h-4 text-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="block space-y-2">
              <span className="label-base">Personal note (optional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Why this swap interests you…"
                className="input-base"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setSwap(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!offeredSkillId || sending}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                Send swap request
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
