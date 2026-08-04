import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserSession, getUserData } from '../auth/sessionController';
import { getDashboardSummary } from '../services/dashboardService';
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
  Users, 
  UserCheck, 
  Building2, 
  CreditCard, 
  ShieldAlert, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  Clock, 
  UserPlus, 
  FileText, 
  CheckCircle2, 
  Activity, 
  Bell, 
  Plus, 
  Sparkles,
  BookOpen,
  Briefcase,
  GraduationCap,
  Layers,
  BarChart3
} from 'lucide-react';

export default function HodDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [freshUserData, setFreshUserData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');

  const session = getUserSession();
  const dynamicUser = getUserData();
  const sessionRole = session?.role || null;
  const sessionUserId = session?.userId || null;
  const role = sessionRole || 'hod';

  const userToUse = freshUserData || dynamicUser;
  const hodName = userToUse?.name || userToUse?.fullName || 'Dr. Ramesh Kumar';
  const hodDepartment = userToUse?.department || userToUse?.departmentId || 'Computer Science';

  const roleQuery = `?role=${encodeURIComponent(role)}`;

  useEffect(() => {
    if (!sessionRole || !sessionUserId) {
      navigate('/', { replace: true });
      return undefined;
    }

    document.title = `MIT Connect - HOD Dashboard (${hodDepartment})`;

    const expectedSearch = `?role=${encodeURIComponent(sessionRole)}`;
    if (location.search !== expectedSearch) {
      navigate(`/dashboard${expectedSearch}`, { replace: true });
    }

    async function fetchHodData() {
      setDataLoading(true);
      try {
        const summary = await getDashboardSummary();
        if (summary) {
          setDashboardStats(summary);
        }
        const profileRes = await fetch(`${API_BASE}/settings/hod/${encodeURIComponent(sessionUserId)}/profile`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setFreshUserData(profileData);
        }
      } catch (err) {
        console.error('Error fetching HOD dashboard telemetry:', err);
      } finally {
        setTimeout(() => {
          setDataLoading(false);
        }, 800);
      }
    }

    fetchHodData();
  }, [location.search, navigate, sessionRole, sessionUserId, hodDepartment]);

  // Chart Data for Department
  const deptAttendanceTrend = [
    { day: '3 Jul', rate: 89 },
    { day: '4 Jul', rate: 93 },
    { day: '5 Jul', rate: 91 },
    { day: '6 Jul', rate: 86 },
    { day: '7 Jul', rate: 95 },
    { day: '8 Jul', rate: 94 },
    { day: '9 Jul', rate: 96 },
  ];

  const deptGradeData = [
    { name: 'A+ Grade', value: 142, pct: '33.8%', color: '#6366F1' },
    { name: 'A Grade', value: 168, pct: '40.0%', color: '#3B82F6' },
    { name: 'B Grade', value: 80, pct: '19.0%', color: '#10B981' },
    { name: 'C Grade', value: 30, pct: '7.2%', color: '#F59E0B' },
  ];

  const scheduleToday = [
    { time: '09:00 AM', course: 'CS-303: Operating Systems', instructor: 'Dr. Meera Patel', room: 'Lab 302', status: 'Ongoing', isOngoing: true },
    { time: '11:00 AM', course: 'CS-306: Database Systems', instructor: 'Dr. Rajesh Iyer', room: 'Hall A1', status: 'Upcoming', isOngoing: false },
    { time: '02:00 PM', course: 'CS-401: Computer Networks', instructor: 'Dr. Riyas', room: 'Lab 108', status: 'Upcoming', isOngoing: false },
    { time: '03:30 PM', course: 'CS-205: Data Structures', instructor: 'Prof. Anitha', room: 'Room 204', status: 'Upcoming', isOngoing: false },
  ];

  const upcomingEvents = [
    { day: '15', month: 'JUL', title: `${hodDepartment} Mid-Sem Exams`, subtitle: '15 Jul - 22 Jul 2026', tag: 'Academic', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { day: '18', month: 'JUL', title: 'Department Faculty Meeting', subtitle: '18 Jul 2026, 02:30 PM', tag: 'Meeting', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { day: '20', month: 'JUL', title: 'Infosys Placement Drive', subtitle: '20 Jul 2026', tag: 'Placement', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ];

  return (
    <Layout title="">
      <div className="w-full max-w-[1600px] mx-auto min-h-0 flex flex-col space-y-4 text-[#1B1F24] pb-2">
        
        {dataLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Header: Greeting & Department Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-[#003A40] flex items-center gap-2 leading-tight">
                  Good morning, {hodName.split(' ')[0]} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-xs md:text-sm text-[#5F6B7A] mt-0.5 font-medium flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-xs">
                    HOD
                  </span>
                  <span>Head of Department — {hodDepartment}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3.5 py-1.5 bg-white border border-[#E6EDF2] rounded-xl text-xs font-semibold text-[#5F6B7A] shadow-2xs flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#0A686A]" />
                  <span>Wednesday, 9 Jul 2026</span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod(selectedPeriod === 'This Week' ? 'This Month' : 'This Week')}
                    className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{selectedPeriod}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 5 KPI Summary Cards Row for HOD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 flex-shrink-0">
              {/* Card 1: Department Students */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">420</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Dept Students</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>↑ 6.4%</span> <span className="text-[#8C98A5] font-normal">this term</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Department Faculty */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">24</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Dept Faculty</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>100% Active</span>
                  </p>
                </div>
              </div>

              {/* Card 3: Department Pass Rate */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">94.2%</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Dept Pass Rate</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1">↑ 1.8% vs avg</p>
                </div>
              </div>

              {/* Card 4: Fee Collection */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">₹18.4L</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Dept Fee Collection</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>↑ 82%</span> <span className="text-[#8C98A5] font-normal">collected</span>
                  </p>
                </div>
              </div>

              {/* Card 5: Pending Requests */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-rose-600 leading-none">5</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Pending Approvals</p>
                  <p className="text-[11px] font-bold text-rose-500 mt-1">Requires HOD review</p>
                </div>
              </div>
            </div>

            {/* Middle Section: Department Attendance, Weekly Trend Chart, Announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Department Attendance Target */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Dept Attendance Target</h3>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    This Week ▾
                  </span>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-[#003A40]">94.6%</span>
                      <p className="text-[11px] text-[#5F6B7A]">Department Avg</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-600">85.0%</span>
                      <p className="text-[11px] text-[#8C98A5]">Min Benchmark</p>
                    </div>
                  </div>

                  {/* Gradient Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-3 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-500" 
                      style={{ width: '94.6%' }} 
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-[11px] font-extrabold text-violet-700">94.6% Excellent</span>
                  </div>
                </div>
              </div>

              {/* Department Weekly Trend Area Chart */}
              <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Weekly Attendance Trend</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-extrabold text-[#003A40]">96% Today <span className="text-[10px] font-bold text-emerald-600">↑ 2.4%</span></span>
                      <span className="text-xs text-[#5F6B7A]">{hodDepartment}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    This Week ▾
                  </span>
                </div>

                <div className="h-28 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={deptAttendanceTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hodGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8C98A5' }} stroke="#E6EDF2" />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#8C98A5' }} stroke="#E6EDF2" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#03323A', borderRadius: '10px', color: '#fff', fontSize: '11px', border: 'none' }}
                        labelStyle={{ fontWeight: 'bold', color: '#6366F1' }}
                      />
                      <Area type="monotone" dataKey="rate" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#hodGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Announcements Card */}
              <div className="lg:col-span-3 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Announcements</h3>
                  <button onClick={() => navigate('/notifications')} className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                    View All
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-violet-50/60 border border-violet-100">
                    <div className="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#003A40] text-[11px] truncate">Department Exam Schedule</p>
                      <p className="text-[10px] text-[#5F6B7A] line-clamp-1">Mid-term exam papers review by Friday.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#003A40] text-[11px] truncate">HOD Council Review</p>
                      <p className="text-[10px] text-[#5F6B7A] line-clamp-1">Monthly HOD review meeting at 3 PM.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operations Row: Today Schedule Table & Grade Distribution Donut Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Department Timetable & Lectures Today */}
              <div className="lg:col-span-7 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">{hodDepartment} Lectures Today</h3>
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
                        <th className="pb-2 font-semibold">Faculty</th>
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

              {/* Department Academic Performance Grades Donut Chart */}
              <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide mb-2">Department Academic Performance</h3>

                <div className="flex items-center gap-4">
                  {/* Donut Chart */}
                  <div className="w-36 h-36 relative flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deptGradeData}
                          innerRadius={42}
                          outerRadius={62}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {deptGradeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xs font-extrabold text-[#003A40]">420</span>
                      <span className="text-[9px] font-semibold text-[#8C98A5]">Students</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="flex-1 space-y-1.5 text-xs">
                    {deptGradeData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-bold text-[#003A40]">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-700">{item.value}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({item.pct})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Lower Row: Events, Quick Actions & Recent Department Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Upcoming Academic Events */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Upcoming Academic Events</h3>
                  <button onClick={() => navigate('/timetable')} className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                    View Calendar
                  </button>
                </div>

                <div className="space-y-2">
                  {upcomingEvents.map((evt, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex flex-col items-center justify-center leading-none flex-shrink-0">
                          <span className="text-[9px] font-bold uppercase">{evt.month}</span>
                          <span className="text-xs font-extrabold mt-0.5">{evt.day}</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#003A40]">{evt.title}</p>
                          <p className="text-[10px] text-[#5F6B7A]">{evt.subtitle}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${evt.color}`}>
                        {evt.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* HOD Quick Actions Grid */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide">HOD Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => navigate(`/students${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Dept Students</span>
                  </button>

                  <button
                    onClick={() => navigate(`/faculty${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Dept Faculty</span>
                  </button>

                  <button
                    onClick={() => navigate(`/admission${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-100/60 text-amber-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-amber-600" />
                    <span>Dept Admission</span>
                  </button>

                  <button
                    onClick={() => navigate(`/analytics${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span>Dept Analytics</span>
                  </button>
                </div>
              </div>

              {/* Department Recent Activity Feed */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Department Activity & Logs</h3>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-bold text-[#003A40] text-[11px]">Dept Status</p>
                      <p className="text-[10px] text-emerald-700">Operational</p>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-bold text-[#003A40] text-[11px]">Active Labs</p>
                      <p className="text-[10px] text-blue-700">8 Labs Online</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6B7A] font-medium">New student admitted ({hodDepartment})</span>
                    <span className="text-slate-400 text-[10px]">1h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6B7A] font-medium">Fee payment ₹45,000 received</span>
                    <span className="text-slate-400 text-[10px]">3h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6B7A] font-medium">Faculty leave approved for CS-306</span>
                    <span className="text-slate-400 text-[10px]">5h ago</span>
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
