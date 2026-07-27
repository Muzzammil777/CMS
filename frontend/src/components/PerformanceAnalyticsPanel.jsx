import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Users, BookOpen, Zap, Target } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function PerformanceAnalyticsPanel({ facultyId, academicYear }) {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() =>{
    fetchMetrics();
    fetchHistory();
  }, [facultyId, academicYear]);

  const fetchMetrics = async () =>{
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/performance-metrics?academic_year=${academicYear}`)
      );

      if (response.status === 404) {
        // Create default metrics
        setMetrics(null);
      } else if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        throw new Error('Failed to fetch metrics');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () =>{
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/performance-metrics/history`)
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const getPerformanceColor = (category) =>{
    switch (category) {
      case 'Excellent':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
      case 'Good':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
      case 'Average':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
      default:
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
    }
  };

  const getScoreBadge = (score) =>{
    if (score >= 4.5) return 'bg-green-600 text-white';
    if (score >= 3.5) return 'bg-green-600 text-white';
    if (score >= 2.5) return 'bg-yellow-600 text-white';
    return 'bg-red-600 text-white';
  };

  const MetricCard = ({ icon: Icon, title, value, unit, color }) =>(
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200"><div className="flex items-start gap-3"><Icon className={`w-6 h-6 ${color}`} /><div><p className="text-xs text-slate-600 mb-1">{title}</p><p className="text-2xl font-bold text-slate-900">{value}{unit}
          </p></div></div></div>);

  if (loading) return <div className="text-center py-8">Loading performance analytics...</div>;

  return (
    <div className="space-y-6">{error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">{error}
        </div>)}

      {metrics ? (
        <>{/* Overall Performance Score */}
          <div className={`p-6 rounded-xl border-2 ${getPerformanceColor(metrics.performance_category).bg} ${getPerformanceColor(metrics.performance_category).border}`}><div className="flex items-center justify-between mb-4"><div><h3 className="text-lg font-bold text-slate-900">Overall Performance</h3><p className="text-sm text-slate-600">Academic Year: {academicYear}</p></div><Award className="w-8 h-8 text-slate-400" /></div><div className="flex items-center gap-6"><div className="flex-1"><div className="flex items-baseline gap-2"><span className={`text-5xl font-bold ${getScoreBadge(metrics.overall_score)}`}>{metrics.overall_score.toFixed(1)}
                  </span><span className="text-slate-600 text-lg">/5.0</span></div><div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
                  getPerformanceColor(metrics.performance_category).text
                }`}>{metrics.performance_category}
                </div></div>{/* Performance Gauge */}
              <div className="flex-1"><div className="flex justify-between text-xs text-slate-600 mb-2"><span>0</span><span>2.5</span><span>5</span></div><div className="w-full bg-slate-200 rounded-full h-3"><div
                    className={`h-full rounded-full ${
                      metrics.overall_score >= 4.5
                        ? 'bg-green-600'
                        : metrics.overall_score >= 3.5
                        ? 'bg-green-600'
                        : metrics.overall_score >= 2.5
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${(metrics.overall_score / 5) * 100}%` }}
                  /></div></div></div></div>{/* Performance Components */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><MetricCard
              icon={BookOpen}
              title="Student Satisfaction"
              value={metrics.student_satisfaction.toFixed(1)}
              unit="/5"
              color="text-green-600"
            /><MetricCard
              icon={TrendingUp}
              title="Course Completion Rate"
              value={Math.round(metrics.course_completion_rate)}
              unit="%"
              color="text-green-600"
            /><MetricCard
              icon={Users}
              title="Student Pass Rate"
              value={Math.round(metrics.student_pass_rate)}
              unit="%"
              color="text-purple-600"
            /></div>{/* Research Metrics */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-green-600" />Research Performance
            </h4><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><MetricCard
                icon={BookOpen}
                title="Publications"
                value={metrics.publications_count}
                unit=""
                color="text-green-600"
              /><MetricCard
                icon={Zap}
                title="Citations"
                value={metrics.citations_count}
                unit=""
                color="text-orange-600"
              /><MetricCard
                icon={Target}
                title="H-Index"
                value={metrics.h_index.toFixed(1)}
                unit=""
                color="text-green-600"
              /><MetricCard
                icon={Award}
                title="Grant Value"
                value={(metrics.research_grant_value / 100000).toFixed(1)}
                unit="L"
                color="text-purple-600"
              /></div></div>{/* Administrative Metrics */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Users size={18} className="text-green-600" />Administrative Contributions
            </h4><div className="grid grid-cols-2 md:grid-cols-3 gap-4"><MetricCard
                icon={Award}
                title="Committee Participation"
                value={metrics.committee_participation}
                unit=""
                color="text-green-600"
              /><MetricCard
                icon={Users}
                title="Mentoring Effectiveness"
                value={metrics.mentoring_effectiveness.toFixed(1)}
                unit="/5"
                color="text-green-600"
              /></div></div>{/* Performance Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200"><h4 className="font-semibold text-green-900 mb-3">Teaching (35%)</h4><p className="text-3xl font-bold text-green-600">{(metrics.student_satisfaction).toFixed(1)}/5
              </p><p className="text-xs text-green-700 mt-2">Based on student satisfaction and completion rates
              </p></div><div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200"><h4 className="font-semibold text-green-900 mb-3">Research (35%)</h4><p className="text-3xl font-bold text-green-600">{Math.min((metrics.h_index * 0.5 + Math.min(metrics.citations_count / 50, 5)) / 2, 5).toFixed(1)}/5
              </p><p className="text-xs text-green-700 mt-2">Based on publications, citations, and funding
              </p></div><div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200"><h4 className="font-semibold text-purple-900 mb-3">Administration (30%)</h4><p className="text-3xl font-bold text-purple-600">{((metrics.committee_participation * 0.5 + metrics.mentoring_effectiveness) / 2).toFixed(1)}/5
              </p><p className="text-xs text-purple-700 mt-2">Based on committee work and mentoring
              </p></div></div>{/* Performance Trend */}
          {history.length >1 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-semibold text-slate-900 mb-4">Performance Trend</h4><div className="space-y-3">{history.map((item, idx) =>(
                  <div key={idx} className="flex items-center gap-3"><span className="text-sm font-semibold text-slate-600 w-20">{item.academic_year}
                    </span><div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden"><div
                        className={`h-full ${
                          item.overall_score >= 4.5
                            ? 'bg-green-600'
                            : item.overall_score >= 3.5
                            ? 'bg-green-600'
                            : item.overall_score >= 2.5
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${(item.overall_score / 5) * 100}%` }}
                      /></div><span className="text-sm font-bold text-slate-900 w-12 text-right">{item.overall_score.toFixed(1)}
                    </span></div>))}
              </div></div>)}
        </>) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300"><Target className="w-12 h-12 mx-auto mb-3 text-slate-400" /><p className="text-slate-600">No performance metrics recorded for this year</p></div>)}

      {/* Recommendations */}
      {metrics && (
        <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded"><h4 className="font-semibold text-green-900 mb-2">Recommendations</h4><ul className="text-sm text-green-800 space-y-1">{metrics.performance_category === 'Excellent' && (
              <><li>• Continue your excellent work</li><li>• Consider mentoring junior faculty</li><li>• Explore leadership roles in committees</li></>)}
            {metrics.performance_category === 'Good' && (
              <><li>• Enhance research output through collaborations</li><li>• Focus on increasing citation impact</li><li>• Explore new research areas</li></>)}
            {metrics.performance_category === 'Average' && (
              <><li>• Develop an action plan to improve teaching effectiveness</li><li>• Consider professional development activities</li><li>• Seek mentoring from senior faculty</li></>)}
            {metrics.performance_category === 'Needs Improvement' && (
              <><li>• Schedule meeting with department head</li><li>• Develop comprehensive improvement plan</li><li>• Enroll in faculty development programs</li></>)}
          </ul></div>)}
    </div>);
}
