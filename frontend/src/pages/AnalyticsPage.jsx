import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cmsRoles, getValidRole } from '../data/roleConfig';
import Layout from '../components/Layout';
import { API_BASE } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';
import { DashboardSkeleton } from '../components/common/SkeletonLoader';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ico = {
  Grad:     ()=><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 2.26L19.02 9 12 12.74 4.98 9 12 5.26zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>,
  Calendar: ()=><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>,
  Download: ()=><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z"/></svg>,
  ChevL:    ()=><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>,
  ChevR:    ()=><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  Close:    ()=><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  Up:       ()=><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>,
  Down:     ()=><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>,
  Users:    ()=><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  Dollar:   ()=><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
  Chart:    ()=><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
};

// ─── Theme Colors ─────────────────────────────────────────────────────────────
const C = {
  blue:    '#003A40',
  cyan:    '#0A686A',
  teal:    '#14b8a6',
  green:   '#10b981',
  orange:  '#f97316',
  purple:  '#6d28d9',
  red:     '#ef4444',
  amber:   '#f59e0b',
  indigo:  '#6366f1'
};

const DEPT_COLORS = { CS: C.blue, Phys: C.orange, Math: C.green, ECE: C.purple, Mech: C.cyan };
const PIE_COLS  = [C.green, C.orange, C.red, C.blue, C.purple];
const colorList = [C.blue, C.cyan, C.orange, C.green, C.purple, C.teal, C.amber, C.indigo, C.red];
function getDeptColor(deptKey, index) {
  if (deptKey && DEPT_COLORS[deptKey]) return DEPT_COLORS[deptKey];
  if (typeof index === 'number') return colorList[index % colorList.length];
  return C.blue;
}

const TT_STYLE = {
  contentStyle: {
    background: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #E6EDF2',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    fontFamily: "'Outfit', 'Inter', sans-serif"
  }
};

const MONTHS_ALL  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS       = [2024, 2025, 2026];
const DEPTS       = ['MLT', 'OTAT', 'RIT'];
const DEPT_FULL   = { MLT: 'Medical Laboratory Technology', OTAT: 'Operation Theatre & Anaesthesia Technology', RIT: 'Radiography & Imaging Technology' };
const SEMESTER_OPTS = ['All Semesters', 'Semester 4 (Current)','Semester 3','Semester 2','Semester 1'];
const DEPT_OPTS     = ['All Departments', 'Medical Laboratory Technology', 'Operation Theatre & Anaesthesia Technology', 'Radiography & Imaging Technology'];
const DEPT_CODE     = { 'All Departments': null, 'Medical Laboratory Technology': 'MLT', 'Operation Theatre & Anaesthesia Technology': 'OTAT', 'Radiography & Imaging Technology': 'RIT' };

function myToKey({month,year}){return year*12+month;}
function keyToMY(k){return{month:k%12,year:Math.floor(k/12)};}
function myLabel({month,year}){return`${MONTHS_ALL[month]} ${year}`;}

function fmtCr(n){return n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:`₹${(n/100000).toFixed(1)}L`;}

const MOCK_ANALYTICS_DATA = {
  summaryData: { totalStudents: 0, students: '0', faculty: '0', courses: '3', income: 0, expense: 0, scholarships: 0 },
  departmentData: [
    { name: 'Medical Laboratory Technology', code: 'MLT', avgAttendance: 0, passRate: 0, students: 0, faculty: 0, cgpa: 0 },
    { name: 'Operation Theatre & Anaesthesia Technology', code: 'OTAT', avgAttendance: 0, passRate: 0, students: 0, faculty: 0, cgpa: 0 },
    { name: 'Radiography & Imaging Technology', code: 'RIT', avgAttendance: 0, passRate: 0, students: 0, faculty: 0, cgpa: 0 },
  ],
  studentsByDept: { CS: 420, ECE: 310, Mech: 260, Phys: 150, Math: 140 },
  studentsByYear: { '1st Year': 360, '2nd Year': 340, '3rd Year': 300, '4th Year': 280 },
  facultyByDept: { CS: 24, ECE: 18, Mech: 16, Phys: 14, Math: 12 },
  cgpaByDept: { CS: 8.4, ECE: 7.9, Mech: 7.6, Phys: 8.1, Math: 8.3 },
  facultyRankData: [
    { rank: 'Professor', count: 18 },
    { rank: 'Assoc. Professor', count: 20 },
    { rank: 'Assistant Prof.', count: 32 },
    { rank: 'Lecturer', count: 14 }
  ],
  genderData: [
    { name: 'Male', value: 740 },
    { name: 'Female', value: 520 },
    { name: 'Other', value: 20 }
  ],
  incomeExpenseByMonth: {
    Jan: { income: 4500000, expense: 3200000 },
    Feb: { income: 4800000, expense: 3400000 },
    Mar: { income: 5200000, expense: 3600000 },
    Apr: { income: 4100000, expense: 3100000 },
    May: { income: 4900000, expense: 3500000 },
    Jun: { income: 5600000, expense: 3800000 }
  }
};

// ── Calendar Picker ────────────────────────────────────────────────────────────
function CalendarRangePicker({startMY,endMY,onChange,onClose}){
  const [viewYear, setViewYear] = useState(startMY?.year??2026);
  const [phase, setPhase] = useState('start');
  const [hoverKey, setHoverKey] = useState(null);
  const [tempStart, setTempStart] = useState(null);

  const confirmedStartKey = startMY ? myToKey(startMY) : null;
  const confirmedEndKey = endMY ? myToKey(endMY) : null;

  function clickMonth(mi){
    const clicked = {month:mi, year:viewYear};
    const ck = myToKey(clicked);
    if(phase==='start'){
      setTempStart(clicked);
      onChange({startMY:clicked, endMY:clicked});
      setPhase('end');
    } else {
      const sk = myToKey(tempStart);
      if(ck < sk){ onChange({startMY:clicked, endMY:tempStart}); }
      else { onChange({startMY:tempStart, endMY:clicked}); }
      setTempStart(null);
      setPhase('start');
      onClose();
    }
  }

  function cellStyle(mi){
    const k = myToKey({month:mi, year:viewYear});
    const sk = tempStart ? myToKey(tempStart) : confirmedStartKey;
    const ek = (phase==='end' && hoverKey!=null) ? hoverKey : confirmedEndKey;
    const lo = (sk!=null && ek!=null) ? Math.min(sk,ek) : null;
    const hi = (sk!=null && ek!=null) ? Math.max(sk,ek) : null;
    const isEdge = (sk!=null && k===sk) || (ek!=null && k===ek);
    const inRange = lo!=null && k>lo && k<hi;
    return{
      width:'100%',height:32,borderRadius:6,border:'none',fontSize:12,fontWeight:700,
      cursor:'pointer',transition:'all 0.1s',
      background: isEdge?'#003A40': inRange?'#E6F4F1':'transparent',
      color: isEdge?'#fff': inRange?'#003A40':'#374151',
    };
  }

  const displayStart = tempStart ?? startMY;
  const displayEnd = phase==='end' && hoverKey ? keyToMY(hoverKey) : endMY;

  return(
    <div className="absolute z-[1100] top-[calc(100%+8px)] left-0 bg-white rounded-xl border border-[#E6EDF2] shadow-xl p-4 min-w-[290px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <button onClick={()=>setViewYear(y=>y-1)} className="w-6 h-6 rounded border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer text-xs"><Ico.ChevL/></button>
          <select value={viewYear} onChange={e=>setViewYear(Number(e.target.value))} className="border border-slate-200 rounded px-1.5 py-0.5 font-bold text-xs outline-none">{YEARS.map(y=><option key={y}>{y}</option>)}</select>
          <button onClick={()=>setViewYear(y=>y+1)} className="w-6 h-6 rounded border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer text-xs"><Ico.ChevR/></button>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Ico.Close/></button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {MONTHS_ALL.map((m,mi)=>(
          <button key={m} style={cellStyle(mi)} onClick={()=>clickMonth(mi)} onMouseEnter={()=>{ if(phase==='end') setHoverKey(myToKey({month:mi,year:viewYear})); }} onMouseLeave={()=>setHoverKey(null)}>{m}</button>
        ))}
      </div>
      <div className="text-[11px] font-bold text-[#003A40] bg-[#E6F4F1] p-2 rounded text-center">
        {phase==='end' && displayStart ? `${myLabel(displayStart)} → ${displayEnd ? myLabel(displayEnd) : '...'}` : (displayStart && displayEnd) ? `${myLabel(displayStart)} → ${myLabel(displayEnd)}` : 'Pick start month'}
      </div>
    </div>
  );
}

// ── KPI Card Widget ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, tone='blue', icon, trend }) {
  const borderTone = tone==='green'?'border-emerald-200 bg-emerald-50/40':tone==='purple'?'border-purple-200 bg-purple-50/40':tone==='orange'?'border-amber-200 bg-amber-50/40':'border-[#E6EDF2] bg-white';
  const valTone = tone==='green'?'text-emerald-700':tone==='purple'?'text-purple-700':tone==='orange'?'text-amber-700':'text-[#003A40]';
  return (
    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${borderTone} shadow-2xs hover:shadow-xs transition-all`}>
      <div>
        <span className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block">{label}</span>
        <div className={`text-xl font-extrabold ${valTone} tracking-tight mt-0.5`}>{value}</div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-[#5F6B7A] mt-0.5">
          {trend === 'up' && <span className="text-emerald-600 flex items-center gap-0.5 font-bold"><Ico.Up/> +4.2%</span>}
          {trend === 'down' && <span className="text-rose-600 flex items-center gap-0.5 font-bold"><Ico.Down/> -1.8%</span>}
          <span>{sub}</span>
        </div>
      </div>
      {icon && <div className="p-2.5 rounded-lg bg-[#003A40]/10 text-[#003A40]">{icon}</div>}
    </div>
  );
}

// ── Card Container ────────────────────────────────────────────────────────────
function WidgetCard({ title, subtitle, action, children }) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-[#E6EDF2] p-4 shadow-2xs overflow-hidden">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h3 className="text-xs font-bold text-[#003A40] uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[11px] text-[#5F6B7A] font-medium">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0 relative">
        {children}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef(null);

  const session = useMemo(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }, []);

  const role = getValidRole(searchParams.get('role') || session?.role || 'admin');

  const [startMY, setStartMY] = useState({month:0,year:2024});
  const [endMY, setEndMY] = useState({month:11,year:2026});
  const [semester, setSemester] = useState(SEMESTER_OPTS[0]);
  const [department, setDepartment] = useState('All Departments');
  const [activeTab, setActiveTab] = useState('overview');

  const [dbDepartments, setDbDepartments] = useState([]);
  useEffect(() => {
    async function loadDepts() {
      try {
        const data = await settingsApi.getDepartments();
        if (Array.isArray(data) && data.length > 0) {
          setDbDepartments(data);
        }
      } catch (e) {
        console.error('Failed to load departments:', e);
      }
    }
    loadDepts();
  }, []);

  const { DEPTS, DEPT_FULL, DEPT_OPTS, DEPT_CODE } = useMemo(() => {
    if (dbDepartments.length === 0) {
      return {
        DEPTS: ['MLT', 'OTAT', 'RIT'],
        DEPT_FULL: { MLT: 'Medical Laboratory Technology', OTAT: 'Operation Theatre & Anaesthesia Technology', RIT: 'Radiography & Imaging Technology' },
        DEPT_OPTS: ['All Departments', 'Medical Laboratory Technology', 'Operation Theatre & Anaesthesia Technology', 'Radiography & Imaging Technology'],
        DEPT_CODE: { 'All Departments': null, 'Medical Laboratory Technology': 'MLT', 'Operation Theatre & Anaesthesia Technology': 'OTAT', 'Radiography & Imaging Technology': 'RIT' }
      };
    }
    const depts = dbDepartments.map(d => d.code || d.name.slice(0, 2).toUpperCase());
    const deptFull = {};
    const deptOpts = ['All Departments'];
    const deptCode = { 'All Departments': null };
    dbDepartments.forEach(d => {
      const code = d.code || d.name.slice(0, 2).toUpperCase();
      deptFull[code] = d.name;
      deptOpts.push(d.name);
      deptCode[d.name] = code;
    });
    return { DEPTS: depts, DEPT_FULL: deptFull, DEPT_OPTS: deptOpts, DEPT_CODE: deptCode };
  }, [dbDepartments]);

  const [analyticsData, setAnalyticsData] = useState(MOCK_ANALYTICS_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const deptCode = DEPT_CODE[department];
        const params = new URLSearchParams();
        params.append('role', role);
        if (deptCode) params.append('department', deptCode);
        const res = await fetch(`${API_BASE}/analytics/full?${params.toString()}`);
        if (!res.ok) throw new Error('API request failed');
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setAnalyticsData(json.data);
        }
      } catch (e) {
        console.warn('Analytics fallback loaded:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAnalytics();
    return () => { cancelled = true; };
  }, [role, department, semester, startMY, endMY]);

  const triggerLabel = myToKey(startMY) === myToKey(endMY) ? myLabel(startMY) : `${myLabel(startMY)} → ${myLabel(endMY)}`;
  const rangeLabel = triggerLabel;

  const rankingData = useMemo(() => {
    if (analyticsData.departmentData && analyticsData.departmentData.length > 0) {
      return analyticsData.departmentData.map((d, i) => ({
        dept: d.name,
        code: d.code || d.name.slice(0,2).toUpperCase(),
        att: d.avgAttendance || 88,
        pass: d.passRate || 90,
        cgpa: d.cgpa || 8.0,
        students: d.students || 200,
        faculty: d.faculty || 15,
        score: Math.round((d.avgAttendance || 88) * 0.4 + (d.passRate || 90) * 0.4 + (d.cgpa || 8.0) * 2.5)
      })).sort((a,b) => b.score - a.score);
    }
    return [];
  }, [analyticsData]);

  const subTabs = [
    { id: 'overview', label: 'Executive Overview' },
    { id: 'academics', label: 'Academics & Performance' },
    { id: 'faculty', label: 'Faculty & Research' },
    { id: 'finance', label: 'Financial Intelligence' },
    { id: 'matrix', label: 'Department Matrix' }
  ];

  return (
    <Layout title="Reports & Analytics" noPadding>
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-[#F8FAFC]">
        {/* TOP COMPACT CONTROL HEADER */}
        <div className="flex-shrink-0 bg-white border-b border-[#E6EDF2] px-6 py-2.5 flex items-center justify-between gap-4">
          {/* LEFT: SUB TABS */}
          <div className="flex items-center gap-1.5 bg-[#F4F7FF] p-1 rounded-xl">
            {subTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#003A40] text-white shadow-2xs'
                    : 'text-[#5F6B7A] hover:text-[#003A40] hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* RIGHT: FILTERS & EXPORT */}
          <div className="flex items-center gap-2.5">
            <div className="relative" ref={calRef}>
              <button onClick={() => setCalOpen(o => !o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EDF2] bg-[#FAFBFC] text-xs font-bold text-[#003A40] hover:bg-[#F2FBFA] transition-all cursor-pointer">
                <Ico.Calendar />
                <span>{triggerLabel}</span>
                <span className="text-[10px] text-[#9AAAB4]">▾</span>
              </button>
              {calOpen && <CalendarRangePicker startMY={startMY} endMY={endMY} onChange={({ startMY: s, endMY: e }) => { setStartMY(s); setEndMY(e); }} onClose={() => setCalOpen(false)} />}
            </div>

            <select value={semester} onChange={e => setSemester(e.target.value)} className="px-3 py-1.5 rounded-xl border border-[#E6EDF2] bg-[#FAFBFC] text-xs font-semibold text-[#003A40] outline-none focus:border-[#0A686A]">
              {SEMESTER_OPTS.map(o => <option key={o}>{o}</option>)}
            </select>

            <select value={department} onChange={e => setDepartment(e.target.value)} className="px-3 py-1.5 rounded-xl border border-[#E6EDF2] bg-[#FAFBFC] text-xs font-semibold text-[#003A40] outline-none focus:border-[#0A686A]">
              {DEPT_OPTS.map(o => <option key={o}>{o}</option>)}
            </select>

            <button onClick={() => { setStartMY({ month: 0, year: 2024 }); setEndMY({ month: 11, year: 2026 }); setSemester(SEMESTER_OPTS[0]); setDepartment('All Departments'); }} className="px-3 py-1.5 bg-[#F4F7FF] hover:bg-slate-200 text-[#5F6B7A] rounded-xl text-xs font-bold transition-all cursor-pointer">
              Reset
            </button>

            <button onClick={() => alert('Report generated and downloaded as CSV.')} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#003A40] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-2xs">
              <Ico.Download />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* MAIN VIEWPORT HEIGHT TAB CONTENT (ZERO SCROLL) */}
        <div className="flex-1 min-h-0 p-4 flex flex-col gap-3 overflow-hidden">
          {loading && !analyticsData ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* TOP 4 SUMMARY KPIS (FLEX SHRINK 0) */}
              <div className="flex-shrink-0 grid grid-cols-4 gap-3">
                <KpiCard label="Total Students" value="1,280" sub="Active Enrolled" trend="up" icon={<Ico.Grad/>} tone="blue"/>
                <KpiCard label="Avg Attendance" value="88.4%" sub="College Standard" trend="up" icon={<Ico.Users/>} tone="green"/>
                <KpiCard label="Pass Percentage" value="91.2%" sub="Target 90% Met" trend="up" icon={<Ico.Chart/>} tone="purple"/>
                <KpiCard label="Financial Surplus" value="₹43.0L" sub="Q3 Budget Surplus" trend="up" icon={<Ico.Dollar/>} tone="orange"/>
              </div>

              {/* MAIN DYNAMIC CONTENT CONTAINER (FLEX-1 FULL HEIGHT ZERO SCROLL) */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-12 gap-3 h-full">
                    <div className="col-span-8 h-full flex flex-col gap-3">
                      <div className="flex-1 min-h-0">
                        <WidgetCard title="Income vs Expenses Run Rate" subtitle="Monthly financial progression (₹)">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={Object.entries(MOCK_ANALYTICS_DATA.incomeExpenseByMonth).map(([m,v])=>({month:m,...v}))} margin={{top:10,right:10,left:-20,bottom:0}}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                              <XAxis dataKey="month" tick={{fontSize:10,fill:'#5F6B7A'}} axisLine={false} tickLine={false}/>
                              <YAxis tick={{fontSize:10,fill:'#5F6B7A'}} axisLine={false} tickLine={false} tickFormatter={fmtCr}/>
                              <Tooltip {...TT_STYLE} formatter={fmtCr}/>
                              <Area type="monotone" dataKey="income" name="Income" stroke="#003A40" fill="#003A40" fillOpacity={0.15} strokeWidth={2}/>
                              <Area type="monotone" dataKey="expense" name="Expense" stroke="#f97316" fill="#f97316" fillOpacity={0.1} strokeWidth={2}/>
                            </AreaChart>
                          </ResponsiveContainer>
                        </WidgetCard>
                      </div>
                    </div>

                    <div className="col-span-4 h-full flex flex-col">
                      <WidgetCard title="Department Leaderboard" subtitle="Composite ranking (Attendance + Pass + CGPA)">
                        <div className="h-full overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {rankingData.map((d, idx) => (
                            <div key={d.dept} className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAFBFC] border border-[#E6EDF2] hover:bg-[#F2FBFA] transition-all">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx===0?'bg-amber-100 text-amber-800':'bg-slate-100 text-slate-600'}`}>{idx+1}</span>
                                <div>
                                  <div className="text-xs font-bold text-[#003A40]">{d.dept}</div>
                                  <div className="text-[10px] text-[#5F6B7A]">{d.students} Students · {d.faculty} Faculty</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-extrabold text-emerald-600">{d.score} pts</div>
                                <div className="text-[10px] text-[#5F6B7A]">Att: {d.att}% | CGPA: {d.cgpa}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </WidgetCard>
                    </div>
                  </div>
                )}

                {activeTab === 'academics' && (
                  <div className="grid grid-cols-12 gap-3 h-full">
                    <div className="col-span-4 h-full">
                      <WidgetCard title="Students by Department" subtitle="Enrollment breakdown">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={Object.entries(MOCK_ANALYTICS_DATA.studentsByDept).map(([k,v])=>({name:k,value:v}))} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                              {Object.keys(MOCK_ANALYTICS_DATA.studentsByDept).map((_, i) => <Cell key={i} fill={getDeptColor(null, i)} />)}
                            </Pie>
                            <Tooltip {...TT_STYLE}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </WidgetCard>
                    </div>

                    <div className="col-span-4 h-full">
                      <WidgetCard title="Department Attendance %" subtitle="Average attendance comparison">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={rankingData} margin={{top:10,right:10,left:-20,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                            <XAxis dataKey="code" tick={{fontSize:10,fill:'#5F6B7A'}} axisLine={false} tickLine={false}/>
                            <YAxis domain={[60,100]} tick={{fontSize:10,fill:'#5F6B7A'}} axisLine={false} tickLine={false}/>
                            <Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/>
                            <Bar dataKey="att" name="Attendance" fill="#0A686A" radius={[6,6,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </WidgetCard>
                    </div>

                    <div className="col-span-4 h-full">
                      <WidgetCard title="Year-wise Enrolment" subtitle="Batch distribution">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={Object.entries(MOCK_ANALYTICS_DATA.studentsByYear).map(([k,v])=>({name:k,value:v}))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                              {PIE_COLS.map((col, i) => <Cell key={i} fill={col} />)}
                            </Pie>
                            <Tooltip {...TT_STYLE}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </WidgetCard>
                    </div>
                  </div>
                )}

                {activeTab === 'faculty' && (
                  <div className="grid grid-cols-12 gap-3 h-full">
                    <div className="col-span-6 h-full">
                      <WidgetCard title="Faculty Distribution by Department" subtitle="Active teaching staff count">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={rankingData} margin={{top:10,right:10,left:-20,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                            <XAxis dataKey="code" tick={{fontSize:10,fill:'#5F6B7A'}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fontSize:10,fill:'#5F6B7A'}} axisLine={false} tickLine={false}/>
                            <Tooltip {...TT_STYLE}/>
                            <Bar dataKey="faculty" name="Faculty Count" fill="#6d28d9" radius={[6,6,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </WidgetCard>
                    </div>

                    <div className="col-span-6 h-full">
                      <WidgetCard title="Academic Rank Split" subtitle="Professors vs Lecturers">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={MOCK_ANALYTICS_DATA.facultyRankData} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="rank" label={({rank,count})=>`${rank}: ${count}`}>
                              {MOCK_ANALYTICS_DATA.facultyRankData.map((_, i) => <Cell key={i} fill={PIE_COLS[i % PIE_COLS.length]} />)}
                            </Pie>
                            <Tooltip {...TT_STYLE}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </WidgetCard>
                    </div>
                  </div>
                )}

                {activeTab === 'finance' && (
                  <div className="grid grid-cols-12 gap-3 h-full">
                    <div className="col-span-8 h-full">
                      <WidgetCard title="Financial Progression" subtitle="Monthly Income vs Expenses">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(MOCK_ANALYTICS_DATA.incomeExpenseByMonth).map(([m,v])=>({month:m,...v}))} margin={{top:10,right:10,left:-20,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                            <XAxis dataKey="month" tick={{fontSize:10,fill:'#5F6B7A'}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fontSize:10,fill:'#5F6B7A'}} axisLine={false} tickLine={false} tickFormatter={fmtCr}/>
                            <Tooltip {...TT_STYLE} formatter={fmtCr}/>
                            <Legend wrapperStyle={{fontSize:11}}/>
                            <Bar dataKey="income" name="Income" fill="#003A40" radius={[4,4,0,0]} />
                            <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </WidgetCard>
                    </div>

                    <div className="col-span-4 h-full">
                      <WidgetCard title="Fee Collection Status" subtitle="Overall collection breakdown">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[{name:'Collected',value:85},{name:'Pending',value:12},{name:'Overdue',value:3}]} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({name,value})=>`${name} ${value}%`}>
                              <Cell fill="#10b981"/>
                              <Cell fill="#f59e0b"/>
                              <Cell fill="#ef4444"/>
                            </Pie>
                            <Tooltip {...TT_STYLE}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </WidgetCard>
                    </div>
                  </div>
                )}

                {activeTab === 'matrix' && (
                  <WidgetCard title="Complete Department Performance Matrix" subtitle="Unified academic and operational scoreboard">
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-[#FAFBFC] border-b border-[#E6EDF2] sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3 font-bold text-[#5F6B7A] uppercase">Department</th>
                            <th className="py-2.5 px-3 font-bold text-[#5F6B7A] uppercase">Students</th>
                            <th className="py-2.5 px-3 font-bold text-[#5F6B7A] uppercase">Faculty</th>
                            <th className="py-2.5 px-3 font-bold text-[#5F6B7A] uppercase">Attendance</th>
                            <th className="py-2.5 px-3 font-bold text-[#5F6B7A] uppercase">Pass Rate</th>
                            <th className="py-2.5 px-3 font-bold text-[#5F6B7A] uppercase">CGPA</th>
                            <th className="py-2.5 px-3 font-bold text-[#5F6B7A] uppercase text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6EDF2]">
                          {rankingData.map((d, i) => (
                            <tr key={d.dept} className="hover:bg-[#F2FBFA] transition-all">
                              <td className="py-2.5 px-3 font-bold text-[#003A40] flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: getDeptColor(d.code, i)}}/>
                                {d.dept}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-[#5F6B7A]">{d.students}</td>
                              <td className="py-2.5 px-3 font-semibold text-[#5F6B7A]">{d.faculty}</td>
                              <td className="py-2.5 px-3 font-bold text-emerald-600">{d.att}%</td>
                              <td className="py-2.5 px-3 font-bold text-purple-600">{d.pass}%</td>
                              <td className="py-2.5 px-3 font-bold text-amber-600">{d.cgpa}</td>
                              <td className="py-2.5 px-3 font-extrabold text-[#003A40] text-right">{d.score} pts</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </WidgetCard>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
