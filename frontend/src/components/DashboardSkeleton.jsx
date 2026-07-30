import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="w-full space-y-5 animate-pulse select-none">
      {/* Animated Running Animal Banner */}
      <div className="relative w-full h-12 bg-gradient-to-r from-[#03323A]/10 via-[#0A686A]/20 to-[#03323A]/10 rounded-2xl overflow-hidden flex items-center px-4 border border-[#0A686A]/10">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#003A40]">
          <span className="w-2 h-2 rounded-full bg-[#0A686A] animate-ping" />
          <span>Loading MIT Campus Dashboard telemetry...</span>
        </div>

        {/* Running Animal Micro-Animation (Cheetah/Cat Silhouette) */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#003A40]"
          style={{
            animation: 'runAcross 3.5s linear infinite'
          }}
        >
          {/* Running Animal SVG */}
          <svg 
            className="w-8 h-8 text-[#003A40] drop-shadow-sm" 
            viewBox="0 0 64 64" 
            fill="currentColor"
            style={{ animation: 'animalBounce 0.35s ease-in-out infinite alternate' }}
          >
            {/* Running Cat/Cheetah Path */}
            <path d="M52 24c-2-2-5-3-8-2l-4 3c-3 2-7 2-10 0l-6-4c-2-1-5-1-7 1l-5 5c-2 2-3 5-2 8 1 2 3 4 5 5l6 3c3 1 6 1 9-1l5-4c2-1 4-2 7-1l6 2c2 1 4 0 5-2 1-2 1-5-1-7zm-42 6l4-4 4 2-3 4-5-2zm38-8c1-1 3-1 4 0s1 3 0 4l-4-4z" />
            <circle cx="48" cy="20" r="2.5" fill="#0A686A" />
            {/* Running Legs */}
            <path d="M18 36l-4 10m8-8l3 9m20-11l-3 10m8-8l5 8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] font-bold text-[#0A686A] opacity-75">Loading...</span>
        </div>

        <style>{`
          @keyframes runAcross {
            0% { left: -10%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { left: 105%; opacity: 0; }
          }
          @keyframes animalBounce {
            0% { transform: translateY(-50%) translateY(0px) rotate(0deg); }
            100% { transform: translateY(-50%) translateY(-6px) rotate(-3deg); }
          }
        `}</style>
      </div>

      {/* Header Greeting Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 rounded-xl" />
          <div className="h-4 w-80 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-36 bg-slate-200 rounded-xl" />
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* 5 KPI Metric Cards Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex-shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-6 w-16 bg-slate-200 rounded-md" />
              <div className="h-3 w-20 bg-slate-100 rounded-md" />
              <div className="h-3 w-24 bg-slate-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Analytics Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Fee Collection Overview */}
        <div className="lg:col-span-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 bg-slate-200 rounded-lg" />
            <div className="h-7 w-24 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-10 w-44 bg-slate-200 rounded-xl" />
          <div className="h-4 w-full bg-slate-200 rounded-full" />
        </div>

        {/* Student Admissions Line Chart */}
        <div className="lg:col-span-5 p-5 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 bg-slate-200 rounded-lg" />
            <div className="h-7 w-24 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-28 w-full bg-slate-100 rounded-xl" />
        </div>

        {/* Announcements */}
        <div className="lg:col-span-3 p-5 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-28 bg-slate-200 rounded-lg" />
            <div className="h-4 w-12 bg-slate-100 rounded-lg" />
          </div>
          {[1, 2, 3].map((j) => (
            <div key={j} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
              <div className="space-y-1 flex-1">
                <div className="h-3 w-32 bg-slate-200 rounded" />
                <div className="h-2 w-20 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Schedule & Donut Chart Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 p-5 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="h-5 w-44 bg-slate-200 rounded-lg" />
          <div className="h-32 w-full bg-slate-100 rounded-xl" />
        </div>

        <div className="lg:col-span-5 p-5 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="h-5 w-40 bg-slate-200 rounded-lg" />
          <div className="h-32 w-full bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
