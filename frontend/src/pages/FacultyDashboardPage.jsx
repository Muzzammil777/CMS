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
  Users, 
  UserCheck, 
  BookOpen, 
  Clock, 
  ShieldAlert, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  FileText, 
  CheckCircle2, 
  Activity, 
  Bell, 
  Plus, 
  Award, 
  Briefcase,
  Sparkles,
  ClipboardList,
  GraduationCap
} from 'lucide-react';

// Attendance Marking Modal Component
function AttendanceModal({ isOpen, onClose, onSubmit }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const classes = [
    { id: 'CS-303', code: 'CS-303', name: 'Data Structures', time: '09:00 - 10:30' },
    { id: 'CS-306', code: 'CS-306', name: 'Database Systems', time: '11:00 - 12:30' },
    { id: 'CS-309', code: 'CS-309', name: 'Web Development', time: '14:00 - 15:30' }
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-fadeIn">
        <h2 className="text-lg font-extrabold text-[#003A40] mb-4">Mark Class Attendance</h2>
        
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Course / Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 font-medium"
          >
            <option value="">Choose a course...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name} ({c.time})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 font-medium"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Mark Attendance
          </button>
        </div>
      </div>
    </div>
  );
}

// Internal Marks Publishing Modal Component
function PublishMarksModal({ isOpen, onClose, onSubmit }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [marksType, setMarksType] = useState('');

  const classes = [
    { id: 'CS-303', code: 'CS-303', name: 'Data Structures' },
    { id: 'CS-306', code: 'CS-306', name: 'Database Systems' },
    { id: 'CS-309', code: 'CS-309', name: 'Web Development' }
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-fadeIn">
        <h2 className="text-lg font-extrabold text-[#003A40] mb-4">Publish Internal Marks</h2>
        
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Course / Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 font-medium"
          >
            <option value="">Choose a course...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Assessment Type</label>
          <select
            value={marksType}
            onChange={(e) => setMarksType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 font-medium"
          >
            <option value="">Choose assessment type...</option>
            {marksTypes.map(mt => (
              <option key={mt.id} value={mt.id}>
                {mt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Publish Marks
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
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');

  const session = getUserSession();
  const dynamicUser = getUserData();
  const sessionRole = session?.role || null;
  const sessionUserId = session?.userId || null;
  const role = sessionRole || 'faculty';

  const userToUse = freshUserData || dynamicUser;
  const facultyName = userToUse?.name || userToUse?.fullName || 'Dr. Ramesh Kumar';
  const designation = userToUse?.designation || 'Professor';
  const department = userToUse?.departmentId || userToUse?.department_id || userToUse?.department || 'Computer Science';

  const roleQuery = `?role=${encodeURIComponent(role)}`;

  useEffect(() => {
    if (!sessionRole || !sessionUserId) {
      navigate('/', { replace: true });
      return undefined;
    }

    document.title = `MIT Connect - Faculty Dashboard`;

    const expectedSearch = `?role=${encodeURIComponent(sessionRole)}`;
    if (location.search !== expectedSearch) {
      navigate(`/dashboard${expectedSearch}`, { replace: true });
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
        console.error('Failed to fetch faculty data:', err);
      } finally {
        setTimeout(() => {
          setDataLoading(false);
        }, 800);
      }
    }

    fetchFacultyData();
  }, [location.search, navigate, sessionRole, sessionUserId]);

  // Chart Data
  const attendanceTrendData = [
    { day: '3 Jul', rate: 88 },
    { day: '4 Jul', rate: 94 },
    { day: '5 Jul', rate: 91 },
    { day: '6 Jul', rate: 85 },
    { day: '7 Jul', rate: 96 },
    { day: '8 Jul', rate: 92 },
    { day: '9 Jul', rate: 95 },
  ];

  const gradeDistData = [
    { name: 'A+ Grade', value: 48, pct: '34.2%', color: '#6366F1' },
    { name: 'A Grade', value: 52, pct: '37.1%', color: '#10B981' },
    { name: 'B Grade', value: 28, pct: '20.0%', color: '#F59E0B' },
    { name: 'C Grade', value: 12, pct: '8.7%', color: '#EC4899' },
  ];

  const scheduleToday = [
    { time: '09:00 AM', course: 'CS-303: Data Structures', room: 'Lab 302', students: 48, status: 'Ongoing', isOngoing: true },
    { time: '11:00 AM', course: 'CS-306: Database Systems', room: 'Hall A1', students: 52, status: 'Upcoming', isOngoing: false },
    { time: '02:00 PM', course: 'CS-309: Web Development', room: 'Lab 104', students: 40, status: 'Upcoming', isOngoing: false },
  ];

  const upcomingEvents = [
    { day: '15', month: 'JUL', title: 'Mid-Semester CS303 Exam', subtitle: '15 Jul 2026, 10:00 AM', tag: 'Exam', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { day: '18', month: 'JUL', title: 'Department Faculty Meeting', subtitle: '18 Jul 2026, 02:30 PM', tag: 'Meeting', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { day: '22', month: 'JUL', title: 'Research Grant Review', subtitle: '22 Jul 2026, 11:00 AM', tag: 'Research', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ];

  const handleAttendanceSubmit = (classId, date) => {
    console.log('Attendance submitted:', { classId, date });
  };

  const handleMarksSubmit = (classId, type) => {
    console.log('Marks published:', { classId, type });
  };

  return (
    <Layout title="">
      <div className="w-full max-w-[1600px] mx-auto min-h-0 flex flex-col space-y-4 text-[#1B1F24] pb-2">
        
        {dataLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Header: Greeting & Period Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-[#003A40] flex items-center gap-2 leading-tight">
                  Good morning, {facultyName.split(' ')[0]} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-xs md:text-sm text-[#5F6B7A] mt-0.5 font-medium">
                  {designation} • {department} Department
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

            {/* 5 KPI Summary Cards Row (Copied & adapted from Admin Dashboard UI) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 flex-shrink-0">
              {/* Card 1: Assigned Courses */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">3</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Assigned Courses</p>
                  <p className="text-[11px] font-semibold text-indigo-600 mt-1">CS-303, 306, 309</p>
                </div>
              </div>

              {/* Card 2: Enrolled Students */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">140</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Total Students</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>↑ 3 Classes</span>
                  </p>
                </div>
              </div>

              {/* Card 3: Today Lectures */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">3</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Today's Lectures</p>
                  <p className="text-[11px] font-semibold text-blue-600 mt-1">1 Ongoing</p>
                </div>
              </div>

              {/* Card 4: Class Attendance */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">92.4%</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Avg Attendance</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>↑ 2.1%</span> <span className="text-[#8C98A5] font-normal">vs target</span>
                  </p>
                </div>
              </div>

              {/* Card 5: Pending Requests */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-rose-600 leading-none">4</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Pending OD / Leaves</p>
                  <p className="text-[11px] font-bold text-rose-500 mt-1">Action needed</p>
                </div>
              </div>
            </div>

            {/* Middle Section: Attendance Rate Overview, Class Attendance Trend, Announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Class Attendance Rate Progress Card */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Class Attendance Target</h3>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    This Week ▾
                  </span>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-[#003A40]">92.4%</span>
                      <p className="text-[11px] text-[#5F6B7A]">Current Average</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-600">85.0%</span>
                      <p className="text-[11px] text-[#8C98A5]">Required Min</p>
                    </div>
                  </div>

                  {/* Gradient Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-3 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-500" 
                      style={{ width: '92.4%' }} 
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-[11px] font-extrabold text-violet-700">92.4% Compliant</span>
                  </div>
                </div>
              </div>

              {/* Class Attendance Trend Area Chart */}
              <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Weekly Attendance Trend</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-extrabold text-[#003A40]">95% Today <span className="text-[10px] font-bold text-emerald-600">↑ 3.0%</span></span>
                      <span className="text-xs text-[#5F6B7A]">Data Structures Lab</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    This Week ▾
                  </span>
                </div>

                <div className="h-28 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceTrendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="facultyAttendanceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8C98A5' }} stroke="#E6EDF2" />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#8C98A5' }} stroke="#E6EDF2" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#03323A', borderRadius: '10px', color: '#fff', fontSize: '11px', border: 'none' }}
                        labelStyle={{ fontWeight: 'bold', color: '#10B981' }}
                      />
                      <Area type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#facultyAttendanceGrad)" />
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
                      <p className="font-bold text-[#003A40] text-[11px] truncate">Mid-Semester Exam Schedule</p>
                      <p className="text-[10px] text-[#5F6B7A] line-clamp-1">Submit internal question papers by 12th July.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#003A40] text-[11px] truncate">Faculty Development Program</p>
                      <p className="text-[10px] text-[#5F6B7A] line-clamp-1">AI & ML Workshop on 25th July.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operations Row: Today Schedule Table & Grade Distribution Donut Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Course Schedule - Today Table */}
              <div className="lg:col-span-7 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">My Lecture Schedule - Today</h3>
                  <button onClick={() => navigate('/timetable')} className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                    Full Timetable
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[#8C98A5] text-[10px] font-bold uppercase tracking-wider">
                        <th className="pb-2 font-semibold">Time</th>
                        <th className="pb-2 font-semibold">Course</th>
                        <th className="pb-2 font-semibold">Room</th>
                        <th className="pb-2 font-semibold">Students</th>
                        <th className="pb-2 font-semibold text-right">Action / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scheduleToday.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 text-[11px] font-medium text-slate-500">{item.time}</td>
                          <td className="py-2.5 font-bold text-[#003A40]">{item.course}</td>
                          <td className="py-2.5 text-[11px] text-slate-600">{item.room}</td>
                          <td className="py-2.5 text-[11px] font-medium text-slate-500">{item.students}</td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => setIsAttendanceModalOpen(true)}
                              className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase cursor-pointer transition-all ${
                                item.isOngoing 
                                  ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700' 
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                              }`}
                            >
                              {item.isOngoing ? 'Mark Attendance' : 'Schedule'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Student Grade Distribution Donut Chart */}
              <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide mb-2">Student Performance Grades</h3>

                <div className="flex items-center gap-4">
                  {/* Donut Chart */}
                  <div className="w-36 h-36 relative flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gradeDistData}
                          innerRadius={42}
                          outerRadius={62}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {gradeDistData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xs font-extrabold text-[#003A40]">140</span>
                      <span className="text-[9px] font-semibold text-[#8C98A5]">Students</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="flex-1 space-y-1.5 text-xs">
                    {gradeDistData.map((item) => (
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

            {/* Lower Row: Upcoming Events, Quick Actions & Recent Activity Feed */}
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

              {/* Quick Actions Grid */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Faculty Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setIsAttendanceModalOpen(true)}
                    className="p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                    <span>Mark Attendance</span>
                  </button>

                  <button
                    onClick={() => setIsMarksModalOpen(true)}
                    className="p-2.5 rounded-xl border border-violet-100 bg-violet-50/50 hover:bg-violet-100/60 text-violet-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-violet-600" />
                    <span>Publish Marks</span>
                  </button>

                  <button
                    onClick={() => navigate(`/faculty${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Request Leave</span>
                  </button>

                  <button
                    onClick={() => navigate(`/timetable${roleQuery}`)}
                    className="p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>My Timetable</span>
                  </button>
                </div>
              </div>

              {/* Faculty Recent Activity */}
              <div className="lg:col-span-4 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Recent Activity & Logs</h3>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-bold text-[#003A40] text-[11px]">Portal Status</p>
                      <p className="text-[10px] text-emerald-700">Active</p>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-bold text-[#003A40] text-[11px]">Teaching Load</p>
                      <p className="text-[10px] text-blue-700">14 hrs / week</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6B7A] font-medium">Marked CS303 attendance (48/50)</span>
                    <span className="text-slate-400 text-[10px]">1h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6B7A] font-medium">Published Midterm CS306 marks</span>
                    <span className="text-slate-400 text-[10px]">4h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#5F6B7A] font-medium">Approved 2 student OD requests</span>
                    <span className="text-slate-400 text-[10px]">1d ago</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Modals */}
        <AttendanceModal 
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          onSubmit={handleAttendanceSubmit}
        />

        <PublishMarksModal
          isOpen={isMarksModalOpen}
          onClose={() => setIsMarksModalOpen(false)}
          onSubmit={handleMarksSubmit}
        />

      </div>
    </Layout>
  );
}
