import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Award, TrendingUp } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function ProfessionalDevelopmentPanel({ facultyId }) {
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [formData, setFormData] = useState({
    activity_type: 'Conference',
    title: '',
    description: '',
    organization: '',
    start_date: '',
    end_date: '',
    hours: 0,
    budget_allocated: 0,
    budget_spent: 0
  });

  const activityTypes = ['Conference', 'Workshop', 'Online Course', 'Certification', 'Seminar'];

  useEffect(() => {
    fetchData();
  }, [facultyId, selectedFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedFilter ? `?activity_type=${selectedFilter}` : '';
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/professional-development${params}`)
      );
      
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      setActivities(data);
      await fetchSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/professional-development/summary?academic_year=2024`)
      );
      
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/professional-development`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            start_date: new Date(formData.start_date).toISOString(),
            end_date: new Date(formData.end_date).toISOString(),
            hours: parseFloat(formData.hours),
            budget_allocated: parseFloat(formData.budget_allocated),
            budget_spent: parseFloat(formData.budget_spent)
          })
        }
      );

      if (!response.ok) throw new Error('Failed to add activity');

      setShowAddForm(false);
      setFormData({
        activity_type: 'Conference',
        title: '',
        description: '',
        organization: '',
        start_date: '',
        end_date: '',
        hours: 0,
        budget_allocated: 0,
        budget_spent: 0
      });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;

    try {
      // Note: This assumes a DELETE endpoint exists
      // If not, you'll need to implement it in the backend
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/professional-development/${activityId}`),
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete activity');
      
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center py-8">Loading professional development data...</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-xs text-slate-600">Total Activities</p>
            <p className="text-2xl font-bold text-green-600">{summary.total_activities}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <p className="text-xs text-slate-600">Conferences</p>
            <p className="text-2xl font-bold text-purple-600">{summary.conferences_attended}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-xs text-slate-600">Workshops</p>
            <p className="text-2xl font-bold text-green-600">{summary.workshops_attended}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-xs text-slate-600">Certifications</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.certifications_earned}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <p className="text-xs text-slate-600">Total Hours</p>
            <p className="text-2xl font-bold text-orange-600">{Math.round(summary.total_hours)}</p>
          </div>
        </div>
      )}

      {/* Add Activity Button and Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          Add Activity
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedFilter(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedFilter === null
                ? 'bg-slate-900 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            All
          </button>
          {activityTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedFilter(type)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedFilter === type
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">Add Professional Development Activity</h3>
          
          <form onSubmit={handleAddActivity} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Activity Type</label>
                <select
                  value={formData.activity_type}
                  onChange={(e) => setFormData({...formData, activity_type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                >
                  {activityTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Activity title"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Organization</label>
                <input
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({...formData, organization: e.target.value})}
                  placeholder="Organizing institution"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.hours}
                  onChange={(e) => setFormData({...formData, hours: e.target.value})}
                  placeholder="Duration in hours"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Budget Allocated (₹)</label>
                <input
                  type="number"
                  step="100"
                  value={formData.budget_allocated}
                  onChange={(e) => setFormData({...formData, budget_allocated: e.target.value})}
                  placeholder="Budget allocated"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Budget Spent (₹)</label>
                <input
                  type="number"
                  step="100"
                  value={formData.budget_spent}
                  onChange={(e) => setFormData({...formData, budget_spent: e.target.value})}
                  placeholder="Budget spent"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Activity details"
                rows="3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Save Activity
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Activities List */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No activities recorded yet</p>
          </div>
        ) : (
          activities.map(activity => (
            <div key={activity._id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <Award className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900">{activity.title}</h4>
                    <p className="text-sm text-slate-600">{activity.organization}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {activity.activity_type}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                        {activity.hours} hours
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteActivity(activity._id)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-2">{activity.description}</p>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Duration</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(activity.start_date).toLocaleDateString()} - {new Date(activity.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Budget</p>
                  <p className="font-semibold text-slate-900">
                    ₹{activity.budget_spent} / ₹{activity.budget_allocated}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <p className={`font-semibold ${
                    activity.status === 'Completed' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {activity.status}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
