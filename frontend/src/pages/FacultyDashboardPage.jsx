import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserSession, getUserData } from '../auth/sessionController';
import { cmsRoles, roleMenuGroups } from '../data/roleConfig';
import { API_BASE } from '../api/apiBase';
import Layout from '../components/Layout';
import { Bell, Settings, User } from 'lucide-react';
import SectionAccess from '../components/SectionAccess';
import NewsletterWidget from '../components/NewsletterWidget';

// Mock modal component for attendance
function AttendanceModal({ isOpen, onClose, onSubmit }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const classes = [
    { id: 1, code: 'CS-303', name: 'Data Structures', time: '09:00 - 10:30' },
    { id: 2, code: 'CS-306', name: 'Database Systems', time: '11:00 - 12:30' },
    { id: 3, code: 'CS-309', name: 'Web Development', time: '14:00 - 15:30' }
  ];

  const handleSubmit = () => {
    if (selectedClass && date) {
      onSubmit(selectedClass, date);
      setSelectedClass('');
      alert('Attendance marked successfully!');
      onClose();
    } else {
      alert('Please select both class and date');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '16px', margin: '0 0 16px 0' }}>
          Mark Attendance
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
            Select Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">Choose a class...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name} ({c.time})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
            onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 16px',
              background: '#4c1d95',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#3b0764'}
            onMouseLeave={(e) => e.target.style.background = '#4c1d95'}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// Mock modal component for internal marks
function PublishMarksModal({ isOpen, onClose, onSubmit }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [marksType, setMarksType] = useState('');

  const classes = [
    { id: 1, code: 'CS-303', name: 'Data Structures' },
    { id: 2, code: 'CS-306', name: 'Database Systems' },
    { id: 3, code: 'CS-309', name: 'Web Development' }
  ];

  const marksTypes = [
    { id: 'quiz', name: 'Quiz Marks' },
    { id: 'assignment', name: 'Assignment Marks' },
    { id: 'midterm', name: 'Mid-term Marks' },
    { id: 'class_test', name: 'Class Test Marks' }
  ];

  const handleSubmit = () => {
    if (selectedClass && marksType) {
      onSubmit(selectedClass, marksType);
      setSelectedClass('');
      setMarksType('');
      alert('Internal marks published successfully!');
      onClose();
    } else {
      alert('Please select both class and marks type');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '16px', margin: '0 0 16px 0' }}>
          Publish Internal Marks
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
            Select Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">Choose a class...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
            Marks Type
          </label>
          <select
            value={marksType}
            onChange={(e) => setMarksType(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">Choose marks type...</option>
            {marksTypes.map(mt => (
              <option key={mt.id} value={mt.id}>
                {mt.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
            onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 16px',
              background: '#4c1d95',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#3b0764'}
            onMouseLeave={(e) => e.target.style.background = '#4c1d95'}
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FacultyDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [freshUserData, setFreshUserData] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const session = getUserSession();
  const dynamicUser = getUserData();
  const sessionRole = session?.role || null;
  const sessionUserId = session?.userId || null;
  const role = sessionRole || 'faculty';

  const userToUse = freshUserData || dynamicUser;

  // ── Derived Faculty Fields ──────────────────────────────────────
  const facultyName   = userToUse?.name || userToUse?.fullName || 'Faculty Member';
  const designation   = userToUse?.designation || 'Faculty';
  const department    = userToUse?.departmentId || userToUse?.department_id || userToUse?.department || 'Engineering';
  const email         = userToUse?.email || '—';
  const phone         = userToUse?.phone || '—';
  const empStatus     = userToUse?.employment_status || userToUse?.status || 'Active';
  const attendanceRate = userToUse?.attendance_rate ?? userToUse?.leave_attendance_summary?.attendance_rate ?? null;
  const passRate      = userToUse?.pass_rate ?? userToUse?.performance_summary?.pass_rate ?? null;
  const expYears      = userToUse?.experience_years ?? userToUse?.yearsOfExperience ?? null;
  const officeLocation = userToUse?.office_location || userToUse?.location || '—';
  const joiningDate   = userToUse?.joining_date ? new Date(userToUse.joining_date).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }) : '—';

  // ── Courses (from teaching_load OR courses array OR subject string) ──
  const rawCourses = userToUse?.teaching_load && userToUse.teaching_load.length > 0
    ? userToUse.teaching_load
    : Array.isArray(userToUse?.courses) && userToUse.courses.length > 0
      ? userToUse.courses.map(c => typeof c === 'string' ? { courseName: c, courseCode: c } : c)
      : userToUse?.subject
        ? [{ courseCode: '—', courseName: userToUse.subject, studentCount: 0 }]
        : [];

  // ── Classes ────────────────────────────────────────────────────
  const rawClasses = Array.isArray(userToUse?.classes) ? userToUse.classes
    : Array.isArray(userToUse?.assignedClasses) ? userToUse.assignedClasses
    : typeof userToUse?.classes === 'string' ? userToUse.classes.split(',').map(s=>s.trim()).filter(Boolean)
    : [];

  // ── Leave summary ──────────────────────────────────────────────
  const leaveSummary = userToUse?.leave_attendance_summary || {};
  const leaveRequests = Array.isArray(leaveSummary.leave_requests)
    ? leaveSummary.leave_requests
    : [];

  const menuGroups = roleMenuGroups[role] || [];

  useEffect(() => {
    if (!sessionRole || !sessionUserId) {
      navigate('/', { replace: true });
      return undefined;
    }

    document.title = 'MIT Connect - Faculty Dashboard';

    const expectedSearch = `?role=${encodeURIComponent(sessionRole)}`;
    if (location.search !== expectedSearch) {
      navigate(`/dashboard${expectedSearch}`, { replace: true });
    }

    function enforceSessionOnPageRestore() {
      if (!getUserSession()) navigate('/', { replace: true });
    }

    async function fetchFacultyData() {
      setDataLoading(true);
      try {
        const res = await fetch(`${API_BASE}/faculty/${encodeURIComponent(sessionUserId)}`);
        if (res.ok) {
          const facData = await res.json();
          setFreshUserData(facData);
        }
      } catch (err) {
        console.error('Failed to fetch fresh faculty data:', err);
      } finally {
        setDataLoading(false);
      }
    }

    async function fetchFacultyExams() {
      try {
        const res = await fetch(`${API_BASE}/exams?role=faculty&userId=${encodeURIComponent(sessionUserId)}`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            setUpcomingExams(result.data.filter(e => e.status === 'Upcoming'));
          }
        }
      } catch (err) {
        console.error('Failed to fetch faculty exams:', err);
      }
    }

    fetchFacultyData();
    fetchFacultyExams();
    window.addEventListener('pageshow', enforceSessionOnPageRestore);
    return () => window.removeEventListener('pageshow', enforceSessionOnPageRestore);
  }, [location.search, navigate, sessionRole, sessionUserId]);

  // ── Initials avatar ────────────────────────────────────────────
  const initials = facultyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // ── Status color ───────────────────────────────────────────────
  const statusColor = empStatus === 'Active' ? { bg: '#dcfce7', text: '#166534', dot: '#22c55e' }
    : empStatus === 'On-Leave' ? { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' }
    : { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' };

  return (
    <Layout title="Dashboard">
      <div className="faculty-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>

        {/* ── Hero Profile Card ───────────────────────────────────── */}
        <div className="hero-profile-card" style={{
          background: '#4c1d95',
          borderRadius: '20px',
          padding: '32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(76, 29, 149,0.3)',
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
                    {dataLoading ? 'Loading…' : facultyName}
                  </h2>
                  {!dataLoading && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', background: statusColor.bg, color: statusColor.text, padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:'700' }}>
                      <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: statusColor.dot, display:'inline-block' }}/>
                      {empStatus}
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
                onClick={() => setIsAttendanceModalOpen(true)}
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
                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>fact_check</span>
                Mark Attendance
              </button>
              <button
                onClick={() => setIsMarksModalOpen(true)}
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
                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>grade</span>
                Publish Marks
              </button>
            </div>
          </div>
        </div>

        {/* ── 5 KPI Stat Cards ────────────────────────────────────── */}
        <div className="kpi-grid-container" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'16px' }}>
          {[
            {
              icon:'menu_book', label:'Assigned Courses',
              value: dataLoading ? '…' : rawCourses.length || '0',
              sub: dataLoading ? '' : rawCourses.map(c=>c.courseCode||c.course_code||c.courseName||c).join(', ') || 'No courses assigned',
              bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'#bbf7d0', iconBg:'#4c1d95', valColor:'#15803d'
            },
            {
              icon:'group', label:'Total Students',
              value: dataLoading ? '…' : ((userToUse?.totalStudents ?? userToUse?.student_count ?? rawCourses.reduce((s,c)=>s+(c.studentCount||c.student_count||0),0)) || '—'),
              sub: 'Across all courses',
              bg:'linear-gradient(135deg,#fdf4ff,#f3e8ff)', border:'#e9d5ff', iconBg:'#9333ea', valColor:'#7e22ce'
            },
            {
              icon:'trending_up', label:'Attendance Rate',
              value: dataLoading ? '…' : (attendanceRate !== null ? `${attendanceRate}%` : '—'),
              sub: 'Monthly average',
              bg:'linear-gradient(135deg,#eff6ff,#dbeafe)', border:'#bfdbfe', iconBg:'#2563eb', valColor:'#1d4ed8'
            },
            {
              icon:'workspace_premium', label:'Pass Rate',
              value: dataLoading ? '…' : (passRate !== null ? `${passRate}%` : '—'),
              sub: 'Student success avg',
              bg:'linear-gradient(135deg,#fff7ed,#ffedd5)', border:'#fed7aa', iconBg:'#ea580c', valColor:'#c2410c'
            },
            {
              icon:'history_edu', label:'Experience',
              value: dataLoading ? '…' : (expYears !== null ? `${expYears} yrs` : '—'),
              sub: joiningDate !== '—' ? `Joined ${joiningDate}` : 'Teaching experience',
              bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'#a7f3d0', iconBg:'#059669', valColor:'#065f46'
            },
          ].map(s => (
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

          {/* Left column */}
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

            {/* Assigned Courses */}
            <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'36px', height:'36px', background:'#4c1d95', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>book</span>
                  </div>
                  <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Assigned Courses</h4>
                </div>
                <span style={{ fontSize:'11px', fontWeight:'700', background:'#f0fdf4', color:'#4c1d95', border:'1px solid #bbf7d0', borderRadius:'100px', padding:'3px 10px' }}>
                  {rawCourses.length} Course{rawCourses.length !== 1 ? 's' : ''}
                </span>
              </div>

              {dataLoading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {[1,2].map(i=><div key={i} style={{ height:'60px', background:'#f9fafb', borderRadius:'10px', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
                </div>
              ) : rawCourses.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px', color:'#9ca3af' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'40px', display:'block', marginBottom:'8px', opacity:0.3 }}>menu_book</span>
                  <p style={{ fontSize:'13px' }}>No courses assigned yet</p>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'12px' }}>
                  {rawCourses.map((course, idx) => {
                    const code = course.courseCode || course.course_code || '—';
                    const name = course.courseName || course.course_name || course.name || (typeof course === 'string' ? course : 'Course');
                    const count = course.studentCount || course.student_count || 0;
                    const colors = [
                      { bg:'#f0fdf4', border:'#bbf7d0', code:'#4c1d95' },
                      { bg:'#fdf4ff', border:'#e9d5ff', code:'#9333ea' },
                      { bg:'#eff6ff', border:'#bfdbfe', code:'#2563eb' },
                      { bg:'#fff7ed', border:'#fed7aa', code:'#ea580c' },
                    ];
                    const c = colors[idx % colors.length];
                    return (
                      <div key={idx} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:'12px', padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <div style={{ fontSize:'11px', fontWeight:'700', color:c.code, marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{code}</div>
                          <div style={{ fontSize:'13px', fontWeight:'600', color:'#1f2937', marginBottom:'8px', lineHeight:'1.3' }}>{name}</div>
                          {count > 0 && (
                            <span style={{ fontSize:'10px', fontWeight:'700', background:'white', color:c.code, border:`1px solid ${c.border}`, padding:'2px 8px', borderRadius:'100px' }}>
                              {count} Students
                            </span>
                          )}
                        </div>
                        <span className="material-symbols-outlined" style={{ fontSize:'20px', color:c.code, opacity:0.4 }}>school</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's Classes */}
            <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'36px', height:'36px', background:'#2563eb', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>schedule</span>
                  </div>
                  <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Today's Classes</h4>
                </div>
              </div>

              {dataLoading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {[1,2].map(i=><div key={i} style={{ height:'50px', background:'#f9fafb', borderRadius:'10px' }}/>)}
                </div>
              ) : rawClasses.length === 0 && rawCourses.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px', color:'#9ca3af' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'36px', display:'block', marginBottom:'8px', opacity:0.3 }}>event_busy</span>
                  <p style={{ fontSize:'13px' }}>No classes scheduled today</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {(rawClasses.length > 0 ? rawClasses : rawCourses.map(c => c.courseCode || c.courseName || c)).map((cls, idx) => {
                    const label = typeof cls === 'string' ? cls : (cls.code || cls.name || cls.courseCode || JSON.stringify(cls));
                    const times = ['09:00 AM – 10:30 AM', '11:00 AM – 12:30 PM', '02:00 PM – 03:30 PM', '04:00 PM – 05:30 PM'];
                    return (
                      <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#f9fafb', borderRadius:'10px', border:'1px solid #f1f5f9' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#4c1d95', flexShrink:0 }}/>
                          <div>
                            <div style={{ fontSize:'13px', fontWeight:'700', color:'#1f2937' }}>{label}</div>
                            <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'2px' }}>Section {String.fromCharCode(65+idx)}</div>
                          </div>
                        </div>
                        <span style={{ fontSize:'11px', fontWeight:'600', color:'#4c1d95', background:'#f0fdf4', border:'1px solid #bbf7d0', padding:'3px 10px', borderRadius:'100px', whiteSpace:'nowrap' }}>
                          {times[idx % times.length]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Exams */}
            <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'36px', height:'36px', background:'#dc2626', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>assignment</span>
                  </div>
                  <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Upcoming Exams</h4>
                </div>
                <span style={{ fontSize:'11px', fontWeight:'700', background:'#fef2f2', color:'#dc2626', border:'1px solid #fee2e2', borderRadius:'100px', padding:'3px 10px' }}>
                  {upcomingExams.length} Scheduled
                </span>
              </div>

              {dataLoading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[1,2].map(i=><div key={i} style={{ height:'50px', background:'#f9fafb', borderRadius:'10px' }}/>)}
                </div>
              ) : upcomingExams.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px', color:'#9ca3af' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'36px', display:'block', marginBottom:'8px', opacity:0.3 }}>event_busy</span>
                  <p style={{ fontSize:'13px' }}>No upcoming exams scheduled</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {upcomingExams.map((exam, idx) => (
                    <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#f9fafb', borderRadius:'10px', border:'1px solid #f1f5f9', flexWrap:'wrap', gap:'10px' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'13px', fontWeight:'700', color:'#1f2937' }}>{exam.code}: {exam.name}</span>
                          <span style={{ fontSize:'10px', fontWeight:'700', background:'#e2e8f0', color:'#475569', padding:'2px 6px', borderRadius:'4px' }}>{exam.room}</span>
                        </div>
                        <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'2px' }}>Type: {exam.type}</div>
                      </div>
                      <span style={{ fontSize:'11px', fontWeight:'600', color:'#dc2626', background:'#fef2f2', border:'1px solid #fee2e2', padding:'3px 10px', borderRadius:'100px', whiteSpace:'nowrap' }}>
                        {exam.date} @ {exam.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

            {/* Newsletter Feed */}
            <NewsletterWidget role={role} userId={sessionUserId} />

            {/* Profile Details card */}
            <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'18px' }}>Profile Details</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {[
                  { icon:'mail', label:'Email', value: email, href:`mailto:${email}` },
                  { icon:'call', label:'Phone', value: phone, href:`tel:${phone}` },
                  { icon:'domain', label:'Department', value: department },
                  { icon:'badge', label:'Designation', value: designation },
                  { icon:'location_on', label:'Office', value: officeLocation },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'32px', height:'32px', background:'#f0fdf4', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'16px', color:'#4c1d95' }}>{item.icon}</span>
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'10px', color:'#9ca3af', fontWeight:'600', marginBottom:'1px' }}>{item.label}</div>
                      {item.href && item.value !== '—'
                        ? <a href={item.href} style={{ fontSize:'13px', color:'#4c1d95', fontWeight:'500', textDecoration:'none', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.value}</a>
                        : <div style={{ fontSize:'13px', color: item.value !== '—' ? '#1f2937' : '#d1d5db', fontWeight:'500' }}>{item.value}</div>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Requests */}
            <div style={{ background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
                <div style={{ width:'36px', height:'36px', background:'#f59e0b', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'white' }}>beach_access</span>
                </div>
                <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1f2937', margin:0 }}>Leave Requests</h4>
              </div>

              {dataLoading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[1,2].map(i=><div key={i} style={{ height:'36px', background:'#f9fafb', borderRadius:'8px' }}/>)}
                </div>
              ) : leaveRequests.length === 0 ? (
                <div style={{ textAlign:'center', padding:'20px', color:'#9ca3af' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'32px', display:'block', marginBottom:'6px', opacity:0.3 }}>event_available</span>
                  <p style={{ fontSize:'12px' }}>No leave records found</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {leaveRequests.slice(0, 4).map((lr, i) => {
                    const statusBg = lr.status === 'Approved' ? { bg:'#dcfce7', text:'#166534' }
                      : lr.status === 'Rejected' ? { bg:'#fee2e2', text:'#991b1b' }
                      : { bg:'#fef3c7', text:'#92400e' };
                    return (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#f9fafb', borderRadius:'8px' }}>
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:'600', color:'#1f2937' }}>{lr.leaveType || lr.leave_type || 'Leave'}</div>
                          <div style={{ fontSize:'10px', color:'#6b7280' }}>{lr.dates || lr.startDate || lr.date || '—'}</div>
                        </div>
                        <span style={{ fontSize:'10px', fontWeight:'700', background: statusBg.bg, color: statusBg.text, padding:'2px 8px', borderRadius:'100px' }}>
                          {(lr.status || 'Pending').toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
          .faculty-dashboard {
            gap: 16px !important;
          }
          .kpi-grid-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Modals */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        onSubmit={(classId, date) => console.log('Attendance:', classId, date)}
      />
      <PublishMarksModal
        isOpen={isMarksModalOpen}
        onClose={() => setIsMarksModalOpen(false)}
        onSubmit={(classId, marksType) => console.log('Marks:', classId, marksType)}
      />
    </Layout>
  );
}
