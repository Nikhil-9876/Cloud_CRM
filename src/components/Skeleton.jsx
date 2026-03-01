/**
 * Skeleton — reusable shimmer placeholder elements.
 *
 * Usage:
 *   <Skeleton className="h-6 w-48" />           ← single bar
 *   <Skeleton.Table rows={5} cols={4} />         ← full table skeleton
 *   <Skeleton.Card rows={3} />                   ← stacked card skeleton
 *   <Skeleton.StatRow count={5} />               ← dashboard stat cards
 */

const base = 'animate-pulse bg-gray-200 rounded'

const Skeleton = ({ className = 'h-4 w-full' }) => (
  <div className={`${base} ${className}`} />
)

// ── Table skeleton ──────────────────────────────────────────────────────────
Skeleton.Table = function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* header row */}
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`${base} h-4`} style={{ flex: i === 0 ? 2 : 1 }} />
        ))}
      </div>
      {/* data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-6 py-4 flex gap-6 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={`${base} h-4`} style={{ flex: c === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Card list skeleton (activities, etc.) ───────────────────────────────────
Skeleton.Card = function SkeletonCard({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4">
          <div className={`${base} h-5 w-5 rounded-full flex-shrink-0 mt-0.5`} />
          <div className={`${base} h-5 w-16 rounded-full flex-shrink-0`} />
          <div className="flex-1 space-y-2">
            <div className={`${base} h-4 w-3/4`} />
            <div className={`${base} h-3 w-1/2`} />
          </div>
          <div className="flex gap-2">
            <div className={`${base} h-4 w-4`} />
            <div className={`${base} h-4 w-4`} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Stat row (dashboard) ────────────────────────────────────────────────────
Skeleton.StatRow = function SkeletonStatRow({ count = 5 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className={`${base} w-12 h-12 rounded-xl flex-shrink-0`} />
          <div className="flex-1 space-y-2">
            <div className={`${base} h-3 w-20`} />
            <div className={`${base} h-7 w-12`} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Kanban skeleton ─────────────────────────────────────────────────────────
Skeleton.Kanban = function SkeletonKanban({ cols = 6, cardsPerCol = 2 }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: cols }).map((_, ci) => (
        <div key={ci} className="w-64 flex-shrink-0 rounded-2xl border-2 border-gray-200 bg-gray-50 min-h-64">
          <div className={`${base} h-10 rounded-t-xl`} />
          <div className="p-3 space-y-2">
            {Array.from({ length: cardsPerCol }).map((_, ri) => (
              <div key={ri} className={`${base} h-20 rounded-xl`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Section block ───────────────────────────────────────────────────────────
Skeleton.Section = function SkeletonSection({ lines = 3 }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
      <div className={`${base} h-5 w-40`} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`${base} h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  )
}

export default Skeleton
