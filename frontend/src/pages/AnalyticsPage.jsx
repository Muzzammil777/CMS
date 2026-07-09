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

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ico = {
  Grad:     ()=><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 2.26L19.02 9 12 12.74 4.98 9 12 5.26zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>,
  Menu:     ()=><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>,
  Logout:   ()=><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
  Back:     ()=><svg viewBox="0 0 24 24" width="18" height="18" fill="#6b7280"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  Up:       ()=><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{verticalAlign:'middle'}}><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>,
  Down:     ()=><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{verticalAlign:'middle'}}><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>,
  Calendar: ()=><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{verticalAlign:'middle'}}><path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>,
  Download: ()=><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{verticalAlign:'middle'}}><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z"/></svg>,
  ChevL:    ()=><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>,
  ChevR:    ()=><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  Close:    ()=><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
};

// ─── Theme Colors ─────────────────────────────────────────────────────────────
const C = {
  blue:    '#6d28d9', // Primary Green/Blue Accent
  cyan:    '#06b6d4',
  green:   '#10b981',
  orange:  '#f97316',
  purple:  '#8b5cf6',
  red:     '#ef4444',
  teal:    '#14b8a6',
  amber:   '#f59e0b',
  indigo:  '#6366f1'
};

const DEPT_COLORS = { CS: C.blue, Phys: C.orange, Math: C.green, ECE: C.purple, Mech: C.cyan };
const PIE_COLS  = [C.green, C.orange, C.red, C.blue, C.purple];
const colorList = [C.blue, C.orange, C.green, C.purple, C.cyan, C.teal, C.amber, C.indigo, C.red];
function getDeptColor(deptKey, index) {
  if (deptKey && DEPT_COLORS[deptKey]) return DEPT_COLORS[deptKey];
  if (typeof index === 'number') return colorList[index % colorList.length];
  return C.blue;
}


const TT_STYLE = {
  contentStyle: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
    fontFamily: "'Outfit', 'Inter', sans-serif"
  }
};

const H = 210, H2 = 240;

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS_ALL  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS       = [2024, 2025, 2026];
const DEPTS       = ['CS','Phys','Math','ECE','Mech'];
const DEPT_FULL   = { CS:'Computer Science', Phys:'Physics', Math:'Mathematics', ECE:'Electronics', Mech:'Mechanical' };
const SEMESTER_OPTS = ['All Semesters', 'Semester 4 (Current)','Semester 3','Semester 2','Semester 1'];
const DEPT_OPTS     = ['All Departments','Computer Science','Physics','Mathematics','Electronics','Mechanical'];
const DEPT_CODE     = { 'All Departments':null,'Computer Science':'CS','Physics':'Phys','Mathematics':'Math','Electronics':'ECE','Mechanical':'Mech' };

// Grade range keys
const GRADE_F   = 'F (<50)';
const GRADE_O   = 'O (\u226590)';
const GRADE_Ap  = 'A+ (80-89)';
const GRADE_A   = 'A (70-79)';
const GRADE_Bp  = 'B+ (60-69)';
const GRADE_B   = 'B (50-59)';

// ─── MonthYear helpers ────────────────────────────────────────────────────────
function myToKey({month,year}){return year*12+month;}
function keyToMY(k){return{month:k%12,year:Math.floor(k/12)};}
function myLabel({month,year}){return`${MONTHS_ALL[month]} ${year}`;}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n){return(n/100000).toFixed(1)+'L';}
function fmtCr(n){return n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:`₹${(n/100000).toFixed(1)}L`;}

function avgCardField(cardMap,months,field){
  if(!cardMap)return '—';
  const vals=months.map(m=>{const v=cardMap[m.month]?.[field];if(!v)return null;const n=parseFloat(String(v).replace(/[^\d.]/g,''));return isNaN(n)?null:n;}).filter(x=>x!==null);
  if(!vals.length)return '—';
  const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
  const sample=String(cardMap[months[months.length-1].month]?.[field]??'');
  if(sample.includes('%'))return`${avg.toFixed(0)}%`;
  if(sample.includes('₹'))return cardMap[months[months.length-1].month][field];
  if(sample.includes('/')){const t=months.reduce((a,m)=>{const p=String(cardMap[m.month]?.[field]??'0/0').split('/');return[a[0]+(parseInt(p[0])||0),a[1]+(parseInt(p[1])||0)];},[0,0]);return`${t[0]}/${t[1]}`;}
  if(sample.includes(','))return Math.round(avg).toLocaleString();
  return`${Math.round(avg)}`;
}

function avgFinancePie(piMap,months){
  if(!piMap)return[{name:'Paid',value:70},{name:'Pending',value:20},{name:'Overdue',value:10}];
  return['Paid','Pending','Overdue'].map(n=>({name:n,value:Math.round(months.reduce((s,m)=>{const r=(piMap[m.month]??[]).find(x=>x.name===n);return s+(r?.value??0)},0)/months.length)}));
}

function avgFinanceDept(fdMap,months,DEPTS_VAL){
  if(!fdMap)return[];
  const deptsToUse = DEPTS_VAL || DEPTS;
  return deptsToUse.map(d=>({dept:d,paid:Math.round(months.reduce((s,m)=>{const r=(fdMap[m.month]??[]).find(x=>x.dept===d);return s+(r?.paid??0)},0)/months.length),pending:Math.round(months.reduce((s,m)=>{const r=(fdMap[m.month]??[]).find(x=>x.dept===d);return s+(r?.pending??0)},0)/months.length),overdue:Math.round(months.reduce((s,m)=>{const r=(fdMap[m.month]??[]).find(x=>x.dept===d);return s+(r?.overdue??0)},0)/months.length)}));
}

function avgMarksDist(mdMap,months){
  if(!mdMap)return[];
  const keys=[GRADE_O,GRADE_Ap,GRADE_A,GRADE_Bp,GRADE_B,GRADE_F];
  return keys.map(r=>({range:r,count:Math.round(months.reduce((s,m)=>{const d=(mdMap[m.month]??[]).find(x=>x.range===r);return s+(d?.count??0)},0)/months.length)}));
}

// ── Universal inside-slice pie label ─────────────────────────────────────────
const RADIAN=Math.PI/180;
function PieLabelInside({cx,cy,midAngle,innerRadius,outerRadius,value,percent,name,labelType='pct',threshold=6}){
  const pct=Math.round((percent??0)*100);
  if(pct<threshold)return null;
  const r=innerRadius+(outerRadius-innerRadius)*0.55;
  const x=cx+r*Math.cos(-midAngle*RADIAN);
  const y=cy+r*midAngle*RADIAN;
  const targetX=cx+r*Math.cos(-midAngle*RADIAN);
  const targetY=cy+r*Math.sin(-midAngle*RADIAN);
  const txt=labelType==='count'?`${value}`:labelType==='name'?`${String(name).split(' ')[0]}`:`${pct}%`;
  return<text x={targetX} y={targetY} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} style={{pointerEvents:'none'}}>{txt}</text>;
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(role,months,rangeLabel,tab,ad,DEPTS_VAL,DEPT_FULL_VAL){
  let headers=[],rows=[];
  const deptsToUse = DEPTS_VAL || DEPTS;
  const deptFullToUse = DEPT_FULL_VAL || DEPT_FULL;
  if(role==='admin'){
    if(tab==='students'){headers=['Month','Total Students','Avg Attendance','Avg Pass Rate','Courses'];rows=months.map(m=>{const c=ad?.adminCardsByMonth?.[m.month]??{};const att=Math.round((ad?.adminAttByMonth?.[m.month]??[]).reduce((s,d)=>s+d.avg,0)/5);const pass=Math.round((ad?.adminExamByMonth?.[m.month]??[]).reduce((s,d)=>s+d.pass,0)/5);return[m.label,c.students??'—',`${att}%`,`${pass}%`,c.courses??'—'];});}
    else if(tab==='faculty'){headers=['Dept','Faculty Count','Avg Attendance','Avg Pass Rate'];rows=deptsToUse.map(d=>{const att=Math.round(months.reduce((s,m)=>{const f=(ad?.adminAttByMonth?.[m.month]??[]).find(x=>x.dept===d);return s+(f?.avg??0)},0)/months.length);const pass=Math.round(months.reduce((s,m)=>{const f=(ad?.adminExamByMonth?.[m.month]??[]).find(x=>x.dept===d);return s+(f?.pass??0)},0)/months.length);return[deptFullToUse[d] || d,ad?.facultyByDept?.[d]??0,`${att}%`,`${pass}%`];});}
    else{headers=['Month','Income','Expense','Net'];rows=months.map(m=>{const d=ad?.incomeExpenseByMonth?.[m.month]??{income:0,expense:0};return[m.label,fmtCr(d.income),fmtCr(d.expense),fmtCr(d.income-d.expense)];});}
  } else if(role==='finance'){
    headers=['Month','Collected','Pending Fees','Paid%','Scholarships'];
    rows=months.map(m=>{const c=ad?.financeCardsByMonth?.[m.month]??{};const paid=(ad?.financePieByMonth?.[m.month]??[]).find(x=>x.name==='Paid')?.value??0;return[m.label,c.collected??'—',c.pending??'—',`${paid}%`,c.scholarships??'—'];});
  } else if(role==='faculty'){
    headers=['Month','Students','Avg Attendance','Submitted','Pending'];
    rows=months.map(m=>{const c=ad?.facultyCardsByMonth?.[m.month]??{};return[m.label,c.students??'—',c.att??'—',c.submitted??'—',c.pending??'—'];});
  }
  const csv=[headers.join(','),...rows.map(r=>r.map(v=>`"${v}"`).join(','))].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`CMS_${role}_${tab}_${rangeLabel.replace(/[\s\u2013\u2192]/g,'_')}.csv`;
  a.click();
}

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR RANGE PICKER
// ══════════════════════════════════════════════════════════════════════════════
function CalendarRangePicker({startMY,endMY,onChange,onClose}){
  const [viewYear,  setViewYear]  = useState(startMY?.year??2026);
  const [phase,     setPhase]     = useState('start');
  const [hoverKey,  setHoverKey]  = useState(null);
  const [tempStart, setTempStart] = useState(null);

  const confirmedStartKey = startMY ? myToKey(startMY) : null;
  const confirmedEndKey   = endMY   ? myToKey(endMY)   : null;

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
      else        { onChange({startMY:tempStart, endMY:clicked}); }
      setTempStart(null);
      setPhase('start');
      onClose();
    }
  }

  function cellStyle(mi){
    const k   = myToKey({month:mi, year:viewYear});
    const sk  = tempStart ? myToKey(tempStart) : confirmedStartKey;
    const ek  = (phase==='end' && hoverKey!=null) ? hoverKey : confirmedEndKey;
    const lo  = (sk!=null && ek!=null) ? Math.min(sk,ek) : null;
    const hi  = (sk!=null && ek!=null) ? Math.max(sk,ek) : null;
    const isEdge  = (sk!=null && k===sk) || (ek!=null && k===ek);
    const inRange = lo!=null && k>lo && k<hi;
    return{
      width:'100%',height:40,borderRadius:8,border:'none',fontSize:13,fontWeight:700,
      cursor:'pointer',transition:'all 0.1s',
      background: isEdge?'#6d28d9': inRange?'#dbeafe':'transparent',
      color:      isEdge?'#fff': inRange?'#6d28d9':'#374151',
      boxShadow:  isEdge?'0 2px 8px rgba(37,99,235,.3)':'none',
    };
  }

  const displayStart = tempStart ?? startMY;
  const displayEnd   = phase==='end' && hoverKey ? keyToMY(hoverKey) : endMY;

  return(
    <div style={{position:'absolute',zIndex:1100,top:'calc(100% + 10px)',left:0,background:'#fff',borderRadius:18,border:'1.5px solid #e5e7eb',boxShadow:'0 12px 40px rgba(0,0,0,.16)',padding:22,minWidth:330}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}><div style={{display:'flex',alignItems:'center',gap:8}}><button onClick={()=>setViewYear(y=>y-1)} style={{width:28,height:28,borderRadius:7,border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Ico.ChevL/></button><select value={viewYear} onChange={e=>setViewYear(Number(e.target.value))} style={{border:'1.5px solid #e5e7eb',borderRadius:7,padding:'2px 6px',fontWeight:700,fontSize:14,color:'#111827',cursor:'pointer',outline:'none'}}>{YEARS.map(y=><option key={y}>{y}</option>)}
          </select><button onClick={()=>setViewYear(y=>y+1)} style={{width:28,height:28,borderRadius:7,border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Ico.ChevR/></button></div><div style={{fontSize:12,fontWeight:600,padding:'3px 10px',borderRadius:999,
          color:      phase==='start'?'#6d28d9':'#f97316',
          background: phase==='start'?'#eff6ff':'#fff7ed',
          border:`1px solid ${phase==='start'?'#bfdbfe':'#fed7aa'}`}}>{phase==='start'?'\u2460 Start month':'\u2461 End month'}
        </div><button onClick={onClose} style={{width:28,height:28,borderRadius:7,border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#6b7280'}}><Ico.Close/></button></div><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>{MONTHS_ALL.map((m,mi)=>(
          <button key={m}
            style={cellStyle(mi)}
            onClick={()=>clickMonth(mi)}
            onMouseEnter={()=>{ if(phase==='end') setHoverKey(myToKey({month:mi,year:viewYear})); }}
            onMouseLeave={()=>setHoverKey(null)}>{m}
          </button>))}
      </div><div style={{marginTop:14,padding:'8px 14px',background:'#f0fdf4',borderRadius:10,border:'1px solid #bbf7d0',fontSize:12,fontWeight:700,color:'#15803d',textAlign:'center'}}>{phase==='end' && displayStart
          ? `${myLabel(displayStart)} \u2192 ${displayEnd ? myLabel(displayEnd) : '...'}`
          : (displayStart && displayEnd)
            ? (myLabel(displayStart)===myLabel(displayEnd)
                ? `${myLabel(displayStart)}`
                : `${myLabel(displayStart)} \u2192 ${myLabel(displayEnd)}`)
            : 'Pick start month'
        }
      </div></div>);
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function SCard({label,value,sub,tone,icon,trend}){
  const gradients = {
    blue: 'linear-gradient(135deg, rgba(0, 35, 111, 0.08) 0%, rgba(0, 35, 111, 0.03) 100%)',
    green: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)',
    purple: 'linear-gradient(135deg, rgba(26, 60, 133, 0.08) 0%, rgba(26, 60, 133, 0.03) 100%)',
    orange: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)',
    red: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)',
    teal: 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(20, 184, 166, 0.03) 100%)',
    cyan: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.03) 100%)'
  };
  const borderColors = {
    blue: 'rgba(0, 35, 111, 0.15)',
    green: 'rgba(16, 185, 129, 0.15)',
    purple: 'rgba(26, 60, 133, 0.15)',
    orange: 'rgba(249, 115, 22, 0.15)',
    red: 'rgba(239, 68, 68, 0.15)',
    teal: 'rgba(20, 184, 166, 0.15)',
    cyan: 'rgba(6, 182, 212, 0.15)'
  };
  const textColors = {
    blue: '#6d28d9',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f97316',
    red: '#ef4444',
    teal: '#14b8a6',
    cyan: '#06b6d4'
  };
  
  return (
    <div className="premium-kpi-card" style={{
      background: gradients[tone] || '#ffffff',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: '16px',
      padding: '20px 24px',
      border: `1px solid ${borderColors[tone] || 'rgba(0,0,0,0.05)'}`,
      flex: 1,
      minWidth: '220px',
      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.02)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '4px',
        height: '100%',
        background: textColors[tone] || '#ccc'
      }} />
      <div style={{display:'flex',justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{label}</div>
          <div style={{fontSize:28,fontWeight:800,color:'#1e293b',lineHeight:1.1,marginBottom:6,letterSpacing:'-0.5px',fontFamily:"'Outfit', sans-serif"}}>{value}</div>
          <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#64748b',fontWeight:500}}>
            {trend==='up' && <span style={{color:'#10b981',display:'inline-flex',alignItems:'center'}}><Ico.Up/><span style={{marginLeft:2}}></span></span>}
            {trend==='down' && <span style={{color:'#ef4444',display:'inline-flex',alignItems:'center'}}><Ico.Down/><span style={{marginLeft:2}}></span></span>}
            {sub}
          </div>
        </div>
        {icon && <div style={{
          fontSize:32,
          color: textColors[tone],
          opacity: 0.85,
          background: `${textColors[tone]}10`,
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 12
        }}>{icon}</div>}
      </div>
    </div>
  );
}

function CC({title,subtitle,children,span2,style,action}){
  return(
    <div className="content-card-premium" style={{gridColumn:span2?'span 2':'span 1',...style}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,borderBottom:'1px solid rgba(241, 245, 249, 0.8)',paddingBottom:12}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a',fontFamily:"'Outfit', sans-serif"}}>{title}</div>
          {subtitle && <div style={{fontSize:12,color:'#64748b',marginTop:2,fontWeight:500}}>{subtitle}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

const tH = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  padding: '12px 16px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  borderBottom: '2px solid #e2e8f0',
  background: '#f8fafc',
  fontFamily: "'Outfit', sans-serif"
};

const tD = {
  fontSize: '13px',
  fontWeight: '500',
  color: '#334155',
  padding: '14px 16px',
  verticalAlign: 'middle',
  borderBottom: '1px solid #f1f5f9',
  fontFamily: "'Inter', sans-serif"
};

const miniBtn = {
  fontSize: '11px',
  fontWeight: '700',
  padding: '5px 12px',
  borderRadius: '8px',
  border: '1.5px solid #cbd5e1',
  background: '#fff',
  color: '#64748b',
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
  transition: 'all 0.2s'
};

function RoleTab({tabs,active,onChange}){
  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      background: '#f1f5f9',
      borderRadius: '14px',
      padding: '6px',
      marginBottom: '28px',
      border: '1px solid #e2e8f0',
      maxWidth: '600px',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: '1 0 auto',
            minWidth: '100px',
            height: '38px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: "'Outfit', sans-serif",
            background: active === t.id ? '#ffffff' : 'transparent',
            color: active === t.id ? '#6d28d9' : '#64748b',
            boxShadow: active === t.id ? '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' : 'none'
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function AlertBanner({items}){
  if(!items?.length)return null;
  return(
    <div style={{display:'flex',gap:10,alignItems:'flex-start',padding:'14px 20px',borderRadius:12,background:'#fff7ed',border:'1.5px solid #fed7aa',marginBottom:24}}>
      <div style={{color:'#d97706',fontSize:18,marginTop:1}}><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div>
      <div>
        <div style={{fontWeight:700,fontSize:14,color:'#92400e',marginBottom:2,fontFamily:"'Outfit', sans-serif"}}>Action Required</div>
        <div style={{fontSize:13,color:'#b45309',fontWeight:500}}>{items.join(' · ')}</div>
      </div>
    </div>
  );
}

function MiniProgress({value,max=100,color=C.blue}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{flex:1,height:6,borderRadius:3,background:'#f3f4f6',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${Math.min(100,(value/max)*100)}%`,background:color,borderRadius:3}}/>
      </div>
      <span style={{fontSize:11,fontWeight:700,color:'#374151',minWidth:32,textAlign:'right'}}>{value}%</span>
    </div>
  );
}

function LoadingSpinner(){
  return(
    <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:'120px 0',gap:16}}>
      <div style={{width:42,height:42,border:'3px solid #e2e8f0',borderTopColor:'#6d28d9',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <div style={{color:'#64748b',fontSize:13,fontWeight:600,fontFamily:"'Outfit', sans-serif"}}>Aggregating dynamic database statistics...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN VIEW
// ══════════════════════════════════════════════════════════════════════════════
function AdminView({activeMonths,rangeLabel,department,semester,analyticsData}){
  const [tab,setTab]=useState('overview');
  const ad = analyticsData || {};
  const dc = DEPT_CODE[department];

  const adminAttByMonth   = ad.adminAttByMonth   || {};
  const adminExamByMonth  = ad.adminExamByMonth  || {};
  const adminCardsByMonth = ad.adminCardsByMonth  || {};
  const incomeExpenseByMonth = ad.incomeExpenseByMonth || {};
  const studentsByDept    = ad.studentsByDept     || {};
  const studentsByYear    = ad.studentsByYear     || {};
  const genderData        = ad.genderData         || [];
  const cgpaByDept        = ad.cgpaByDept         || {};
  const facultyByDept     = ad.facultyByDept      || {};
  const facultyRankData   = ad.facultyRankData    || [];
  const FACULTY_LIST      = ad.facultyList        || {};

  const aAttData = useMemo(()=>{
    if(ad.departmentData) return ad.departmentData.map(d=>({dept:d.name,avg:Math.round(d.avgAttendance||85)}));
    const rows=[];DEPTS.forEach(d=>{const avg=Math.round(activeMonths.reduce((s,m)=>{const f=(adminAttByMonth[m]??[]).find(x=>x.dept===d);return s+(f?.avg??0)},0)/activeMonths.length);rows.push({dept:d,avg});});return rows;
  },[activeMonths,ad,adminAttByMonth,DEPTS]);
  
  const aExamData = useMemo(()=>{
    const rows=[];DEPTS.forEach(d=>{const pass=Math.round(activeMonths.reduce((s,m)=>{const f=(adminExamByMonth[m]??[]).find(x=>x.dept===d);return s+(f?.pass??0)},0)/activeMonths.length);const fail=Math.round(activeMonths.reduce((s,m)=>{const f=(adminExamByMonth[m]??[]).find(x=>x.dept===d);return s+(f?.fail??0)},0)/activeMonths.length);rows.push({dept:d,pass,fail});});return rows;
  },[activeMonths,adminExamByMonth,DEPTS]);
  
  const aCards = useMemo(()=>{
    if(ad.summaryData){const sd=ad.summaryData;return{students:String(sd.students||sd.totalStudents||0),faculty:String(sd.faculty||0),courses:String(sd.courses||0)};}
    return{students:avgCardField(adminCardsByMonth,activeMonths,'students'),faculty:avgCardField(adminCardsByMonth,activeMonths,'faculty'),courses:avgCardField(adminCardsByMonth,activeMonths,'courses')};
  },[activeMonths,ad,adminCardsByMonth]);

  const filteredAtt  = dc?aAttData.filter(d=>d.dept===dc):aAttData;
  const filteredExam = dc?aExamData.filter(d=>d.dept===dc):aExamData;
  const attTrendData  = activeMonths.map(mn=>{const row={month:mn.label};(dc?[dc]:DEPTS).forEach(d=>{const f=(adminAttByMonth[mn.month]??[]).find(x=>x.dept===d);row[d]=f?.avg??0;});return row;});
  const passTrendData = activeMonths.map(mn=>{const row={month:mn.label};(dc?[dc]:DEPTS).forEach(d=>{const f=(adminExamByMonth[mn.month]??[]).find(x=>x.dept===d);row[d]=f?.pass??0;});return row;});
  const incExpData    = activeMonths.map(mn=>({month:mn.label,...(incomeExpenseByMonth[mn.month]??{income:0,expense:0})}));

  const rankingData = useMemo(()=>{
    if(ad.departmentData&&ad.departmentData.length>0){
      return ad.departmentData.map((d,i)=>{const pass=85+(i*2)%15;return{dept:d.name,att:Math.round(d.avgAttendance||85),pass,cgpa:d.cgpa||7.5,score:Math.round((d.avgAttendance||85)*0.3+pass*0.5+(d.cgpa||7.5)*2.2),students:d.students||0,faculty:d.faculty||1};}).sort((a,b)=>b.score-a.score);
    }
    return DEPTS.map(d=>{const att=Math.round(activeMonths.reduce((s,m)=>{const f=(adminAttByMonth[m.month]??[]).find(x=>x.dept===d);return s+(f?.avg??0)},0)/activeMonths.length);const pass=Math.round(activeMonths.reduce((s,m)=>{const f=(adminExamByMonth[m.month]??[]).find(x=>x.dept===d);return s+(f?.pass??0)},0)/activeMonths.length);const cgpa=cgpaByDept[d]??0;const score=Math.round(att*0.3+pass*0.5+cgpa*2.2);return{dept:d,att,pass,cgpa,score,students:studentsByDept[d]??0,faculty:facultyByDept[d]??0};}).sort((a,b)=>b.score-a.score);
  },[activeMonths,ad,adminAttByMonth,adminExamByMonth,cgpaByDept,studentsByDept,facultyByDept,DEPTS]);

  const alerts=[];
  rankingData.forEach(d=>{if(d.att<80)alerts.push(`${d.dept} attendance ${d.att}%`);});
  rankingData.forEach(d=>{if(d.pass<80)alerts.push(`${d.dept} pass rate ${d.pass}%`);});

  const deptPieData=useMemo(()=>{
    if(ad.departmentData)return ad.departmentData.map(d=>({name:d.name,value:d.students}));
    return Object.entries(dc?{[dc]:studentsByDept[dc]}:studentsByDept).map(([k,v])=>({name:k,value:v}));
  },[dc,ad,studentsByDept]);
  
  const yearPieData=Object.entries(studentsByYear).map(([k,v])=>({name:k,value:v}));
  
  const facultyPieData=useMemo(()=>{
    if(ad.departmentData)return ad.departmentData.map(d=>({name:d.name,value:d.faculty}));
    return Object.entries(dc?{[dc]:facultyByDept[dc]}:facultyByDept).map(([k,v])=>({name:DEPT_FULL[k]??k,value:v}));
  },[dc,ad,facultyByDept,DEPT_FULL]);
  
  const cgpaDeptData=useMemo(()=>{
    if(ad.departmentData)return ad.departmentData.map(d=>({dept:d.name,cgpa:d.cgpa}));
    return(dc?[{dept:dc,cgpa:cgpaByDept[dc]}]:DEPTS.map(d=>({dept:d,cgpa:cgpaByDept[d]}))).filter(Boolean);
  },[dc,ad,cgpaByDept,DEPTS]);

  const TABS=[{id:'overview',label:'Overview'},{id:'students',label:'Students'},{id:'faculty',label:'Faculty'},{id:'finance',label:'Finance'}];
  
  const totalIncome = useMemo(()=>{
    if(ad.summaryData)return ad.summaryData.income||0;
    return activeMonths.reduce((s,m)=>s+(incomeExpenseByMonth[m]?.income??0),0);
  },[activeMonths,ad,incomeExpenseByMonth]);
  
  const totalExpense = useMemo(()=>{
    if(ad.summaryData)return ad.summaryData.expense||0;
    return activeMonths.reduce((s,m)=>s+(incomeExpenseByMonth[m]?.expense??0),0);
  },[activeMonths,ad,incomeExpenseByMonth]);
  
  const avgAtt = useMemo(()=>{
    if(ad.summaryData)return Math.round(ad.summaryData.averageAttendance||85);
    return Math.round(activeMonths.reduce((s,m)=>(adminAttByMonth[m]??[]).reduce((a,d)=>a+d.avg,0)/5+s,0)/activeMonths.length);
  },[activeMonths,ad,adminAttByMonth]);
  
  const avgPass = useMemo(()=>{
    if(ad.summaryData)return Math.round(ad.summaryData.averagePerformance||85);
    return Math.round(activeMonths.reduce((s,m)=>(adminExamByMonth[m]??[]).reduce((a,d)=>a+d.pass,0)/5+s,0)/activeMonths.length);
  },[activeMonths,ad,adminExamByMonth]);

  return(
    <><AlertBanner items={alerts}/><RoleTab tabs={TABS} active={tab} onChange={setTab}/>{tab==='overview'&&(
        <><div className="grid grid-cols-1 lg:grid-cols-3 gap-[18px] mb-[28px]">{[
              {id:'students',label:'Students & Academics',color:'#6d28d9',bg:'linear-gradient(135deg, rgba(0, 35, 111, 0.08) 0%, rgba(0, 35, 111, 0.02) 100%)',border:'rgba(0, 35, 111, 0.15)',
                stats:[{k:'Total Students',v:aCards.students},{k:'Avg Attendance',v:`${avgAtt}%`},{k:'Avg Pass Rate',v:`${avgPass}%`},{k:'Active Courses',v:aCards.courses}]},
              {id:'faculty',label:'Faculty & Staff',color:'#8b5cf6',bg:'linear-gradient(135deg, rgba(26, 60, 133, 0.08) 0%, rgba(26, 60, 133, 0.02) 100%)',border:'rgba(26, 60, 133, 0.15)',
                stats:[{k:'Total Faculty',v:aCards.faculty},{k:'Departments',v:'5'},{k:'Professors',v:facultyRankData.find(r=>r.rank==='Professor')?.count??0},{k:'Lecturers',v:facultyRankData.find(r=>r.rank==='Lecturer')?.count??0}]},
              {id:'finance',label:'Finance Overview',color:'#10b981',bg:'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',border:'rgba(16, 185, 129, 0.15)',
                stats:[{k:'Total Income',v:fmtCr(totalIncome)},{k:'Total Expense',v:fmtCr(totalExpense)},{k:'Net Surplus',v:fmtCr(totalIncome-totalExpense)},{k:'Scholarships',v:ad.summaryData?.scholarships??0}]},
            ].map(card=>(
              <div key={card.id} onClick={()=>setTab(card.id)} className="premium-kpi-card"
                style={{background:card.bg,borderRadius:16,padding:'20px 22px',border:`1.5px solid ${card.border}`,cursor:'pointer',transition:'all 0.18s'}}>
                <div style={{fontSize:15,fontWeight:800,color:card.color,marginBottom:14,fontFamily:"'Outfit', sans-serif"}}>{card.label}</div>
                <div className="grid grid-cols-2 gap-2.5">{card.stats.map(s=>(
                  <div key={s.k}><div style={{fontSize:20,fontWeight:800,color:'#1e293b',lineHeight:1.2,fontFamily:"'Outfit', sans-serif"}}>{s.v}</div><div style={{fontSize:11,color:'#64748b',fontWeight:600}}>{s.k}</div></div>
                ))}</div>
              </div>
            ))}</div>

          <CC title="Department Summary" subtitle={`All departments — ${rangeLabel} composite view`} style={{marginBottom:20}}>
            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
              <table style={{width:'100%',minWidth:650,borderCollapse:'collapse'}}><thead><tr><th style={tH}>Dept</th><th style={tH}>Students</th><th style={tH}>Faculty</th><th style={tH}>Attendance</th><th style={tH}>Pass Rate</th><th style={tH}>CGPA</th><th style={tH}>Score</th></tr></thead>
                <tbody>{rankingData.map((d,i)=>(
                  <tr key={d.dept} style={{background:i===0?'#f0fdf4':i%2===0?'#fafafa':'#fff'}}><td style={{...tD,fontWeight:700}}><span style={{display:'inline-block',width:10,height:10,borderRadius:3,background:getDeptColor(d.dept, i),marginRight:8}}/>{DEPT_FULL[d.dept]??d.dept}</td><td style={tD}>{d.students}</td><td style={tD}>{d.faculty}</td><td style={{...tD,fontWeight:700,color:d.att>=85?C.green:d.att>=80?C.orange:C.red}}>{d.att}%</td><td style={{...tD,fontWeight:700,color:d.pass>=85?C.green:d.pass>=80?C.orange:C.red}}>{d.pass}%</td><td style={{...tD,fontWeight:700,color:C.blue}}>{d.cgpa}</td><td style={{...tD,fontWeight:800,color:i===0?C.green:'#374151'}}>{d.score}</td></tr>
                ))}</tbody></table>
            </div>
          </CC>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
            <CC title="Attendance by Dept" subtitle={`${rangeLabel} avg`}>
              <ResponsiveContainer width="100%" height={160}><BarChart data={filteredAtt} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="dept" tick={{fontSize:11,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis domain={[60,100]} tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/><Bar dataKey="avg" name="Attendance" radius={[6,6,0,0]}>{filteredAtt.map((_,i)=><Cell key={i} fill={getDeptColor(null, i)}/>)}</Bar></BarChart></ResponsiveContainer>
            </CC>
            <CC title="Income vs Expense" subtitle={`${rangeLabel} monthly`}>
              <ResponsiveContainer width="100%" height={160}><BarChart data={incExpData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={fmtCr}/><Tooltip {...TT_STYLE} formatter={fmtCr}/><Legend wrapperStyle={{fontSize:10,fontFamily:"'Outfit', sans-serif"}}/><Bar dataKey="income" name="Income" fill={C.blue} radius={[4,4,0,0]}/><Bar dataKey="expense" name="Expense" fill={C.orange} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
            </CC>
            <CC title="Faculty by Dept" subtitle="Current distribution" action={<button onClick={()=>setTab('faculty')} style={miniBtn}>Expand</button>}>
              <ResponsiveContainer width="100%" height={160}><PieChart><Pie data={Object.entries(facultyByDept).map(([k,v])=>({name:k,value:v}))} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={<PieLabelInside labelType="count"/>} labelLine={false}>{Object.keys(facultyByDept).map((_,i)=><Cell key={i} fill={getDeptColor(null, i)}/>)}</Pie><Tooltip {...TT_STYLE}/></PieChart></ResponsiveContainer>
            </CC>
          </div>
        </>
      )}

      {tab==='students'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
            <SCard label="Total Students" value={aCards.students} sub={rangeLabel} tone="blue" icon="" trend="up"/>
            <SCard label="Avg Attendance" value={`${avgAtt}%`} sub="College-wide" tone="green" icon="" trend="up"/>
            <SCard label="Avg Pass Rate" value={`${avgPass}%`} sub="All depts" tone="purple" icon=""/>
            <SCard label="Active Courses" value={aCards.courses} sub={semester} tone="orange" icon=""/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
            <CC title="Students by Department" subtitle="Distribution"><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={deptPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={<PieLabelInside labelType="count"/>} labelLine={false}>{deptPieData.map((_,i)=><Cell key={i} fill={getDeptColor(null, i)}/>)}</Pie><Tooltip {...TT_STYLE}/></PieChart></ResponsiveContainer></CC>
            <CC title="Students by Year" subtitle="Year-wise split"><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={yearPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={<PieLabelInside labelType="count"/>} labelLine={false}>{yearPieData.map((_,i)=><Cell key={i} fill={PIE_COLS[i]}/>)}</Pie><Tooltip {...TT_STYLE}/></PieChart></ResponsiveContainer></CC>
            <CC title="Gender Distribution" subtitle="All departments"><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={genderData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={<PieLabelInside labelType="pct"/>} labelLine={false}>{genderData.map((_,i)=><Cell key={i} fill={[C.blue,C.orange,C.purple][i]}/>)}</Pie><Tooltip {...TT_STYLE}/></PieChart></ResponsiveContainer></CC>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Attendance Trend" subtitle={`${rangeLabel} — by department`}><ResponsiveContainer width="100%" height={H}><LineChart data={attTrendData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis domain={[60,100]} tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/>{(dc?[dc]:DEPTS).map((d,i)=><Line key={d} type="monotone" dataKey={d} stroke={getDeptColor(d, i)} strokeWidth={2.5} dot={false}/>)}</LineChart></ResponsiveContainer></CC>
            <CC title="Pass Rate Trend" subtitle={`${rangeLabel} — by department`}><ResponsiveContainer width="100%" height={H}><LineChart data={passTrendData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis domain={[60,100]} tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/>{(dc?[dc]:DEPTS).map((d,i)=><Line key={d} type="monotone" dataKey={d} stroke={getDeptColor(d, i)} strokeWidth={2.5} dot={false}/>)}</LineChart></ResponsiveContainer></CC>
          </div>
          <CC title="Dept CGPA Comparison" subtitle="Average CGPA by department" style={{marginBottom:20}}><ResponsiveContainer width="100%" height={H}><BarChart data={cgpaDeptData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="dept" tick={{fontSize:11,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis domain={[6,10]} tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip {...TT_STYLE}/><Bar dataKey="cgpa" name="CGPA" radius={[6,6,0,0]}>{cgpaDeptData.map((_,i)=><Cell key={i} fill={getDeptColor(null, i)}/>)}</Bar></BarChart></ResponsiveContainer></CC>
        </>
      )}

      {tab==='faculty'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
            <SCard label="Total Faculty" value={aCards.faculty} sub={rangeLabel} tone="blue" icon=""/>
            <SCard label="Departments" value={DEPTS.length} sub="Active" tone="green" icon=""/>
            <SCard label="Avg Pass Rate" value={`${avgPass}%`} sub="College avg" tone="purple" icon=""/>
            <SCard label="Total Courses" value={aCards.courses} sub={semester} tone="orange" icon=""/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
            <CC title="Faculty by Department" subtitle="Distribution"><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={facultyPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={<PieLabelInside labelType="count"/>} labelLine={false}>{facultyPieData.map((_,i)=><Cell key={i} fill={getDeptColor(null, i)}/>)}</Pie><Tooltip {...TT_STYLE}/></PieChart></ResponsiveContainer></CC>
            <CC title="Faculty Rank Distribution" subtitle="By academic rank"><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={facultyRankData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="count" label={<PieLabelInside labelType="count"/>} labelLine={false}>{facultyRankData.map((_,i)=><Cell key={i} fill={PIE_COLS[i]}/>)}</Pie><Tooltip {...TT_STYLE}/></PieChart></ResponsiveContainer></CC>
            <CC title="Dept Ranking" subtitle="Composite score">
              {rankingData.map((d,i)=>(<div key={d.dept} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:i<rankingData.length-1?'1px solid #f1f5f9':'none'}}><span style={{fontSize:16,fontWeight:900,color:i===0?C.green:i===1?C.blue:'#9ca3af',minWidth:24}}>#{i+1}</span><span style={{display:'inline-block',width:10,height:10,borderRadius:3,background:getDeptColor(d.dept, i)}}/><span style={{fontSize:13,fontWeight:700,flex:1,color:'#334155'}}>{DEPT_FULL[d.dept]??d.dept}</span><span style={{fontSize:14,fontWeight:800,color:getDeptColor(d.dept, i),minWidth:32}}>{d.score}</span></div>))}
            </CC>
          </div>
          <CC title="Faculty Directory" subtitle={dc?`${DEPT_FULL[dc]} — individual faculty list`:'All departments — click a dept filter above to narrow'} style={{marginBottom:20}}>
            {(dc?[dc]:DEPTS).map((deptKey, i)=>(
              <div key={deptKey} style={{marginBottom:24}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,padding:'12px 16px',background:getDeptColor(deptKey, i)+'10',borderRadius:10,border:`1.5px solid ${getDeptColor(deptKey, i)}30`}}>
                  <span style={{display:'inline-block',width:12,height:12,borderRadius:3,background:getDeptColor(deptKey, i)}}/>
                  <span style={{fontWeight:800,fontSize:14,color:getDeptColor(deptKey, i),fontFamily:"'Outfit', sans-serif"}}>{DEPT_FULL[deptKey]}</span>
                  <span style={{fontSize:12,color:'#64748b',marginLeft:4,fontWeight:500}}>— {FACULTY_LIST[deptKey]?.length??0} Faculty Members</span>
                  <span style={{marginLeft:'auto',fontSize:12,fontWeight:700,color:'#334155'}}>Avg Att: <span style={{color:C.green}}>{rankingData.find(r=>r.dept===deptKey)?.att??0}%</span></span>
                  <span style={{fontSize:12,fontWeight:700,color:'#334155',marginLeft:12}}>Pass: <span style={{color:C.blue}}>{rankingData.find(r=>r.dept===deptKey)?.pass??0}%</span></span>
                </div>
                <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                  <table style={{width:'100%',minWidth:650,borderCollapse:'collapse'}}>
                    <thead><tr><th style={tH}>Name</th><th style={tH}>Designation</th><th style={tH}>Subject</th><th style={tH}>Attendance</th><th style={tH}>Pass Rate</th><th style={tH}>Experience</th><th style={tH}>Status</th></tr></thead>
                    <tbody>{(FACULTY_LIST[deptKey]??[]).map((f,i)=>{
                      const attNum=parseInt(f.att);const passNum=parseInt(f.passRate);
                      return(<tr key={i} style={{background:i%2===0?'#fafafa':'#fff'}}><td style={{...tD,fontWeight:700}}>{f.name}</td><td style={tD}>{f.designation}</td><td style={tD}>{f.subject}</td><td style={{...tD,fontWeight:700,color:attNum>=88?C.green:attNum>=82?C.orange:C.red}}>{f.att}</td><td style={{...tD,fontWeight:700,color:passNum>=88?C.green:passNum>=82?C.orange:C.red}}>{f.passRate}</td><td style={tD}>{f.exp}</td><td style={tD}><span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:999,background:attNum>=85?'#e6f4ea':'#fff3cd',color:attNum>=85?'#137333':'#b06000',textTransform:'uppercase'}}>{attNum>=85?'Active':'Review'}</span></td></tr>);
                    })}</tbody>
                  </table>
                </div>
              </div>
            ))}
          </CC>
        </>
      )}

      {tab==='finance'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
            <SCard label="Total Income" value={fmtCr(totalIncome)} sub={rangeLabel} tone="blue" icon="" trend="up"/>
            <SCard label="Total Expense" value={fmtCr(totalExpense)} sub={rangeLabel} tone="orange" icon=""/>
            <SCard label="Net Surplus" value={fmtCr(totalIncome-totalExpense)} sub="Income - Expense" tone="green" icon="" trend="up"/>
            <SCard label="Scholarships" value={ad.summaryData?.scholarships??0} sub="Active avg" tone="purple" icon=""/>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Income vs Expense Trend" subtitle={`${rangeLabel} monthly`}><ResponsiveContainer width="100%" height={H}><BarChart data={incExpData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={fmtCr}/><Tooltip {...TT_STYLE} formatter={fmtCr}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Bar dataKey="income" name="Income" fill={C.blue} radius={[4,4,0,0]}/><Bar dataKey="expense" name="Expense" fill={C.orange} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></CC>
            <CC title="Expense Breakdown" subtitle="Category-wise split"><ResponsiveContainer width="100%" height={H}><PieChart><Pie data={ad.expenseBreakdown||[]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={<PieLabelInside labelType="pct"/>} labelLine={false}>{(ad.expenseBreakdown||[]).map((_,i)=><Cell key={i} fill={[C.blue,C.orange,C.green,C.purple,C.teal][i]}/>)}</Pie><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/><Legend wrapperStyle={{fontSize:10,fontFamily:"'Outfit', sans-serif"}}/></PieChart></ResponsiveContainer></CC>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Fee Collection by Department" subtitle={`${rangeLabel} avg`}><ResponsiveContainer width="100%" height={H}><BarChart data={dc?avgFinanceDept(ad.financeDeptByMonth,activeMonths,DEPTS).filter(d=>d.dept===dc):avgFinanceDept(ad.financeDeptByMonth,activeMonths,DEPTS)} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="dept" tick={{fontSize:11,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip {...TT_STYLE}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Bar dataKey="paid" name="Paid" stackId="a" fill={C.green} radius={[0,0,0,0]}/><Bar dataKey="pending" name="Pending" stackId="a" fill={C.orange} radius={[0,0,0,0]}/><Bar dataKey="overdue" name="Overdue" stackId="a" fill={C.red} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></CC>
            <CC title="Fee Payment Status" subtitle={`${rangeLabel} avg split`}><ResponsiveContainer width="100%" height={H}><PieChart><Pie data={avgFinancePie(ad.financePieByMonth,activeMonths)} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value" label={<PieLabelInside labelType="pct"/>} labelLine={false}>{avgFinancePie(ad.financePieByMonth,activeMonths).map((_,i)=><Cell key={i} fill={PIE_COLS[i]}/>)}</Pie><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/><Legend wrapperStyle={{fontSize:12,fontFamily:"'Outfit', sans-serif"}}/></PieChart></ResponsiveContainer></CC>
          </div>
        </>
      )}
    </>);
}

// ══════════════════════════════════════════════════════════════════════════════
// FINANCE VIEW
// ══════════════════════════════════════════════════════════════════════════════
function FinanceView({activeMonths,rangeLabel,department,semester,analyticsData,DEPTS,DEPT_FULL,DEPT_CODE}){
  const [tab,setTab]=useState('collection');
  const ad = analyticsData || {};
  const dc = DEPT_CODE[department];

  const financeCardsByMonth = ad.financeCardsByMonth || {};
  const financeColByMonth   = ad.financeColByMonth   || {};
  const financePieByMonth   = ad.financePieByMonth   || {};
  const financeDeptByMonth  = ad.financeDeptByMonth  || {};
  const incomeExpenseByMonth= ad.incomeExpenseByMonth || {};
  const expenseBreakdown    = ad.expenseBreakdown     || [];
  const paymentMethodData   = ad.paymentMethodData    || [];
  const scholarshipByDept   = ad.scholarshipByDept    || [];
  const pendingStudents     = ad.pendingStudents      || [];
  const semesterFeeData     = ad.semesterFeeData      || [];

  const fiCards = useMemo(()=>({
    collected:avgCardField(financeCardsByMonth,activeMonths,'collected'),
    pending:avgCardField(financeCardsByMonth,activeMonths,'pending'),
    scholarships:avgCardField(financeCardsByMonth,activeMonths,'scholarships'),
    late:avgCardField(financeCardsByMonth,activeMonths,'late'),
  }),[activeMonths,financeCardsByMonth]);

  const fiColData = useMemo(()=>{
    const weeks=['Wk1','Wk2','Wk3','Wk4'];
    return weeks.map(w=>({week:w,collected:Math.round(activeMonths.reduce((s,m)=>{const r=(financeColByMonth[m.month]??[]).find(x=>x.week===w);return s+(r?.collected??0)},0)/activeMonths.length),target:Math.round(activeMonths.reduce((s,m)=>{const r=(financeColByMonth[m.month]??[]).find(x=>x.week===w);return s+(r?.target??0)},0)/activeMonths.length)}));
  },[activeMonths,financeColByMonth]);

  const fiPieData = avgFinancePie(financePieByMonth,activeMonths);
  const fiDeptData = avgFinanceDept(financeDeptByMonth,activeMonths,DEPTS);

  const semFeeDetails = semesterFeeData.map(s=>({...s,rate:s.target?Math.round(s.collected/s.target*100):0}));

  const TABS=[{id:'collection',label:'Fee Collection'},{id:'status',label:'Fee Status'},{id:'expenses',label:'Expenses'},{id:'scholarships',label:'Scholarships'}];

  return(
    <><RoleTab tabs={TABS} active={tab} onChange={setTab}/>

      {tab==='collection'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
            <SCard label="Total Collected" value={fiCards.collected} sub={rangeLabel} tone="blue" icon="" trend="up"/>
            <SCard label="Pending Fees" value={fiCards.pending} sub={rangeLabel} tone="orange" icon=""/>
            <SCard label="Scholarships" value={fiCards.scholarships} sub="Active avg" tone="green" icon=""/>
            <SCard label="Late Payments" value={fiCards.late} sub="Avg / month" tone="red" icon=""/>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Weekly Fee Collection" subtitle={`${rangeLabel} avg — target vs collected`}><ResponsiveContainer width="100%" height={H2}><BarChart data={fiColData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="week" tick={{fontSize:11,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={fmt}/><Tooltip {...TT_STYLE} formatter={fmt}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Bar dataKey="collected" name="Collected" fill={C.blue} radius={[6,6,0,0]}/><Bar dataKey="target" name="Target" fill={C.green} radius={[6,6,0,0]} fillOpacity={0.3}/></BarChart></ResponsiveContainer></CC>
            <CC title="Payment Status" subtitle={`${rangeLabel} avg`}><ResponsiveContainer width="100%" height={H2}><PieChart><Pie data={fiPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={<PieLabelInside labelType="pct"/>} labelLine={false}>{fiPieData.map((_,i)=><Cell key={i} fill={PIE_COLS[i]}/>)}</Pie><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/><Legend wrapperStyle={{fontSize:12,fontFamily:"'Outfit', sans-serif"}}/></PieChart></ResponsiveContainer></CC>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Department-wise Collection" subtitle={`${rangeLabel} avg breakdown`}><ResponsiveContainer width="100%" height={H}><BarChart data={fiDeptData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="dept" tick={{fontSize:11,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip {...TT_STYLE}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Bar dataKey="paid" name="Paid" stackId="a" fill={C.green} radius={[0,0,0,0]}/><Bar dataKey="pending" name="Pending" stackId="a" fill={C.orange} radius={[0,0,0,0]}/><Bar dataKey="overdue" name="Overdue" stackId="a" fill={C.red} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></CC>
            <CC title="Payment Method Split" subtitle="Online / bank / cash"><ResponsiveContainer width="100%" height={H}><PieChart><Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={<PieLabelInside labelType="pct"/>} labelLine={false}>{paymentMethodData.map((_,i)=><Cell key={i} fill={[C.blue,C.green,C.orange][i]}/>)}</Pie><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/></PieChart></ResponsiveContainer></CC>
          </div>
          <CC title="Semester-wise Fee Report" subtitle="Collection per semester" style={{marginBottom:20}}>
            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
              <table style={{width:'100%',minWidth:650,borderCollapse:'collapse'}}><thead><tr><th style={tH}>Semester</th><th style={tH}>Students</th><th style={tH}>Collected</th><th style={tH}>Pending</th><th style={tH}>Rate</th><th style={tH}>Progress</th></tr></thead>
                <tbody>{semFeeDetails.map((s,i)=>(
                  <tr key={i} style={{background:i%2===0?'#fafafa':'#fff'}}><td style={{...tD,fontWeight:700}}>{s.sem}</td><td style={tD}>{ad.summaryData?.students??'—'}</td><td style={{...tD,fontWeight:700,color:C.blue}}>{fmtCr(s.collected)}</td><td style={{...tD,color:C.orange}}>{fmtCr(s.target-s.collected)}</td><td style={{...tD,fontWeight:700,color:s.rate>=90?C.green:s.rate>=80?C.orange:C.red}}>{s.rate}%</td><td style={{...tD,minWidth:120}}><MiniProgress value={s.rate} color={s.rate>=90?C.green:s.rate>=80?C.orange:C.red}/></td></tr>
                ))}</tbody></table>
            </div>
          </CC>
        </>
      )}

      {tab==='status'&&(
        <CC title="Pending Fee Students" subtitle="Students with overdue or upcoming payments" style={{marginBottom:20}}>
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table style={{width:'100%',minWidth:650,borderCollapse:'collapse'}}><thead><tr><th style={tH}>Student</th><th style={tH}>Roll No</th><th style={tH}>Dept</th><th style={tH}>Amount</th><th style={tH}>Due Date</th><th style={tH}>Days</th><th style={tH}>Semester</th><th style={tH}>Status</th></tr></thead>
              <tbody>{pendingStudents.map((s,i)=>(
                <tr key={i} style={{background:s.days<0?'#fef2f2':i%2===0?'#fafafa':'#fff'}}><td style={{...tD,fontWeight:700}}>{s.name}</td><td style={{...tD,color:'#6b7280'}}>{s.rollNo}</td><td style={tD}>{s.dept}</td><td style={{...tD,fontWeight:700,color:C.blue}}>{s.amount}</td><td style={tD}>{s.due}</td><td style={{...tD,fontWeight:700,color:s.days<0?C.red:s.days<=3?C.orange:C.green}}>{s.days<0?`${Math.abs(s.days)}d overdue`:`${s.days}d left`}</td><td style={tD}>{s.sem}</td><td style={tD}><span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:999,background:s.days<0?'#fef2f2':s.days<=3?'#fff7ed':'#f0fdf4',color:s.days<0?'#b91c1c':s.days<=3?'#c2410c':'#16a34a',textTransform:'uppercase'}}>{s.days<0?'Overdue':s.days<=3?'Urgent':'On Track'}</span></td></tr>
              ))}</tbody></table>
          </div>
        </CC>
      )}

      {tab==='expenses'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
            {(()=>{const totals=activeMonths.reduce((acc,m)=>{const d=incomeExpenseByMonth[m.month]??{income:0,expense:0};return{income:acc.income+d.income,expense:acc.expense+d.expense}},{income:0,expense:0});return(<>
              <SCard label="Total Expenses" value={fmtCr(totals.expense)} sub={rangeLabel} tone="orange" icon=""/>
              <SCard label="Salary Cost" value={fmtCr(totals.expense*0.58)} sub="58% of total" tone="blue" icon=""/>
              <SCard label="Infrastructure" value={fmtCr(totals.expense*0.22)} sub="22% of total" tone="purple" icon=""/>
              <SCard label="Net Surplus" value={fmtCr(totals.income-totals.expense)} sub="Income - Expense" tone="green" icon="" trend="up"/>
            </>);})()}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Expense Breakdown" subtitle="Category distribution"><ResponsiveContainer width="100%" height={H2}><PieChart><Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={<PieLabelInside labelType="pct"/>} labelLine={false}>{expenseBreakdown.map((_,i)=><Cell key={i} fill={[C.blue,C.orange,C.red,C.purple,C.teal][i]}/>)}</Pie><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/></PieChart></ResponsiveContainer></CC>
            <CC title="Income vs Expense Trend" subtitle="Monthly surplus / deficit"><ResponsiveContainer width="100%" height={H2}><AreaChart data={activeMonths.map(mn=>({month:mn.label,...(incomeExpenseByMonth[mn.month]??{income:0,expense:0}),net:(incomeExpenseByMonth[mn.month]?.income??0)-(incomeExpenseByMonth[mn.month]?.expense??0)}))} margin={{top:4,right:4,left:-10,bottom:0}}><defs><linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.3}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={fmtCr}/><Tooltip {...TT_STYLE} formatter={fmtCr}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Area type="monotone" dataKey="net" name="Net Surplus" stroke={C.green} fill="url(#gNet)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer></CC>
          </div>
        </>
      )}

      {tab==='scholarships'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
            <SCard label="Total Scholarships" value={fiCards.scholarships} sub="Active avg" tone="blue" icon=""/>
            <SCard label="Merit-based" value={`${scholarshipByDept.reduce((s,d)=>s+d.merit,0)}`} sub="All depts" tone="green" icon="" trend="up"/>
            <SCard label="Need-based" value={`${scholarshipByDept.reduce((s,d)=>s+d.needBased,0)}`} sub="All depts" tone="orange" icon=""/>
            <SCard label="Sports Quota" value={`${scholarshipByDept.reduce((s,d)=>s+d.sports,0)}`} sub="All depts" tone="purple" icon=""/>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Scholarships by Department" subtitle="Merit, need-based, sports"><ResponsiveContainer width="100%" height={H2}><BarChart data={dc?scholarshipByDept.filter(d=>d.dept===dc):scholarshipByDept} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="dept" tick={{fontSize:11,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip {...TT_STYLE}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Bar dataKey="merit" name="Merit" fill={C.blue} radius={[0,0,0,0]}/><Bar dataKey="needBased" name="Need" fill={C.green} radius={[0,0,0,0]}/><Bar dataKey="sports" name="Sports" fill={C.orange} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></CC>
            <CC title="Scholarship Type Split" subtitle="Total across all depts"><ResponsiveContainer width="100%" height={H2}><PieChart><Pie data={[{name:'Merit',value:scholarshipByDept.reduce((s,d)=>s+d.merit,0)},{name:'Need-based',value:scholarshipByDept.reduce((s,d)=>s+d.needBased,0)},{name:'Sports',value:scholarshipByDept.reduce((s,d)=>s+d.sports,0)}]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={<PieLabelInside labelType="count"/>} labelLine={false}>{[0,1,2].map(i=><Cell key={i} fill={[C.blue,C.green,C.orange][i]}/>)}</Pie><Tooltip {...TT_STYLE}/><Legend wrapperStyle={{fontSize:12,fontFamily:"'Outfit', sans-serif"}}/></PieChart></ResponsiveContainer></CC>
          </div>
        </>
      )}
    </>);
}

// ══════════════════════════════════════════════════════════════════════════════
// FACULTY VIEW
// ══════════════════════════════════════════════════════════════════════════════
function FacultyView({activeMonths,rangeLabel,department,semester,analyticsData}){
  const [tab,setTab]=useState('attendance');
  const ad = analyticsData || {};

  const facultyAttByMonth  = ad.facultyAttByMonth  || {};
  const facultySubByMonth  = ad.facultySubByMonth  || {};
  const facultyCardsByMonth= ad.facultyCardsByMonth || {};
  const marksDistByMonth   = ad.marksDistByMonth    || {};
  const examResultsBySubject = ad.examResultsBySubject || [];
  const studentRiskData    = ad.studentRiskData     || [];

  const fAttData = useMemo(()=>{
    const weeks=['Wk1','Wk2','Wk3','Wk4'];
    return weeks.map(w=>{const row={week:w};['CS6001','CS6002','Phy'].forEach(k=>{row[k]=Math.round(activeMonths.reduce((s,m)=>{const r=(facultyAttByMonth[m.month]??[]).find(x=>x.week===w);return s+(r?.[k]??0)},0)/activeMonths.length);});return row;});
  },[activeMonths,facultyAttByMonth]);

  const fSubData = useMemo(()=>{
    const weeks=['Wk1','Wk2','Wk3','Wk4'];
    return weeks.map(w=>({week:w,onTime:Math.round(activeMonths.reduce((s,m)=>{const r=(facultySubByMonth[m.month]??[]).find(x=>x.week===w);return s+(r?.onTime??0)},0)/activeMonths.length),late:Math.round(activeMonths.reduce((s,m)=>{const r=(facultySubByMonth[m.month]??[]).find(x=>x.week===w);return s+(r?.late??0)},0)/activeMonths.length),missing:Math.round(activeMonths.reduce((s,m)=>{const r=(facultySubByMonth[m.month]??[]).find(x=>x.week===w);return s+(r?.missing??0)},0)/activeMonths.length)}));
  },[activeMonths,facultySubByMonth]);

  const fCards = useMemo(()=>({
    students:avgCardField(facultyCardsByMonth,activeMonths,'students'),
    att:avgCardField(facultyCardsByMonth,activeMonths,'att'),
    submitted:avgCardField(facultyCardsByMonth,activeMonths,'submitted'),
    pending:avgCardField(facultyCardsByMonth,activeMonths,'pending'),
  }),[activeMonths,facultyCardsByMonth]);

  const fMarksDist = useMemo(()=>avgMarksDist(marksDistByMonth,activeMonths),[activeMonths,marksDistByMonth]);

  const attTrendData = useMemo(()=>{
    return activeMonths.map(mn=>{const row={month:mn.label};['CS6001','CS6002','Phy'].forEach(k=>{const weeks=facultyAttByMonth[mn.month]??[];row[k]=weeks.length?Math.round(weeks.reduce((s,w)=>s+(w[k]??0),0)/weeks.length):0;});return row;});
  },[activeMonths,facultyAttByMonth]);

  const TABS=[{id:'attendance',label:'Attendance'},{id:'performance',label:'Performance'},{id:'assignments',label:'Assignments'},{id:'exams',label:'Exams & Grades'}];

  return(
    <><RoleTab tabs={TABS} active={tab} onChange={setTab}/>{tab==='attendance'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}><SCard label="Students in Class" value={fCards.students} sub={rangeLabel} tone="blue" icon=""/><SCard label="Avg Attendance" value={fCards.att} sub={rangeLabel} tone="green" icon="" trend="up"/><SCard label="Below 75% Alert" value={`${studentRiskData.filter(s=>parseInt(s.att)<75).length}`} sub="Students at risk" tone="red" icon=""/><SCard label="Above 90%" value={`${MONTHS_ALL.flatMap(m=>Object.values(facultyAttByMonth[m]??{}).flatMap(w=>typeof w==='object'?Object.values(w):[])).filter(v=>typeof v==='number'&&v>=90).length}`} sub="Class-weeks" tone="purple" icon=""/></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Weekly Attendance by Course" subtitle={`${rangeLabel} — per subject`}><ResponsiveContainer width="100%" height={H}><LineChart data={fAttData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="week" tick={{fontSize:8,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis domain={[65,100]} tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Line type="monotone" dataKey="CS6001" stroke={C.blue} strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="CS6002" stroke={C.cyan} strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="Phy" stroke={C.orange} strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></CC>
            <CC title="Annual Attendance Trend" subtitle="12-month overview per course"><ResponsiveContainer width="100%" height={H}><LineChart data={attTrendData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis domain={[70,100]} tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Line type="monotone" dataKey="CS6001" stroke={C.blue} strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="CS6002" stroke={C.cyan} strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="Phy" stroke={C.orange} strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></CC>
          </div>
          <CC title="At-Risk Students" subtitle="Below 75% attendance — action required" style={{marginBottom:20}}>
            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
              <table style={{width:'100%',minWidth:650,borderCollapse:'collapse'}}><thead><tr><th style={tH}>Student</th><th style={tH}>Roll No</th><th style={tH}>Attendance</th><th style={tH}>Marks</th><th style={tH}>Subject</th><th style={tH}>Risk</th></tr></thead><tbody>{studentRiskData.map((s,i)=>(
                    <tr key={i} style={{background:s.risk==='high'?'#fff5f5':i%2===0?'#fafafa':'#fff'}}><td style={{...tD,fontWeight:700}}>{s.name}</td><td style={{...tD,color:'#6b7280'}}>{s.rollNo}</td><td style={{...tD,fontWeight:800,color:parseInt(s.att)<70?C.red:C.orange}}>{s.att}</td><td style={{...tD,fontWeight:700,color:s.marks<60?C.red:C.orange}}>{s.marks}</td><td style={tD}>{s.subject}</td><td style={tD}><span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:999,background:s.risk==='high'?'#fef2f2':s.risk==='medium'?'#fff7ed':'#f0fdf4',color:s.risk==='high'?'#b91c1c':s.risk==='medium'?'#c2410c':'#16a34a',textTransform:'uppercase'}}>{s.risk}</span></td></tr>))}</tbody></table>
            </div>
          </CC>
        </>)}

      {tab==='performance'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}><SCard label="Avg Class Score" value="82" sub={rangeLabel} tone="blue" icon=""/><SCard label="O Grade Students" value={`${fMarksDist.find(d=>d.range===GRADE_O)?.count??0}`} sub="90 and above" tone="green" icon="" trend="up"/><SCard label="Failing Students" value={`${fMarksDist.find(d=>d.range===GRADE_F)?.count??0}`} sub="below 50" tone="red" icon=""/><SCard label="Avg Pass Rate" value="92%" sub="Excl. fails" tone="purple" icon=""/></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Grade Distribution" subtitle={`${rangeLabel} — student count per grade`}><ResponsiveContainer width="100%" height={H}><BarChart data={fMarksDist} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="range" tick={{fontSize:9,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip {...TT_STYLE}/><Bar dataKey="count" name="Students" radius={[6,6,0,0]}>{fMarksDist.map((_,i)=><Cell key={i} fill={[C.green,C.blue,C.cyan,C.purple,C.orange,C.red][i]}/>)}</Bar></BarChart></ResponsiveContainer></CC>
            <CC title="Grade Distribution Pie" subtitle="Visual breakdown of grades"><ResponsiveContainer width="100%" height={H}><PieChart><Pie data={fMarksDist} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="range" label={<PieLabelInside labelType="count"/>} labelLine={false}>{fMarksDist.map((_,i)=><Cell key={i} fill={[C.green,C.blue,C.cyan,C.purple,C.orange,C.red][i]}/>)}</Pie><Tooltip {...TT_STYLE}/></PieChart></ResponsiveContainer></CC>
          </div>
        </>)}

      {tab==='assignments'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}><SCard label="Total Submitted" value={fCards.submitted} sub={rangeLabel} tone="blue" icon="" trend="up"/><SCard label="Pending" value={fCards.pending} sub="Avg / month" tone="orange" icon="" trend="down"/><SCard label="On-Time Rate" value={`${Math.round(activeMonths.reduce((s,m)=>{const d=facultySubByMonth[m.month]??[];const total=d.reduce((a,w)=>a+w.onTime+w.late+w.missing,0)||1;return s+d.reduce((a,w)=>a+w.onTime,0)/total*100},0)/activeMonths.length)}%`} sub="Avg on-time" tone="green" icon="" trend="up"/><SCard label="Missing" value={`${Math.round(activeMonths.reduce((s,m)=>{const d=facultySubByMonth[m.month]??[];return s+d.reduce((a,w)=>a+w.missing,0)},0)/activeMonths.length)}`} sub="Avg / month" tone="red" icon=""/></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Submission Rate (Weekly)" subtitle={`${rangeLabel} — on-time vs late vs missing`}><ResponsiveContainer width="100%" height={H}><BarChart data={fSubData} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="week" tick={{fontSize:8,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip {...TT_STYLE}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Bar dataKey="onTime" name="On Time" stackId="a" fill={C.green} radius={[0,0,0,0]}/><Bar dataKey="late" name="Late" stackId="a" fill={C.orange} radius={[0,0,0,0]}/><Bar dataKey="missing" name="Missing" stackId="a" fill={C.red} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></CC>
            <CC title="Submission Status Split" subtitle={`${rangeLabel} avg`}><ResponsiveContainer width="100%" height={H}><PieChart><Pie data={[{name:'On Time',value:Math.round(activeMonths.reduce((s,m)=>{const d=facultySubByMonth[m]??[];return s+d.reduce((a,w)=>a+w.onTime,0)},0)/activeMonths.length)},{name:'Late',value:Math.round(activeMonths.reduce((s,m)=>{const d=facultySubByMonth[m]??[];return s+d.reduce((a,w)=>a+w.late,0)},0)/activeMonths.length)},{name:'Missing',value:Math.round(activeMonths.reduce((s,m)=>{const d=facultySubByMonth[m]??[];return s+d.reduce((a,w)=>a+w.missing,0)},0)/activeMonths.length)}]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={<PieLabelInside labelType="pct"/>} labelLine={false}>{[0,1,2].map(i=><Cell key={i} fill={[C.green,C.orange,C.red][i]}/>)}</Pie><Tooltip {...TT_STYLE}/><Legend wrapperStyle={{fontSize:12,fontFamily:"'Outfit', sans-serif"}}/></PieChart></ResponsiveContainer></CC>
          </div>
        </>)}

      {tab==='exams'&&(
        <><div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}><SCard label="Overall Pass Rate" value={`${Math.round(examResultsBySubject.reduce((s,d)=>s+d.pass,0)/Math.max(1,examResultsBySubject.length))}%`} sub="All subjects" tone="green" icon=""/><SCard label="Highest Pass Rate" value={`${Math.max(...examResultsBySubject.map(d=>d.pass))}%`} sub={examResultsBySubject.find(d=>d.pass===Math.max(...examResultsBySubject.map(d=>d.pass)))?.subject} tone="blue" icon=""/><SCard label="Lowest Pass Rate" value={`${Math.min(...examResultsBySubject.map(d=>d.pass))}%`} sub={examResultsBySubject.find(d=>d.pass===Math.min(...examResultsBySubject.map(d=>d.pass)))?.subject} tone="red" icon=""/><SCard label="Avg Class Score" value={`${Math.round(examResultsBySubject.reduce((s,d)=>s+d.avg,0)/Math.max(1,examResultsBySubject.length))}`} sub="All subjects" tone="purple" icon=""/></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <CC title="Subject-wise Pass Rate" subtitle="Pass vs fail breakdown per subject"><ResponsiveContainer width="100%" height={H2}><BarChart data={examResultsBySubject} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="subject" tick={{fontSize:9,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/><Tooltip {...TT_STYLE} formatter={v=>`${v}%`}/><Legend wrapperStyle={{fontSize:11,fontFamily:"'Outfit', sans-serif"}}/><Bar dataKey="pass" name="Pass%" stackId="a" fill={C.green} radius={[0,0,0,0]}/><Bar dataKey="fail" name="Fail%" stackId="a" fill={C.red} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></CC>
            <CC title="Average Marks per Subject" subtitle="Subject performance comparison"><ResponsiveContainer width="100%" height={H2}><BarChart data={examResultsBySubject} margin={{top:4,right:4,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/><XAxis dataKey="subject" tick={{fontSize:9,fill:'#64748b',fontWeight:600}} axisLine={false} tickLine={false}/><YAxis domain={[50,100]} tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false}/><Tooltip {...TT_STYLE}/><Bar dataKey="avg" name="Avg Marks" radius={[6,6,0,0]}>{examResultsBySubject.map((_,i)=><Cell key={i} fill={[C.blue,C.cyan,C.orange,C.green,C.purple][i]}/>)}</Bar></BarChart></ResponsiveContainer></CC>
          </div>
          <CC title="Exam Results Summary" subtitle="Detailed per-subject exam report" style={{marginBottom:20}}>
            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
              <table style={{width:'100%',minWidth:650,borderCollapse:'collapse'}}><thead><tr><th style={tH}>Subject</th><th style={tH}>Pass%</th><th style={tH}>Fail%</th><th style={tH}>Avg Marks</th><th style={tH}>Pass Rate Bar</th><th style={tH}>Grade</th></tr></thead><tbody>{examResultsBySubject.map((s,i)=>(
                    <tr key={i} style={{background:i%2===0?'#fafafa':'#fff'}}><td style={{...tD,fontWeight:700}}>{s.subject}</td><td style={{...tD,fontWeight:800,color:C.green}}>{s.pass}%</td><td style={{...tD,fontWeight:800,color:C.red}}>{s.fail}%</td><td style={{...tD,fontWeight:700,color:C.blue}}>{s.avg}</td><td style={{...tD,minWidth:120}}><MiniProgress value={s.pass} color={s.pass>=88?C.green:s.pass>=80?C.orange:C.red}/></td><td style={tD}><span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:999,background:s.pass>=90?'#fffbeb':s.pass>=80?'#f0fdf4':'#fef2f2',color:s.pass>=90?'#b45309':s.pass>=80?'#16a34a':'#b91c1c'}}>{s.pass>=90?'Excellent':s.pass>=80?'Good':'Needs Work'}</span></td></tr>))}</tbody></table>
            </div>
          </CC>
        </>)}
    </>);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AnalyticsPage({role:propRole}){
  const [searchParams] = useSearchParams();
  const [calOpen,     setCalOpen]     = useState(false);
  const calRef = useRef(null);

  const storedRole = localStorage.getItem('cmsRole')||'student';
  const role       = getValidRole(propRole||searchParams.get('role')||storedRole);
  const data       = cmsRoles[role];

  const [startMY,    setStartMY]    = useState({month:0,year:2024});
  const [endMY,      setEndMY]      = useState({month:11,year:2026});
  const [semester,   setSemester]   = useState(SEMESTER_OPTS[0]);
  const [department, setDepartment] = useState('All Departments');

  const [dbDepartments, setDbDepartments] = useState([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await settingsApi.getDepartments();
        if (data && data.length > 0) {
          setDbDepartments(data);
        }
      } catch (err) {
        console.error('Error fetching departments in AnalyticsPage:', err);
      }
    };
    fetchDepts();
  }, []);

  const { DEPTS, DEPT_FULL, DEPT_OPTS, DEPT_CODE } = useMemo(() => {
    if (dbDepartments.length === 0) {
      return {
        DEPTS: ['CS','Phys','Math','ECE','Mech'],
        DEPT_FULL: { CS:'Computer Science', Phys:'Physics', Math:'Mathematics', ECE:'Electronics', Mech:'Mechanical' },
        DEPT_OPTS: ['All Departments','Computer Science','Physics','Mathematics','Electronics','Mechanical'],
        DEPT_CODE: { 'All Departments':null,'Computer Science':'CS','Physics':'Phys','Mathematics':'Math','Electronics':'ECE','Mechanical':'Mech' }
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

    return {
      DEPTS: depts,
      DEPT_FULL: deptFull,
      DEPT_OPTS: deptOpts,
      DEPT_CODE: deptCode
    };
  }, [dbDepartments]);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() =>{
    let cancelled = false;
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const deptCode = DEPT_CODE[department];
        const params = new URLSearchParams();
        params.append('role', role);
        if (deptCode) params.append('department', deptCode);
        
        // Extract semester number
        const semMatch = semester.match(/\d+/);
        if (semMatch) params.append('semester', semMatch[0]);
        
        // Add date range parameters
        params.append('startMonth', String(startMY.month + 1));
        params.append('startYear', String(startMY.year));
        params.append('endMonth', String(endMY.month + 1));
        params.append('endYear', String(endMY.year));

        const res = await fetch(`${API_BASE}/analytics/full?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch analytics data');
        const json = await res.json();

        if (cancelled) return;
        if (json.success) {
          setAnalyticsData(json.data);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAnalytics();
    return () =>{ cancelled = true; };
  }, [role, department, semester, startMY, endMY]);

  useEffect(()=>{
    function onOut(e){if(calRef.current&&!calRef.current.contains(e.target))setCalOpen(false);}
    if(calOpen)document.addEventListener('mousedown',onOut);
    return()=>document.removeEventListener('mousedown',onOut);
  },[calOpen]);

  const activeMonths = useMemo(()=>{
    const sk=myToKey(startMY),ek=myToKey(endMY),lo=Math.min(sk,ek),hi=Math.max(sk,ek);
    const res=[];
    for(let k=lo;k<=hi;k++){
      const {month, year}=keyToMY(k);
      res.push({
        month: MONTHS_ALL[month],
        year: year,
        label: `${MONTHS_ALL[month]} ${String(year).slice(-2)}`
      });
    }
    return res;
  },[startMY,endMY]);

  const rangeLabel   = myToKey(startMY)===myToKey(endMY)?myLabel(startMY):`${myLabel(startMY)} \u2013 ${myLabel(endMY)}`;
  const triggerLabel = myToKey(startMY)===myToKey(endMY)?myLabel(startMY):`${myLabel(startMY)} \u2192 ${myLabel(endMY)}`;

  useEffect(()=>{document.title=`MIT Connect \u2013 ${data.label} Analytics`;localStorage.setItem('cmsRole',role);},[data.label,role]);

  function FilterBar(){
    return(
      <div className="content-card-premium" style={{marginBottom:28,padding:'20px 24px',background:'#ffffff',border:'1px solid #e2e8f0'}}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end gap-4">
          <div className="relative" ref={calRef}>
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.8,marginBottom:6,display:'flex',alignItems:'center',gap:6,fontFamily:"'Outfit', sans-serif"}}>
              <Ico.Calendar/>Date Range
            </div>
            <button onClick={()=>setCalOpen(o=>!o)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,height:40,padding:'0 16px',borderRadius:10,border:`1.5px solid ${calOpen?'#6d28d9':'#cbd5e1'}`,background:calOpen?'#faf5ff':'#fff',color:'#1e293b',fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',boxShadow:calOpen?'0 0 0 3px rgba(0, 35, 111,.12)':'none',transition:'all 0.15s',fontFamily:"'Outfit', sans-serif",width:'100%'}}>
              <span style={{display:'flex',alignItems:'center',gap:8}}><Ico.Calendar/>{triggerLabel}</span><span style={{fontSize:10,color:'#64748b'}}>▾</span>
            </button>
            {calOpen&&<CalendarRangePicker startMY={startMY} endMY={endMY} onChange={({startMY:s,endMY:e})=>{setStartMY(s);setEndMY(e);}} onClose={()=>setCalOpen(false)}/>}
          </div>
          
          <div className="flex flex-col">
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.8,marginBottom:6,fontFamily:"'Outfit', sans-serif"}}>Semester</div>
            <select value={semester} onChange={e=>setSemester(e.target.value)} style={{height:40,padding:'0 16px',borderRadius:10,border:'1.5px solid #cbd5e1',background:'#fff',fontSize:13,fontWeight:600,color:'#1e293b',cursor:'pointer',outline:'none',width:'100%',minWidth:180,fontFamily:"'Outfit', sans-serif"}}>
              {SEMESTER_OPTS.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          
          {role!=='student'&&(
            <div className="flex flex-col">
              <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.8,marginBottom:6,fontFamily:"'Outfit', sans-serif"}}>Department</div>
              <select value={department} onChange={e=>setDepartment(e.target.value)} style={{height:40,padding:'0 16px',borderRadius:10,border:'1.5px solid #cbd5e1',background:'#fff',fontSize:13,fontWeight:600,color:'#1e293b',cursor:'pointer',outline:'none',width:'100%',minWidth:200,fontFamily:"'Outfit', sans-serif"}}>
                {DEPT_OPTS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-end gap-3 mt-2 sm:mt-0 col-span-1 sm:col-span-2 lg:col-span-1 lg:ml-auto">
            <button onClick={()=>{setStartMY({month:0,year:2024});setEndMY({month:11,year:2026});setSemester(SEMESTER_OPTS[0]);setDepartment('All Departments');}} style={{height:40,padding:'0 18px',borderRadius:10,border:'1.5px solid #cbd5e1',background:'#f8fafc',color:'#64748b',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.2s',fontFamily:"'Outfit', sans-serif",flex:1}}>
              Reset
            </button>
            
            <button onClick={()=>exportCSV(role,activeMonths,rangeLabel,'students',analyticsData,DEPTS,DEPT_FULL)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,height:40,padding:'0 20px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#6d28d9,#4c1d95)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px rgba(0, 35, 111,.3)',transition:'all 0.2s',fontFamily:"'Outfit', sans-serif",flex:2}}>
              <Ico.Download/>Download Report
            </button>
          </div>
        </div>
        
        <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap',alignItems:'center',borderTop:'1px solid #f1f5f9',paddingTop:14}}>
          <span style={{fontSize:12,color:'#64748b',fontWeight:500}}>Active Filters:</span>
          <span style={{fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:999,background:'#faf5ff',color:'#6d28d9',border:'1px solid #d4e5d1',fontFamily:"'Outfit', sans-serif"}}>{triggerLabel}</span>
          <span style={{fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:999,background:'#faf5ff',color:'#7c3aed',border:'1px solid #ddd6fe',fontFamily:"'Outfit', sans-serif"}}>{semester}</span>
          {department!==DEPT_OPTS[0]&&<span style={{fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:999,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',fontFamily:"'Outfit', sans-serif"}}>{department}</span>}
          {activeMonths.length>1&&<span style={{fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:999,background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa',fontFamily:"'Outfit', sans-serif"}}>{activeMonths.length} Months Range</span>}
        </div>
      </div>
    );
  }

  return (
    <Layout title="Reports & Analytics">
      <style>{`
        .premium-kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.08) !important;
          border-color: rgba(0, 35, 111, 0.3) !important;
        }
        .content-card-premium {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.02);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .content-card-premium:hover {
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
        }
      `}</style>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><p style={{color:'#64748b',fontSize:13,margin:0}}>{role==='admin'&&'College-wide statistics - Students, Faculty, Finance'}
          {role==='faculty'&&'Class performance, attendance and exam analytics'}
          {role==='finance'&&'Fee collection, expenses and scholarship analytics'}
          {role==='student'&&'Your personal performance overview'}
        </p><span style={{fontSize:11,color:'#9ca3af',fontWeight:500}}>Updated {new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>{FilterBar()}
      {loading && !analyticsData ? <LoadingSpinner/> : <>
        {role==='admin'  && <AdminView   activeMonths={activeMonths} rangeLabel={rangeLabel} department={department} semester={semester} analyticsData={analyticsData}/>}
        {role==='finance' && <FinanceView activeMonths={activeMonths} rangeLabel={rangeLabel} department={department} semester={semester} analyticsData={analyticsData} DEPTS={DEPTS} DEPT_FULL={DEPT_FULL} DEPT_CODE={DEPT_CODE}/>}
        {role==='faculty' && <FacultyView activeMonths={activeMonths} rangeLabel={rangeLabel} department={department} semester={semester} analyticsData={analyticsData}/>}
        {role==='student' && <div style={{textAlign:'center',padding:'60px 0',color:'#9ca3af',fontSize:14}}>Student analytics coming soon</div>}
      </>}
    </Layout>);
}