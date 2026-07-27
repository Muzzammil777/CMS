import React, { useState } from 'react';
import { X } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function AssignCourseModal({ isOpen, onClose, onSuccess, facultyId }) {
  const [formData, setFormData] = useState({
    courseId: '',
    course_name: '',
    semester: '',
    academic_year: '2025-2026',
    credits: 3
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'credits' ? (value === '' ? '' : parseInt(value, 10) || 0) : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(buildApiUrl(`/faculty/${facultyId}/courses`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to assign course');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Assign Course</h2>
            <p className="text-sm text-slate-500 mt-1">Map faculty to a specific subject</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form id="assignCourseForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Course Code</label>
              <input
                type="text" name="courseId" value={formData.courseId} onChange={handleChange} required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                placeholder="e.g. CS101"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Course Name</label>
              <input
                type="text" name="course_name" value={formData.course_name} onChange={handleChange} required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                placeholder="e.g. Introduction to Programming"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Semester</label>
                <select
                  name="semester" value={formData.semester} onChange={handleChange} required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all bg-white"
                >
                  <option value="">Select...</option>
                  <option value="Fall">Fall</option>
                  <option value="Spring">Spring</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Credits</label>
                <input
                  type="number" name="credits" min="0" max="10" value={formData.credits} onChange={handleChange} required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Academic Year</label>
              <input
                type="text" name="academic_year" value={formData.academic_year} onChange={handleChange} required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" form="assignCourseForm" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-50">
            {loading ? 'Assigning...' : 'Assign Course'}
          </button>
        </div>
      </div>
    </div>
  );
}
