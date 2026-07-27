import React, { useState, useEffect } from 'react';
import { Briefcase, Target, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function CareerPathwayTracking({ facultyId }) {
  const [pathway, setPathway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    current_designation: '',
    target_designation: '',
    target_years: 2,
    required_qualifications: [],
    completed_milestones: [],
    pending_milestones: [],
    mentors: []
  });

  useEffect(() => {
    fetchPathway();
  }, [facultyId]);

  const fetchPathway = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/career-pathway`)
      );
      
      if (response.status === 404) {
        // No existing pathway
        setPathway(null);
      } else if (response.ok) {
        const data = await response.json();
        setPathway(data);
      } else {
        throw new Error('Failed to fetch pathway');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePathway = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/career-pathway`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            required_qualifications: formData.required_qualifications.filter(Boolean),
            completed_milestones: formData.completed_milestones.filter(Boolean),
            pending_milestones: formData.pending_milestones.filter(Boolean),
            mentors: formData.mentors.filter(Boolean)
          })
        }
      );

      if (!response.ok) throw new Error('Failed to create pathway');

      setShowAddForm(false);
      fetchPathway();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdatePathway = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/career-pathway/${pathway._id}`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            required_qualifications: formData.required_qualifications.filter(Boolean),
            completed_milestones: formData.completed_milestones.filter(Boolean),
            pending_milestones: formData.pending_milestones.filter(Boolean),
            mentors: formData.mentors.filter(Boolean)
          })
        }
      );

      if (!response.ok) throw new Error('Failed to update pathway');

      setEditMode(false);
      fetchPathway();
    } catch (err) {
      setError(err.message);
    }
  };

  const calculateProgress = () => {
    if (!pathway) return 0;
    const total = (pathway.required_qualifications?.length || 0) + 
                  (pathway.pending_milestones?.length || 0);
    if (total === 0) return 100;
    const completed = pathway.completed_milestones?.length || 0;
    return Math.round((completed / total) * 100);
  };

  if (loading) return <div className="text-center py-8">Loading career pathway...</div>;

  if (!pathway && !showAddForm) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
        <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-400" />
        <p className="text-slate-600 mb-4">No career pathway defined yet</p>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Create Career Pathway
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Existing Pathway Display */}
      {pathway && !editMode && (
        <>
          {/* Career Journey Overview */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900">Career Development Pathway</h3>
              <button
                onClick={() => {
                  setEditMode(true);
                  setFormData(pathway);
                }}
                className="text-green-700 hover:text-green-800 font-semibold text-sm"
              >
                Edit
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <p className="text-sm text-slate-600">Current Position</p>
                <p className="text-lg font-bold text-slate-900">{pathway.current_designation}</p>
              </div>
              
              <ArrowRight className="w-6 h-6 text-green-700 flex-shrink-0" />
              
              <div className="flex-1">
                <p className="text-sm text-slate-600">Target Position</p>
                <p className="text-lg font-bold text-green-700">{pathway.target_designation}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-slate-700">Overall Progress</p>
                <span className="text-sm font-bold text-green-700">{calculateProgress()}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-green-700 transition-all"
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Target: {pathway.target_years} years | Status: {pathway.status}
            </p>
          </div>

          {/* Milestones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Completed Milestones */}
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <CheckCircle2 size={18} />
                Completed Milestones ({pathway.completed_milestones?.length || 0})
              </h4>
              <div className="space-y-2">
                {pathway.completed_milestones && pathway.completed_milestones.length > 0 ? (
                  pathway.completed_milestones.map((milestone, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border-l-3 border-green-600">
                      <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700 line-through">{milestone}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">No milestones completed yet</p>
                )}
              </div>
            </div>

            {/* Pending Milestones */}
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                <Circle size={18} />
                Pending Milestones ({pathway.pending_milestones?.length || 0})
              </h4>
              <div className="space-y-2">
                {pathway.pending_milestones && pathway.pending_milestones.length > 0 ? (
                  pathway.pending_milestones.map((milestone, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border-l-3 border-orange-600">
                      <Circle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700">{milestone}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">All milestones completed!</p>
                )}
              </div>
            </div>
          </div>

          {/* Required Qualifications */}
          {pathway.required_qualifications && pathway.required_qualifications.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-3">Required Qualifications</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {pathway.required_qualifications.map((qual, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-slate-200 text-sm text-slate-700">
                    {qual}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mentors */}
          {pathway.mentors && pathway.mentors.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-3">Assigned Mentors</h4>
              <div className="space-y-2">
                {pathway.mentors.map((mentor, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                    <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {mentor.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-slate-700">{mentor}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Form - Create or Edit */}
      {(showAddForm || editMode) && (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">
            {editMode ? 'Edit Career Pathway' : 'Create Career Pathway'}
          </h3>

          <form onSubmit={editMode ? handleUpdatePathway : handleCreatePathway} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Current Designation</label>
                <input
                  type="text"
                  required
                  value={formData.current_designation}
                  onChange={(e) => setFormData({...formData, current_designation: e.target.value})}
                  placeholder="e.g., Assistant Professor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Target Designation</label>
                <input
                  type="text"
                  required
                  value={formData.target_designation}
                  onChange={(e) => setFormData({...formData, target_designation: e.target.value})}
                  placeholder="e.g., Associate Professor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Target Years</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.target_years}
                  onChange={(e) => setFormData({...formData, target_years: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-green-700 hover:bg-green-800 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {editMode ? 'Update Pathway' : 'Create Pathway'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditMode(false);
                }}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
