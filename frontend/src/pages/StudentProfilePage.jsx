import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AddStudentModal from '../components/AddStudentModal';
import { TableSkeleton } from '../components/common';
import { getUserSession, updateUserData } from '../auth/sessionController';
import { 
  ArrowLeft, User, BarChart2,
  Mail, Phone, MapPin, Calendar, Users, FolderOpen
} from 'lucide-react';
import { API_BASE } from '../api/apiBase';
import '../styles.css';

const API_BASE_URL = API_BASE;
const profileTabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'academics', label: 'Academics', icon: BarChart2 },
  { id: 'fees', label: 'Fees', icon: Calendar }
];

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');

  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchStudentDetails();
    } else {
      setError('Invalid student ID');
      setLoading(false);
    }
  }, [id]);

  const fetchStudentDetails = async () => {
    // Validate ID is not undefined
    if (!id || id === 'undefined') {
      setError('Invalid student ID');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [response, examsRes, marksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/${id}`),
        fetch(`${API_BASE_URL}/exams`),
        fetch(`${API_BASE_URL}/exams/marks?student_id=${id}`)
      ]);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Student not found');
        throw new Error('Failed to fetch student details');
      }
      const data = await response.json();
      
      let allExams = [];
      let studentMarks = [];
      if (examsRes && examsRes.ok) {
        const examsData = await examsRes.json();
        allExams = examsData.data || [];
      }
      if (marksRes && marksRes.ok) {
        const marksData = await marksRes.json();
        studentMarks = marksData.data || [];
      }

      const norm = (c) => String(c || '').replace(/[-_\s]+/g, '').toUpperCase();

      // Map subjects to End-Sem marks
      const mapped = (data.subjects || []).map(sub => {
        const subCodeNorm = norm(sub.code);
        const endSemExam = allExams.find(e => norm(e.code) === subCodeNorm && e.type === 'End-Sem');
        let marksRecord = null;
        if (endSemExam) {
          const examId = endSemExam._id || endSemExam.id;
          marksRecord = studentMarks.find(m => String(m.examId) === String(examId));
        }
        if (!marksRecord) {
          marksRecord = studentMarks.find(m => {
            const ex = allExams.find(e => String(e._id || e.id) === String(m.examId));
            return ex && norm(ex.code) === subCodeNorm && ex.type === 'End-Sem';
          });
        }
        return {
          ...sub,
          grade: marksRecord ? (marksRecord.grade || 'Pending') : 'Pending',
          total: marksRecord ? (marksRecord.marks !== undefined ? marksRecord.marks : null) : null
        };
      });

      // Calculate dynamic CGPA based only on End-Sem passed courses
      const passed = mapped.filter(s => s.grade && s.grade !== 'Pending' && s.grade !== 'F');
      const totalObtained = passed.reduce((acc, s) => acc + (s.total || 0), 0);
      const totalMax = passed.length * 100;
      const calculatedCgpa = totalMax > 0 ? ((totalObtained / totalMax) * 10).toFixed(2) : '0.00';

      setStudent({
        ...data,
        subjects: mapped,
        cgpa: calculatedCgpa
      });
      setError(null);
    } catch (error) {
      console.error(error);
      setStudent(null);
      setError(error.message || 'Failed to fetch student details');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: base64Data })
        });
        if (!response.ok) {
          throw new Error('Failed to update profile photo');
        }
        await fetchStudentDetails();
        const session = getUserSession();
        if (session && (session.userId === id || session.userId === id.toString())) {
          updateUserData({ avatar: base64Data });
        }
        alert('Profile photo updated successfully!');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Failed to upload photo');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async (e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: null })
      });
      if (!response.ok) {
        throw new Error('Failed to remove profile photo');
      }
      await fetchStudentDetails();
      const session = getUserSession();
      if (session && (session.userId === id || session.userId === id.toString())) {
        updateUserData({ avatar: null });
      }
      alert('Profile photo removed successfully!');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to remove photo');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Loading Student Profile">
        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
          <div className="w-24 h-24 bg-slate-100 rounded-xl mb-6" />
          <div className="w-48 h-4 bg-slate-100 rounded mb-2" />
          <div className="w-32 h-3 bg-slate-50 rounded" />
        </div>
      </Layout>
    );
  }

  if (error || !student) {
    return (
      <Layout title="Student Not Found">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">{error === 'Student not found' ? 'person_off' : 'cloud_off'}</span>
          <h2 className="text-xl font-bold text-slate-700 mb-2">{error === 'Student not found' ? 'Student Not Found' : 'Connection Error'}</h2>
          <p className="text-sm text-slate-500 mb-6">
            {error === 'Student not found' ? `No student record exists with ID "${id}"` : error}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStudentDetails}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/students')}
              className="px-5 py-2.5 bg-[#4c1d95] text-white rounded-lg text-sm font-semibold hover:bg-[#3b0764] transition-all"
            >
              Back to Students
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const statusStyles = {
    active: 'bg-green-50 text-green-700',
    Active: 'bg-green-50 text-green-700',
    inactive: 'bg-red-50 text-red-700',
    Inactive: 'bg-red-50 text-red-700',
    graduated: 'bg-blue-50 text-blue-700',
    Graduated: 'bg-blue-50 text-blue-700',
  };

  return (
    <Layout title="Student Profile">
      <div className="page-container h-full overflow-y-auto pr-2 pb-12 custom-scrollbar">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:text-[#4c1d95] hover:border-[#4c1d95] transition-all group uppercase tracking-wider"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Students</span>
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-5 py-2.5 bg-[#4c1d95] text-white rounded-lg text-sm font-semibold hover:bg-[#4c1d95]/90 transition-all"
          >
            Edit Profile
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm mb-8 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-1000" />
          <div className="absolute top-1/2 -right-12 w-32 h-32 bg-green-50/30 rounded-full blur-3xl" />

          <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              <div 
                className="w-28 h-28 rounded-xl bg-gradient-to-br from-[#4c1d95] to-[#60a5fa] p-1 shadow-xl cursor-pointer relative group overflow-hidden"
              >
                <img
                  src={student.avatar || `https://ui-avatars.com/api/?name=${student.name}&background=00236f&color=fff&size=128`}
                  alt={student.name}
                  className="w-full h-full rounded-lg object-cover"
                  onClick={() => document.getElementById('student-profile-photo-upload').click()}
                />
                <div 
                  onClick={() => document.getElementById('student-profile-photo-upload').click()}
                  className="absolute inset-0 bg-[#4c1d95]/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 rounded-lg"
                >
                  <span className="text-white text-[10px] font-bold text-center tracking-wider px-1">UPLOAD PHOTO</span>
                </div>
                {student.avatar && !student.avatar.startsWith('https://ui-avatars.com') && (
                  <button 
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute top-1.5 right-1.5 z-20 p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border border-white/10"
                    title="Remove profile photo"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
              <input 
                id="student-profile-photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />

              <div className="text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{student.name}</h1>
                  <span className="px-2.5 py-0.5 bg-green-50 text-[#4c1d95] border border-green-100 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 sm:mt-0">
                    {student.rollNumber || student.id}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
                  <span className="text-base font-semibold text-slate-600">
                    {student.semester ? `Semester ${student.semester}` : 'Semester 1'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block" />
                  <span className="text-base font-semibold text-slate-400">{student.departmentId || student.department}</span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusStyles[student.status] || 'bg-slate-50 text-slate-700'}`}>
                    {student.status || 'Active'}
                  </span>
                  {student.cgpa && (
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      CGPA: {student.cgpa}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const session = getUserSession();
          const showDocumentsTab = session && (session.role === 'admin' || session.userId === id || session.userId?.toString() === id?.toString());
          const dynamicTabs = [...profileTabs];
          if (showDocumentsTab) {
            dynamicTabs.push({ id: 'documents', label: 'Documents', icon: FolderOpen });
          }

          return (
            <div className="flex items-center gap-8 border-b border-slate-200 mb-8 px-4 overflow-x-auto">
              {dynamicTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 text-sm font-semibold transition-all relative whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-[#4c1d95]'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <tab.icon size={16} />
                    {tab.label}
                  </span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4c1d95] rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          );
        })()}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'overview' && (
            <OverviewTab student={student} />
          )}

          {activeTab === 'academics' && (() => {
            const filteredSubjects = (student.subjects || []).filter(sub => {
              const matchesYear = yearFilter === 'All' || sub.year === yearFilter;
              const matchesSem = semesterFilter === 'All' || sub.semester?.toString() === semesterFilter;
              return matchesYear && matchesSem;
            });

            // Calculate GPA/CGPA
            const activePassed = filteredSubjects.filter(s => s.grade && s.grade !== 'Pending' && s.grade !== 'F');
            const activeTotalObtained = activePassed.reduce((acc, s) => acc + (s.total || 0), 0);
            const activeTotalMax = activePassed.length * 100;
            const dynamicGPA = activeTotalMax > 0 ? ((activeTotalObtained / activeTotalMax) * 10).toFixed(2) : '0.00';

            const allPassed = (student.subjects || []).filter(s => s.grade && s.grade !== 'Pending' && s.grade !== 'F');
            const allTotalObtained = allPassed.reduce((acc, s) => acc + (s.total || 0), 0);
            const allTotalMax = allPassed.length * 100;
            const globalCGPA = allTotalMax > 0 ? ((allTotalObtained / allTotalMax) * 10).toFixed(2) : '0.00';

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-50 text-[#4c1d95] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">military_tech</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall CGPA</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{globalCGPA}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-50 text-[#4c1d95] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">analytics</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered GPA</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{dynamicGPA}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-50 text-[#4c1d95] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">menu_book</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Courses</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{filteredSubjects.length}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-50 text-[#4c1d95] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">verified</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passed Credits</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{activePassed.length * 4} Credits</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Subject Performance</h3>
                      <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Academic history and marks</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <select 
                        value={yearFilter}
                        onChange={(e) => { setYearFilter(e.target.value); setSemesterFilter('All'); }}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 uppercase tracking-wider outline-none cursor-pointer"
                      >
                        <option value="All">All Years</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>

                      <select 
                        value={semesterFilter}
                        onChange={(e) => setSemesterFilter(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 uppercase tracking-wider outline-none cursor-pointer"
                      >
                        <option value="All">All Semesters</option>
                        {(() => {
                          let sems = [1, 2, 3, 4, 5, 6, 7, 8];
                          if (yearFilter === '1st Year') sems = [1, 2];
                          else if (yearFilter === '2nd Year') sems = [3, 4];
                          else if (yearFilter === '3rd Year') sems = [5, 6];
                          else if (yearFilter === '4th Year') sems = [7, 8];
                          
                          return sems.map(s => (
                            <option key={s} value={s.toString()}>Semester {s}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Subject Code</th>
                          <th className="px-6 py-4">Subject Name</th>
                          <th className="px-6 py-4">Year</th>
                          <th className="px-6 py-4">Semester</th>
                          <th className="px-6 py-4">Grade</th>
                          <th className="px-6 py-4">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <TableSkeleton cols={6} rows={5} />
                            </td>
                          </tr>
                        ) : filteredSubjects.length > 0 ? (
                          filteredSubjects.map((subject, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{subject.code}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{subject.name}</td>
                              <td className="px-6 py-4 text-sm text-slate-500">{subject.year || '—'}</td>
                              <td className="px-6 py-4 text-sm text-slate-500">{subject.semester ? `Semester ${subject.semester}` : '—'}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  subject.grade === 'A+' || subject.grade === 'A' ? 'bg-emerald-50 text-emerald-700' :
                                  subject.grade === 'B+' || subject.grade === 'B' ? 'bg-green-50 text-green-700' :
                                  subject.grade === 'F' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'
                                }`}>
                                  {subject.grade || '—'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-700">{subject.total !== undefined ? subject.total : '—'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                              No subjects found matching the selection
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {activeTab === 'fees' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Fee Status</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Fee Type</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Paid</th>
                      <th className="px-6 py-4">Due</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <TableSkeleton cols={5} rows={4} />
                        </td>
                      </tr>
                    ) : student.fees && student.fees.length > 0 ? (
                      student.fees.map((fee, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{fee.type}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">₹{fee.amount}</td>
                          <td className="px-6 py-4 text-sm text-green-700 font-medium">₹{fee.paid}</td>
                          <td className="px-6 py-4 text-sm text-red-700 font-medium">₹{fee.due}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                              fee.status === 'Paid' ? 'bg-green-50 text-green-700' :
                              fee.status === 'Partial' ? 'bg-orange-50 text-orange-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {fee.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          No fees recorded yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'documents' && <DocumentsTab student={student} onRefresh={fetchStudentDetails} />}
        </div>
      </div>

      {isEditModalOpen && (
        <AddStudentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          editStudent={student}
          onSuccess={() => {
            fetchStudentDetails();
            setIsEditModalOpen(false);
          }}
        />
      )}
    </Layout>
  );
}

function DocumentsTab({ student, onRefresh }) {
  const rawDocs = student.documents || [];
  const [viewingDoc, setViewingDoc] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Normalize documents: handle both array format (seed data) and object/dict format (from admissions)
  const docs = Array.isArray(rawDocs)
    ? rawDocs.map((d, i) => {
        const fileData = (d.data && d.data.data) || (typeof d.data === 'string' ? d.data : null) || d.file_url || d.fileUrl || null;
        const fileName = (d.data && d.data.name) || d.name || 'Document';
        const fileSize = (d.data && d.data.size) ? `${(d.data.size / 1024 / 1024).toFixed(2)} MB` : (d.size || 'N/A');
        const uploadDateStr = d.uploadDate || d.uploadedAt || student.enrollDate || new Date().toISOString();
        return { ...d, id: d.id || `doc-${i}`, fileName, fileSize, fileData, uploadDateStr };
      })
    : Object.entries(rawDocs)
        .map(([key, val]) => {
          if (!val) return null;
          const fileData = (val && typeof val === 'object' && val.data) ? val.data : (typeof val === 'string' ? val : null);
          const fileName = (val && val.name) || key
              .replace(/([A-Z])/g, ' $1')
              .replace(/[-_]+/g, ' ')
              .replace(/^\w/, (c) => c.toUpperCase())
              .trim();
          const fileSize = (val && val.size) ? `${(val.size / 1024 / 1024).toFixed(2)} MB` : 'N/A';
          const uploadDateStr = student.enrollDate || new Date().toISOString();
          const isPdf = typeof fileData === 'string' && fileData.includes('pdf');
          return { id: key, name: fileName, fileName, fileSize, fileData, uploadDateStr, type: isPdf ? 'pdf' : 'image' };
        })
        .filter(Boolean);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const newDoc = {
          id: `DOC-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, '') || 'Uploaded Document',
          type: file.type.includes('pdf') ? 'pdf' : 'image',
          uploadDate: new Date().toISOString(),
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          data: { name: file.name, size: file.size, data: reader.result }
        };

        // Convert current docs to array format for storage
        const currentDocsList = Array.isArray(rawDocs)
          ? rawDocs
          : Object.entries(rawDocs).map(([key, val]) => ({
              id: key,
              name: key.replace(/[-_]+/g, ' ').replace(/^\w/, c => c.toUpperCase()),
              type: typeof val === 'string' && val.includes('pdf') ? 'pdf' : 'image',
              data: val
            })).filter(d => d.data);

        const updatedDocs = [...currentDocsList, newDoc];
        const res = await fetch(`${API_BASE_URL}/students/${student.id || student.rollNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documents: updatedDocs })
        });
        if (!res.ok) throw new Error('Failed to upload document');
        if (onRefresh) onRefresh();
        else window.location.reload();
      } catch (err) {
        console.error(err);
        alert(err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so re-uploading same file works
    e.target.value = '';
  };

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const currentDocsList = Array.isArray(rawDocs)
        ? rawDocs
        : Object.entries(rawDocs).map(([key, val]) => ({
            id: key,
            name: key.replace(/[-_]+/g, ' ').replace(/^\w/, c => c.toUpperCase()),
            type: typeof val === 'string' && val.includes('pdf') ? 'pdf' : 'image',
            data: val
          })).filter(d => d.data);

      const updatedDocs = currentDocsList.filter(d => d.id !== docId);
      const res = await fetch(`${API_BASE_URL}/students/${student.id || student.rollNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: updatedDocs })
      });
      if (!res.ok) throw new Error('Failed to delete document');
      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Delete failed');
    }
  };

  const isImage = (dataUri) => {
    if (!dataUri || typeof dataUri !== 'string') return false;
    return dataUri.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(dataUri);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Upload Section */}
        <label className={`block bg-[#4c1d95]/5 border-2 border-dashed border-[#4c1d95]/20 rounded-xl p-8 text-center cursor-pointer hover:bg-[#4c1d95]/10 transition-all group ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <input type="file" className="hidden" onChange={handleUpload} accept="image/*,.pdf,.doc,.docx" disabled={uploading} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-[#4c1d95] shadow-lg shadow-[#4c1d95]/10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[28px]">{uploading ? 'hourglass_top' : 'cloud_upload'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#4c1d95]">{uploading ? 'Uploading...' : 'Upload Document'}</p>
              <p className="text-[11px] text-[#4c1d95]/50 mt-1">PDF, Images, DOC • Click to browse</p>
            </div>
          </div>
        </label>

        {/* Documents List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FolderOpen size={18} className="text-[#4c1d95]" />
              My Documents
            </h3>
            <span className="text-xs font-medium text-slate-400">{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
          </div>

          {docs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <span className="material-symbols-outlined text-5xl text-slate-200 mb-3 block">folder_open</span>
              <p className="text-sm font-semibold text-slate-400">No documents uploaded yet</p>
              <p className="text-xs text-slate-300 mt-1">Use the upload area above to add your first document</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {docs.map((doc) => {
                const hasData = !!doc.fileData;
                return (
                  <div key={doc.id} className="flex items-center justify-between p-4 sm:px-6 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Thumbnail preview */}
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-100 ${hasData ? 'cursor-pointer' : ''}`}
                        onClick={() => hasData && setViewingDoc(doc)}
                      >
                        {hasData && isImage(doc.fileData) ? (
                          <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-[#4c1d95]">
                            <span className="material-symbols-outlined text-[22px]">
                              {doc.type === 'pdf' || (doc.fileName && doc.fileName.toLowerCase().endsWith('.pdf')) ? 'picture_as_pdf' : 'image'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-800 truncate">{doc.name || doc.fileName}</h4>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">
                          {doc.fileSize || doc.size || 'N/A'} • {new Date(doc.uploadDateStr || doc.uploadDate || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {hasData && (
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="p-2 text-slate-400 hover:text-[#4c1d95] hover:bg-blue-50 rounded-lg transition-all"
                          title="View"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      )}
                      {hasData && (
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = doc.fileData;
                            link.download = doc.fileName || doc.name || 'document';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="p-2 text-slate-400 hover:text-[#4c1d95] hover:bg-blue-50 rounded-lg transition-all"
                          title="Download"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── In-App Document Viewer Modal ─── */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-8" onClick={() => setViewingDoc(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#4c1d95] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    {isImage(viewingDoc.fileData) ? 'image' : 'picture_as_pdf'}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 truncate">{viewingDoc.name || viewingDoc.fileName}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{viewingDoc.fileSize || viewingDoc.size || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewingDoc.fileData;
                    link.download = viewingDoc.fileName || viewingDoc.name || 'document';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="p-2 text-slate-400 hover:text-[#4c1d95] hover:bg-blue-50 rounded-lg transition-all"
                  title="Download"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                  title="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body - Document Content */}
            <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-[300px]">
              {isImage(viewingDoc.fileData) ? (
                <img
                  src={viewingDoc.fileData}
                  alt={viewingDoc.name || 'Document'}
                  className="max-w-full max-h-[75vh] object-contain p-4"
                />
              ) : (
                <iframe
                  src={viewingDoc.fileData}
                  title={viewingDoc.name || 'Document Viewer'}
                  className="w-full h-[75vh] border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OverviewTab({ student }) {
  const formatValue = (val) => val || 'Not provided';
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not provided';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getFormattedAddress = () => {
    const addr = student.address || student.personal?.address;
    const city = student.city || student.personal?.city;
    const state = student.state || student.personal?.state;
    const pin = student.pincode || student.personal?.pincode;

    let parts = [];
    if (addr) parts.push(addr);
    if (city) parts.push(city);
    if (state) parts.push(state);
    
    let baseAddr = parts.join(', ');
    if (pin) {
      if (baseAddr) baseAddr += ` - ${pin}`;
      else baseAddr = pin;
    }
    
    return baseAddr || 'Not provided';
  };

  // --- Dynamic GPA Trend Calculation ---
  const GRADE_POINTS = {
    'A+': 10.0,
    'A': 9.0,
    'B+': 8.0,
    'B': 7.0,
    'C+': 6.0,
    'C': 5.0,
    'D': 4.0,
    'F': 0.0,
  };

  const subjects = student.subjects || [];
  const semestersData = {};

  subjects.forEach(sub => {
    const sem = sub.semester;
    if (!sem) return;
    
    if (!semestersData[sem]) {
      semestersData[sem] = { totalPoints: 0, totalCredits: 0 };
    }
    
    if (sub.grade === 'Pending' || sub.status === 'In Progress') {
      return;
    }
    
    const gradePoint = GRADE_POINTS[sub.grade];
    if (gradePoint !== undefined) {
      const credits = parseFloat(sub.credits) || 4.0;
      semestersData[sem].totalPoints += gradePoint * credits;
      semestersData[sem].totalCredits += credits;
    }
  });

  const semestersList = [];
  const maxSem = Math.max(4, ...Object.keys(semestersData).map(Number));

  for (let sem = 1; sem <= maxSem; sem++) {
    const data = semestersData[sem];
    const gpa = data && data.totalCredits > 0 ? (data.totalPoints / data.totalCredits) : 0;
    semestersList.push({
      semester: sem,
      gpa: parseFloat(gpa.toFixed(2)),
      hasData: !!(data && data.totalCredits > 0)
    });
  }

  let totalGpaSum = 0;
  let semestersWithData = 0;
  semestersList.forEach(s => {
    if (s.hasData) {
      totalGpaSum += s.gpa;
      semestersWithData++;
    }
  });
  
  const averageGpa = semestersWithData > 0 ? totalGpaSum / semestersWithData : 0;
  let averageLabel = "No GPA Recorded";
  if (averageGpa >= 9.0) averageLabel = "O Outstanding";
  else if (averageGpa >= 8.0) averageLabel = "A+ Excellent";
  else if (averageGpa >= 7.0) averageLabel = "A Good";
  else if (averageGpa >= 6.0) averageLabel = "B+ Average";
  else if (averageGpa >= 5.0) averageLabel = "B Below Average";
  else if (averageGpa > 0) averageLabel = "C Re-eval required";

  // --- Dynamic Attendance Calendar Generation ---
  const attendancePct = student.attendancePct !== undefined ? student.attendancePct : 0;
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentDate.getMonth(), 1);
  const rawDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday...
  const startOffset = rawDayOfWeek === 0 ? 6 : rawDayOfWeek - 1; // Monday = 0
  const totalDays = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();

  const getDayStatus = (dayNum, dayOfWeek) => {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) return 'weekend';
    if (dayNum > currentDate.getDate()) return 'future';
    if (!attendancePct || attendancePct === 0) return 'no-data';

    // Deterministic pseudo-random generation to match the attendance percentage
    const hash = (dayNum * 19 + 7) % 100;
    return hash < attendancePct ? 'present' : 'absent';
  };

  // --- Dynamic Academic Alert Configuration ---
  const getAlertConfig = () => {
    const failedSubjects = subjects.filter(s => s.grade === 'F' || s.status === 'Failed');
    const hasBacklogs = failedSubjects.length > 0;
    const cgpaVal = typeof student.cgpa === 'number' ? student.cgpa : parseFloat(student.cgpa) || 0.0;
    const isNewStudent = subjects.length === 0;

    if (hasBacklogs) {
      return {
        title: "Academic Alert: Backlogs Detected",
        message: `${student.name} has backlog(s) in: ${failedSubjects.map(s => s.code).join(', ')}. Please contact the academic advisor to schedule remedial classes.`,
        icon: "warning",
        bgColor: "bg-red-50 border-red-200",
        textColor: "text-red-800",
        iconBg: "bg-red-600 shadow-red-200",
        iconColor: "text-white"
      };
    }

    if (attendancePct > 0 && attendancePct < 75) {
      return {
        title: "Critical Alert: Low Attendance",
        message: `${student.name}'s attendance is currently at ${attendancePct}%, which falls below the mandatory 75% threshold. Immediate improvement is required to avoid exam debarment.`,
        icon: "event_busy",
        bgColor: "bg-amber-50 border-amber-200",
        textColor: "text-amber-800",
        iconBg: "bg-amber-500 shadow-amber-200",
        iconColor: "text-white"
      };
    }

    if (cgpaVal >= 8.5) {
      return {
        title: "Academic Distinction: Honor Roll",
        message: `Congratulations! ${student.name} has achieved an outstanding academic performance with a CGPA of ${cgpaVal.toFixed(2)}. Keep up the excellent work!`,
        icon: "workspace_premium",
        bgColor: "bg-[#4c1d95]/5 border-[#4c1d95]/20",
        textColor: "text-[#4c1d95]",
        iconBg: "bg-[#4c1d95] shadow-blue-200",
        iconColor: "text-yellow-300"
      };
    }

    if (isNewStudent) {
      return {
        title: "Academic Status: Welcome",
        message: `Welcome, ${student.name}! You are newly enrolled. Your academic records, GPA trends, and class attendance will populate here once classes and exams begin.`,
        icon: "school",
        bgColor: "bg-blue-50/50 border-blue-200",
        textColor: "text-blue-800",
        iconBg: "bg-blue-600 shadow-blue-200",
        iconColor: "text-white"
      };
    }

    return {
      title: "Academic Status: Normal",
      message: `${student.name} is in good academic standing. All requirements for the current academic session are being met successfully.`,
      icon: "check_circle",
      bgColor: "bg-[#4c1d95]/5 border-[#4c1d95]/10",
      textColor: "text-[#4c1d95]",
      iconBg: "bg-[#4c1d95] shadow-[#4c1d95]/10",
      iconColor: "text-white"
    };
  };

  const alert = getAlertConfig();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Core Info */}
      <div className="lg:col-span-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact & Personal Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#4c1d95] text-[20px]">contact_page</span>
              Personal & Contact
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone Number</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.phone)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Personal Email</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.email)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Permanent Address</p>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">{getFormattedAddress()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(student.dateOfBirth || student.dob)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Gender</p>
                  <p className="text-sm font-medium text-slate-700">{formatValue(student.gender)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Blood Group</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.bloodGroup)}</p>
              </div>
            </div>
          </div>

          {/* Family & Guardian Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#4c1d95] text-[20px]">family_restroom</span>
              Family & Guardian
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Guardian Name</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.guardianName || student.guardian)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Relationship</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.relationship)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Guardian Contact</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.guardianPhone)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Guardian Email</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.guardianEmail)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Guardian Occupation</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.guardianOccupation)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Academic & Housing Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#4c1d95] text-[20px]">menu_book</span>
              Academic & Housing
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Admission Date</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(student.enrollDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Admission Type</p>
                  <p className="text-sm font-medium text-slate-700">{formatValue(student.admissionType)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Quota / Category</p>
                  <p className="text-sm font-medium text-slate-700">{formatValue(student.quota)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Accommodation</p>
                  <p className="text-sm font-medium text-slate-700">{formatValue(student.accommodation)}</p>
                </div>
              </div>
              {student.accommodation === 'Hostel Required' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Hostel Name</p>
                    <p className="text-sm font-medium text-slate-700">{formatValue(student.hostelName)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Room Type</p>
                    <p className="text-sm font-medium text-slate-700">{formatValue(student.roomType)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Previous Education Record */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#4c1d95] text-[20px]">history_edu</span>
              Previous Education
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Previous School / Institution</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.previousSchool || student.previousInstitution)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Board of Study</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.board)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Year of Passing</p>
                  <p className="text-sm font-medium text-slate-700">{student.yearOfPassing || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Marks Percentage</p>
                  <p className="text-sm font-medium text-slate-700">{student.marksPercentage ? `${student.marksPercentage}%` : 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Payment & Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[#4c1d95] text-[20px]">payments</span>
            Application Payment & Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Application Fee</span>
                <span className="text-sm font-bold text-slate-700">₹{(student.payment?.application_fee || student.feeAmount || 500).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Method</span>
                <span className="text-sm font-medium text-slate-700">{formatValue(student.payment?.payment_method || student.paymentMethod)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transaction ID</span>
                <span className="text-sm font-medium text-mono text-slate-700">{formatValue(student.payment?.transaction_id || student.transactionId)}</span>
              </div>
              {student.payment?.payment_datetime && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Date</span>
                  <span className="text-sm font-medium text-slate-700">{new Date(student.payment.payment_datetime).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 justify-center">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance</p>
                  <p className="text-lg font-bold text-[#4c1d95] mt-1">{attendancePct}%</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 justify-center">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current CGPA</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">{student.cgpa || 0.0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Trends & Status */}
      <div className="lg:col-span-4 space-y-8">
        {/* GPA Trend Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider text-slate-900 leading-none">GPA Trend</h3>
            <span className="px-2 py-0.5 bg-green-50 text-[#4c1d95] rounded text-[9px] font-bold uppercase tracking-wider">{averageLabel}</span>
          </div>
          <div className="flex items-end justify-between h-24 gap-2 mb-4 relative">
            {semestersWithData === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50/70 rounded-lg backdrop-blur-[0.5px]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                  No GPA Records Available
                </span>
              </div>
            )}
            {semestersList.map((semInfo) => {
              const heightPct = semInfo.hasData ? (semInfo.gpa / 10.0) * 100 : 0;
              return (
                <div key={semInfo.semester} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  {semInfo.hasData && (
                    <span className="text-[9px] font-bold text-[#4c1d95] leading-none mb-0.5">{semInfo.gpa}</span>
                  )}
                  <div 
                    className={`w-full rounded-md transition-all duration-1000 ${
                      semInfo.hasData 
                        ? 'bg-[#4c1d95]' 
                        : 'bg-slate-100 border border-dashed border-slate-200'
                    }`} 
                    style={{ height: semInfo.hasData ? `${heightPct}%` : '8px' }} 
                    title={semInfo.hasData ? `Semester ${semInfo.semester} GPA: ${semInfo.gpa}` : `Semester ${semInfo.semester}: No records`}
                  />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">SEM{semInfo.semester}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Calendar Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Attendance: {currentMonthName} {currentYear}</h3>
              <div className="flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-green-500" title="Present" />
                 <div className="w-2 h-2 rounded-full bg-red-400" title="Absent" />
              </div>
           </div>
           <div className="grid grid-cols-7 gap-2 mb-4">
              {['M','T','W','T','F','S','S'].map(d => (
                <div key={d} className="text-center text-[9px] font-bold text-slate-300 py-1">{d}</div>
              ))}
              {Array.from({ length: startOffset }).map((_, idx) => (
                <div key={`pad-${idx}`} className="aspect-square bg-transparent" />
              ))}
              {Array.from({ length: totalDays }).map((_, idx) => {
                const dayNum = idx + 1;
                const date = new Date(currentYear, currentDate.getMonth(), dayNum);
                const dayOfWeek = date.getDay();
                const status = getDayStatus(dayNum, dayOfWeek);
                
                let bgClass = 'bg-slate-50 border border-slate-100';
                let titleText = `Day ${dayNum}`;
                
                if (status === 'present') {
                  bgClass = 'bg-green-500 text-white';
                  titleText = `Day ${dayNum}: Present`;
                } else if (status === 'absent') {
                  bgClass = 'bg-red-400 text-white';
                  titleText = `Day ${dayNum}: Absent`;
                } else if (status === 'weekend') {
                  bgClass = 'bg-slate-50 text-slate-300 cursor-not-allowed';
                  titleText = `Day ${dayNum}: Weekend`;
                } else if (status === 'future') {
                  bgClass = 'bg-slate-50/50 text-slate-200 cursor-not-allowed';
                  titleText = `Day ${dayNum}: Scheduled`;
                } else if (status === 'no-data') {
                  bgClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
                  titleText = `Day ${dayNum}: No attendance logs`;
                }
                
                return (
                  <div 
                    key={`day-${dayNum}`} 
                    className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-bold transition-all ${bgClass}`}
                    title={titleText}
                  >
                    {dayNum}
                  </div>
                );
              })}
           </div>
           {attendancePct === 0 ? (
             <p className="text-[10px] text-slate-400 italic text-center">* No attendance logs exist for this session.</p>
           ) : (
             <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
               <span>Rate: {attendancePct}%</span>
               <span>{currentMonthName} {currentYear} estimate</span>
             </div>
           )}
        </div>

        {/* Academic Alert Card */}
        <div className={`border rounded-xl p-8 flex gap-4 transition-all duration-300 ${alert.bgColor}`}>
           <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-lg ${alert.iconBg}`}>
              <span className={`material-symbols-outlined text-[20px] ${alert.iconColor}`}>{alert.icon}</span>
           </div>
           <div>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${alert.textColor}`}>{alert.title}</p>
              <p className={`text-xs font-medium leading-relaxed ${alert.textColor}/90`}>
                {alert.message}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
