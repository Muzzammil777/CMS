import { useState, useEffect } from 'react';
import { assignInvigilator, listInvigilators, deleteInvigilator } from '../../api/examsApi';
import { buildApiUrl } from '../../api/apiBase';

export default function InvigilatorAssignModal({ isOpen, onClose, exam, currentUserId }) {
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [assignedInvigilators, setAssignedInvigilators] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  useEffect(() => {
    if (isOpen && exam) {
      loadAssignedInvigilators();
      loadFacultyList();
    }
  }, [isOpen, exam]);

  const loadFacultyList = async () => {
    try {
      const res = await fetch(buildApiUrl('/faculty'));
      if (res.ok) {
        const data = await res.json();
        setFacultyList(data || []);
      }
    } catch (err) {
      console.error('Failed to load faculty list:', err);
    }
  };

  const loadAssignedInvigilators = async () => {
    try {
      const examId = exam._id || exam.id;
      const assigned = await listInvigilators({ examId });
      setAssignedInvigilators(assigned);
    } catch (err) {
      console.error('Failed to load invigilators:', err);
      setAssignedInvigilators([]);
    }
  };

  const handleAssign = async () => {
    if (!selectedFaculty) return;

    const faculty = facultyList.find(f => (f.employeeId || f.id || f._id) === selectedFaculty);
    if (!faculty) return;

    try {
      await assignInvigilator({
        examId: exam._id || exam.id,
        facultyId: faculty.employeeId || faculty.id || faculty._id,
        facultyName: faculty.fullName || faculty.name,
        assignedBy: currentUserId || '',
      });
      loadAssignedInvigilators();
      setSelectedFaculty('');
      alert('Invigilator assigned successfully!');
    } catch (err) {
      alert(err?.message || 'Failed to assign invigilator');
    }
  };

  const handleRemove = async (assignmentId) => {
    if (confirm('Remove this invigilator assignment?')) {
      try {
        await deleteInvigilator(assignmentId);
        loadAssignedInvigilators();
      } catch (err) {
        alert(err?.message || 'Failed to remove invigilator');
      }
    }
  };

  if (!isOpen) return null;

  // Filter out already assigned faculty
  const availableFaculty = facultyList.filter(
    f => !assignedInvigilators.some(a => a.facultyId === (f.employeeId || f.id || f._id))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col transition-all duration-300">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#00236f]/10 rounded-lg">
              <span className="material-symbols-outlined text-[#00236f]">person_add</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Assign Invigilators</h3>
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
          {/* Add Invigilator */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 block uppercase tracking-wider">
              Select Faculty Member
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-2">
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] outline-none bg-white text-slate-800 text-sm"
              >
                <option value="">-- Select Faculty --</option>
                {availableFaculty.map(faculty => {
                  const fId = faculty.employeeId || faculty.id || faculty._id;
                  const fName = faculty.fullName || faculty.name;
                  const fDept = faculty.department || 'N/A';
                  return (
                    <option key={fId} value={fId}>
                      {fName} ({fDept})
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleAssign}
                disabled={!selectedFaculty}
                className="px-5 py-2.5 bg-[#00236f] text-white rounded-lg hover:bg-[#00236f]/90 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
              >
                Assign
              </button>
            </div>
          </div>

          {/* Assigned Invigilators List */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
              Assigned Invigilators ({assignedInvigilators.length})
            </h4>
            {assignedInvigilators.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">person_off</span>
                <p className="text-sm">No invigilators assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignedInvigilators.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#00236f] flex items-center justify-center text-white font-bold">
                        {assignment.facultyName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{assignment.facultyName}</p>
                        <p className="text-xs text-slate-500">{assignment.facultyId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(assignment.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-200 flex justify-end bg-slate-50/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-sm shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
