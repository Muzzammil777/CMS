import React, { useState, useEffect } from 'react';
import { getSchedulePreview, submitBulkSchedule } from '../../api/examsApi';
import { getUserSession } from '../../auth/sessionController';
import { settingsApi } from '../../api/settingsApi';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export default function TimetableScheduleWizard({ isOpen, onClose, onSave }) {
  const session = getUserSession();
  const [wizardStep, setWizardStep] = useState(1);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);

  // Step 1 parameters
  const [dept, setDept] = useState('Computer Science');

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await settingsApi.getDepartments();
        setDepartments(data || []);
        if (data && data.length > 0) {
          setDept(data[0].name);
        }
      } catch (err) {
        console.error('Error loading departments in TimetableScheduleWizard:', err);
      }
    };
    fetchDepts();
  }, []);
  const [year, setYear] = useState('3rd Year');
  const [semester, setSemester] = useState('6');
  const [examType, setExamType] = useState('Mid-Sem');
  const [duration, setDuration] = useState('120');
  const [maxMarks, setMaxMarks] = useState('100');

  // Step 2 list of exams
  const [exams, setExams] = useState([
    { code: '', name: '', date: '', time: '' }
  ]);

  // Step 3 preview assignments list
  const [previewExams, setPreviewExams] = useState([]);

  if (!isOpen) return null;

  const handleAddExamRow = () => {
    setExams([...exams, { code: '', name: '', date: '', time: '' }]);
  };

  const handleRemoveExamRow = (index) => {
    if (exams.length > 1) {
      setExams(exams.filter((_, i) => i !== index));
    }
  };

  const handleExamChange = (index, field, value) => {
    const updated = [...exams];
    updated[index][field] = value;
    setExams(updated);
  };

  const handleNext = async () => {
    if (wizardStep === 1) {
      if (!dept.trim() || !year.trim() || !semester.trim() || !duration.trim() || !maxMarks.trim()) {
        alert('Please fill out all batch information fields.');
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      const incomplete = exams.filter(e => !e.code.trim() || !e.name.trim() || !e.date.trim() || !e.time.trim());
      if (incomplete.length > 0) {
        alert('Please fill in the Subject Code, Name, Date, and Time for all exams.');
        return;
      }

      // Fetch automated assignments preview from backend
      setLoadingPreview(true);
      setWizardStep(3);
      try {
        const payload = {
          dept,
          year,
          semester,
          type: examType,
          duration: parseInt(duration),
          maxMarks: parseInt(maxMarks),
          exams
        };
        const result = await getSchedulePreview(payload);
        setPreviewExams(result);
      } catch (err) {
        alert(err?.message || 'Failed to fetch allocations preview');
        setWizardStep(2); // Go back if failed
      } finally {
        setLoadingPreview(false);
      }
    }
  };

  const handleBack = () => {
    setWizardStep(prev => Math.max(1, prev - 1));
  };

  const handleScheduleExams = async () => {
    setSubmitting(true);
    try {
      const payload = {
        dept,
        year,
        semester,
        type: examType,
        duration: parseInt(duration),
        maxMarks: parseInt(maxMarks),
        exams: previewExams
      };
      await submitBulkSchedule(payload);
      alert('Exams scheduled successfully and notifications sent to enrolled students!');
      resetWizard();
      onSave();
      onClose();
    } catch (err) {
      alert(err?.message || 'Failed to schedule exams');
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setDept('Computer Science');
    setYear('3rd Year');
    setSemester('6');
    setExamType('Mid-Sem');
    setDuration('120');
    setMaxMarks('100');
    setExams([{ code: '', name: '', date: '', time: '' }]);
    setPreviewExams([]);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const inputClasses = "w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6d28d9]/10 focus:border-[#6d28d9] outline-none transition-all text-sm bg-white text-slate-800";
  const labelClasses = "block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transform transition-all duration-300">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Bulk Exam Scheduler</h3>
            <p className="text-[10px] sm:text-xs text-slate-500">Create multiple conflict-free exams with auto-allocated halls and invigilators.</p>
          </div>
          <button 
            type="button" 
            onClick={handleClose} 
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-4 sm:px-8 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white select-none flex-shrink-0">
          {['Batch Info', 'Exam Slots', 'Resource Allocation'].map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = wizardStep === stepNum;
            const isPassed = wizardStep > stepNum;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 relative">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors z-10 ${
                  isActive || isPassed ? 'bg-[#6d28d9] text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isPassed ? '✓' : stepNum}
                </div>
                <div className={`text-[9px] sm:text-xs mt-1 text-center font-semibold transition-colors ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                  {label}
                </div>
                {idx < 2 && (
                  <div className={`absolute top-3.5 sm:top-4 left-[50%] w-full h-[2px] z-0 transition-colors ${isPassed ? 'bg-[#6d28d9]' : 'bg-slate-100'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/20">
          {/* STEP 1: Batch Information */}
          {wizardStep === 1 && (
            <div className="space-y-6">
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 flex gap-3 items-start">
                <span className="material-symbols-outlined text-emerald-600 mt-0.5">info</span>
                <div className="text-xs text-emerald-800 leading-relaxed">
                  <p className="font-bold mb-0.5">Automated Assignment Settings</p>
                  <p>In this step, specify the target class details. The system will use all active faculties and classrooms in the college to assign conflict-free resources.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className={labelClasses}>Department</label>
                  <select value={dept} onChange={(e) => setDept(e.target.value)} className={inputClasses}>
                    {departments.map(d => (
                      <option key={d.code} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelClasses}>Study Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)} className={inputClasses}>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelClasses}>Semester</label>
                  <select value={semester} onChange={(e) => setSemester(e.target.value)} className={inputClasses}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={String(s)}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelClasses}>Exam Type</label>
                  <select value={examType} onChange={(e) => setExamType(e.target.value)} className={inputClasses}>
                    <option value="Mid-Sem">Mid-Semester</option>
                    <option value="End-Sem">End-Semester</option>
                    <option value="Practical">Practical</option>
                    <option value="Internal">Internal Assessment</option>
                    <option value="Quiz">Quiz</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelClasses}>Duration (minutes)</label>
                  <input 
                    type="number" 
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    placeholder="e.g. 120" 
                    className={inputClasses}
                    min="1"
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelClasses}>Maximum Marks</label>
                  <input 
                    type="number" 
                    value={maxMarks} 
                    onChange={(e) => setMaxMarks(e.target.value)} 
                    placeholder="e.g. 100" 
                    className={inputClasses}
                    min="1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Exam Slots */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-700">List of Exams ({exams.length})</span>
                <button
                  type="button"
                  onClick={handleAddExamRow}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#6d28d9]/10 hover:bg-[#6d28d9]/20 text-[#6d28d9] rounded-lg text-xs font-semibold transition-all"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                  Add Exam
                </button>
              </div>

              <div className="space-y-3">
                {exams.map((exam, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3 relative">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Exam Slot #{idx + 1}</span>
                      {exams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExamRow(idx)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Subject Code</label>
                        <input
                          type="text"
                          value={exam.code}
                          onChange={(e) => handleExamChange(idx, 'code', e.target.value)}
                          placeholder="e.g. CS301"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#6d28d9]/10 focus:border-[#6d28d9] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Subject Name</label>
                        <input
                          type="text"
                          value={exam.name}
                          onChange={(e) => handleExamChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Data Structures"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#6d28d9]/10 focus:border-[#6d28d9] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Date</label>
                        <input
                          type="date"
                          value={exam.date}
                          onChange={(e) => handleExamChange(idx, 'date', e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#6d28d9]/10 focus:border-[#6d28d9] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Start Time</label>
                        <input
                          type="time"
                          value={exam.time}
                          onChange={(e) => handleExamChange(idx, 'time', e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#6d28d9]/10 focus:border-[#6d28d9] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Preview Assignments */}
          {wizardStep === 3 && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase block mb-0.5">Department</span>
                  <span className="font-bold text-slate-700">{dept}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block mb-0.5">Semester & Year</span>
                  <span className="font-bold text-slate-700">{year} (Sem {semester})</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block mb-0.5">Type & Duration</span>
                  <span className="font-bold text-slate-700">{examType} ({duration} mins)</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block mb-0.5">Max Marks</span>
                  <span className="font-bold text-slate-700">{maxMarks} Marks</span>
                </div>
              </div>

              {loadingPreview ? (
                <div className="text-center py-16 text-slate-500">
                  <span className="material-symbols-outlined text-4xl animate-spin text-[#6d28d9] mb-2">sync</span>
                  <p className="text-sm font-semibold">Running conflict checks and auto-assigning classrooms & invigilators...</p>
                </div>
              ) : (
                <>
                  {/* Desktop Preview Table */}
                  <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                          <th className="px-5 py-3.5">Subject</th>
                          <th className="px-5 py-3.5">Date & Time</th>
                          <th className="px-5 py-3.5">Auto-Assigned Room</th>
                          <th className="px-5 py-3.5">Auto-Assigned Invigilator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewExams.map((exam, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/55 transition-colors">
                            <td className="px-5 py-4">
                              <span className="text-[10px] font-bold text-[#6d28d9] block uppercase">{exam.code}</span>
                              <span className="font-semibold text-slate-700 text-sm">{exam.name}</span>
                            </td>
                            <td className="px-5 py-4 text-slate-600 font-medium">
                              <p>{exam.date}</p>
                              <p className="text-slate-400 font-normal">{exam.time}</p>
                            </td>
                            <td className="px-5 py-4 font-semibold text-slate-700">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#6d28d9]/5 text-[#6d28d9] border border-[#6d28d9]/10">
                                <span className="material-symbols-outlined text-sm">room</span>
                                {exam.room}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                                  {exam.invigilatorName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'F'}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-700">{exam.invigilatorName}</p>
                                  <p className="text-[10px] text-slate-400">ID: {exam.invigilatorEmployeeId}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Preview Card List */}
                  <div className="block sm:hidden space-y-3">
                    {previewExams.map((exam, idx) => (
                      <div key={idx} className="p-4 border border-slate-200 bg-white rounded-xl shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-[#6d28d9] block uppercase">{exam.code}</span>
                            <span className="font-semibold text-slate-800 text-sm">{exam.name}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2.5">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Date & Time</span>
                            <span className="text-slate-700 font-semibold">{exam.date} @ {exam.time}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Auto-Assigned Room</span>
                            <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-semibold text-[#6d28d9]">
                              <span className="material-symbols-outlined text-xs">room</span>
                              {exam.room}
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-slate-100 pt-2.5 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                            {exam.invigilatorName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'F'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{exam.invigilatorName}</p>
                            <p className="text-[9px] text-slate-400">ID: {exam.invigilatorEmployeeId}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
          <button
            type="button"
            onClick={handleBack}
            disabled={wizardStep === 1 || submitting}
            className={`px-4 py-2.5 border rounded-lg text-sm font-semibold transition-all shadow-sm ${
              wizardStep === 1
                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95'
            }`}
          >
            Back
          </button>

          <div className="flex gap-2">
            {wizardStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 bg-[#6d28d9] hover:bg-[#4c1d95] text-white rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-sm"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleScheduleExams}
                disabled={submitting || loadingPreview}
                className="px-5 py-2.5 bg-[#6d28d9] hover:bg-[#4c1d95] text-white rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {submitting ? 'Scheduling...' : 'Schedule Exams'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
