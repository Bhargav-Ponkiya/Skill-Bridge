export function SkillCardSkeleton() {
  return (
    <div className="surface border rounded-2xl p-5 space-y-4 animate-pulse">
      {/* Header: badge + title + chip */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-2" />
          <div className="space-y-2">
            <div className="w-24 h-4 rounded bg-surface-2" />
            <div className="w-16 h-3 rounded bg-surface-2" />
          </div>
        </div>
        <div className="w-16 h-6 rounded-full bg-surface-2" />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="w-full h-3 rounded bg-surface-2" />
        <div className="w-3/4 h-3 rounded bg-surface-2" />
      </div>

      {/* Portfolio chips */}
      <div className="flex gap-2">
        <div className="w-14 h-5 rounded bg-surface-2" />
        <div className="w-14 h-5 rounded bg-surface-2" />
      </div>

      {/* Footer: avatar + name + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-surface-2" />
          <div className="w-20 h-3 rounded bg-surface-2" />
        </div>
        <div className="w-20 h-3 rounded bg-surface-2" />
      </div>
    </div>
  );
}

export function SessionCardSkeleton() {
  return (
    <div className="surface border rounded-2xl p-5 space-y-4 animate-pulse">
      {/* Status chip + icon */}
      <div className="flex items-center justify-between">
        <div className="w-24 h-6 rounded-full bg-surface-2" />
        <div className="w-4 h-4 rounded bg-surface-2" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <div className="w-48 h-5 rounded bg-surface-2" />
        <div className="w-32 h-3 rounded bg-surface-2" />
      </div>
    </div>
  );
}

export function MatchSuggestionSkeleton() {
  return (
    <div className="surface border rounded-2xl p-5 space-y-4 animate-pulse">
      {/* Title + score */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="w-28 h-5 rounded bg-surface-2" />
          <div className="w-16 h-3 rounded bg-surface-2" />
        </div>
        <div className="w-10 h-10 rounded bg-surface-2" />
      </div>

      {/* Score bar */}
      <div className="w-full h-1 rounded-full bg-surface-2" />

      {/* Description */}
      <div className="space-y-2">
        <div className="w-full h-3 rounded bg-surface-2" />
        <div className="w-3/4 h-3 rounded bg-surface-2" />
      </div>

      {/* Footer: avatar + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-surface-2" />
          <div className="w-20 h-3 rounded bg-surface-2" />
        </div>
        <div className="w-20 h-3 rounded bg-surface-2" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Hero skeleton */}
      <div className="surface border rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-end justify-between">
          <div className="space-y-3">
            <div className="w-40 h-4 rounded bg-surface-2" />
            <div className="w-64 h-9 rounded bg-surface-2" />
            <div className="w-80 h-4 rounded bg-surface-2" />
          </div>
          <div className="flex gap-3">
            <div className="w-32 h-10 rounded-xl bg-surface-2" />
            <div className="w-28 h-10 rounded-xl bg-surface-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-border">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="w-12 h-7 rounded bg-surface-2" />
              <div className="w-20 h-3 rounded bg-surface-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Main + sidebar skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Suggested matches section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="w-40 h-5 rounded bg-surface-2" />
                <div className="w-64 h-3 rounded bg-surface-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <MatchSuggestionSkeleton key={i} />
              ))}
            </div>
          </div>
          {/* Sessions section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-36 h-5 rounded bg-surface-2" />
              <div className="w-16 h-3 rounded bg-surface-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <SessionCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="surface border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-32 h-5 rounded bg-surface-2" />
              <div className="w-6 h-6 rounded-full bg-surface-2" />
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-2" />
                <div className="space-y-2 flex-1">
                  <div className="w-24 h-4 rounded bg-surface-2" />
                  <div className="w-32 h-3 rounded bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
          <div className="surface border rounded-2xl p-5 space-y-3">
            <div className="w-40 h-5 rounded bg-surface-2" />
            <div className="w-full h-3 rounded bg-surface-2" />
            <div className="w-3/4 h-3 rounded bg-surface-2" />
            <div className="w-24 h-3 rounded bg-surface-2" />
          </div>
        </aside>
      </div>
    </div>
  );
}
