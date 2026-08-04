import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { listExams, listRegistrations, registerExam, listMarks, listSeatAssignments } from '../api/examsApi';
import { getUserSession } from '../auth/sessionController';
import { getStudentById } from '../data/studentData';
import { Calendar, CheckCircle2, Clock, AlertCircle, FileText, Badge } from 'lucide-react';
import HallTicket from '../components/exam/HallTicket';

export default function StudentExamsPage() {
  const session = getUserSession();
  const studentId = session?.userId;
  const studentRecord = getStudentById(studentId);

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({ status: '', type: '' });
  
  const [showHallTicket, setShowHallTicket] = useState(false);
  const [hallTicketMode, setHallTicketMode] = useState('all');
  const [selectedExam, setSelectedExam] = useState(null);

  const fetchExamsData = async () => {
    setLoading(true);
    try {
      const [examList, registrations, marks, seats] = await Promise.all([
        listExams({ role: 'student', userId: studentId }),
        listRegistrations({ studentId }),
        listMarks({ studentId }),
        listSeatAssignments({ studentId }),
      ]);

      const registeredIds = new Set(registrations.map(reg => reg.examId));
      const marksByExam = marks.reduce((acc, item) => ({ ...acc, [item.examId]: item }), {});
      const seatsByExam = seats.reduce((acc, item) => ({ ...acc, [item.examId]: item }), {});

      const merged = (examList || []).map((exam) => {
        const examId = exam._id || exam.id;
        const mark = marksByExam[examId];
        const seat = seatsByExam[examId];
        return {
          ...exam,
          registered: registeredIds.has(examId) || exam.type !== 'End-Sem',
          marks: mark?.marks,
          grade: mark?.grade,
          seatNumber: seat?.seatNumber,
          hallName: seat?.hallName,
        };
      });

      setExams(merged);
    } catch (err) {
      console.error('Failed to fetch student exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsData();
  }, []);

  const handleRegister = async (examId) => {
    try {
      await registerExam({
        examId,
        studentId,
        studentName: studentRecord?.name || studentId,
      });
      alert('Successfully registered for the exam!');
      fetchExamsData();
    } catch (err) {
      alert(err?.message || 'Registration failed.');
    }
  };

  const handleOpenHallTicket = (exam) => {
    setSelectedExam(exam);
    setHallTicketMode('single');
    setShowHallTicket(true);
  };

  const handleOpenAllHallTickets = () => {
    const registeredEndSemExams = exams.filter(e => e.registered && e.type === 'End-Sem');
    if (registeredEndSemExams.length === 0) {
      alert('No end-semester exams registered yet.');
      return;
    }
    setSelectedExam(registeredEndSemExams[0]);
    setHallTicketMode('all');
    setShowHallTicket(true);
  };

  const buildHallTicketSubjects = ({ mode, exam } = {}) => {
    const mapExam = (item) => ({
      code: item.code,
      name: item.name,
      credits: item.credits ?? 4,
      semester: item.semester || studentRecord?.semester || 4,
    });
    if (mode === 'single' && exam) {
      if (exam.type !== 'End-Sem') return [];
      return [mapExam(exam)];
    }
    const registeredEndSemExams = exams.filter(e => e.registered && e.type === 'End-Sem');
    return registeredEndSemExams.map(mapExam);
  };

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        (exam.name || '').toLowerCase().includes(q) || 
        (exam.code || '').toLowerCase().includes(q);

      const st = (exam.status || 'Upcoming').toLowerCase();
      const matchStatus = !activeFilters.status || st === activeFilters.status.toLowerCase();

      const type = (exam.type || '').toLowerCase();
      const matchType = !activeFilters.type || type === activeFilters.type.toLowerCase();

      return matchSearch && matchStatus && matchType;
    });
  }, [exams, searchQuery, activeFilters]);

  const upcomingCount = exams.filter(e => e.status === 'Upcoming').length;
  const completedCount = exams.filter(e => e.status === 'Completed').length;
  const pendingResultsCount = exams.filter(e => e.status === 'Completed' && e.marks === undefined).length;
  const totalRegistered = exams.filter(e => e.registered).length;

  const kpiCards = [
    {
      title: 'Upcoming Exams',
      value: upcomingCount.toString(),
      sub: 'Scheduled exams',
      trend: upcomingCount > 0 ? 'Prepare well' : 'No upcoming exams',
      trendUp: true,
      icon: <Calendar className="w-5 h-5" />,
      gradient: 'blue',
    },
    {
      title: 'Completed Exams',
      value: completedCount.toString(),
      sub: 'Exams finished',
      trend: 'Good progress',
      trendUp: true,
      icon: <CheckCircle2 className="w-5 h-5" />,
      gradient: 'emerald',
    },
    {
      title: 'Registered Exams',
      value: totalRegistered.toString(),
      sub: 'Total registrations',
      trend: 'Registration complete',
      trendUp: true,
      icon: <Badge className="w-5 h-5" />,
      gradient: 'indigo',
    },
    {
      title: 'Pending Results',
      value: pendingResultsCount.toString(),
      sub: 'Awaiting marks',
      trend: pendingResultsCount > 0 ? 'Results soon' : 'All results published',
      trendUp: pendingResultsCount === 0,
      icon: <Clock className="w-5 h-5" />,
      gradient: 'amber',
    }
  ];

  const columns = [
    {
      key: 'exam',
      label: 'Exam Details',
      render: (_, e) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F4F7FF] border border-[#E6EDF2] text-[#003A40] flex items-center justify-center font-bold text-xs flex-shrink-0">
            <FileText className="w-4 h-4 text-[#0A686A]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#003A40] truncate leading-tight">{e.name || 'Exam Name'}</p>
            <p className="text-[10px] text-[#8C98A5] font-medium truncate uppercase">{e.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'datetime',
      label: 'Date & Time',
      render: (_, e) => (
        <div>
          <p className="text-xs font-bold text-[#1E293B]">{new Date(e.date).toLocaleDateString()}</p>
          <p className="text-[11px] text-[#64748B] font-medium">{e.time}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (_, e) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border tracking-wide bg-slate-50 text-slate-600 border-slate-200">
          {e.type}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, e) => {
        if (e.status === 'Completed') {
          return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
        }
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Upcoming</span>;
      },
    },
    {
      key: 'result',
      label: 'Result',
      render: (_, e) => {
        if (e.status !== 'Completed') return <span className="text-xs text-slate-400">—</span>;
        if (e.marks === undefined) return <span className="text-xs font-semibold text-amber-600">Pending</span>;
        return (
          <div className="flex flex-col">
            <span className="text-xs font-bold text-emerald-700">{e.marks} / {e.maxMarks || 100}</span>
            <span className="text-[10px] font-semibold text-slate-500">Grade: {e.grade || 'N/A'}</span>
          </div>
        );
      },
    }
  ];

  const actions = [
    {
      icon: <Badge className="w-3.5 h-3.5" />,
      label: 'Register',
      color: 'emerald',
      onClick: (e) => handleRegister(e._id || e.id),
      showIf: (e) => e.status === 'Upcoming' && !e.registered
    },
    {
      icon: <FileText className="w-3.5 h-3.5" />,
      label: 'Hall Ticket',
      color: 'indigo',
      onClick: (e) => handleOpenHallTicket(e),
      showIf: (e) => e.registered && e.type === 'End-Sem'
    }
  ];

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Upcoming', label: 'Upcoming' },
        { value: 'Completed', label: 'Completed' },
      ],
    },
    {
      key: 'type',
      label: 'Exam Type',
      options: [
        { value: 'End-Sem', label: 'End-Sem' },
        { value: 'Mid-Sem', label: 'Mid-Sem' },
        { value: 'Practical', label: 'Practical' },
        { value: 'Quiz', label: 'Quiz' },
      ],
    }
  ];

  return (
    <Layout title="My Exams">
      <div className="mb-4 flex justify-end px-6">
        <button
          onClick={handleOpenAllHallTickets}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#003A40] hover:bg-[#02282d] text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
        >
          <Badge className="w-4 h-4" />
          Download All Hall Tickets
        </button>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <EnterprisePageTemplate
          kpiCards={kpiCards}
          columns={columns}
          rows={filteredExams}
          actions={actions}
          rowKey="id"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search exams by name or code..."
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters(prev => ({ ...prev, [key]: val }))}
          loading={false}
          emptyMessage="No exams found."
        />
      )}

      {showHallTicket && (
        <HallTicket
          studentDetails={{
            name: studentRecord?.name || 'Student Name',
            rollNumber: studentRecord?.rollNumber || studentId,
            department: studentRecord?.department || 'B.Tech CSE',
            semester: studentRecord?.semester || 6,
            photo: studentRecord?.photo,
          }}
          exam={selectedExam}
          subjects={buildHallTicketSubjects({ mode: hallTicketMode, exam: selectedExam })}
          mode={hallTicketMode}
          onClose={() => setShowHallTicket(false)}
        />
      )}
    </Layout>
  );
}
