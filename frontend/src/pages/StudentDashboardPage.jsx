import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserSession, getUserData } from '../auth/sessionController';
import { API_BASE } from '../api/apiBase';
import Layout from '../components/Layout';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  BookOpen, 
  Sparkles, 
  Briefcase,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { listFees } from '../api/feesApi';
import { listMarks, listExams } from '../api/examsApi';
import { fetchPlacements } from '../api/placementApi';

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [freshUserData, setFreshUserData] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    cgpa: '0.0',
    attendance: '0%',
    pendingFees: 0,
    upcomingExams: [],
    placements: [],
    marksDataForChart: [],
    inferredSemester: '',
    inferredDepartment: '',
    inferredSection: ''
  });

  const session = getUserSession();
  const dynamicUser = getUserData();
  const sessionRole = session?.role || null;
  const sessionUserId = session?.userId || null;
  const role = sessionRole || 'student';
  
  const userToUse = freshUserData || dynamicUser;
  const userName = userToUse?.name || userToUse?.fullName || 'Student';

  useEffect(() => {
    if (!sessionRole || !sessionUserId) {
      navigate('/', { replace: true });
      return undefined;
    }

    document.title = `MIT Connect - Student Dashboard`;

    const expectedSearch = `?role=${encodeURIComponent(sessionRole)}`;
    if (location.search !== expectedSearch) {
      navigate(`/dashboard${expectedSearch}`, { replace: true });
    }

    async function fetchDashboardData() {
      setDataLoading(true);
      try {
        const profileRes = await fetch(`${API_BASE}/settings/student/${encodeURIComponent(sessionUserId)}/profile`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setFreshUserData(profileData);
        }

        // Fetch live metrics
        const [feesData, marksData, examsData, attendanceRes, placementsDataRaw] = await Promise.all([
          listFees().catch(() => []),
          listMarks({ studentId: sessionUserId }).catch(() => []),
          listExams().catch(() => []),
          fetch(`${API_BASE}/academics/attendance/student/${encodeURIComponent(sessionUserId)}/summary`).catch(() => null),
          fetchPlacements().catch(() => [])
        ]);

        let pendingFeesTotal = 0;
        let inferredSemester = '';
        let inferredDepartment = '';
        
        if (Array.isArray(feesData)) {
          const studentFees = feesData.filter(f => f.studentId === sessionUserId);
          pendingFeesTotal = studentFees
            .filter(f => (f.paymentStatus || f.status || '').toLowerCase() !== 'paid')
            .reduce((acc, f) => acc + (f.totalFee || f.amount || 0), 0);
            
          if (studentFees.length > 0) {
            inferredSemester = studentFees[0].semester || '';
            inferredDepartment = studentFees[0].course || studentFees[0].department || '';
          }
        }

        let cgpa = '0.0';
        if (Array.isArray(marksData) && marksData.length > 0) {
          const totalObtained = marksData.reduce((sum, m) => sum + (m.marks || 0), 0);
          const totalMax = marksData.length * 100;
          cgpa = totalMax > 0 ? ((totalObtained / totalMax) * 10).toFixed(2) : '0.0';
        }

        let attendanceStr = '0%';
        if (attendanceRes && attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          if (attendanceData.success && attendanceData.data) {
            attendanceStr = `${attendanceData.data.overallAttendancePct?.toFixed(1) || 0}%`;
          }
        }

        let upcomingExamsList = [];
        if (Array.isArray(examsData)) {
          upcomingExamsList = examsData
            .filter(e => e.status === 'Upcoming' && new Date(e.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3);
        }

        let studentPlacements = [];
        if (Array.isArray(placementsDataRaw)) {
          studentPlacements = placementsDataRaw.filter(p => p.student_id === sessionUserId || p.id === sessionUserId);
        }

        const marksChart = (Array.isArray(marksData) ? marksData : []).map((m, idx) => ({
          name: m.examName || `Exam ${idx + 1}`,
          marks: m.marks || 0,
          maxMarks: m.maxMarks || 100
        }));

        setDashboardData({
          cgpa,
          attendance: attendanceStr,
          pendingFees: pendingFeesTotal,
          upcomingExams: upcomingExamsList,
          placements: studentPlacements,
          marksDataForChart: marksChart,
          inferredSemester,
          inferredDepartment,
          inferredSection: 'A' // Default section if not available
        });

      } catch (err) {
        console.error('Error fetching dashboard telemetry:', err);
      } finally {
        setTimeout(() => {
          setDataLoading(false);
        }, 1100);
      }
    }

    fetchDashboardData();
  }, [location.search, navigate, sessionRole, sessionUserId, role]);

  const scheduleToday = [
    { time: '09:00 AM', course: 'CS-202: Operating Systems', instructor: 'Dr. Meera Patel', room: 'Room 115', status: 'Ongoing', isOngoing: true },
    { time: '09:50 AM', course: 'CS-305: DBMS', instructor: 'Dr. Rajesh Iyer', room: 'Room 113', status: 'Upcoming', isOngoing: false },
    { time: '10:55 AM', course: 'CS-401: Computer Networks', instructor: 'Dr. Riyas', room: 'Room 118', status: 'Upcoming', isOngoing: false },
  ];

  return (
    <Layout title="">
      <div className="w-full max-w-[1600px] mx-auto min-h-0 flex flex-col space-y-4 text-[#1B1F24] pb-2">
        {dataLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-[#003A40] flex items-center gap-2 leading-tight">
                  Welcome back, {userName.split(' ')[0]} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-xs md:text-sm text-[#5F6B7A] mt-1 font-medium flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#F2FBFA] text-[#0A686A] border border-[#0A686A]/20 rounded-md text-[11px] font-bold">
                    {dashboardData.inferredDepartment || userToUse?.department || 'Department'}
                  </span>
                  <span className="px-2 py-0.5 bg-[#F4F7FF] text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-bold">
                    Sem {dashboardData.inferredSemester || userToUse?.semester || 'N/A'}
                  </span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-bold">
                    Sec {dashboardData.inferredSection || userToUse?.section || 'N/A'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3.5 py-1.5 bg-white border border-[#E6EDF2] rounded-xl text-xs font-semibold text-[#5F6B7A] shadow-2xs flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#0A686A]" />
                  <span>Wednesday, 9 Jul 2026</span>
                </div>
              </div>
            </div>

            {/* 4 KPI Summary Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 flex-shrink-0">
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">{dashboardData.cgpa}</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Current CGPA</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span className="text-[#8C98A5] font-normal">Based on recent results</span>
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">{dashboardData.attendance}</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Overall Attendance</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>Target: 75%</span>
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">{dashboardData.upcomingExams.length}</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Upcoming Exams</p>
                  <p className="text-[11px] font-semibold text-amber-600 mt-1 flex items-center gap-0.5">
                    <span>Check timetable</span>
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-rose-600 leading-none">₹{dashboardData.pendingFees.toLocaleString()}</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Fees Due</p>
                  <p className="text-[11px] font-bold text-rose-500 mt-1">Action required</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Left Column - Schedules and Placements */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[#003A40] tracking-wide uppercase">My Classes Today</h3>
                    <button onClick={() => navigate('/timetable')} className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                      View Timetable
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[#8C98A5] text-[10px] font-bold uppercase tracking-wider">
                          <th className="pb-2 font-semibold">Time</th>
                          <th className="pb-2 font-semibold">Course</th>
                          <th className="pb-2 font-semibold">Instructor</th>
                          <th className="pb-2 font-semibold">Room</th>
                          <th className="pb-2 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scheduleToday.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 text-[11px] font-medium text-slate-500">{item.time}</td>
                            <td className="py-2 font-bold text-[#003A40]">{item.course}</td>
                            <td className="py-2 text-[11px] text-slate-600">{item.instructor}</td>
                            <td className="py-2 text-[11px] font-medium text-slate-500">{item.room}</td>
                            <td className="py-2 text-right">
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                                item.isOngoing 
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[#003A40] tracking-wide uppercase">Performance Graph</h3>
                  </div>
                  <div className="h-64 w-full">
                    {dashboardData.marksDataForChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.marksDataForChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8C98A5' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#8C98A5' }} axisLine={false} tickLine={false} domain={[0, 'dataMax']} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ color: '#5F6B7A', fontWeight: 600, fontSize: '11px' }}
                            itemStyle={{ color: '#003A40', fontWeight: 700, fontSize: '13px' }}
                          />
                          <Area type="monotone" dataKey="marks" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorMarks)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Sparkles className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-sm font-semibold">No performance data yet</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Upcoming Exams and Placements */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[#003A40] tracking-wide uppercase">Upcoming Exams</h3>
                    <button onClick={() => navigate('/exams')} className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                      All Exams
                    </button>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    {dashboardData.upcomingExams.length > 0 ? (
                      dashboardData.upcomingExams.map((exam, i) => (
                        <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E6EDF2]">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 pr-2 flex-1">
                              <p className="font-bold text-[#003A40] text-sm truncate">{exam.name || exam.code}</p>
                              <span className="inline-block px-2 py-0.5 mt-1 rounded bg-[#E6EDF2] text-[#5F6B7A] text-[10px] font-bold tracking-wide uppercase">
                                {exam.type || 'Exam'}
                              </span>
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                              <BookOpen className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 pt-2 border-t border-[#E6EDF2]">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#5F6B7A]">
                              <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
                              {new Date(exam.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#5F6B7A]">
                              <Clock className="w-3.5 h-3.5 opacity-70" />
                              {exam.time}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center text-center p-4 text-[#8C98A5]">
                        <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-xs font-medium">No upcoming exams.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[#003A40] tracking-wide uppercase">My Placements</h3>
                    <button onClick={() => navigate('/placements')} className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                      More
                    </button>
                  </div>
                  <div className="space-y-3">
                    {dashboardData.placements.length > 0 ? (
                      dashboardData.placements.map((p, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[#003A40] truncate">{p.company_name || p.company}</h4>
                            <p className="text-[10px] font-medium text-[#5F6B7A]">{p.job_role || p.role}</p>
                            <p className="text-[10px] font-bold text-emerald-700 mt-1">₹{p.package_lpa || p.ctc} LPA</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-24 flex flex-col items-center justify-center text-center p-4 text-[#8C98A5] bg-[#F8FAFC] rounded-xl border border-dashed border-[#E6EDF2]">
                        <span className="text-xs font-medium">No placement records yet.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
