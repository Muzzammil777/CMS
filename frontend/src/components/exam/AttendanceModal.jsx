import { useState, useEffect, useMemo } from 'react';
import { 
  listEnrolledStudents,
  listExamAttendance,
  upsertExamAttendance,
} from '../../api/examsApi';
import { getUserSession } from '../../auth/sessionController';

export default function AttendanceModal({ exam, onClose, onSave }) {
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const session = getUserSession();

  useEffect(() => {
    if (exam) {
      loadStudentsAndAttendance();
    }
  }, [exam]);

  const loadStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      const examId = exam._id || exam.id;
      const [enrolled, existingAttendance] = await Promise.all([
        listEnrolledStudents(examId),
        listExamAttendance({ examId }),
      ]);

      setStudents(enrolled);

      const attObj = {};
      enrolled.forEach(s => {
        attObj[s.studentId] = 'Present';
      });
      existingAttendance.forEach((a) => {
        attObj[a.studentId] = a.status;
      });
      
      setAttendanceData(attObj);
    } catch (err) {
      console.error('Failed to load exam attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkAll = (status) => {
    const updated = {};
    students.forEach(s => {
      updated[s.studentId] = status;
    });
    setAttendanceData(updated);
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(s => 
      s.studentName?.toLowerCase().includes(term) || 
      s.studentId?.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  const stats = useMemo(() => {
    const total = students.length;
    const values = Object.values(attendanceData);
    const present = values.filter(s => s === 'Present').length;
    const absent = values.filter(s => s === 'Absent').length;
    const late = values.filter(s => s === 'Late').length;
    
    return { total, present, absent, late };
  }, [students, attendanceData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const examId = exam._id || exam.id;
      const rows = Object.entries(attendanceData).filter(([, status]) => Boolean(status));
      await Promise.all(
        rows.map(([studentId, status]) =>
          upsertExamAttendance({
            examId,
            studentId,
            status,
            markedBy: session?.userId || session?.username || 'faculty',
          })
        )
      );
      alert(`Attendance saved for ${rows.length} students successfully!`);
      onSave();
    } catch (err) {
      alert(err?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'Absent': return 'bg-red-100 text-red-700 border-red-300';
      case 'Late': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="material-symbols-outlined text-purple-600">fact_check</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Mark Attendance</h3>
              <p className="text-sm text-slate-500">{exam.code} - {exam.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Present</p>
              <p className="text-xl font-bold text-emerald-600 mt-0.5">{stats.present}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Absent</p>
              <p className="text-xl font-bold text-red-600 mt-0.5">{stats.absent}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-[10px] font-semibold text-yellow-600 uppercase tracking-wider">Late</p>
              <p className="text-xl font-bold text-yellow-600 mt-0.5">{stats.late}</p>
            </div>
          </div>

          {/* Quick Actions + Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleMarkAll('Present')}
                className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">check_circle</span>
                All Present
              </button>
              <button
                onClick={() => handleMarkAll('Absent')}
                className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">cancel</span>
                All Absent
              </button>
            </div>
          </div>

          {/* Student Attendance List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-2 opacity-20">person_off</span>
              <p className="text-sm">No students found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => {
                const currentStatus = attendanceData[student.studentId];
                
                return (
                  <div 
                    key={student.id} 
                    className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{student.studentName}</p>
                      <p className="text-xs text-slate-500">{student.studentId}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {['Present', 'Absent', 'Late'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleAttendanceChange(student.studentId, status)}
                          className={`px-3.5 py-1.5 rounded-lg border-2 font-medium text-sm transition-all ${
                            currentStatus === status
                              ? getStatusColor(status)
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || students.length === 0}
            className="px-4 py-2 bg-[#6d28d9] text-white rounded-lg hover:bg-[#4c1d95] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}
