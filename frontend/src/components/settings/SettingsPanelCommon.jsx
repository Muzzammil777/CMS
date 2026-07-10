import { useEffect } from 'react';

/* ── Shared helpers used across all settings panels ───────────────────── */

/** Standard input class matching app design */
export const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4c1d95]/20 focus:border-[#4c1d95] outline-none transition-all text-sm text-slate-700 bg-white';

/** Standard label class */
export const labelCls = 'block text-sm font-semibold text-slate-700 mb-1.5';

/** Section card wrapper */
export function SettingsCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/** Save/Reset action bar */
export function SettingsActions({ onSave, onReset, saving = false, disableSave = false }) {
  return (
    <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
      <button
        type="button"
        onClick={onReset}
        className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disableSave}
        className="px-6 py-2 bg-[#4c1d95] hover:bg-[#3b0764] text-white text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

/** Error banner */
export function SettingsError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
      {message}
    </div>
  );
}

/** Success/info toast (bottom-right) */
export function SettingsToast({ message, onClear }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => onClear(), 3000);
    return () => clearTimeout(t);
  }, [message, onClear]);

  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 bg-white border border-emerald-200 shadow-lg rounded-xl text-sm font-semibold text-emerald-700">
      <span className="material-symbols-outlined text-[18px]">check_circle</span>
      {message}
    </div>
  );
}

/** Skeleton loader */
export function SettingsLoader({ label = 'Loading…' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 flex items-center justify-center gap-3 text-slate-400 text-sm">
      <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-200 border-t-[#4c1d95] animate-spin" />
      {label}
    </div>
  );
}

/** Toggle row */
export function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer group">
      <div>
        <p className="text-sm font-semibold text-slate-800 group-hover:text-[#4c1d95] transition-colors">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="relative flex-shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-10 h-5 bg-slate-200 peer-checked:bg-[#4c1d95] rounded-full transition-colors duration-200" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

export function isDirty(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
