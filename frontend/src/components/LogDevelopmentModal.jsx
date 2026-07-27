import React, { useState } from 'react';
import { X } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function LogDevelopmentModal({ isOpen, onClose, onSuccess, facultyId }) {
  const [formData, setFormData] = useState({
    activity_type: 'Training',
    title: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    status: 'Completed',
    credits_earned: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'credits_earned' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(buildApiUrl(`/faculty/${facultyId}/development`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to log activity');
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
            <h2 className="text-xl font-bold text-slate-800">Log Development Activity</h2>
            <p className="text-sm text-slate-500 mt-1">Record a training, conference, or workshop.</p>
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

          <form id="logDevForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Activity Type</label>
              <select
                name="activity_type" value={formData.activity_type} onChange={handleChange} required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all bg-white"
              >
                <option value="Training">Training</option>
                <option value="Conference">Conference</option>
                <option value="Workshop">Workshop</option>
                <option value="Certification">Certification</option>
                <option value="Mentoring">Mentoring</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Title / Name</label>
              <input
                type="text" name="title" value={formData.title} onChange={handleChange} required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                placeholder="e.g. AI in Education Summit"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Date</label>
                <input
                  type="date" name="date" value={formData.date} onChange={handleChange} required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700">Credits Earned</label>
                 <input
                  type="number" step="0.5" name="credits_earned" value={formData.credits_earned} onChange={handleChange}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                 />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700">Location</label>
                 <input
                  type="text" name="location" value={formData.location} onChange={handleChange}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                  placeholder="e.g. Virtual OR New York, NY"
                 />
              </div>
              
              <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700">Status</label>
                 <select
                  name="status" value={formData.status} onChange={handleChange}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all bg-white"
                 >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                 </select>
              </div>
            </div>
            
            <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">Description / Notes</label>
               <textarea
                name="description" value={formData.description} onChange={handleChange} rows="3"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                placeholder="Brief summary..."
               ></textarea>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" form="logDevForm" disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
