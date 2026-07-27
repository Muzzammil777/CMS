import React, { useState } from 'react';
import { X } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function SubmitPeerReviewModal({ isOpen, onClose, onSuccess, revieweeId }) {
  const [formData, setFormData] = useState({
    reviewerId: '', // To be filled by logged-in user or manually for now
    rating: 0,
    feedback: '',
    strengths: '',
    areas_for_improvement: '',
    status: 'Submitted'
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
    
    // In a real app, reviewerId would be from auth context.
    const submitData = {
      ...formData,
      revieweeId,
      rating: parseFloat(formData.rating)
    };
    
    try {
      const response = await fetch(buildApiUrl(`/faculty/${revieweeId}/peer-review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to submit review');
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
            <h2 className="text-xl font-bold text-slate-800">Submit Peer Review</h2>
            <p className="text-sm text-slate-500 mt-1">Provide 360-degree feedback for this faculty member</p>
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

          <form id="peerReviewForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Your Faculty ID (Reviewer)</label>
                <input
                  type="text"
                  name="reviewerId"
                  value={formData.reviewerId}
                  onChange={handleChange}
                  required
                  placeholder="e.g. FAC-1234"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Overall Rating (1 to 5)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">General Feedback</label>
                <textarea
                  name="feedback"
                  value={formData.feedback}
                  onChange={handleChange}
                  required
                  rows="3"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                  placeholder="Provide overall constructive feedback..."
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Strengths</label>
                <textarea
                  name="strengths"
                  value={formData.strengths}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                  placeholder="What does this faculty member do well?"
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Areas for Improvement</label>
                <textarea
                  name="areas_for_improvement"
                  value={formData.areas_for_improvement}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 transition-all"
                  placeholder="Where can this faculty member improve?"
                ></textarea>
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
            form="peerReviewForm"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
