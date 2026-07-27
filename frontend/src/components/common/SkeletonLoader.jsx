import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-slate-100 border border-slate-200/50 rounded-xl p-4 animate-pulse flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-200 rounded-lg flex-shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-16" />
        <div className="h-5 bg-slate-200 rounded w-24" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 animate-pulse space-y-4">
      {/* Header bar placeholder */}
      <div className="h-8 bg-slate-100 rounded w-full mb-6" />
      
      {/* Table Rows */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-4 py-3 border-b border-slate-50 last:border-0">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div 
                key={cIdx} 
                className="h-4 bg-slate-100 rounded" 
                style={{ flex: cIdx === 0 ? 2 : 1 }} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-50 rounded-xl p-6 h-64 space-y-4">
          <div className="h-5 bg-slate-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-slate-100 rounded w-full" />
          <div className="h-4 bg-slate-100 rounded w-5/6" />
          <div className="h-4 bg-slate-100 rounded w-4/5" />
        </div>
        <div className="bg-slate-50 rounded-xl p-6 h-64 space-y-4">
          <div className="h-5 bg-slate-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-slate-100 rounded w-full" />
          <div className="h-4 bg-slate-100 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 6 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-1/3 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-24" />
            <div className="h-10 bg-slate-100 rounded w-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-slate-200">
        <div className="h-10 bg-slate-100 rounded w-24" />
        <div className="h-10 bg-slate-200 rounded w-32" />
      </div>
    </div>
  );
}

export function GridSkeleton({ items = 6, cols = 3 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-${cols} gap-4`}>
      {Array.from({ length: items }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
            <div className="h-6 w-16 bg-slate-100 rounded-full" />
          </div>
          <div className="space-y-2 mt-4">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-8 animate-pulse">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-slate-300 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-slate-300 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-64" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 animate-pulse">
      {Array.from({ length: items }).map((_, idx) => (
        <div key={idx} className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="h-8 w-20 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

export function FullPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="h-8 bg-slate-200 rounded w-1/3" />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      
      {/* Main Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-4 bg-slate-100 rounded" style={{ width: `${Math.random() * 30 + 70}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
