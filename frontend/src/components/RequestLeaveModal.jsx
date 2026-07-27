import React, { useState } from 'react';
import { X } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function RequestLeaveModal({ isOpen, onClose, onSuccess, facultyId }) {
  const [formData, setFormData] = useState({
    leave_type: 'Sick',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Ensure start_date is not after end_date
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
        setError('End date cannot be before start date.');
        setLoading(false);
        return;
    }

    try {
      const response = await fetch(buildApiUrl(`/faculty/${facultyId}/leave`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to submit leave request');
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
            <h2 className="text-xl font-bold text-slate-800">Request Leave</h2>
            <p className="text-sm text-slate-500 mt-1">Submit a leave of absence request.</p>
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

          <form id="requestLeaveForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Leave Type</label>
              <select
                name="leave_type" value={formData.leave_type} onChange={handleChange} required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all bg-white"
              >
                <option value="Sick">Sick Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Academic">Academic Leave</option>
                <option value="Earned">Earned Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Start Date</label>
                <input
                  type="date" name="start_date" value={formData.start_date} onChange={handleChange} required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700">End Date</label>
                 <input
                  type="date" name="end_date" value={formData.end_date} onChange={handleChange} required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                 />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">Reason</label>
               <textarea
                name="reason" value={formData.reason} onChange={handleChange} rows="3" required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                placeholder="State the reason for your leave..."
               ></textarea>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" form="requestLeaveForm" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
