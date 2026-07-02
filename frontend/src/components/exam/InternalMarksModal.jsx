import React, { useState, useEffect } from 'react';
import { 
  listRegistrations,
  listInternalMarks,
  upsertInternalMark,
} from '../../api/examsApi';
import { getUserSession } from '../../auth/sessionController';
import { buildApiUrl } from '../../api/apiBase';

function isClassAssigned(classId, classLabel, assignedClasses) {
  if (!assignedClasses || assignedClasses.length === 0) return false;
  
  const normalizedLabel = classLabel.toLowerCase();
  const normalizedId = classId.toLowerCase();
  
  const deptCodes = {
    'cse': ['computer science', 'computer science & engineering', 'computer science and engineering'],
    'ece': ['electronics', 'electronics & communication', 'electronics and communication'],
    'me': ['mechanical', 'mechanical engineering'],
    'ce': ['civil', 'civil engineering'],
    'it': ['information technology'],
    'eee': ['electrical', 'electrical engineering', 'electrical & electronics', 'electrical and electronics']
  };
  
  return assignedClasses.some(ac => {
    const normalizedAc = ac.trim().toLowerCase();
    if (!normalizedAc) return false;
    
    if (normalizedLabel.includes(normalizedAc) || normalizedId.includes(normalizedAc)) {
      return true;
    }
    
    const parts = normalizedAc.split(/[-_\s]+/);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      if (last.length === 1 && /[a-z]/.test(last)) {
        const studentSec = normalizedId.split('-').pop();
        if (studentSec === last) {
          if (first === 'cs' || first === 'cse') {
            return normalizedId.includes('computer-science') || normalizedId.includes('cse');
          }
          for (const [code, names] of Object.entries(deptCodes)) {
            if (first === code) {
              return names.some(name => normalizedId.includes(name.replace(/\s+/g, '-')));
            }
          }
        }
      }
    }
    
    const matchNum = normalizedAc.match(/\d+/);
    if (matchNum) {
      const num = matchNum[0];
      const yearWords = {
        '1': ['1st', '1', 'first'],
        '2': ['2nd', '2', 'second'],
        '3': ['3rd', '3', 'third'],
        '4': ['4th', '4', 'fourth']
      };
      if (yearWords[num]) {
        return yearWords[num].some(w => normalizedId.includes(w));
      }
    }
    
    return false;
  });
}

function buildClassMeta(student) {
  const department = String(student?.department || 'General')
  const year = String(student?.year || 'Year')
  const section = String(student?.section || 'A')
  const classLabel = `${department} - ${year} - Sec ${section}`
  const classId = `${department}__${year}__${section}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return { classId, classLabel }
}

export default function InternalMarksModal({ exam, onClose, onSave }) {
  const [registrations, setRegistrations] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [maxInternal, setMaxInternal] = useState(20);
  const session = getUserSession();

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const examId = exam._id || exam.id;
        const [regs, existingMarks, studentsRes] = await Promise.all([
          listRegistrations({ examId }),
          listInternalMarks({ examId, entered_by: session?.userId }),
          fetch(buildApiUrl('/students')).then(res => res.json()).catch(() => [])
        ]);
        if (cancelled) return;

        const studentsList = Array.isArray(studentsRes) ? studentsRes : (Array.isArray(studentsRes?.data) ? studentsRes.data : []);
        const studentClassMap = {};
        studentsList.forEach(student => {
          const { classId, classLabel } = buildClassMeta(student);
          studentClassMap[student.id || student.rollNumber] = { classId, classLabel };
        });

        let assignedClasses = [];
        if (session?.role === 'faculty') {
          const facRes = await fetch(buildApiUrl(`/faculty/${session.userId}`));
          if (facRes.ok) {
            const facData = await facRes.json();
            const assigned = facData?.assignedClasses || facData?.classes || [];
            assignedClasses = Array.isArray(assigned) 
              ? assigned 
              : (typeof assigned === 'string' ? assigned.split(',').map(s => s.trim()).filter(Boolean) : []);
          }
        }

        const filteredRegs = regs.filter(reg => {
          if (session?.role === 'faculty') {
            const studentClass = studentClassMap[reg.studentId];
            if (!studentClass) return false;
            return isClassAssigned(studentClass.classId, studentClass.classLabel, assignedClasses);
          }
          return true;
        });

        setRegistrations(filteredRegs);

        const marksObj = {};
        existingMarks.forEach((m) => {
          marksObj[m.studentId] = m.internalMarks;
        });
        setMarksData(marksObj);
      } catch (err) {
        console.error('Failed to load internal marks:', err);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [exam._id, exam.id, session?.userId, session?.role]);

  const handleMarksChange = (studentId, value) => {
    const numValue = parseFloat(value);
    if (value === '' || (numValue >= 0 && numValue <= maxInternal)) {
      setMarksData(prev => ({
        ...prev,
        [studentId]: value === '' ? '' : numValue
      }));
    }
  };

  const handleSave = async () => {
    try {
      const examId = exam._id || exam.id;
      const rows = Object.entries(marksData).filter(([, marks]) => marks !== '' && marks !== undefined);
      await Promise.all(
        rows.map(([studentId, marks]) =>
          upsertInternalMark({
            examId,
            studentId,
            internalMarks: marks,
            maxInternal,
            enteredBy: session?.userId || session?.username || '',
          })
        )
      );
      alert(`Internal marks saved for ${rows.length} students`);
      onSave();
    } catch (err) {
      alert(err?.message || 'Failed to save internal marks');
    }
  };

  const getMarksColor = (marks) => {
    const percentage = (marks / maxInternal) * 100;
    if (percentage >= 80) return 'text-emerald-600';
    if (percentage >= 60) return 'text-[#00236f]';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="bg-[#00236f] text-white px-6 py-4">
          <h2 className="text-xl font-semibold flex items-center">
            <span className="material-symbols-outlined mr-2">assignment</span>
            Internal Marks Entry - {exam.name}
          </h2>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Max Internal Marks */}
          <div className="mb-6 bg-slate-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Maximum Internal Marks
            </label>
            <input
              type="number"
              value={maxInternal}
              onChange={(e) => setMaxInternal(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
              min="1"
              max="50"
              className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <p className="text-sm text-slate-600 mt-2">
              Total Students: {registrations.length} | Marks Entered: {Object.keys(marksData).filter(k => marksData[k] !== '' && marksData[k] !== undefined).length}
            </p>
          </div>

          {/* Marks Entry Grid */}
          <div className="space-y-2">
            <h3 className="font-medium text-slate-700 mb-3">Enter Internal Marks</h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Student ID</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Student Name</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Internal Marks (/{maxInternal})</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => {
                    const marks = marksData[reg.studentId];
                    const percentage = marks !== '' && marks !== undefined ? ((marks / maxInternal) * 100).toFixed(1) : '-';
                    
                    return (
                      <tr key={reg.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm">{reg.studentId}</td>
                        <td className="px-4 py-3 text-sm">{reg.studentName}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={marks === undefined ? '' : marks}
                            onChange={(e) => handleMarksChange(reg.studentId, e.target.value)}
                            min="0"
                            max={maxInternal}
                            step="0.5"
                            placeholder="0"
                            className="w-24 mx-auto px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-green-500"
                          />
                        </td>
                        <td className={`px-4 py-3 text-center font-medium ${marks !== '' && marks !== undefined ? getMarksColor(marks) : 'text-slate-400'}`}>
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#00236f] text-white rounded-lg hover:bg-[#001a54]"
          >
            Save Internal Marks
          </button>
        </div>
      </div>
    </div>
  );
}
