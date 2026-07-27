import React, { useState, useEffect } from 'react';
import { AlertTriangle, Zap, TrendingUp } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function WorkloadDashboard({ facultyId, semester, academicYear }) {
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() =>{
    fetchWorkload();
  }, [facultyId, semester, academicYear]);

  const fetchWorkload = async () =>{
    setLoading(true);
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/workload?semester=${semester}&academic_year=${academicYear}`)
      );
      
      if (!response.ok) {
        // Create default workload if not found
        await createDefaultWorkload();
        return;
      }
      
      const data = await response.json();
      setWorkload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultWorkload = async () =>{
    try {
      const defaultData = {
        semester,
        academic_year: academicYear,
        total_courses: 0,
        total_credit_hours: 0,
        total_student_count: 0,
        lab_hours: 0,
        active_research_projects: 0,
        research_hours: 0,
        committee_roles: 0,
        mentoring_students: 0
      };

      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/workload`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultData)
        }
      );

      if (response.ok) {
        fetchWorkload();
      }
    } catch (err) {
      setError('Failed to create workload record');
    }
  };

  const getWorkloadColor = (percentage) =>{
    if (percentage >90) return 'text-red-600';
    if (percentage >70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getWorkloadBgColor = (percentage) =>{
    if (percentage >90) return 'bg-red-50';
    if (percentage >70) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  if (loading) return <div className="text-center py-8">Loading workload data...</div>;
  if (error) return <div className="text-red-600 text-center py-8">{error}</div>;
  if (!workload) return <div className="text-center py-8">No workload data available</div>;

  return (
    <div className="space-y-6">{/* Workload Overview */}
      <div className={`p-6 rounded-xl border-2 ${getWorkloadBgColor(workload.workload_percentage)}`}><div className="flex items-center justify-between mb-4"><div><h3 className="text-lg font-bold text-slate-900">Current Workload</h3><p className="text-sm text-slate-600">Semester: {workload.semester} {workload.academic_year}</p></div>{workload.status === 'Overloaded' && (
            <AlertTriangle className="w-8 h-8 text-red-600" />)}
        </div><div className="flex items-center gap-4"><div className="flex-1"><div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden"><div
                className={`h-full transition-all ${
                  workload.workload_percentage >90
                    ? 'bg-red-600'
                    : workload.workload_percentage >70
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(workload.workload_percentage, 100)}%` }}
              /></div><div className="flex justify-between mt-2 text-xs text-slate-600"><span>0%</span><span>50%</span><span>100%</span></div></div><div className="text-center"><div className={`text-4xl font-bold ${getWorkloadColor(workload.workload_percentage)}`}>{Math.round(workload.workload_percentage)}%
            </div><p className="text-xs text-slate-600 mt-1">{workload.status}</p></div></div></div>{/* Workload Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Zap size={18} className="text-green-600" />Teaching Load
          </h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-600">Courses:</span><span className="font-semibold">{workload.total_courses}</span></div><div className="flex justify-between"><span className="text-slate-600">Credit Hours:</span><span className="font-semibold">{workload.total_credit_hours}</span></div><div className="flex justify-between"><span className="text-slate-600">Students:</span><span className="font-semibold">{workload.total_student_count}</span></div><div className="flex justify-between"><span className="text-slate-600">Lab Hours:</span><span className="font-semibold">{workload.lab_hours}</span></div></div></div><div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-green-600" />Research & Admin Load
          </h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-600">Research Projects:</span><span className="font-semibold">{workload.active_research_projects}</span></div><div className="flex justify-between"><span className="text-slate-600">Research Hours:</span><span className="font-semibold">{workload.research_hours}</span></div><div className="flex justify-between"><span className="text-slate-600">Committee Roles:</span><span className="font-semibold">{workload.committee_roles}</span></div><div className="flex justify-between"><span className="text-slate-600">Mentoring:</span><span className="font-semibold">{workload.mentoring_students} students</span></div></div></div></div>{/* Recommendations */}
      {workload.status === 'Overloaded' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4"><h4 className="font-semibold text-red-900 mb-2">Workload Alert</h4><p className="text-sm text-red-800">Your current workload exceeds the recommended limit. Please contact your department head to discuss workload distribution.
          </p></div>)}

      {workload.status === 'Underloaded' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4"><h4 className="font-semibold text-green-900 mb-2">Workload Opportunity</h4><p className="text-sm text-green-800">Your workload is below the recommended level. Consider taking up additional courses, research projects, or committee roles.
          </p></div>)}
    </div>);
}
