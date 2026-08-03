import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AddStudentModal from '../components/AddStudentModal';
import { TableSkeleton } from '../components/common';
import { getUserSession, updateUserData } from '../auth/sessionController';
import { 
  ArrowLeft, User, BarChart2,
  Mail, Phone, MapPin, Calendar, Users, FolderOpen, Pencil, Trash2
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

  return (
    <Layout title="Student Profile" noPadding={true} showBack={true} onBack={() => navigate('/students')}>
      <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC]">
        {/* ── Hero Banner ───────────── */}
        <div className="px-5 pt-4 flex-shrink-0">
          <div 
            className="relative w-full rounded-2xl overflow-hidden border border-white/10 flex flex-col"
            style={{
              backgroundImage: `url('/student_profile_banner.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#35085C',
            }}
          >
            {/* Hero Banner Header: Left (Avatar + Student Info) & Right (Edit Profile) aligned at baseline */}
            <div className="flex items-start justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="relative group cursor-pointer flex-shrink-0">
                  <div className="w-[62px] h-[62px] rounded-xl bg-white/15 border-2 border-white/50 shadow-lg flex items-center justify-center overflow-hidden">
                    {student.avatar && !student.avatar.startsWith('https://ui-avatars.com') ? (
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-full h-full object-cover"
                        onClick={() => document.getElementById('student-profile-photo-upload').click()}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white text-[18px] font-black cursor-pointer tracking-wider"
                        onClick={() => document.getElementById('student-profile-photo-upload').click()}
                      >
                        {(student.name || 'S').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div 
                    onClick={() => document.getElementById('student-profile-photo-upload').click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 rounded-xl"
                  >
                    <span className="text-white text-[9px] font-bold tracking-wider">UPLOAD</span>
                  </div>
                  {student.avatar && !student.avatar.startsWith('https://ui-avatars.com') && (
                    <button 
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-1 -right-1 z-20 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md border border-white"
                      title="Remove photo"
                    >
                      <Trash2 size={10} />
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
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-[18px] font-black tracking-tight leading-none text-white">{student.name}</h2>
                    <span className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
                      {student.rollNumber || student.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/75 font-medium mb-1.5">
                    Semester {student.semester || 1}&nbsp;&nbsp;•&nbsp;&nbsp;{student.departmentId || student.department || 'Information Technology'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#10B981] text-white text-[8px] font-extrabold uppercase tracking-wider rounded-md">
                      {student.status || 'ACTIVE'}
                    </span>
                    <span className="text-[11px] font-bold text-white/90">
                      CGPA: {student.cgpa || '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Profile Button aligned with student name */}
              <button
                onClick={() => navigate(`/edit-student/${student.id || student.rollNumber}`)}
                className="h-8 px-3.5 flex items-center gap-1.5 rounded-xl text-[11px] font-bold text-white transition-all cursor-pointer shadow-sm hover:bg-white/25"
                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                <Pencil size={12} />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Row 3: Floating Tab Bar */}
            <div className="px-5 pb-0">
              <div
                className="inline-flex items-center rounded-[18px] p-1.5"
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0 12px 40px rgba(15,23,42,.12)',
                  border: '1px solid rgba(15,23,42,.06)'
                }}
              >
                {(() => {
                  const session = getUserSession();
                  const showDocumentsTab = session && (session.role === 'admin' || session.userId === id || session.userId?.toString() === id?.toString());
                  const dynamicTabs = [...profileTabs];
                  if (showDocumentsTab) {
                    dynamicTabs.push({ id: 'documents', label: 'Documents', icon: FolderOpen });
                  }
                  return dynamicTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="relative flex items-center gap-2 px-5 py-2.5 rounded-[13px] text-[13px] font-semibold transition-all duration-200 cursor-pointer"
                        style={isActive
                          ? { background: 'linear-gradient(135deg, #F3E8FF, #F8F5FF)', color: '#6D28D9' }
                          : { color: '#64748B' }
                        }
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#334155'; }}}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}}
                      >
                        <Icon size={16} />
                        <span>{tab.label}</span>
                        {isActive && (
                          <span
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                            style={{ width: '22px', height: '3px', background: '#7C3AED' }}
                          />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
            <div className="h-3" />
          </div>
        </div>

        {/* ── Main Content Area ──────────────────────────────── */}
        <div className="flex-1 min-h-0 px-5 pt-3 pb-3 overflow-hidden">
          {activeTab === 'overview' && (
            <OverviewTab student={student} />
          )}

          {activeTab === 'academics' && <AcademicsTab student={student} loading={loading} yearFilter={yearFilter} setYearFilter={setYearFilter} semesterFilter={semesterFilter} setSemesterFilter={setSemesterFilter} />}
          {activeTab === 'fees' && <FeesTab student={student} loading={loading} />}
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
    if (!dateStr) return '27 Sept 2005';
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
    
    return baseAddr || 'nagapattinam';
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">

      {/* ── Top 3 Cards Grid ──────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 overflow-hidden">

        {/* ── Card 1: Personal & Contact ── */}
        <div className="col-span-4 rounded-2xl border border-[#E9E2FF] p-4 flex flex-col shadow-sm overflow-hidden" style={{ background: 'linear-gradient(145deg,#FAF8FF,#F3EEFF)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)' }}>
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
            <h3 className="text-[14px] font-bold text-[#1E293B]">Personal &amp; Contact</h3>
          </div>

          {/* Rows — each in its own rounded container */}
          <div className="flex flex-col gap-2 flex-1">
            {[
              { label: 'Phone Number', value: student.phone || student.mobile || '8438021014', icon: 'call', bg: '#EDE9FE', color: '#7C3AED' },
              { label: 'Email', value: student.email || 'mohamedriyasudeen@gmail.com', icon: 'mail', bg: '#EDE9FE', color: '#7C3AED' },
              { label: 'Permanent Address', value: getFormattedAddress(), icon: 'location_on', bg: '#EDE9FE', color: '#7C3AED' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-3 py-2.5 bg-white rounded-xl" style={{ boxShadow: '0 1px 4px rgba(124,58,237,0.08)', border: '1px solid #EDE9FE' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-[#94A3B8] mb-0.5 font-medium">{row.label}</p>
                  <p className="text-[13px] font-semibold text-[#1E293B] truncate leading-tight">{row.value}</p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: row.bg }}>
                  <span className="material-symbols-outlined text-[15px]" style={{ color: row.color }}>{row.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom 2 chips — DOB & Gender */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Date of Birth */}
            <div className="flex items-center gap-2 p-2 xl:p-3 bg-white rounded-xl" style={{ border: '1px solid #EDE9FE', boxShadow: '0 1px 3px rgba(124,58,237,0.06)' }}>
              <div className="w-7 h-7 xl:w-9 xl:h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[14px] xl:text-[18px] text-[#4F46E5]">calendar_month</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] xl:text-[11px] font-semibold text-[#94A3B8] leading-none whitespace-nowrap">DOB</p>
                <p className="text-[11px] xl:text-[13px] font-bold text-[#1E293B] leading-snug truncate">{formatDate(student.dateOfBirth || student.dob)}</p>
              </div>
            </div>
            {/* Gender */}
            <div className="flex items-center gap-2 p-2 xl:p-3 bg-white rounded-xl" style={{ border: '1px solid #EDE9FE', boxShadow: '0 1px 3px rgba(124,58,237,0.06)' }}>
              <div className="w-7 h-7 xl:w-9 xl:h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[14px] xl:text-[18px] text-[#2563EB]">person</span>
              </div>
              <div>
                <p className="text-[9px] xl:text-[11px] font-semibold text-[#94A3B8] leading-none">Gender</p>
                <p className="text-[11px] xl:text-[13px] font-bold text-[#1E293B] leading-snug">{student.gender || 'Male'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card 2: Family & Guardian ── */}
        <div className="col-span-4 rounded-2xl border border-[#A7F3D0] p-4 flex flex-col shadow-sm overflow-hidden" style={{ background: 'linear-gradient(145deg,#F4FDF9,#ECFDF5)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
              <span className="material-symbols-outlined text-white text-[18px]">group</span>
            </div>
            <h3 className="text-[14px] font-bold text-[#1E293B]">Family &amp; Guardian</h3>
          </div>

          {/* Rows — each in its own rounded container */}
          <div className="flex flex-col gap-1.5 flex-1 justify-around">
            {[
              { label: 'Guardian Name', value: student.guardianName || student.guardian || 'jahabarali', icon: 'person', bg: '#ECFDF5', color: '#059669' },
              { label: 'Relationship', value: student.relationship || 'Not provided', icon: 'favorite', bg: '#ECFDF5', color: '#059669' },
              { label: 'Guardian Contact', value: student.guardianPhone || student.guardianMobile || '8438021014', icon: 'call', bg: '#ECFDF5', color: '#059669' },
              { label: 'Guardian Email', value: student.guardianEmail || 'Not provided', icon: 'mail', bg: '#ECFDF5', color: '#059669' },
              { label: 'Guardian Occupation', value: student.guardianOccupation || 'Not provided', icon: 'business_center', bg: '#ECFDF5', color: '#059669' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-3 py-2 bg-white rounded-xl" style={{ boxShadow: '0 1px 4px rgba(5,150,105,0.08)', border: '1px solid #D1FAE5' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-[#94A3B8] mb-0.5 font-medium">{item.label}</p>
                  <p className="text-[13px] font-semibold text-[#1E293B] truncate leading-tight">{item.value}</p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: item.bg }}>
                  <span className="material-symbols-outlined text-[15px]" style={{ color: item.color }}>{item.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Col 3: GPA Trend + Attendance stacked ── */}
        <div className="col-span-4 flex flex-col gap-3 overflow-hidden">

          {/* GPA Trend Card */}
          <div className="bg-white rounded-2xl border border-[#EFEFEF] p-4 flex flex-col shadow-sm flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F59E0B,#FCD34D)' }}>
                  <span className="material-symbols-outlined text-white text-[16px]">trending_up</span>
                </div>
                <h3 className="text-[14px] font-bold text-[#1E293B]">GPA Trend</h3>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full" style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}>
                No GPA Recorded
              </span>
            </div>
            <div className="flex-1 rounded-xl flex flex-col items-center justify-center gap-1.5" style={{ background: '#FFFBEB' }}>
              <span className="material-symbols-outlined text-[32px]" style={{ color: '#F59E0B' }}>bar_chart</span>
              <p className="text-[11px] font-semibold text-[#94A3B8]">No GPA records available</p>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center mt-2">
              {['SEM1', 'SEM2', 'SEM3', 'SEM4'].map(sem => (
                <span key={sem} className="text-[9px] font-semibold text-[#94A3B8]">{sem}</span>
              ))}
            </div>
          </div>

          {/* Attendance Card */}
          <div className="bg-white rounded-2xl border border-[#EFEFEF] p-4 flex flex-col shadow-sm flex-1 overflow-hidden">
            <AttendanceCard />          
          </div>
        </div>
      </div>

      {/* ── Bottom 5 Summary Cards ─────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 flex-shrink-0">
        {[
          {
            label: 'Classes Attended', sub: '0%', detail: '0 / 0',
            bg: '#EEF2FF', iconBg: 'linear-gradient(135deg,#4F46E5,#6366F1)',
            icon: 'menu_book', color: '#4F46E5'
          },
          {
            label: 'Assignments', sub: '0', detail: 'Submitted',
            bg: '#ECFDF5', iconBg: 'linear-gradient(135deg,#059669,#10B981)',
            icon: 'checklist', color: '#059669'
          },
          {
            label: 'Exams', sub: '0', detail: 'Completed',
            bg: '#FFFBEB', iconBg: 'linear-gradient(135deg,#D97706,#F59E0B)',
            icon: 'description', color: '#D97706'
          },
          {
            label: 'Achievements', sub: '0', detail: 'Earned',
            bg: '#FFF1F2', iconBg: 'linear-gradient(135deg,#E11D48,#F43F5E)',
            icon: 'emoji_events', color: '#E11D48'
          },
          {
            label: 'Certificates', sub: '0', detail: 'Earned',
            bg: '#EFF6FF', iconBg: 'linear-gradient(135deg,#2563EB,#3B82F6)',
            icon: 'workspace_premium', color: '#2563EB'
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl p-3.5 flex items-center gap-3"
            style={{ background: card.bg }}
          >
            <div
              className="w-10 h-10 rounded-xl text-white flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: card.iconBg }}
            >
              <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold truncate leading-tight" style={{ color: card.color }}>{card.label}</p>
              <p className="text-[17px] font-extrabold text-[#1E293B] leading-tight">{card.sub}</p>
              <p className="text-[10px] font-medium text-[#94A3B8]">{card.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Attendance Card — week-wise navigation ───────────────────────────────────
function AttendanceCard() {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekStart = (offset) => {
    const now = new Date();
    const dow = now.getDay();
    const diff = dow === 0 ? 6 : dow - 1;
    const mon = new Date(now);
    mon.setDate(now.getDate() - diff + offset * 7);
    mon.setHours(0, 0, 0, 0);
    return mon;
  };

  const weekStart = getWeekStart(weekOffset);
  const weekEnd   = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatRange = () => {
    const s = weekStart, e = weekEnd;
    if (s.getMonth() === e.getMonth())
      return `${s.getDate()} – ${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
    return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]}`;
  };

  const DAY_LABELS = ['M','T','W','T','F','S','S'];
  const weekDates  = DAY_LABELS.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.getDate();
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F43F5E,#FB7185)' }}>
            <span className="material-symbols-outlined text-white text-[16px]">calendar_month</span>
          </div>
          <h3 className="text-[12px] font-bold text-[#1E293B]">Attendance: {formatRange()}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-6 h-6 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px] text-[#64748B]">chevron_left</span>
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            disabled={weekOffset >= 0}
            className="w-6 h-6 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[14px] text-[#64748B]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_LABELS.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold text-[#1E293B] leading-none">{weekDates[i]}</span>
              <span className="text-[9px] font-semibold text-[#94A3B8] leading-none">{day}</span>
              <div className="w-6 h-6 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Academics Tab ────────────────────────────────────────────────────────────
function AcademicsTab({ student, loading, yearFilter, setYearFilter, semesterFilter, setSemesterFilter }) {
  const filteredSubjects = (student.subjects || []).filter(sub => {
    const matchesYear = yearFilter === 'All' || sub.year === yearFilter;
    const matchesSem = semesterFilter === 'All' || sub.semester?.toString() === semesterFilter;
    return matchesYear && matchesSem;
  });
  const allPassed = (student.subjects || []).filter(s => s.grade && s.grade !== 'Pending' && s.grade !== 'F');
  const globalCGPA = allPassed.length > 0 ? ((allPassed.reduce((a,s) => a+(s.total||0),0)/(allPassed.length*100))*10).toFixed(2) : '0.00';
  const activePassed = filteredSubjects.filter(s => s.grade && s.grade !== 'Pending' && s.grade !== 'F');
  const dynamicGPA = activePassed.length > 0 ? ((activePassed.reduce((a,s) => a+(s.total||0),0)/(activePassed.length*100))*10).toFixed(2) : '0.00';
  const gradeStyle = (g) => {
    if (!g || g === 'Pending') return { bg:'#F8FAFC', color:'#64748B', border:'#E2E8F0' };
    if (g==='A+'||g==='A') return { bg:'#ECFDF5', color:'#059669', border:'#A7F3D0' };
    if (g==='B+'||g==='B') return { bg:'#EFF6FF', color:'#2563EB', border:'#BFDBFE' };
    if (g==='C+'||g==='C') return { bg:'#FFFBEB', color:'#D97706', border:'#FDE68A' };
    if (g==='F') return { bg:'#FFF1F2', color:'#E11D48', border:'#FECDD3' };
    return { bg:'#F8FAFC', color:'#64748B', border:'#E2E8F0' };
  };
  const summaryCards = [
    { label:'Overall CGPA', value:globalCGPA, icon:'military_tech', bg:'linear-gradient(135deg,#7C3AED,#A855F7)', cardBg:'#F5F3FF', border:'#EDE9FE' },
    { label:'Sem GPA', value:dynamicGPA, icon:'analytics', bg:'linear-gradient(135deg,#0284C7,#38BDF8)', cardBg:'#F0F9FF', border:'#BAE6FD' },
    { label:'Courses', value:filteredSubjects.length, icon:'menu_book', bg:'linear-gradient(135deg,#059669,#10B981)', cardBg:'#ECFDF5', border:'#A7F3D0' },
    { label:'Credits Earned', value:`${activePassed.length*4}`, icon:'verified', bg:'linear-gradient(135deg,#D97706,#F59E0B)', cardBg:'#FFFBEB', border:'#FDE68A' },
  ];
  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {summaryCards.map(c => (
          <div key={c.label} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background:c.cardBg, border:`1px solid ${c.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background:c.bg }}>
              <span className="material-symbols-outlined text-white text-[20px]">{c.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] leading-none">{c.label}</p>
              <p className="text-[20px] font-extrabold text-[#1E293B] leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-[#EFEFEF] flex flex-col shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9] flex-shrink-0">
          <div>
            <h3 className="text-[13px] font-bold text-[#1E293B]">Subject Performance</h3>
            <p className="text-[10px] text-[#94A3B8] font-medium">Academic history &amp; marks</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setSemesterFilter('All'); }} className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] font-semibold text-[#64748B] outline-none cursor-pointer">
              <option value="All">All Years</option>
              {['1st Year','2nd Year','3rd Year','4th Year'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] font-semibold text-[#64748B] outline-none cursor-pointer">
              <option value="All">All Sems</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>Sem {s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#F1F5F9]">
              <tr>{['Code','Subject Name','Year','Sem','Grade','Score'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {loading ? <tr><td colSpan={6} className="py-8 text-center text-[#94A3B8] text-sm">Loading...</td></tr>
              : filteredSubjects.length > 0 ? filteredSubjects.map((sub, i) => {
                const gc = gradeStyle(sub.grade);
                return (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-2.5 text-[12px] font-bold text-[#4F46E5]">{sub.code||'—'}</td>
                    <td className="px-4 py-2.5 text-[12px] font-medium text-[#1E293B]">{sub.name||'—'}</td>
                    <td className="px-4 py-2.5 text-[11px] text-[#64748B]">{sub.year||'—'}</td>
                    <td className="px-4 py-2.5 text-[11px] text-[#64748B]">{sub.semester ? `S${sub.semester}` : '—'}</td>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-lg text-[11px] font-bold" style={{ background:gc.bg,color:gc.color,border:`1px solid ${gc.border}` }}>{sub.grade||'Pending'}</span></td>
                    <td className="px-4 py-2.5 text-[12px] font-semibold text-[#1E293B]">{sub.total??'—'}</td>
                  </tr>
                );
              }) : <tr><td colSpan={6} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[32px] text-[#CBD5E1]">menu_book</span>
                  <p className="text-[12px] font-semibold text-[#94A3B8]">No subjects found</p>
                </div>
              </td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Fees Tab ─────────────────────────────────────────────────────────────────
function FeesTab({ student, loading }) {
  const fees = student.fees || [];
  const totalAmount = fees.reduce((a,f) => a+(Number(f.amount)||0), 0);
  const totalPaid   = fees.reduce((a,f) => a+(Number(f.paid)||0),   0);
  const totalDue    = fees.reduce((a,f) => a+(Number(f.due)||0),    0);
  const paidPct = totalAmount > 0 ? Math.round((totalPaid/totalAmount)*100) : 0;
  const statusStyle = (s) => {
    if (s==='Paid')    return { bg:'#ECFDF5', color:'#059669', border:'#A7F3D0' };
    if (s==='Partial') return { bg:'#FFFBEB', color:'#D97706', border:'#FDE68A' };
    return { bg:'#FFF1F2', color:'#E11D48', border:'#FECDD3' };
  };
  const summaryCards = [
    { label:'Total Fees',   value:`₹${totalAmount.toLocaleString()}`, icon:'account_balance_wallet', bg:'linear-gradient(135deg,#4F46E5,#6366F1)', cardBg:'#EEF2FF', border:'#C7D2FE' },
    { label:'Amount Paid',  value:`₹${totalPaid.toLocaleString()}`,   icon:'check_circle',           bg:'linear-gradient(135deg,#059669,#10B981)', cardBg:'#ECFDF5', border:'#A7F3D0' },
    { label:'Amount Due',   value:`₹${totalDue.toLocaleString()}`,    icon:'pending',                bg:'linear-gradient(135deg,#E11D48,#F43F5E)', cardBg:'#FFF1F2', border:'#FECDD3' },
    { label:'Paid %',       value:`${paidPct}%`,                       icon:'pie_chart',              bg:'linear-gradient(135deg,#D97706,#F59E0B)', cardBg:'#FFFBEB', border:'#FDE68A' },
  ];
  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {summaryCards.map(c => (
          <div key={c.label} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background:c.cardBg, border:`1px solid ${c.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background:c.bg }}>
              <span className="material-symbols-outlined text-white text-[20px]">{c.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] leading-none">{c.label}</p>
              <p className="text-[17px] font-extrabold text-[#1E293B] leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-[#EFEFEF] flex flex-col shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9] flex-shrink-0">
          <div>
            <h3 className="text-[13px] font-bold text-[#1E293B]">Fee Records</h3>
            <p className="text-[10px] text-[#94A3B8] font-medium">Semester-wise payment history</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#059669] to-[#10B981] rounded-full" style={{ width:`${paidPct}%` }} />
            </div>
            <span className="text-[11px] font-bold text-[#059669]">{paidPct}% paid</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#F1F5F9]">
              <tr>{['Fee Type','Total','Paid','Due','Status'].map(h => <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {loading ? <tr><td colSpan={5} className="py-8 text-center text-[#94A3B8] text-sm">Loading...</td></tr>
              : fees.length > 0 ? fees.map((fee, i) => {
                const ss = statusStyle(fee.status);
                const fp = fee.amount > 0 ? Math.round((fee.paid/fee.amount)*100) : 0;
                return (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center"><span className="material-symbols-outlined text-[13px] text-[#4F46E5]">receipt_long</span></div><span className="text-[12px] font-semibold text-[#1E293B]">{fee.type}</span></div></td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#1E293B]">₹{Number(fee.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#059669]">₹{Number(fee.paid).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#E11D48]">₹{Number(fee.due).toLocaleString()}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold" style={{ background:ss.bg,color:ss.color,border:`1px solid ${ss.border}` }}>{fee.status}</span><span className="text-[10px] text-[#94A3B8]">{fp}%</span></div></td>
                  </tr>
                );
              }) : <tr><td colSpan={5} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[32px] text-[#CBD5E1]">account_balance_wallet</span>
                  <p className="text-[12px] font-semibold text-[#94A3B8]">No fee records available</p>
                </div>
              </td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
