import React, { useState } from 'react';
import { X } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function PerformanceEvaluationModal({ isOpen, onClose, onSuccess, facultyId, facultyName }) {
  const [formData, setFormData] = useState({
    semester: '',
    academic_year: new Date().getFullYear().toString(),
    evaluator_id: '',
    course_content: 0,
    teaching_methodology: 0,
    student_engagement: 0,
    feedback_responsiveness: 0,
    research_output: 0,
    publication_quality: 0,
    research_collaboration: 0,
    meeting_attendance: 0,
    committee_participation: 0,
    documentation: 0,
    student_satisfaction: 0,
    course_effectiveness: 0,
    availability: 0,
    strengths: '',
    areas_for_improvement: '',
    recommendations: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: ['course_content', 'teaching_methodology', 'student_engagement', 'feedback_responsiveness', 'research_output', 'publication_quality', 'research_collaboration', 'meeting_attendance', 'committee_participation', 'documentation', 'student_satisfaction', 'course_effectiveness', 'availability'].includes(name) ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(buildApiUrl(`/faculty/${facultyId}/evaluations`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save evaluation');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const RatingInput = ({ label, name, value }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          name={name}
          value={value}
          onChange={handleChange}
          min="0"
          max="5"
          step="0.5"
          className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="w-12 text-center font-semibold text-green-600">{value.toFixed(1)}/5</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Performance Evaluation</h2>
            <p className="text-sm text-slate-500 mt-1">Evaluate {facultyName}'s performance</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(100vh-350px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form id="evaluationForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Semester</label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 bg-white"
                >
                  <option value="">Select Semester</option>
                  <option value="Fall">Fall</option>
                  <option value="Spring">Spring</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Evaluator ID</label>
                <input
                  type="text"
                  name="evaluator_id"
                  value={formData.evaluator_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500"
                  placeholder="Your ID"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-4">Teaching Quality</h3>
              <div className="space-y-4">
                <RatingInput label="Course Content" name="course_content" value={formData.course_content} />
                <RatingInput label="Teaching Methodology" name="teaching_methodology" value={formData.teaching_methodology} />
                <RatingInput label="Student Engagement" name="student_engagement" value={formData.student_engagement} />
                <RatingInput label="Feedback Responsiveness" name="feedback_responsiveness" value={formData.feedback_responsiveness} />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-4">Research & Publication</h3>
              <div className="space-y-4">
                <RatingInput label="Research Output" name="research_output" value={formData.research_output} />
                <RatingInput label="Publication Quality" name="publication_quality" value={formData.publication_quality} />
                <RatingInput label="Research Collaboration" name="research_collaboration" value={formData.research_collaboration} />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-4">Administrative & Availability</h3>
              <div className="space-y-4">
                <RatingInput label="Meeting Attendance" name="meeting_attendance" value={formData.meeting_attendance} />
                <RatingInput label="Committee Participation" name="committee_participation" value={formData.committee_participation} />
                <RatingInput label="Student Satisfaction" name="student_satisfaction" value={formData.student_satisfaction} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Strengths</label>
              <textarea
                name="strengths"
                value={formData.strengths}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 resize-none"
                placeholder="Highlight key strengths..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Areas for Improvement</label>
              <textarea
                name="areas_for_improvement"
                value={formData.areas_for_improvement}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 resize-none"
                placeholder="Identify areas for growth..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Recommendations</label>
              <textarea
                name="recommendations"
                value={formData.recommendations}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600-500/20 focus:border-green-500 resize-none"
                placeholder="Provide recommendations..."
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="evaluationForm"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Submit Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
}
