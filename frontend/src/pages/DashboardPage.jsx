import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserSession, getUserData } from '../auth/sessionController';
import { roleMenuGroups } from '../data/roleConfig';
import { getDashboardSummary } from '../services/dashboardService';
import { API_BASE } from '../api/apiBase';
import Layout from '../components/Layout';
import NewsletterWidget from '../components/NewsletterWidget';

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [freshUserData, setFreshUserData] = useState(null);
  const [widgetData, setWidgetData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  const session = getUserSession();
  const dynamicUser = getUserData();
  const sessionRole = session?.role || null;
  const sessionUserId = session?.userId || null;
  const role = sessionRole || 'student';
  
  const userToUse = freshUserData || dynamicUser;

  // ── Derived Profile Fields ──────────────────────────────────────
  const userName       = userToUse?.name || userToUse?.fullName || userToUse?.staffName || 'User Member';
  const designation    = userToUse?.designation || (role === 'admin' ? 'Administrator' : role === 'finance' ? 'Finance Officer' : 'Student');
  const department     = userToUse?.department || userToUse?.departmentId || userToUse?.course || (role === 'admin' ? 'Campus Administration' : role === 'finance' ? 'Accounts & Billing' : 'Computer Science');
  const email          = userToUse?.email || '—';
  const phone          = userToUse?.phone || '—';
  const status         = userToUse?.status || userToUse?.employment_status || (role === 'student' ? 'Enrolled' : 'Active');
  const officeLocation = userToUse?.officeLocation || userToUse?.hostelRoom || userToUse?.location || (role === 'admin' ? 'Main Block, Room 101' : role === 'finance' ? 'Finance Block, Room 204' : 'Hostel Block A, Room 302');
  const rollNumber     = userToUse?.rollNumber || sessionUserId || '—';

  // ── Student-Specific ──────────────────────────────────────────
  const cgpa            = userToUse?.cgpa?.toString() || '0.0';
  const attendancePct   = userToUse?.attendancePct || userToUse?.attendance_rate || 0;
  const enrolledCourses = Array.isArray(userToUse?.subjects) ? userToUse.subjects : [];
  const feeStatus       = userToUse?.feeStatus || 'Paid';

  // ── Admin/Finance-Specific ────────────────────────────────────
  const totalStudents   = dashboardStats?.total_students ?? '0';
  const totalFaculty    = dashboardStats?.total_faculty ?? '0';
  const newAdmissions   = dashboardStats?.new_admissions_count ?? '0';
  const feeCollected    = dashboardStats?.fee_collection?.collected ?? 0;
  const feeDemanded     = dashboardStats?.fee_collection?.demanded ?? 0;
  const feePercentage   = dashboardStats?.fee_collection?.percentage ?? 0;
  const pendingClearance = Math.max(0, feeDemanded - feeCollected);

  // ── Retrieve Data from widgetData Fetch ───────────────────────
  const todayClasses = widgetData?.today_classes || [];
  const upcomingExams = widgetData?.upcoming_exams || [];
  const recentNotifications = widgetData?.recent_notifications || [];
  const upcomingTasks = widgetData?.upcoming_tasks || [];
  const collectionTrends = widgetData?.collection_trends || [];
  const recentInvoices = widgetData?.recent_invoices || [];
  const payrollSummary = widgetData?.payroll_summary || [];

  // ── Navigation Queries ────────────────────────────────────────
  const roleQuery = `?role=${encodeURIComponent(role)}`;

  useEffect(() => {
    if (!sessionRole || !sessionUserId) {
      navigate('/', { replace: true });
      return undefined;
    }

    document.title = `MIT Connect - ${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`;

    const expectedSearch = `?role=${encodeURIComponent(sessionRole)}`;
    if (location.search !== expectedSearch) {
      navigate(`/dashboard${expectedSearch}`, { replace: true });
    }

    function enforceSessionOnPageRestore() {
      if (!getUserSession()) navigate('/', { replace: true });
    }

    async function fetchDashboardData() {
      setDataLoading(true);
      try {
        // 1. Fetch general KPIs / student profile
        if (role === 'admin' || role === 'finance') {
          const summary = await getDashboardSummary();
          if (summary) {
            setDashboardStats(summary);
          }
          const profileRes = await fetch(`${API_BASE}/settings/${role}/${encodeURIComponent(sessionUserId)}/profile`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setFreshUserData(profileData);
          }
        } else if (role === 'student' && sessionUserId) {
          const [stuRes, examsRes, marksRes] = await Promise.all([
            fetch(`${API_BASE}/students/${encodeURIComponent(sessionUserId)}`),
            fetch(`${API_BASE}/exams`),
            fetch(`${API_BASE}/exams/marks?student_id=${encodeURIComponent(sessionUserId)}`)
          ]);
          if (stuRes.ok) {
            const stuData = await stuRes.json();
            let allExams = [];
            let studentMarks = [];
            if (examsRes && examsRes.ok) {
              const examsData = await examsRes.json();
              allExams = examsData.data || [];
            }
            if (marksRes && marksRes.ok) {
              const marksData = await marksRes.json();
              studentMarks = marksData.data || [];
            }

            const norm = (c) => String(c || '').replace(/[-_\s]+/g, '').toUpperCase();

            // Map subjects to End-Sem marks
            const mapped = (stuData.subjects || []).map(sub => {
              const subCodeNorm = norm(sub.code);
              const endSemExam = allExams.find(e => norm(e.code) === subCodeNorm && e.type === 'End-Sem');
              let marksRecord = null;
              if (endSemExam) {
                const examId = endSemExam._id || endSemExam.id;
                marksRecord = studentMarks.find(m => String(m.examId) === String(examId));
              }
              if (!marksRecord) {
                marksRecord = studentMarks.find(m => {
                  const ex = allExams.find(e => String(e._id || e.id) === String(m.examId));
                  return ex && norm(ex.code) === subCodeNorm && ex.type === 'End-Sem';
                });
              }
              return {
                ...sub,
                grade: marksRecord ? (marksRecord.grade || 'Pending') : 'Pending',
                total: marksRecord ? (marksRecord.marks !== undefined ? marksRecord.marks : null) : null
              };
            });

            // Calculate dynamic CGPA based only on End-Sem passed courses
            const passed = mapped.filter(s => s.grade && s.grade !== 'Pending' && s.grade !== 'F');
            const totalObtained = passed.reduce((acc, s) => acc + (s.total || 0), 0);
            const totalMax = passed.length * 100;
            const calculatedCgpa = totalMax > 0 ? ((totalObtained / totalMax) * 10).toFixed(2) : '0.00';

            setFreshUserData({
              ...stuData,
              subjects: mapped,
              cgpa: calculatedCgpa
            });
          }
        }

        // 2. Fetch role-specific widgets
        let widgetUrl = '';
        if (role === 'admin') {
          widgetUrl = `${API_BASE}/dashboard/admin/widgets`;
        } else if (role === 'student' && sessionUserId) {
          widgetUrl = `${API_BASE}/dashboard/student/${encodeURIComponent(sessionUserId)}/widgets`;
        } else if (role === 'finance') {
          widgetUrl = `${API_BASE}/dashboard/finance/widgets`;
        }

        if (widgetUrl) {
          const res = await fetch(widgetUrl);
          if (res.ok) {
            const result = await res.json();
            if (result.success && result.data) {
              setWidgetData(result.data);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setDataLoading(false);
      }
    }

    fetchDashboardData();
    window.addEventListener('pageshow', enforceSessionOnPageRestore);
    return () => window.removeEventListener('pageshow', enforceSessionOnPageRestore);
  }, [location.search, navigate, sessionRole, sessionUserId, role]);

  // ── Initials avatar ────────────────────────────────────────────
  const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // ── Status color ───────────────────────────────────────────────
  const statusColor = status === 'Active' || status === 'Enrolled' || status === 'Paid'
    ? { bg: '#dcfce7', text: '#166534', dot: '#22c55e' }
    : status === 'Pending' || status === 'On-Leave'
      ? { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' }
      : { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' };

  // ── Role Specific Hero Gradients & Action Handlers ────────────
  const heroStyles = {
    admin: {
      grad: '#00236f',
      shadow: 'rgba(0, 35, 111, 0.25)',
      primaryLabel: 'Manage Students',
      secondaryLabel: 'Manage Faculty',
      primaryIcon: 'group',
      secondaryIcon: 'person',
      onPrimary: () => navigate(`/students${roleQuery}`),
      onSecondary: () => navigate(`/faculty${roleQuery}`)
    },
    student: {
      grad: '#00236f',
      shadow: 'rgba(0, 35, 111, 0.25)',
      primaryLabel: 'View Timetable',
      secondaryLabel: 'Track Attendance',
      primaryIcon: 'schedule',
      secondaryIcon: 'fact_check',
      onPrimary: () => navigate(`/timetable${roleQuery}`),
      onSecondary: () => navigate(`/attendance${roleQuery}`)
    },
    finance: {
      grad: '#00236f',
      shadow: 'rgba(0, 35, 111, 0.25)',
      primaryLabel: 'Manage Fees',
      secondaryLabel: 'Run Payroll',
      primaryIcon: 'payments',
      secondaryIcon: 'payments',
      onPrimary: () => navigate(`/admin-fees${roleQuery}`),
      onSecondary: () => navigate(`/payroll${roleQuery}`)
    }
  };

  const styleSet = heroStyles[role] || heroStyles.student;

  // ── Role Specific KPI Cards Setup ─────────────────────────────
  const kpiData = {
    admin: [
      {
        icon: 'group', label: 'Total Students',
        value: dataLoading ? '…' : String(totalStudents),
        sub: 'Registered & Active',
        bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#bfdbfe', iconBg: '#2563eb', valColor: '#1d4ed8'
      },
      {
        icon: 'person', label: 'Faculty Count',
        value: dataLoading ? '…' : String(totalFaculty),
        sub: 'Faculty Members',
        bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0', iconBg: '#16a34a', valColor: '#15803d'
      },
      {
        icon: 'payments', label: 'Fee Collection',
        value: dataLoading ? '…' : `${feePercentage}%`,
        sub: `Collected: ₹${(feeCollected / 100000).toFixed(1)}L / ₹${(feeDemanded / 100000).toFixed(1)}L`,
        bg: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', border: '#99f6e4', iconBg: '#0d9488', valColor: '#0f766e'
      },
      {
        icon: 'person_add', label: 'New Admissions',
        value: dataLoading ? '…' : String(newAdmissions),
        sub: 'Awaiting registration',
        bg: 'linear-gradient(135deg,#ecfeff,#cffafe)', border: '#a5f3fc', iconBg: '#0891b2', valColor: '#0e7490'
      },
      {
        icon: 'warning', label: 'System Alerts',
        value: dataLoading ? '…' : '0 Alerts',
        sub: 'All systems online',
        bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#fed7aa', iconBg: '#ea580c', valColor: '#c2410c'
      }
    ],
    student: [
      {
        icon: 'grade', label: 'Current GPA',
        value: dataLoading ? '…' : cgpa,
        sub: 'From academic record',
        bg: 'linear-gradient(135deg,#fdf4ff,#f3e8ff)', border: '#e9d5ff', iconBg: '#9333ea', valColor: '#7e22ce'
      },
      {
        icon: 'trending_up', label: 'Attendance Rate',
        value: dataLoading ? '…' : `${attendancePct}%`,
        sub: attendancePct >= 75 ? 'Good standing' : 'Below attendance requirement',
        bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#bfdbfe', iconBg: '#2563eb', valColor: '#1d4ed8'
      },
      {
        icon: 'menu_book', label: 'Enrolled Courses',
        value: dataLoading ? '…' : String(enrolledCourses.length),
        sub: 'Current Semester',
        bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0', iconBg: '#16a34a', valColor: '#15803d'
      },
      {
        icon: 'payments', label: 'Fee Status',
        value: dataLoading ? '…' : feeStatus,
        sub: 'Financial record status',
        bg: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', border: '#99f6e4', iconBg: '#0d9488', valColor: '#0f766e'
      },
      {
        icon: 'school', label: 'Class Section',
        value: dataLoading ? '…' : `Sec ${userToUse?.section || 'A'}`,
        sub: `Semester ${userToUse?.semester || 1}`,
        bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#fed7aa', iconBg: '#ea580c', valColor: '#c2410c'
      }
    ],
    finance: [
      {
        icon: 'trending_up', label: 'Collection Rate',
        value: dataLoading ? '…' : `${feePercentage}%`,
        sub: 'Target: 95% minimum',
        bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0', iconBg: '#16a34a', valColor: '#15803d'
      },
      {
        icon: 'payments', label: 'Collected Fees',
        value: dataLoading ? '…' : `₹${(feeCollected / 100000).toFixed(1)}L`,
        sub: 'Deposited in Bank Accounts',
        bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#bfdbfe', iconBg: '#2563eb', valColor: '#1d4ed8'
      },
      {
        icon: 'account_balance', label: 'Demanded Fees',
        value: dataLoading ? '…' : `₹${(feeDemanded / 100000).toFixed(1)}L`,
        sub: 'Total outstanding invoices',
        bg: 'linear-gradient(135deg,#faf5ff,#f3e8ff)', border: '#e9d5ff', iconBg: '#9333ea', valColor: '#7e22ce'
      },
      {
        icon: 'credit_card_off', label: 'Pending Fees',
        value: dataLoading ? '…' : `₹${(pendingClearance / 100000).toFixed(1)}L`,
        sub: 'Requires invoice reminder',
        bg: 'linear-gradient(135deg,#fffde7,#fef9c3)', border: '#fef08a', iconBg: '#ca8a04', valColor: '#a16207'
      },
      {
        icon: 'task_alt', label: 'Payroll Status',
        value: dataLoading ? '…' : 'Processed',
        sub: 'Current month complete',
        bg: 'linear-gradient(135deg,#ecfeff,#cffafe)', border: '#a5f3fc', iconBg: '#0891b2', valColor: '#0e7490'
      }
    ]
  };

  const currentKpis = kpiData[role] || kpiData.student;

  return (
    <Layout title="Dashboard">
      <div className="role-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>

        {/* ── Hero Profile Card ───────────────────────────────────── */}
        <div className="hero-profile-card" style={{
          background: styleSet.grad,
          borderRadius: '20px',
          padding: '32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 20px 60px ${styleSet.shadow}`,
        }}>
          {/* Decorative circles */}
          <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'160px', height:'160px', background:'rgba(255,255,255,0.05)', borderRadius:'50%' }}/>
          <div style={{ position:'absolute', bottom:'-50px', right:'100px', width:'120px', height:'120px', background:'rgba(255,255,255,0.04)', borderRadius:'50%' }}/>

          <div className="hero-profile-container" style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'20px' }}>
            {/* Left: avatar + info */}
            <div className="hero-profile-left" style={{ display:'flex', gap:'20px', alignItems:'center' }}>
              <div style={{
                width:'72px', height:'72px', borderRadius:'50%',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                border: '2px solid rgba(255,255,255,0.35)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'26px', fontWeight:'800', color:'white', flexShrink:0
              }}>
                {dataLoading ? '…' : initials}
              </div>
              <div className="hero-info-container">
                <div className="hero-name-status" style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px', flexWrap:'wrap' }}>
                  <h2 style={{ fontSize:'22px', fontWeight:'800', color:'white', margin:0 }}>
                    {dataLoading ? 'Loading…' : userName}
                  </h2>
                  {!dataLoading && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', background: statusColor.bg, color: statusColor.text, padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:'700' }}>
                      <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: statusColor.dot, display:'inline-block' }}/>
                      {status}
                    </span>
                  )}
                </div>
                <p style={{ color:'rgba(255,255,255,0.85)', fontSize:'14px', margin:'0 0 4px', fontWeight:'500' }}>{designation} • {department}</p>
                <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px', margin:0 }}>ID: {sessionUserId}</p>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="hero-profile-actions" style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              <button
                onClick={styleSet.onPrimary}
                style={{
                  padding:'10px 20px', background:'rgba(255,255,255,0.2)',
                  backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.35)',
                  borderRadius:'10px', color:'white', fontSize:'13px',
                  fontWeight:'700', cursor:'pointer', transition:'all 0.2s',
                  display:'flex', alignItems:'center', gap:'6px'
                }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.3)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'}
              >
                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>{styleSet.primaryIcon}</span>
                {styleSet.primaryLabel}
              </button>
              <button
                onClick={styleSet.onSecondary}
                style={{
                  padding:'10px 20px', background:'rgba(255,255,255,0.12)',
                  backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.2)',
                  borderRadius:'10px', color:'rgba(255,255,255,0.9)', fontSize:'13px',
                  fontWeight:'700', cursor:'pointer', transition:'all 0.2s',
                  display:'flex', alignItems:'center', gap:'6px'
                }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}
              >
                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>{styleSet.secondaryIcon}</span>
                {styleSet.secondaryLabel}
              </button>
            </div>
          </div>
        </div>

        {/* ── 5 KPI Stat Cards ────────────────────────────────────── */}
        <div className="kpi-grid-container" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'16px' }}>
          {currentKpis.map(s => (
            <div key={s.label} style={{
              background:s.bg, borderRadius:'16px', padding:'20px',
              border:`1px solid ${s.border}`, boxShadow:'0 4px 16px rgba(0,0,0,0.05)',
              transition:'transform 0.2s, box-shadow 0.2s'
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.05)'}}
            >
              <div style={{ width:'38px', height:'38px', background:s.iconBg, borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>{s.icon}</span>
              </div>
              <div style={{ fontSize:'26px', fontWeight:'800', color:s.valColor, lineHeight:1, marginBottom:'4px' }}>{s.value}</div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>{s.label}</div>
              <div style={{ fontSize:'11px', color:'#9ca3af', lineHeight:'1.3', wordBreak:'break-word' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Main 2-column content ───────────────────────────────── */}
        <div className="dashboard-main-grid" style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'20px', alignItems:'start' }}>

          {/* Left Column */}
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

            {/* ── ADMIN LEFT COLUMN ── */}
            {role === 'admin' && (
              <>
                {/* Today's Classes */}
                <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'36px', height:'36px', background:'#00236f', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>schedule</span>
                      </div>
                      <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Today's Classes</h4>
                    </div>
                    <span style={{ fontSize:'11px', fontWeight:'700', background:'#f0fdf4', color:'#00236f', border:'1px solid #bbf7d0', borderRadius:'100px', padding:'3px 10px' }}>
                      {todayClasses.length} Scheduled
                    </span>
                  </div>

                  {dataLoading ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {[1,2].map(i=><div key={i} style={{ height:'50px', background:'#f9fafb', borderRadius:'10px', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                    </div>
                  ) : todayClasses.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'24px', color:'#9ca3af' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'36px', display:'block', marginBottom:'8px', opacity:0.3 }}>event_busy</span>
                      <p style={{ fontSize:'13px' }}>No classes scheduled today</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {todayClasses.map((cls, idx) => (
                        <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#f9fafb', borderRadius:'10px', border:'1px solid #f1f5f9', flexWrap:'wrap', gap:'10px' }}>
                          <div>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <span style={{ fontSize:'13px', fontWeight:'700', color:'#1f2937' }}>{cls.code}: {cls.name}</span>
                              <span style={{ fontSize:'10px', fontWeight:'700', background:'#e2e8f0', color:'#475569', padding:'2px 6px', borderRadius:'4px' }}>{cls.room}</span>
                            </div>
                            <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'2px' }}>Instructor: {cls.faculty}</div>
                          </div>
                          <span style={{ fontSize:'11px', fontWeight:'600', color:'#00236f', background:'#f0fdf4', border:'1px solid #bbf7d0', padding:'3px 10px', borderRadius:'100px', whiteSpace:'nowrap' }}>
                            {cls.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming Exams */}
                <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                    <div style={{ width:'36px', height:'36px', background:'#dc2626', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>assignment</span>
                    </div>
                    <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Upcoming Exams</h4>
                  </div>

                  {dataLoading ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'12px' }}>
                      {[1,2].map(i=><div key={i} style={{ height:'80px', background:'#f9fafb', borderRadius:'12px', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                    </div>
                  ) : upcomingExams.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'24px', color:'#9ca3af' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'36px', display:'block', marginBottom:'8px', opacity:0.3 }}>event_busy</span>
                      <p style={{ fontSize:'13px' }}>No upcoming exams scheduled</p>
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'12px' }}>
                      {upcomingExams.map((exam, idx) => (
                        <div key={idx} style={{ display:'flex', gap:'12px', padding:'16px', background:'#fef2f2', border:'1px solid #fee2e2', borderRadius:'12px' }}>
                          <div style={{ width:'36px', height:'36px', background:'#fee2e2', color:'#dc2626', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:'20px' }}>event</span>
                          </div>
                          <div>
                            <div style={{ fontSize:'13px', fontWeight:'700', color:'#1f2937' }}>{exam.name}</div>
                            <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'2px' }}>Subject: {exam.subject}</div>
                            <span style={{ display:'inline-block', fontSize:'10px', fontWeight:'700', background:'#fee2e2', color:'#b91c1c', border:'1px solid #fca5a5', padding:'2px 8px', borderRadius:'100px', marginTop:'8px' }}>
                              Date: {exam.date ? exam.date.split('T')[0] : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── STUDENT LEFT COLUMN ── */}
            {role === 'student' && (
              <>
                {/* Today's Timetable */}
                <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                    <div style={{ width:'36px', height:'36px', background:'#00236f', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>schedule</span>
                    </div>
                    <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Today's Class Schedule</h4>
                  </div>

                  {dataLoading ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {[1,2].map(i=><div key={i} style={{ height:'50px', background:'#f9fafb', borderRadius:'10px', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                    </div>
                  ) : todayClasses.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'24px', color:'#9ca3af' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'36px', display:'block', marginBottom:'8px', opacity:0.3 }}>event_busy</span>
                      <p style={{ fontSize:'13px' }}>No classes scheduled today</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {todayClasses.map((cls, idx) => (
                        <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#f9fafb', borderRadius:'10px', border:'1px solid #f1f5f9', flexWrap:'wrap', gap:'10px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#00236f', flexShrink:0 }}/>
                            <div>
                              <div style={{ fontSize:'13px', fontWeight:'700', color:'#1f2937' }}>{cls.code} - {cls.name}</div>
                              <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'2px' }}>Room {cls.room} • {cls.faculty}</div>
                            </div>
                          </div>
                          <span style={{ fontSize:'11px', fontWeight:'600', color:'#00236f', background:'#f0fdf4', border:'1px solid #bbf7d0', padding:'3px 10px', borderRadius:'100px', whiteSpace:'nowrap' }}>
                            {cls.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enrolled Courses */}
                <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'36px', height:'36px', background:'#00236f', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>book</span>
                      </div>
                      <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Enrolled Courses</h4>
                    </div>
                    <span style={{ fontSize:'11px', fontWeight:'700', background:'#f0fdf4', color:'#00236f', border:'1px solid #bbf7d0', borderRadius:'100px', padding:'3px 10px' }}>
                      {enrolledCourses.length} Course{enrolledCourses.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {dataLoading ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      {[1,2].map(i=><div key={i} style={{ height:'60px', background:'#f9fafb', borderRadius:'10px', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                    </div>
                  ) : enrolledCourses.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'32px', color:'#9ca3af' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'40px', display:'block', marginBottom:'8px', opacity:0.3 }}>menu_book</span>
                      <p style={{ fontSize:'13px' }}>No courses enrolled yet</p>
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'12px' }}>
                      {enrolledCourses.map((course, idx) => {
                        const code = course.code || '—';
                        const name = course.name || 'Course';
                        const grade = course.grade || '—';
                        const score = course.total || '—';
                        const colors = [
                          { bg:'#fdf4ff', border:'#e9d5ff', code:'#9333ea' },
                          { bg:'#eff6ff', border:'#bfdbfe', code:'#2563eb' },
                          { bg:'#f0fdf4', border:'#bbf7d0', code:'#00236f' },
                          { bg:'#fff7ed', border:'#fed7aa', code:'#ea580c' },
                        ];
                        const c = colors[idx % colors.length];
                        return (
                          <div key={idx} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:'12px', padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div>
                              <div style={{ fontSize:'11px', fontWeight:'700', color:c.code, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{code}</div>
                              <div style={{ fontSize:'13px', fontWeight:'600', color:'#1f2937', marginBottom:'8px', lineHeight:'1.3' }}>{name}</div>
                              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                                <span style={{ fontSize:'10px', fontWeight:'700', background:'white', color:c.code, border:`1px solid ${c.border}`, padding:'2px 8px', borderRadius:'100px' }}>
                                  Grade: {grade}
                                </span>
                                {score !== '—' && (
                                  <span style={{ fontSize:'10px', fontWeight:'700', color:'#6b7280' }}>Score: {score}</span>
                                )}
                              </div>
                            </div>
                            <span className="material-symbols-outlined" style={{ fontSize:'20px', color:c.code, opacity:0.4 }}>school</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── FINANCE LEFT COLUMN ── */}
            {role === 'finance' && (
              <>
                {/* Fee Collection Trends Chart */}
                <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                    <div style={{ width:'36px', height:'36px', background:'#00236f', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>trending_up</span>
                    </div>
                    <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Monthly Fee Collections</h4>
                  </div>

                  {dataLoading ? (
                    <div style={{ display:'flex', gap:'10px', height:'100px', alignItems:'flex-end' }}>
                      {[1,2,3,4,5].map(i=><div key={i} style={{ flex:1, height: `${i*20}px`, background:'#f1f5f9', borderRadius:'6px 6px 0 0', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                    </div>
                  ) : collectionTrends.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'32px', color:'#9ca3af' }}>
                      <p style={{ fontSize:'13px' }}>No collections history found</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', height:'140px', paddingTop:'16px', paddingBottom:'8px', paddingLeft:'10px', paddingRight:'10px' }}>
                      {collectionTrends.map((t, idx) => (
                        <div key={idx} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', flex:1 }}>
                          <div style={{ width:'32px', background:'#f1f5f9', borderRadius:'6px 6px 0 0', height:'100px', position:'relative', display:'flex', alignItems:'flex-end' }}>
                            <div
                              style={{
                                width:'100%',
                                background:'linear-gradient(to top, #00236f, #00236f)',
                                borderRadius:'6px 6px 0 0',
                                height: `${t.percent}%`,
                                transition:'height 0.5s ease-in-out'
                              }}
                            />
                            <div style={{ position:'absolute', top:'-22px', left:'50%', transform:'translateX(-50%)', fontSize:'9px', fontWeight:'700', color:'#00236f', background:'white', border:'1px solid #bbf7d0', padding:'1px 4px', borderRadius:'3px', whiteSpace:'nowrap', boxShadow:'0 2px 4px rgba(0,0,0,0.05)' }}>
                              {t.amount}
                            </div>
                          </div>
                          <span style={{ fontSize:'10px', fontWeight:'700', color:'#6b7280', textTransform:'uppercase' }}>{t.month}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Invoices list */}
                <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                    <div style={{ width:'36px', height:'36px', background:'#00236f', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>receipt_long</span>
                    </div>
                    <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Recent Transaction Activity</h4>
                  </div>

                  {dataLoading ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {[1,2].map(i=><div key={i} style={{ height:'50px', background:'#f9fafb', borderRadius:'10px', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                    </div>
                  ) : recentInvoices.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'24px', color:'#9ca3af' }}>
                      <p style={{ fontSize:'13px' }}>No transactions recorded</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {recentInvoices.map((inv, idx) => {
                        const badge = inv.status.toLowerCase() === 'paid' ? { bg:'#dcfce7', text:'#166534' } : { bg:'#fee2e2', text:'#991b1b' };
                        return (
                          <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#f9fafb', borderRadius:'10px', border:'1px solid #f1f5f9' }}>
                            <div>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                <span style={{ fontSize:'13px', fontWeight:'700', color:'#1f2937' }}>{inv.student}</span>
                                <span style={{ fontSize:'10px', color:'#6b7280' }}>({inv.id})</span>
                              </div>
                              <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'2px' }}>{inv.type} • <b style={{ color:'#1f2937' }}>{inv.amount}</b></div>
                            </div>
                            <span style={{ fontSize:'10px', fontWeight:'700', background:badge.bg, color:badge.text, padding:'3px 10px', borderRadius:'100px', textTransform:'uppercase' }}>
                              {inv.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>

          {/* Right Column */}
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

            {/* Newsletter Feed */}
            <NewsletterWidget role={role} userId={sessionUserId} />

            {/* Profile Details card */}
            <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'18px' }}>Profile Details</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {[
                  { icon:'mail', label:'Email', value: email, href: email !== '—' ? `mailto:${email}` : null },
                  { icon:'call', label:'Phone', value: phone, href: phone !== '—' ? `tel:${phone}` : null },
                  { icon:'domain', label: role === 'student' ? 'Course & Dept' : 'Department', value: department },
                  { icon:'badge', label: role === 'student' ? 'Roll Number' : 'Designation', value: role === 'student' ? rollNumber : designation },
                  { icon:'location_on', label: role === 'student' ? 'Hostel Room' : 'Office/Location', value: officeLocation },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'32px', height:'32px', background:'#f0fdf4', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'16px', color:'#00236f' }}>{item.icon}</span>
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'10px', color:'#9ca3af', fontWeight:'600', marginBottom:'1px' }}>{item.label}</div>
                      {item.href && item.value !== '—'
                        ? <a href={item.href} style={{ fontSize:'13px', color:'#00236f', fontWeight:'500', textDecoration:'none', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.value}</a>
                        : <div style={{ fontSize:'13px', color: item.value !== '—' ? '#1f2937' : '#d1d5db', fontWeight:'500' }}>{item.value}</div>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ADMIN RIGHT COLUMN ACTIONS/NOTIFS ── */}
            {role === 'admin' && (
              <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
                  <div style={{ width:'36px', height:'36px', background:'#f59e0b', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>notifications_active</span>
                  </div>
                  <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Recent Notifications</h4>
                </div>

                {dataLoading ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {[1,2].map(i=><div key={i} style={{ height:'50px', background:'#f9fafb', borderRadius:'10px', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'20px', color:'#9ca3af' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'32px', display:'block', marginBottom:'6px', opacity:0.3 }}>notifications_off</span>
                    <p style={{ fontSize:'12px' }}>No notifications found</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    {recentNotifications.map((notif, i) => (
                      <div key={i} style={{ display:'flex', gap:'10px', padding:'10px 12px', background:'#f9fafb', borderRadius:'10px', border:'1px solid #f1f5f9' }}>
                        <div style={{ width:'28px', height:'28px', background: notif.priority === 'High' || notif.priority === 'Critical' ? '#fee2e2' : '#dbeafe', color: notif.priority === 'High' || notif.priority === 'Critical' ? '#dc2626' : '#1d4ed8', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:'16px' }}>{notif.priority === 'High' || notif.priority === 'Critical' ? 'warning' : 'info'}</span>
                        </div>
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:'700', color:'#1f2937' }}>{notif.title}</div>
                          <div style={{ fontSize:'10px', color:'#6b7280', marginTop:'2px', lineHeight:'1.3' }}>{notif.message}</div>
                          <span style={{ display:'block', fontSize:'9px', color:'#9ca3af', marginTop:'4px' }}>{notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STUDENT RIGHT COLUMN ACTIONS/NOTIFS ── */}
            {role === 'student' && (
              <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
                  <div style={{ width:'36px', height:'36px', background:'#f59e0b', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>assignment_late</span>
                  </div>
                  <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Upcoming Tasks</h4>
                </div>

                {dataLoading ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {[1,2].map(i=><div key={i} style={{ height:'40px', background:'#f9fafb', borderRadius:'8px', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                  </div>
                ) : upcomingTasks.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'20px', color:'#9ca3af' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'32px', display:'block', marginBottom:'6px', opacity:0.3 }}>event_available</span>
                    <p style={{ fontSize:'12px' }}>No upcoming exams or tasks</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {upcomingTasks.map((item, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#f9fafb', borderRadius:'8px' }}>
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:'600', color:'#1f2937' }}>{item.title}</div>
                          <div style={{ fontSize:'10px', color:'#6b7280' }}>Course: {item.course}</div>
                          <div style={{ fontSize:'9px', color:'#9ca3af', marginTop:'2px' }}>Due: {item.date ? item.date.split('T')[0] : '—'}</div>
                        </div>
                        <span style={{ fontSize:'9px', fontWeight:'700', background:'#fef3c7', color:'#92400e', padding:'2px 8px', borderRadius:'100px', textTransform:'uppercase' }}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── FINANCE RIGHT COLUMN ACTIONS/NOTIFS ── */}
            {role === 'finance' && (
              <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
                  <div style={{ width:'36px', height:'36px', background:'#00236f', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>contact_mail</span>
                  </div>
                  <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Payroll Summary</h4>
                </div>

                {dataLoading ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {[1,2].map(i=><div key={i} style={{ height:'40px', background:'#f9fafb', borderRadius:'8px', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                  </div>
                ) : payrollSummary.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'24px', color:'#9ca3af' }}>
                    <p style={{ fontSize:'13px' }}>No payroll processing records</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {payrollSummary.map((item, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#f9fafb', borderRadius:'8px' }}>
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:'600', color:'#1f2937' }}>{item.category}</div>
                          <div style={{ fontSize:'10px', color:'#6b7280' }}>Disbursed: {item.processed}</div>
                        </div>
                        <span style={{ fontSize:'9px', fontWeight:'700', background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:'100px', textTransform:'uppercase' }}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @media (max-width: 1024px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .hero-profile-card {
            padding: 20px !important;
          }
          .hero-profile-container {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 20px !important;
          }
          .hero-profile-left {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 16px !important;
          }
          .hero-profile-left h2 {
            justify-content: center !important;
          }
          .hero-info-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
          .hero-name-status {
            flex-direction: column !important;
            align-items: center !important;
            gap: 8px !important;
            margin-bottom: 8px !important;
          }
          .hero-profile-actions {
            width: 100% !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .hero-profile-actions button {
            width: 100% !important;
            justify-content: center !important;
            padding: 12px 20px !important;
          }
        }
        @media (max-width: 480px) {
          .role-dashboard {
            gap: 16px !important;
          }
          .kpi-grid-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Layout>
  );
}
