/**
 * EnterprisePageTemplate — Premium Enterprise Grade
 * ─────────────────────────────────────────────────
 * • Zero scroll (fits exactly in viewport height)
 * • Compact KPI cards with gradient icon badges
 * • Premium toolbar: search + filter dropdowns + export + bulk + add
 * • Fixed 7-row table with padded empty rows
 * • Footer: "Showing X–Y of Z" left · pagination right
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, SlidersHorizontal, Download, Plus, Upload,
  ChevronLeft, ChevronRight, FileDown, FileText,
  X, ChevronDown, TrendingUp, TrendingDown,
} from 'lucide-react';

const ROWS = 8;

/* ─── Gradient KPI Card ─────────────────────────────────────────────────── */
const GRAD_MAP = {
  indigo:  { from: '#6366F1', to: '#8B5CF6', light: '#EEF2FF', text: '#4338CA' },
  emerald: { from: '#10B981', to: '#059669', light: '#ECFDF5', text: '#047857' },
  amber:   { from: '#F59E0B', to: '#D97706', light: '#FFFBEB', text: '#B45309' },
  rose:    { from: '#F43F5E', to: '#E11D48', light: '#FFF1F2', text: '#BE123C' },
  sky:     { from: '#0EA5E9', to: '#0284C7', light: '#F0F9FF', text: '#0369A1' },
  teal:    { from: '#0A686A', to: '#003A40', light: '#F0FDFA', text: '#0F766E' },
  purple:  { from: '#A855F7', to: '#7C3AED', light: '#FAF5FF', text: '#7E22CE' },
  cyan:    { from: '#06B6D4', to: '#0891B2', light: '#ECFEFF', text: '#0E7490' },
};

function KpiCard({ title, value, sub, trend, trendUp, icon, gradient = 'indigo' }) {
  const g = GRAD_MAP[gradient] || GRAD_MAP.indigo;
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#E6EDF2] bg-white hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 p-4 flex items-center gap-3.5"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 inset-x-0 h-0.5 rounded-t-xl"
        style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }}
      />
      {/* Icon Badge */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
        style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})`, boxShadow: `0 4px 12px ${g.from}40` }}
      >
        {icon}
      </div>
      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#8C98A5' }}>
          {title}
        </p>
        <p className="text-xl font-extrabold leading-none" style={{ color: '#003A40', fontFamily: "'Outfit', sans-serif" }}>
          {value}
        </p>
        {(sub || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendUp ? 'text-emerald-600' : 'text-rose-500'}`}>
                {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trend}
              </span>
            )}
            {sub && !trend && <span className="text-[10px] text-[#8C98A5] font-medium">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Filter Pill Dropdown ──────────────────────────────────────────────── */
function FilterPill({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = options.find(o => o.value === value);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
          value
            ? 'border-[#0A686A] bg-[#F0FDFA] text-[#0A686A]'
            : 'border-[#E6EDF2] bg-white text-[#5F6B7A] hover:border-[#0A686A]/50 hover:bg-[#F0FDFA]/50'
        }`}
      >
        <span>{selected ? selected.label : label}</span>
        {value
          ? <X className="w-3 h-3 cursor-pointer" onClick={e => { e.stopPropagation(); onChange(''); }} />
          : <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        }
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E6EDF2] rounded-xl shadow-lg overflow-hidden min-w-[140px]">
          <div className="p-1">
            <button
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 text-[11px] text-[#8C98A5] hover:bg-slate-50 rounded-lg cursor-pointer"
            >All</button>
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors ${
                  value === o.value ? 'bg-[#F0FDFA] text-[#0A686A]' : 'text-[#1B1F24] hover:bg-slate-50'
                }`}
              >{o.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Export Dropdown ───────────────────────────────────────────────────── */
function ExportMenu({ onCSV, onPDF }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-[#E6EDF2] bg-white text-[11px] font-semibold text-[#5F6B7A] hover:border-[#E6EDF2] hover:bg-[#F4F7FF] transition-all cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-[#E6EDF2] rounded-xl shadow-lg overflow-hidden min-w-[148px]">
          <div className="p-1">
            {onCSV && (
              <button
                onClick={() => { onCSV(); setOpen(false); }}
                className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-[#1B1F24] hover:bg-[#F4F7FF] rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-600" /> CSV
              </button>
            )}
            {onPDF && (
              <button
                onClick={() => { onPDF(); setOpen(false); }}
                className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-[#1B1F24] hover:bg-[#F4F7FF] rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" /> PDF
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────────────── */
function Skeleton({ cols = 6 }) {
  return (
    <div className="flex flex-col h-full gap-3 animate-pulse">
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-[72px] bg-white rounded-xl border border-[#E6EDF2]" />
        ))}
      </div>
      <div className="flex-1 bg-white rounded-xl border border-[#E6EDF2]" />
    </div>
  );
}

/* ─── Main Template ─────────────────────────────────────────────────────── */
export default function EnterprisePageTemplate({
  kpiCards = [],
  columns = [],
  rows = [],
  actions = [],
  rowKey = 'id',
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterOptions = [],
  activeFilters = {},
  onFilterChange,
  onExportCSV,
  onExportPDF,
  onAdd,
  addLabel = 'Add',
  onBulkUpload,
  loading = false,
  emptyMessage = 'No records found.',
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS));
  const pageRows = useMemo(() => rows.slice((page - 1) * ROWS, page * ROWS), [rows, page]);

  // Pad to always 7 rows
  const displayRows = useMemo(() => {
    const r = [...pageRows];
    while (r.length < ROWS) r.push(null);
    return r;
  }, [pageRows]);

  const from = rows.length === 0 ? 0 : (page - 1) * ROWS + 1;
  const to = Math.min(page * ROWS, rows.length);

  if (loading) return <Skeleton cols={columns.length + 1} />;

  return (
    <div
      className="flex flex-col gap-3"
      style={{ height: '100%', overflow: 'hidden' }}
    >
      {/* ── KPI Cards ─────────────────────────────────── */}
      {kpiCards.length > 0 && (
        <div className={`grid gap-3 flex-shrink-0 ${
          kpiCards.length === 2 ? 'grid-cols-2' :
          kpiCards.length === 3 ? 'grid-cols-3' :
          'grid-cols-2 lg:grid-cols-4'
        }`}>
          {kpiCards.map((c, i) => <KpiCard key={i} {...c} />)}
        </div>
      )}

      {/* ── Table Card ───────────────────────────────── */}
      <div
        className="flex flex-col flex-1 min-h-0 rounded-xl border border-[#E6EDF2] bg-white overflow-hidden"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-[#EEF4F7] bg-white flex-shrink-0">
          {/* Search */}
          <div className="flex items-center gap-2 h-8 px-3 bg-[#F8FAFC] border border-[#E6EDF2] rounded-lg flex-1 min-w-[180px] max-w-xs focus-within:border-[#0A686A] focus-within:ring-1 focus-within:ring-[#0A686A]/20 transition-all">
            <Search className="w-3.5 h-3.5 text-[#8C98A5] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { onSearchChange?.(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent border-none outline-none text-[11px] font-medium text-[#1B1F24] placeholder-[#A0AEC0]"
            />
            {searchQuery && (
              <button onClick={() => { onSearchChange?.(''); setPage(1); }} className="text-[#8C98A5] hover:text-rose-500 transition-colors cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filters */}
          {filterOptions.map(fo => (
            <FilterPill
              key={fo.key}
              label={fo.label}
              options={fo.options}
              value={activeFilters[fo.key] || ''}
              onChange={v => { onFilterChange?.(fo.key, v); setPage(1); }}
            />
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {(onExportCSV || onExportPDF) && <ExportMenu onCSV={onExportCSV} onPDF={onExportPDF} />}
            {onBulkUpload && (
              <button
                onClick={onBulkUpload}
                className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-[#E6EDF2] bg-white text-[11px] font-semibold text-[#5F6B7A] hover:bg-[#F4F7FF] transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Bulk Upload
              </button>
            )}
            {onAdd && (
              <button
                onClick={onAdd}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-[11px] font-bold text-white transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #003A40, #0A686A)', boxShadow: '0 2px 8px rgba(0,58,64,0.3)' }}
              >
                <Plus className="w-3.5 h-3.5" /> {addLabel}
              </button>
            )}
          </div>
        </div>

        {/* Table Container with Internal Scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
            <thead className="sticky top-0 z-10 shadow-xs" style={{ backgroundColor: '#FAFBFF' }}>
              <tr className="border-b border-[#EEF4F7]" style={{ backgroundColor: '#FAFBFF' }}>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap select-none"
                    style={{ color: '#8C98A5', fontFamily: "'Outfit', sans-serif", width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-4 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-widest select-none" style={{ color: '#8C98A5', width: '100px' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                    className="text-center py-12"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-[#DCE5EA]" />
                      <p className="text-xs font-semibold text-[#8C98A5]">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => (
                  <tr
                    key={row ? (row[rowKey] || idx) : `empty-${idx}`}
                    className="border-b border-[#F4F7FF] last:border-b-0 transition-colors"
                    style={{
                      height: '50px',
                      backgroundColor: row && idx % 2 === 0 ? '#FFFFFF' : row ? '#FAFBFF' : 'transparent'
                    }}
                    onMouseEnter={e => row && (e.currentTarget.style.backgroundColor = '#F0FDFA')}
                    onMouseLeave={e => row && (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFF')}
                  >
                    {row ? (
                      <>
                        {columns.map(col => (
                          <td key={col.key} className="px-4 py-2.5 overflow-hidden">
                            {col.render
                              ? col.render(row[col.key], row)
                              : <span className="text-xs font-medium text-[#1B1F24] truncate block">{row[col.key] ?? '—'}</span>
                            }
                          </td>
                        ))}
                        {actions.length > 0 && (
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              {actions.map((a, ai) => (
                                <button
                                  key={ai}
                                  title={a.label}
                                  aria-label={a.label}
                                  onClick={() => a.onClick(row)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                    a.color === 'red' ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600' :
                                    a.color === 'blue' ? 'text-blue-400 hover:bg-blue-50 hover:text-blue-600' :
                                    a.color === 'teal' ? 'text-[#0A686A] hover:bg-[#F0FDFA]' :
                                    'text-[#8C98A5] hover:bg-[#F4F7FF] hover:text-[#003A40]'
                                  }`}
                                >
                                  {a.icon}
                                </button>
                              ))}
                            </div>
                          </td>
                        )}
                      </>
                    ) : (
                      <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} />
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: count left · pagination right */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-[#EEF4F7] bg-white">
          {/* Showing X-Y of Z */}
          <span className="text-[11px] font-semibold text-[#8C98A5]">
            Showing{' '}
            <span className="font-bold text-[#003A40]">{from}–{to}</span>
            {' '}of{' '}
            <span className="font-bold text-[#003A40]">{rows.length}</span>{' '}records
          </span>

          {/* Pagination right-aligned */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 rounded-lg border border-[#E6EDF2] flex items-center justify-center text-[#5F6B7A] hover:border-[#0A686A]/30 hover:bg-[#F0FDFA] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => {
                if (totalPages <= 5) return true;
                return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
              })
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…' + p);
                acc.push(p);
                return acc;
              }, [])
              .map(item =>
                typeof item === 'string' ? (
                  <span key={item} className="px-1 text-[10px] text-[#8C98A5]">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      page === item
                        ? 'text-white shadow-sm'
                        : 'text-[#5F6B7A] hover:bg-[#F4F7FF] border border-transparent hover:border-[#E6EDF2]'
                    }`}
                    style={page === item ? { background: 'linear-gradient(135deg, #003A40, #0A686A)' } : {}}
                  >
                    {item}
                  </button>
                )
              )
            }

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 rounded-lg border border-[#E6EDF2] flex items-center justify-center text-[#5F6B7A] hover:border-[#0A686A]/30 hover:bg-[#F0FDFA] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
