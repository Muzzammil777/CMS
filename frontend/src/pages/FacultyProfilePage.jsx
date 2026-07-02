import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AddEditFacultyModal from '../components/AddEditFacultyModal';
import RequestLeaveModal from '../components/RequestLeaveModal';
import PerformanceEvaluationModal from '../components/PerformanceEvaluationModal';
import PayrollIntegrationPanel from '../components/PayrollIntegrationPanel';
import CareerPathwayTracking from '../components/CareerPathwayTracking';
import { TableSkeleton } from '../components/common';
import { 
  ArrowLeft, User, BarChart2,
  Mail, Phone, MapPin, Briefcase, Calendar, Target, DollarSign
} from 'lucide-react';
import { API_BASE } from '../api/apiBase';
import '../styles.css';

const API_BASE_URL = API_BASE;
const profileTabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'performance', label: 'Performance', icon: BarChart2 },
  { id: 'payroll', label: 'Invoice', icon: DollarSign },
  { id: 'career', label: 'Career Path', icon: Target },
  { id: 'leave', label: 'Leave & Attendance', icon: Calendar }
];

export default function FacultyProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);

  useEffect(() => {
    fetchFacultyDetails();
  }, [id]);

  const fetchFacultyDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/faculty/${id}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Faculty not found');
        throw new Error('Failed to fetch faculty details');
      }
      const data = await response.json();
      setFaculty(data);
      setError(null);
    } catch (error) {
      console.error(error);
      setFaculty(null);
      setError(error.message || 'Failed to fetch faculty details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Loading Faculty Profile">
        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
          <div className="w-24 h-24 bg-slate-100 rounded-xl mb-6" />
          <div className="w-48 h-4 bg-slate-100 rounded mb-2" />
          <div className="w-32 h-3 bg-slate-50 rounded" />
        </div>
      </Layout>
    );
  }

  if (error || !faculty) {
    return (
      <Layout title="Faculty Not Found">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">{error === 'Faculty not found' ? 'person_off' : 'cloud_off'}</span>
          <h2 className="text-xl font-bold text-slate-700 mb-2">{error === 'Faculty not found' ? 'Faculty Member Not Found' : 'Connection Error'}</h2>
          <p className="text-sm text-slate-500 mb-6">
            {error === 'Faculty not found' ? `No faculty record exists with ID "${id}"` : error}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchFacultyDetails}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/faculty')}
              className="px-5 py-2.5 bg-[#00236f] text-white rounded-lg text-sm font-semibold hover:bg-[#001a54] transition-all"
            >
              Back to Faculty
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Faculty Profile">
      <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/faculty')}
          className="flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:text-[#00236f] hover:border-[#00236f] transition-all group uppercase tracking-wider"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Faculty</span>
        </button>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-5 py-2.5 bg-[#00236f] text-white rounded-lg text-sm font-semibold hover:bg-[#00236f]/90 transition-all"
        >
          Edit Profile
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm mb-8 relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-1000" />
        <div className="absolute top-1/2 -right-12 w-32 h-32 bg-green-50/30 rounded-full blur-3xl" />

        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-[#00236f] to-[#60a5fa] p-1 shadow-xl">
              <div className="w-full h-full rounded-lg bg-white flex items-center justify-center text-[#00236f]">
                <User size={40} />
              </div>
            </div>

            <div className="text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{faculty.name}</h1>
                <span className="px-2.5 py-0.5 bg-green-50 text-[#00236f] border border-green-100 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 sm:mt-0">
                  {faculty.employeeId}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
                <span className="text-base font-semibold text-slate-600">{faculty.designation}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block" />
                <span className="text-base font-semibold text-slate-400">{faculty.departmentId}</span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${faculty.employment_status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {faculty.employment_status || 'Active'}
                </span>
                {faculty.contract_end_date && (
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Contract: {new Date(faculty.contract_end_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200 mb-8 px-4 overflow-x-auto">
        {profileTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-sm font-semibold transition-all relative whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-[#00236f]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <tab.icon size={16} />
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00236f] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[#00236f] text-[20px]">contact_page</span>
                Contact & Info
              </h3>

              <div className="space-y-5">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <Mail size={18} className="text-slate-400" />
                  <span>{faculty.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <Phone size={18} className="text-slate-400" />
                  <span>{faculty.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <MapPin size={18} className="text-slate-400" />
                  <span>Room: {faculty.office_location || 'Not assigned'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <Briefcase size={18} className="text-slate-400" />
                  <span>Employee ID: {faculty.employeeId}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">work_history</span>
                  <span>Experience: {faculty.yearsOfExperience || faculty.years_of_experience || 0} Years</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">badge</span>
                  <span>Type: {faculty.employmentType || faculty.employment_type || 'Not specified'}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 my-6" />

              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[#00236f] text-[20px]">badge</span>
                Personal Details
              </h3>

              <div className="space-y-5">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">wc</span>
                  <span>Gender: {faculty.gender || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_today</span>
                  <span>DOB: {faculty.dob ? new Date(faculty.dob).toLocaleDateString() : 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">public</span>
                  <span>Nationality: {faculty.nationality || 'Not specified'}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 my-6" />

              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[#00236f] text-[20px]">badge</span>
                Personal Details
              </h3>

              <div className="space-y-5">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">wc</span>
                  <span>Gender: {faculty.gender || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_today</span>
                  <span>DOB: {faculty.dob ? new Date(faculty.dob).toLocaleDateString() : 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">public</span>
                  <span>Nationality: {faculty.nationality || 'Not specified'}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 my-6" />

              <h3 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Office Hours</h3>
              {faculty.office_hours && faculty.office_hours.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-600">
                  {faculty.office_hours.map((oh, i) => (
                    <li key={i}>{oh.day}: {oh.start_time} - {oh.end_time}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No office hours posted.</p>
              )}
            </div>

            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[#00236f] text-[20px]">school</span>
                  Education & Qualifications
                </h3>

                {/* Primary Qualification from Edit Profile */}
                <div className="mb-6 p-5 bg-green-50/40 border border-green-100 rounded-xl">
                  <h4 className="text-xs font-bold text-[#00236f] uppercase tracking-wider mb-3">Primary Qualification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Degree / Qualification</span>
                      <span className="text-sm font-semibold text-slate-800">{faculty.qualification || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">College</span>
                      <span className="text-sm font-semibold text-slate-800">{faculty.college || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">University</span>
                      <span className="text-sm font-semibold text-slate-800">{faculty.university || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                {faculty.qualifications && faculty.qualifications.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Other Qualifications</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                            <th className="px-4 py-3">Degree</th>
                            <th className="px-4 py-3">Institution</th>
                            <th className="px-4 py-3">Year</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {faculty.qualifications.map((q, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-4 text-sm font-semibold text-slate-800">{q.degree}</td>
                              <td className="px-4 py-4 text-sm text-slate-600">{q.institution}</td>
                              <td className="px-4 py-4 text-sm text-slate-600">{q.year}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-6 uppercase tracking-wider">Research & Specialization</h3>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Specializations</h4>
                  <div className="flex gap-2 flex-wrap">
                    {faculty.specializations?.map((spec, i) => (
                      <span key={i} className="px-3 py-1 bg-green-50 text-[#00236f] rounded-full text-xs font-semibold">
                        {spec}
                      </span>
                    ))}
                    {(!faculty.specializations || faculty.specializations.length === 0) && (
                      <span className="text-sm text-slate-500">None listed</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Publications</h4>
                  {faculty.publications && faculty.publications.length > 0 ? (
                    <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
                      {faculty.publications.map((pub, i) => (
                        <li key={i}>
                          {pub.title} ({pub.year}){' '}
                          {pub.journal_link && (
                            <a href={pub.journal_link} target="_blank" rel="noreferrer" className="text-[#00236f] font-medium">
                              [Link]
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm text-slate-500">No publications</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Performance Metrics</h3>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#00236f] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#00236f]/90 transition-all shadow-sm"
                onClick={() => setIsEvalModalOpen(true)}
              >
                Add Evaluation
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-8 py-4">Semester</th>
                    <th className="px-4 py-4">Academic Year</th>
                    <th className="px-4 py-4">Student Feedback (5.0)</th>
                    <th className="px-4 py-4">Completion Rate</th>
                    <th className="px-8 py-4">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {faculty.performance_metrics && faculty.performance_metrics.length > 0 ? (
                    faculty.performance_metrics.map((metric, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-sm font-semibold text-slate-800">{metric.semester}</td>
                        <td className="px-4 py-5 text-sm text-slate-700">{metric.academic_year}</td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[#00236f] h-full" style={{ width: `${(metric.student_feedback_score / 5) * 100}%` }} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{metric.student_feedback_score.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm text-slate-700">{metric.course_completion_rate}%</td>
                        <td className="px-8 py-5 text-sm text-slate-700">{metric.attendance_rate}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-8 py-10 text-center text-sm text-slate-500">No performance metrics recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <PayrollIntegrationPanel 
              facultyId={faculty.employeeId}
              semester="Semester 1"
              academicYear="2024"
            />
          </div>
        )}

        {activeTab === 'career' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <CareerPathwayTracking 
              facultyId={faculty.employeeId}
            />
          </div>
        )}

        {activeTab === 'leave' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Leave History</h3>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#00236f] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#00236f]/90 transition-all shadow-sm"
                onClick={() => setIsRequestLeaveOpen(true)}
              >
                Request Leave
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-8 py-4">Type</th>
                    <th className="px-4 py-4">Start Date</th>
                    <th className="px-4 py-4">End Date</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-8 py-4">Applied On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {faculty.leave_requests && faculty.leave_requests.length > 0 ? (
                    faculty.leave_requests.map((leaveReq, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-sm font-semibold text-slate-800">{leaveReq.leave_type}</td>
                        <td className="px-4 py-5 text-sm text-slate-700">{new Date(leaveReq.start_date).toLocaleDateString()}</td>
                        <td className="px-4 py-5 text-sm text-slate-700">{new Date(leaveReq.end_date).toLocaleDateString()}</td>
                        <td className="px-4 py-5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${leaveReq.status === 'Approved' ? 'bg-green-50 text-green-600' : leaveReq.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                            {leaveReq.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-700">{new Date(leaveReq.applied_on).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-8 py-10 text-center text-sm text-slate-500">No leave records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      <AddEditFacultyModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchFacultyDetails}
        editMode={true}
        initialData={faculty}
      />
      
      <RequestLeaveModal
        isOpen={isRequestLeaveOpen}
        onClose={() => setIsRequestLeaveOpen(false)}
        onSuccess={fetchFacultyDetails}
        facultyId={faculty.employeeId}
      />

      <PerformanceEvaluationModal
        isOpen={isEvalModalOpen}
        onClose={() => setIsEvalModalOpen(false)}
        onSuccess={fetchFacultyDetails}
        facultyId={faculty.employeeId}
      />

    </div>
    </Layout>
  );
}
