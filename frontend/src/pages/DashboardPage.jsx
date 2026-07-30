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
  Database, 
  Server, 
  HardDrive, 
  Bell, 
  Plus, 
  ArrowUpRight,
  Sparkles,
  Award,
  BookOpen,
  Briefcase
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [freshUserData, setFreshUserData] = useState(null);
  const [widgetData, setWidgetData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');

  const session = getUserSession();
  const dynamicUser = getUserData();
  const sessionRole = session?.role || null;
  const sessionUserId = session?.userId || null;
  const role = sessionRole || 'student';
  
  const userToUse = freshUserData || dynamicUser;
  const userName = userToUse?.name || userToUse?.fullName || userToUse?.staffName || 'Nandhini Sakthivel';

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

    async function fetchDashboardData() {
      setDataLoading(true);
      try {
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
        }

        // Widget telemetry data
        const widgetRes = await fetch(`${API_BASE}/widget-data/${role}`);
        if (widgetRes.ok) {
          const wData = await widgetRes.json();
          setWidgetData(wData);
        }
      } catch (err) {
        console.error('Error fetching dashboard telemetry:', err);
      } finally {
        // Small delay to showcase smooth animal skeleton loader transition
        setTimeout(() => {
          setDataLoading(false);
        }, 1100);
      }
    }

    fetchDashboardData();
  }, [location.search, navigate, sessionRole, sessionUserId, role]);

  // Chart Data
  const admissionsData = [
    { day: '3 Jul', admissions: 10 },
    { day: '4 Jul', admissions: 22 },
    { day: '5 Jul', admissions: 16 },
    { day: '6 Jul', admissions: 8 },
    { day: '7 Jul', admissions: 14 },
    { day: '8 Jul', admissions: 24 },
    { day: '9 Jul', admissions: 32 },
  ];

  const deptData = [
    { name: 'CSE', value: 420, pct: '33.7%', color: '#6366F1' },
    { name: 'IT', value: 280, pct: '22.4%', color: '#3B82F6' },
    { name: 'ECE', value: 220, pct: '17.6%', color: '#10B981' },
    { name: 'MECH', value: 180, pct: '14.4%', color: '#F59E0B' },
    { name: 'CIVIL', value: 148, pct: '11.9%', color: '#EC4899' },
  ];

  const scheduleToday = [
    { time: '09:00 AM', course: 'CS-202: Operating Systems', instructor: 'Dr. Meera Patel', room: 'Room 115', status: 'Ongoing', isOngoing: true },
    { time: '09:50 AM', course: 'CS-305: DBMS', instructor: 'Dr. Rajesh Iyer', room: 'Room 113', status: 'Upcoming', isOngoing: false },
    { time: '10:55 AM', course: 'CS-401: Computer Networks', instructor: 'Dr. Riyas', room: 'Room 118', status: 'Upcoming', isOngoing: false },
    { time: '11:45 AM', course: 'CS-205: Data Structures', instructor: 'Prof. Anitha', room: 'Room 104', status: 'Upcoming', isOngoing: false },
  ];

  const upcomingEvents = [
    { day: '15', month: 'JUL', title: 'Mid Semester Exams', subtitle: '15 Jul - 25 Jul 2026', tag: 'Academic', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { day: '20', month: 'JUL', title: 'Infosys Placement Drive', subtitle: '20 Jul 2026', tag: 'Placement', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { day: '25', month: 'JUL', title: 'Department Meeting', subtitle: '25 Jul 2026, 10:00 AM', tag: 'Meeting', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ];

  return (
    <Layout title="">
      <div className="w-full max-w-[1600px] mx-auto min-h-0 flex flex-col space-y-4 text-[#1B1F24] pb-2">
        
        {dataLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Header: Greeting & Control Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-[#003A40] flex items-center gap-2 leading-tight">
                  Good morning, {userName.split(' ')[0]} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-xs md:text-sm text-[#5F6B7A] mt-0.5 font-medium">
                  Here's what's happening at MIT Campus today.
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

            {/* 5 KPI Summary Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 flex-shrink-0">
              {/* Card 1 */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">
                    {dashboardStats?.total_students ? Number(dashboardStats.total_students).toLocaleString() : '1,248'}
                  </h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Total Students</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>↑ 8.3%</span> <span className="text-[#8C98A5] font-normal">from last month</span>
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">
                    {dashboardStats?.total_faculty ? dashboardStats.total_faculty : '86'}
                  </h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Total Faculty</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>↑ 4.7%</span> <span className="text-[#8C98A5] font-normal">from last month</span>
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">28</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Departments</p>
                  <p className="text-[11px] font-semibold text-[#8C98A5] mt-1">No change</p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">₹6.3L</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Fee Collection</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>↑ 12.5%</span> <span className="text-[#8C98A5] font-normal">this week</span>
                  </p>
                </div>
              </div>

              {/* Card 5 */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-rose-600 leading-none">3</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">System Alerts</p>
                  <p className="text-[11px] font-bold text-rose-500 mt-1">Requires attention</p>
                </div>
              </div>
            </div>

            {/* Middle Section: Fee Collection Progress, Student Admissions Line Chart, Announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Fee Collection Overview */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Fee Collection Overview</h3>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    This Week ▾
                  </span>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-[#003A40]">₹6,30,000</span>
                      <p className="text-[11px] text-[#5F6B7A]">Total Collected</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-600">₹8,00,000</span>
                      <p className="text-[11px] text-[#8C98A5]">Target</p>
                    </div>
                  </div>

                  {/* Violet Striped Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-3 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-500" 
                      style={{ width: '78.8%' }} 
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-[11px] font-extrabold text-violet-700">78.8%</span>
                  </div>
                </div>
              </div>

              {/* Student Admissions Area Chart */}
              <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Student Admissions</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-extrabold text-[#003A40]">120 <span className="text-[10px] font-bold text-emerald-600">↑ 15.2%</span></span>
                      <span className="text-xs text-[#5F6B7A]">32 Applications Pending</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    This Month ▾
                  </span>
                </div>

                <div className="h-28 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={admissionsData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="admissionGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8C98A5' }} stroke="#E6EDF2" />
                      <YAxis tick={{ fontSize: 10, fill: '#8C98A5' }} stroke="#E6EDF2" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#03323A', borderRadius: '10px', color: '#fff', fontSize: '11px', border: 'none' }}
                        labelStyle={{ fontWeight: 'bold', color: '#6366F1' }}
                      />
                      <Area type="monotone" dataKey="admissions" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#admissionGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Announcements Card */}
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
                      <p className="font-bold text-[#003A40] text-[11px] truncate">Mid-Semester Exams</p>
                      <p className="text-[10px] text-[#5F6B7A] line-clamp-1">Mid-semester exams begin from 15th July.</p>
                    </div>
                    <span className="text-[9px] text-slate-400">2h ago</span>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#003A40] text-[11px] truncate">Cultural Fest 2026</p>
                      <p className="text-[10px] text-[#5F6B7A] line-clamp-1">TechnoCultura '26 registration is open.</p>
                    </div>
                    <span className="text-[9px] text-slate-400">1d ago</span>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                    <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#003A40] text-[11px] truncate">Placement Drive</p>
                      <p className="text-[10px] text-[#5F6B7A] line-clamp-1">Infosys drive on 20th July 2026.</p>
                    </div>
                    <span className="text-[9px] text-slate-400">2d ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operations Row: Today Schedule Table, Department Donut Chart, Upcoming Events, Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Course Schedule - Today Table */}
              <div className="lg:col-span-7 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Course Schedule - Today</h3>
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

              {/* Department-wise Students Donut Chart */}
              <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide mb-2">Department-wise Students</h3>

                <div className="flex items-center gap-4">
                  {/* Donut Chart */}
                  <div className="w-36 h-36 relative flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deptData}
                          innerRadius={42}
                          outerRadius={62}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {deptData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xs font-extrabold text-[#003A40]">1,248</span>
                      <span className="text-[9px] font-semibold text-[#8C98A5]">Total</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="flex-1 space-y-1.5 text-xs">
                    {deptData.map((item) => (
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

            {/* Lower Row: Events, Quick Actions, System Status & Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Upcoming Events */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Upcoming Events</h3>
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

              {/* Quick Actions Grid */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => navigate(`/add-student${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>Add Student</span>
                  </button>

                  <button
                    onClick={() => navigate(`/add-faculty${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Add Faculty</span>
                  </button>

                  <button
                    onClick={() => navigate(`/notifications${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-100/60 text-amber-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Bell className="w-4 h-4 text-amber-600" />
                    <span>Create Notice</span>
                  </button>

                  <button
                    onClick={() => navigate(`/analytics${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>

              {/* System Status & Recent Activity Feed */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide">System Status & Activity</h3>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-bold text-[#003A40] text-[11px]">Server Status</p>
                      <p className="text-[10px] text-emerald-700">Operational</p>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-bold text-[#003A40] text-[11px]">Database</p>
                      <p className="text-[10px] text-blue-700">Connected</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6B7A] font-medium">New student admission (CSE)</span>
                    <span className="text-slate-400 text-[10px]">2h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6B7A] font-medium">Fee payment ₹25,000 received</span>
                    <span className="text-slate-400 text-[10px]">3h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6B7A] font-medium">New faculty joined ECE</span>
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
