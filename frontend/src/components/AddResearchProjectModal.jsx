import React, { useState } from 'react';
import { X } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function AddResearchProjectModal({ isOpen, onClose, onSuccess, leadFacultyId }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    collaboratorIds: '',
    fundingAmount: '',
    fundingSource: '',
    status: 'Ongoing',
    start_date: '',
    end_date: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const submitData = {
      title: formData.title,
      description: formData.description,
      leadFacultyId,
      collaboratorIds: formData.collaboratorIds.split(',').map(id => id.trim()).filter(id => id),
      fundingAmount: formData.fundingAmount ? parseFloat(formData.fundingAmount) : null,
      fundingSource: formData.fundingSource,
      status: formData.status,
      start_date: formData.start_date,
      end_date: formData.end_date
    };
    
    try {
      const response = await fetch(buildApiUrl('/faculty/research'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to add research project');
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add Research Project</h2>
            <p className="text-sm text-slate-500 mt-1">Log a new collaborative research effort or grant</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form id="researchProjectForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Project Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. AI-driven Personalized Learning"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="Brief summary of the research goals..."
                ></textarea>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Collaborator IDs (Comma-separated)</label>
                <input
                  type="text"
                  name="collaboratorIds"
                  value={formData.collaboratorIds}
                  onChange={handleChange}
                  placeholder="e.g. FAC-1001, FAC-1002"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Funding Amount ($)</label>
                <input
                  type="number"
                  name="fundingAmount"
                  value={formData.fundingAmount}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="e.g. 50000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Funding Source</label>
                <input
                  type="text"
                  name="fundingSource"
                  value={formData.fundingSource}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="e.g. NSF Grant"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all bg-white"
                >
                  <option value="Proposed">Proposed</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="OnHold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="researchProjectForm"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-green-700 rounded-xl hover:bg-green-800 active:scale-95 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Add Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
