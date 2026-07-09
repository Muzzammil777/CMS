import React, { useState, useEffect } from 'react';
import { 
  listExamHalls,
  listRegistrations,
  listSeatAssignments,
  upsertSeatAssignment,
  autoAssignSeats,
} from '../../api/examsApi';

export default function SeatAssignmentModal({ exam, onClose, onSave }) {
  const [registrations, setRegistrations] = useState([]);
  const [halls, setHalls] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [selectedHall, setSelectedHall] = useState(exam.room || '');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const examId = exam._id || exam.id;
        const [regs, hallRows, seatRows] = await Promise.all([
          listRegistrations({ examId }),
          listExamHalls(),
          listSeatAssignments({ examId }),
        ]);
        if (cancelled) return;

        setRegistrations(regs);
        setHalls(hallRows);

        const existing = {};
        seatRows.forEach((seat) => {
          if (seat?.studentId && seat?.seatNumber) {
            existing[seat.studentId] = seat.seatNumber;
          }
        });
        setAssignments(existing);
      } catch (err) {
        console.error('Failed to load seat assignment data:', err);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [exam._id, exam.id]);

  const handleAutoAssign = async () => {
    try {
      const examId = exam._id || exam.id;
      const result = await autoAssignSeats({ examId, hallName: selectedHall });
      const seatRows = await listSeatAssignments({ examId });
      const updated = {};
      seatRows.forEach((seat) => {
        if (seat?.studentId && seat?.seatNumber) {
          updated[seat.studentId] = seat.seatNumber;
        }
      });
      setAssignments(updated);
      alert(`Successfully assigned ${result?.assigned || 0} seats`);
    } catch (err) {
      alert(err?.message || 'Auto-assignment failed');
    }
  };

  const handleManualAssign = (studentId, seatNumber) => {
    setAssignments(prev => ({
      ...prev,
      [studentId]: seatNumber
    }));
  };

  const handleSave = async () => {
    try {
      const examId = exam._id || exam.id;
      const rows = Object.entries(assignments).filter(([, seatNumber]) => Boolean(seatNumber));
      await Promise.all(
        rows.map(([studentId, seatNumber]) =>
          upsertSeatAssignment({
            examId,
            studentId,
            seatNumber,
            hallName: selectedHall,
          })
        )
      );
      onSave();
    } catch (err) {
      alert(err?.message || 'Failed to save seat assignments');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col transition-all duration-300">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6d28d9]/10 rounded-lg">
              <span className="material-symbols-outlined text-[#6d28d9]">event_seat</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Seat Assignment</h3>
              <p className="text-xs sm:text-sm text-slate-500">{exam.code} - {exam.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Hall Selection & Auto-assign */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                  Exam Hall
                </label>
                <select
                  value={selectedHall}
                  onChange={(e) => setSelectedHall(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6d28d9]/20 focus:border-[#6d28d9] outline-none text-sm bg-white text-slate-800"
                >
                  <option value="">Select Hall</option>
                  {halls.map((hall) => (
                    <option key={hall.id} value={hall.name}>
                      {hall.name} (Capacity: {hall.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAutoAssign}
                disabled={!selectedHall}
                className="px-4 py-2.5 bg-[#6d28d9] text-white rounded-lg hover:bg-[#6d28d9]/90 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-sm shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-base">auto_fix_high</span>
                Auto-assign Seats
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">
              Total Students: <span className="text-slate-800 font-bold">{registrations.length}</span> | Assigned: <span className="text-[#6d28d9] font-bold">{Object.keys(assignments).filter(k => assignments[k]).length}</span>
            </p>
          </div>

          {/* Student List with Seat Assignments */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Manual Seat Assignment</h3>
            <div className="space-y-2.5">
              {registrations.map((reg) => (
                <div key={reg.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-all shadow-sm">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 uppercase tracking-wide leading-tight">{reg.studentName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{reg.studentId}</p>
                  </div>
                  <div className="w-full sm:w-44 flex items-center gap-2">
                    <span className="text-[10px] sm:hidden font-bold text-slate-400 uppercase">Seat:</span>
                    <input
                      type="text"
                      value={assignments[reg.studentId] || ''}
                      onChange={(e) => handleManualAssign(reg.studentId, e.target.value)}
                      placeholder="e.g., A-15"
                      className="w-full px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-[#6d28d9]/20 focus:border-[#6d28d9] outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-slate-50/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#6d28d9] text-white rounded-lg hover:bg-[#4c1d95] transition-colors font-semibold text-sm shadow-sm flex items-center justify-center"
          >
            Save Assignments
          </button>
        </div>
      </div>
    </div>
  );
}
