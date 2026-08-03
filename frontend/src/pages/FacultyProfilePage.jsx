import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AddEditFacultyModal from '../components/AddEditFacultyModal';
import RequestLeaveModal from '../components/RequestLeaveModal';
import PerformanceEvaluationModal from '../components/PerformanceEvaluationModal';
import PayrollIntegrationPanel from '../components/PayrollIntegrationPanel';
import CareerPathwayTracking from '../components/CareerPathwayTracking';
import Pagination from '../components/common/Pagination';
import { getUserSession, updateUserData } from '../auth/sessionController';
import { 
  User, BarChart2, TrendingUp,
  Mail, Phone, MapPin, Briefcase, Calendar, Target, DollarSign, FolderOpen, Pencil, Trash2
} from 'lucide-react';
import { API_BASE } from '../api/apiBase';
import '../styles.css';

const API_BASE_URL = API_BASE;
const profileTabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'academics', label: 'Academics', icon: BarChart2 },
  { id: 'payroll', label: 'Invoice & Payroll', icon: DollarSign },
  { id: 'career', label: 'Career Path', icon: Target },
  { id: 'leave', label: 'Leave & Attendance', icon: Calendar },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
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
    if (id && id !== 'undefined') {
      fetchFacultyDetails();
    } else {
      setError('Invalid faculty ID');
      setLoading(false);
    }
  }, [id]);

  const fetchFacultyDetails = async () => {
    if (!id || id === 'undefined') {
      setError('Invalid faculty ID');
      setLoading(false);
      return;
    }
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

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/faculty/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: base64Data })
        });
        if (!response.ok) {
          throw new Error('Failed to update profile photo');
        }
        await fetchFacultyDetails();
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
      const response = await fetch(`${API_BASE_URL}/faculty/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: null })
      });
      if (!response.ok) {
        throw new Error('Failed to remove profile photo');
      }
      await fetchFacultyDetails();
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
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/faculty')}
              className="px-5 py-2.5 bg-[#4c1d95] text-white rounded-lg text-sm font-semibold hover:bg-[#3b0764] transition-all cursor-pointer"
            >
              Back to Faculty
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const facId = faculty.employeeId || faculty.id || id;
  const facName = faculty.name || faculty.fullName || 'Faculty Member';
  const facDept = faculty.departmentId || faculty.department || 'Information Technology';
  const facRole = faculty.designation || faculty.role || 'Assistant Professor';
  const facExp = faculty.experience_years || faculty.yearsOfExperience || 5;

  return (
    <Layout title="Faculty Profile" noPadding={true} showBack={true} onBack={() => navigate('/faculty')}>
      <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC]">
        {/* ── Hero Banner ───────────── */}
        <div className="px-5 pt-4 flex-shrink-0">
          <div 
            className="relative w-full rounded-2xl overflow-hidden border border-white/10 flex flex-col shadow-sm"
            style={{
              backgroundImage: `url('/student_profile_banner.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#35085C',
            }}
          >
            {/* Hero Header: Left (Avatar + Faculty Info) & Right (Edit Profile) aligned at baseline */}
            <div className="flex items-start justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="relative group cursor-pointer flex-shrink-0">
                  <div className="w-[62px] h-[62px] rounded-xl bg-white/15 border-2 border-white/50 shadow-lg flex items-center justify-center overflow-hidden">
                    {faculty.avatar && !faculty.avatar.startsWith('https://ui-avatars.com') ? (
                      <img
                        src={faculty.avatar}
                        alt={facName}
                        className="w-full h-full object-cover"
                        onClick={() => document.getElementById('faculty-profile-photo-upload').click()}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white text-[18px] font-black cursor-pointer tracking-wider"
                        onClick={() => document.getElementById('faculty-profile-photo-upload').click()}
                      >
                        {facName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div 
                    onClick={() => document.getElementById('faculty-profile-photo-upload').click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 rounded-xl"
                  >
                    <span className="text-white text-[9px] font-bold tracking-wider">UPLOAD</span>
                  </div>
                  {faculty.avatar && !faculty.avatar.startsWith('https://ui-avatars.com') && (
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
                  id="faculty-profile-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-[18px] font-black tracking-tight leading-none text-white">{facName}</h2>
                    <span className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
                      {facId}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/75 font-medium mb-1.5">
                    {facRole}&nbsp;&nbsp;•&nbsp;&nbsp;{facDept}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#10B981] text-white text-[8px] font-extrabold uppercase tracking-wider rounded-md">
                      {faculty.employment_status || faculty.status || 'ACTIVE'}
                    </span>
                    <span className="text-[11px] font-bold text-white/90">
                      {facExp} Yrs Experience
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Profile Button aligned with faculty name */}
              <button
                onClick={() => navigate(`/edit-faculty/${facId}`)}
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
                {profileTabs.map((tab) => {
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
                })}
              </div>
            </div>
            <div className="h-3" />
          </div>
        </div>

        {/* ── Main Content Area ──────────────────────────────── */}
        <div className="flex-1 min-h-0 px-5 pt-3 pb-3 overflow-hidden">
          {activeTab === 'overview' && <OverviewTab faculty={faculty} />}
          {activeTab === 'performance' && <PerformanceTab faculty={faculty} onEvaluate={() => setIsEvalModalOpen(true)} />}
          {activeTab === 'academics' && <AcademicsTab faculty={faculty} />}
          {activeTab === 'payroll' && <PayrollTab faculty={faculty} facId={facId} />}
          {activeTab === 'career' && <CareerTab faculty={faculty} facId={facId} />}
          {activeTab === 'leave' && <LeaveTab faculty={faculty} onRequestLeave={() => setIsRequestLeaveOpen(true)} />}
          {activeTab === 'documents' && <DocumentsTab faculty={faculty} onRefresh={fetchFacultyDetails} />}
        </div>
      </div>

      {isRequestLeaveOpen && (
        <RequestLeaveModal
          isOpen={isRequestLeaveOpen}
          onClose={() => setIsRequestLeaveOpen(false)}
          facultyId={facId}
          onSuccess={fetchFacultyDetails}
        />
      )}

      {isEvalModalOpen && (
        <PerformanceEvaluationModal
          isOpen={isEvalModalOpen}
          onClose={() => setIsEvalModalOpen(false)}
          facultyId={facId}
          facultyName={facName}
          onSuccess={fetchFacultyDetails}
        />
      )}
    </Layout>
  );
}

/* ── OVERVIEW TAB ──────────────────────────────────────────────────────────── */
function OverviewTab({ faculty }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '15 Aug 1985';
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
    const addr = faculty.addressLine1 || faculty.address;
    const addr2 = faculty.addressLine2;
    const city = faculty.city;
    const state = faculty.state || 'Tamil Nadu';
    const pin = faculty.pincode || faculty.pinCode;

    let parts = [];
    if (addr) parts.push(addr);
    if (addr2) parts.push(addr2);
    if (city) parts.push(city);
    if (state) parts.push(state);
    
    let baseAddr = parts.join(', ');
    if (pin) {
      if (baseAddr) baseAddr += ` - ${pin}`;
      else baseAddr = pin;
    }
    
    return baseAddr || 'Nagapattinam, Tamil Nadu';
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* ── Top 3 Cards Grid ──────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 overflow-hidden">

        {/* ── Card 1: Personal & Contact ── */}
        <div className="col-span-4 rounded-2xl border border-[#E9E2FF] p-4 flex flex-col shadow-sm overflow-hidden" style={{ background: 'linear-gradient(145deg,#FAF8FF,#F3EEFF)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)' }}>
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
            <h3 className="text-[14px] font-bold text-[#1E293B]">Personal &amp; Contact</h3>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            {[
              { label: 'Phone Number', value: faculty.phone || '+91 98765 43210', icon: 'call', bg: '#EDE9FE', color: '#7C3AED' },
              { label: 'Email Address', value: faculty.email || 'faculty@university.edu', icon: 'mail', bg: '#EDE9FE', color: '#7C3AED' },
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

          {/* Bottom 2 chips: DOB & Gender */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center gap-2 p-2 xl:p-3 bg-white rounded-xl" style={{ border: '1px solid #EDE9FE', boxShadow: '0 1px 3px rgba(124,58,237,0.06)' }}>
              <div className="w-7 h-7 xl:w-9 xl:h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[14px] xl:text-[18px] text-[#4F46E5]">calendar_month</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] xl:text-[11px] font-semibold text-[#94A3B8] leading-none whitespace-nowrap">DOB</p>
                <p className="text-[11px] xl:text-[13px] font-bold text-[#1E293B] leading-snug truncate">{formatDate(faculty.dateOfBirth || faculty.dob)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 xl:p-3 bg-white rounded-xl" style={{ border: '1px solid #EDE9FE', boxShadow: '0 1px 3px rgba(124,58,237,0.06)' }}>
              <div className="w-7 h-7 xl:w-9 xl:h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[14px] xl:text-[18px] text-[#2563EB]">person</span>
              </div>
              <div>
                <p className="text-[9px] xl:text-[11px] font-semibold text-[#94A3B8] leading-none">Gender</p>
                <p className="text-[11px] xl:text-[13px] font-bold text-[#1E293B] leading-snug">{faculty.gender || 'Male'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card 2: Professional & Qualification Credentials ── */}
        <div className="col-span-4 rounded-2xl border border-[#A7F3D0] p-4 flex flex-col shadow-sm overflow-hidden" style={{ background: 'linear-gradient(145deg,#F4FDF9,#ECFDF5)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
              <span className="material-symbols-outlined text-white text-[18px]">school</span>
            </div>
            <h3 className="text-[14px] font-bold text-[#1E293B]">Professional &amp; Credentials</h3>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 justify-around">
            {[
              { label: 'Highest Degree', value: faculty.highestQualification || faculty.qualification || 'Ph.D. in Computer Science', icon: 'workspace_premium', bg: '#ECFDF5', color: '#059669' },
              { label: 'Specialization', value: faculty.specialization || 'Artificial Intelligence & ML', icon: 'psychology', bg: '#ECFDF5', color: '#059669' },
              { label: 'University', value: faculty.university || 'IIT Madras', icon: 'account_balance', bg: '#ECFDF5', color: '#059669' },
              { label: 'Employment Type', value: faculty.employmentType || faculty.employment_status || 'Full-Time Faculty', icon: 'badge', bg: '#ECFDF5', color: '#059669' },
              { label: 'NET / SET Status', value: faculty.netGateQualified || 'UGC-NET Qualified', icon: 'verified', bg: '#ECFDF5', color: '#059669' },
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

        {/* ── Card 3: Performance & Teaching Summary ── */}
        <div className="col-span-4 rounded-2xl border border-[#BAE6FD] p-4 flex flex-col shadow-sm overflow-hidden" style={{ background: 'linear-gradient(145deg,#F0F9FF,#E0F2FE)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0284C7,#0EA5E9)' }}>
              <span className="material-symbols-outlined text-white text-[18px]">analytics</span>
            </div>
            <h3 className="text-[14px] font-bold text-[#1E293B]">Performance &amp; Office</h3>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            {[
              { label: 'Attendance Rate', value: `${faculty.attendance_rate || 94}%`, icon: 'how_to_reg', bg: '#E0F2FE', color: '#0284C7' },
              { label: 'Student Pass Rate', value: `${faculty.pass_rate || 96}%`, icon: 'grade', bg: '#E0F2FE', color: '#0284C7' },
              { label: 'Office Location', value: faculty.office_location || 'Building A, Room 301', icon: 'apartment', bg: '#E0F2FE', color: '#0284C7' },
              { label: 'Primary Subject', value: faculty.subject || 'Database Systems', icon: 'menu_book', bg: '#E0F2FE', color: '#0284C7' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-3 py-2.5 bg-white rounded-xl" style={{ boxShadow: '0 1px 4px rgba(2,132,199,0.08)', border: '1px solid #BAE6FD' }}>
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

      </div>

      {/* ── Bottom 5 Summary Cards Row ─────────────────────── */}
      <div className="grid grid-cols-5 gap-3 flex-shrink-0">
        {[
          {
            label: 'Classes Conducted', sub: '48 Hrs', detail: 'This semester',
            bg: '#EEF2FF', iconBg: 'linear-gradient(135deg,#4F46E5,#6366F1)',
            icon: 'menu_book', color: '#4F46E5'
          },
          {
            label: 'Research Papers', sub: `${faculty.experience_years ? faculty.experience_years + 3 : 8} Papers`, detail: 'Published',
            bg: '#ECFDF5', iconBg: 'linear-gradient(135deg,#059669,#10B981)',
            icon: 'article', color: '#059669'
          },
          {
            label: 'Evaluation Score', sub: `${faculty.pass_rate ? (faculty.pass_rate / 20).toFixed(1) : '4.8'} / 5.0`, detail: 'Student Feedback',
            bg: '#FFFBEB', iconBg: 'linear-gradient(135deg,#D97706,#F59E0B)',
            icon: 'star', color: '#D97706'
          },
          {
            label: 'Leave Balance', sub: '33 Days', detail: 'Available',
            bg: '#FFF1F2', iconBg: 'linear-gradient(135deg,#E11D48,#F43F5E)',
            icon: 'event_available', color: '#E11D48'
          },
          {
            label: 'Mentorships', sub: '42 Students', detail: 'Under Guidance',
            bg: '#EFF6FF', iconBg: 'linear-gradient(135deg,#2563EB,#3B82F6)',
            icon: 'diversity_3', color: '#2563EB'
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs"
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

/* ── PERFORMANCE TAB ───────────────────────────────────────────────────────── */
function PerformanceTab({ faculty, onEvaluate }) {
  const rating = faculty.pass_rate ? (faculty.pass_rate / 20).toFixed(1) : '0.0';
  const attendance = faculty.attendance_rate || 0;

  const realEvals = faculty.evaluations || faculty.reviews;
  const evaluations = Array.isArray(realEvals) ? realEvals : [];

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto custom-scrollbar">
      {/* Performance Appraisal Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7C3AED]">
            <span className="material-symbols-outlined text-[24px]">trending_up</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-0.5">
              Faculty Performance &amp; Evaluation Scorecard
            </h3>
            <p className="text-xs text-slate-500">
              Annual appraisal metrics, teaching rating, research output, and peer reviews.
            </p>
          </div>
        </div>
        <button
          onClick={onEvaluate}
          className="px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">rate_review</span>
          <span>Evaluate Performance</span>
        </button>
      </div>

      {/* KPI Scorecard Cards Grid */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: 'Overall Score', value: rating > 0 ? `${rating} / 5.0` : 'N/A', sub: 'Performance Rating', icon: 'military_tech', bg: 'linear-gradient(135deg,#7C3AED,#A855F7)', cardBg: '#F5F3FF', border: '#EDE9FE' },
          { label: 'Teaching Effectiveness', value: faculty.pass_rate ? `${faculty.pass_rate}%` : 'N/A', sub: 'Student Pass Rate', icon: 'analytics', bg: 'linear-gradient(135deg,#059669,#10B981)', cardBg: '#ECFDF5', border: '#A7F3D0' },
          { label: 'Class Attendance Rate', value: attendance > 0 ? `${attendance}%` : 'N/A', sub: 'Presence Record', icon: 'how_to_reg', bg: 'linear-gradient(135deg,#0284C7,#38BDF8)', cardBg: '#F0F9FF', border: '#BAE6FD' },
          { label: 'Research Publications', value: `${faculty.publications?.length || 0} Papers`, sub: 'Journals & Conferences', icon: 'menu_book', bg: 'linear-gradient(135deg,#D97706,#F59E0B)', cardBg: '#FFFBEB', border: '#FDE68A' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl p-4 flex items-center gap-3 shadow-2xs" style={{ background: card.cardBg, border: `1px solid ${card.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm" style={{ background: card.bg }}>
              <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] leading-none uppercase tracking-wider">{card.label}</p>
              <p className="text-[18px] font-extrabold text-[#1E293B] leading-tight my-0.5">{card.value}</p>
              <p className="text-[10px] font-bold text-[#64748B]">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Peer Review & Evaluation History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm overflow-hidden flex-1">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7C3AED] text-base">history_edu</span>
            Evaluation &amp; Peer Review History
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">{evaluations.length} Recorded Appraisal{evaluations.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {evaluations.length === 0 ? (
            <div className="text-center py-16 px-4">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">rate_review</span>
              <p className="text-xs font-bold text-slate-500">No evaluation records found for this faculty member</p>
              <p className="text-[10px] text-slate-400 mt-1">Click "Evaluate Performance" above to add an evaluation appraisal</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#F1F5F9]">
                <tr>
                  {['Academic Period', 'Evaluator', 'Teaching Rating', 'Research Rating', 'Review Status', 'Evaluation Date'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {evaluations.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-[#003A40]">{ev.semester || ev.period || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">{ev.evaluator || 'HOD Evaluation'}</td>
                    <td className="px-4 py-3 text-xs font-bold text-emerald-600">{ev.score || ev.teachingScore || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs font-bold text-indigo-600">{ev.research || ev.researchScore || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
                        {ev.status || 'SUBMITTED'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{ev.date || ev.created_at || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── ACADEMICS & TEACHING TAB ──────────────────────────────────────────────── */
function AcademicsTab({ faculty }) {
  const rawSubjects = faculty.subjects || faculty.assigned_courses;
  const subjects = Array.isArray(rawSubjects) ? rawSubjects : [];

  const rawPubs = faculty.publications || faculty.research_papers;
  const publications = Array.isArray(rawPubs) ? rawPubs : [];

  const totalStudents = subjects.reduce((a, b) => a + (b.students || b.enrolled_count || 0), 0);

  const summaryCards = [
    { label: 'Active Courses', value: `${subjects.length} Courses`, icon: 'menu_book', bg: 'linear-gradient(135deg,#7C3AED,#A855F7)', cardBg: '#F5F3FF', border: '#EDE9FE' },
    { label: 'Total Enrolled', value: `${totalStudents} Students`, icon: 'groups', bg: 'linear-gradient(135deg,#059669,#10B981)', cardBg: '#ECFDF5', border: '#A7F3D0' },
    { label: 'Weekly Workload', value: faculty.workload ? `${faculty.workload} Hrs/Wk` : 'N/A', icon: 'schedule', bg: 'linear-gradient(135deg,#0284C7,#38BDF8)', cardBg: '#F0F9FF', border: '#BAE6FD' },
    { label: 'Student Rating', value: faculty.pass_rate ? `${(faculty.pass_rate / 20).toFixed(1)} / 5.0` : 'N/A', icon: 'star', bg: 'linear-gradient(135deg,#D97706,#F59E0B)', cardBg: '#FFFBEB', border: '#FDE68A' },
  ];

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Top 4 Summary Cards Grid */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs" style={{ background: card.cardBg, border: `1px solid ${card.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm" style={{ background: card.bg }}>
              <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] leading-none uppercase tracking-wider">{card.label}</p>
              <p className="text-[18px] font-extrabold text-[#1E293B] leading-tight my-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Course Cards Column (span 7) */}
        <div className="col-span-7 bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <h3 className="text-xs font-bold text-[#1E293B] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7C3AED] text-[18px]">menu_book</span>
              Assigned Courses &amp; Schedules
            </h3>
            <span className="px-2.5 py-0.5 bg-[#EDE9FE] text-[#7C3AED] text-[9px] font-extrabold rounded-full uppercase tracking-wider">
              Academic Term
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {subjects.length === 0 ? (
              <div className="text-center py-12 px-4">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">menu_book</span>
                <p className="text-xs font-bold text-slate-500">No courses assigned to this faculty member yet</p>
              </div>
            ) : (
              subjects.map((sub, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#7C3AED] text-white text-[10px] font-extrabold rounded-md uppercase">
                        {sub.code || `SUB-${idx + 1}`}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">{sub.name || sub.title || 'Course'}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700">{sub.schedule || 'Regular'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                    <span>Semester {sub.semester || 1} • {sub.credits || 4} Credits</span>
                    <span>{sub.students || 0} Enrolled Students</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                      <span>Syllabus Delivered</span>
                      <span>{sub.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full" style={{ width: `${sub.progress || 0}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Publications Column (span 5) */}
        <div className="col-span-5 bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <h3 className="text-xs font-bold text-[#1E293B] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#059669] text-[18px]">article</span>
              Research &amp; Publications
            </h3>
            <span className="text-[10px] font-bold text-emerald-600">{publications.length} Papers</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {publications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">article</span>
                <p className="text-xs font-bold text-slate-500">No research publications uploaded yet</p>
              </div>
            ) : (
              publications.map((pub, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs hover:border-emerald-300 transition-colors">
                  <h5 className="text-[11px] font-bold text-slate-800 leading-snug">{pub.title}</h5>
                  <p className="text-[10px] text-slate-500 font-medium">{pub.journal} ({pub.year})</p>
                  <div className="flex items-center justify-between pt-1 text-[9px] font-bold">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Citations: {pub.citations || 0}</span>
                    <span className="text-indigo-600 font-mono">{pub.doi || ''}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── INVOICE & PAYROLL TAB ─────────────────────────────────────────────────── */
function PayrollTab({ faculty, facId }) {
  const [viewMode, setViewMode] = useState('current'); // 'current' | 'history'
  const [historyPage, setHistoryPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // 5 per page as requested!

  const salary = faculty.salary || 125000;
  const basePay = Math.round(salary * 0.75);
  const allowances = Math.round(salary * 0.25);

  const rawPayroll = faculty.payroll_history || faculty.payrolls;
  const payrollHistory = Array.isArray(rawPayroll)
    ? rawPayroll.map((rec, i) => ({
        id: rec.id || rec._id || `PAY-${i}`,
        month: rec.month || rec.payPeriodDetailed || rec.payMonth || 'Monthly Statement',
        basicPay: rec.basicPay || rec.base_salary || 0,
        allowances: rec.allowances || rec.teaching_allowance || 0,
        deductions: rec.deductions || rec.total_deductions || 0,
        netSalary: rec.netSalary || rec.net_salary || 0,
        paidDate: rec.paidDate || rec.payment_date || 'N/A',
        status: rec.status || 'PAID',
        refNo: rec.refNo || rec.transactionId || 'N/A'
      }))
    : [];

  const totalItems = payrollHistory.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (historyPage - 1) * pageSize;
  const paginatedHistory = payrollHistory.slice(startIndex, startIndex + pageSize);

  const summaryCards = [
    { label: 'Net Salary', value: `₹${salary.toLocaleString('en-IN')}`, sub: 'Monthly Payout', icon: 'payments', bg: 'linear-gradient(135deg,#059669,#10B981)', cardBg: '#ECFDF5', border: '#A7F3D0' },
    { label: 'Base Pay', value: `₹${basePay.toLocaleString('en-IN')}`, sub: 'Basic Component', icon: 'account_balance_wallet', bg: 'linear-gradient(135deg,#7C3AED,#A855F7)', cardBg: '#F5F3FF', border: '#EDE9FE' },
    { label: 'Allowances (HRA/DA)', value: `₹${allowances.toLocaleString('en-IN')}`, sub: 'Standard Benefits', icon: 'add_card', bg: 'linear-gradient(135deg,#0284C7,#38BDF8)', cardBg: '#F0F9FF', border: '#BAE6FD' },
    { label: 'Disbursement Status', value: 'PAID', sub: 'Direct Bank Transfer', icon: 'task_alt', bg: 'linear-gradient(135deg,#D97706,#F59E0B)', cardBg: '#FFFBEB', border: '#FDE68A' },
  ];

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs" style={{ background: card.cardBg, border: `1px solid ${card.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm" style={{ background: card.bg }}>
              <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] leading-none uppercase tracking-wider">{card.label}</p>
              <p className="text-[18px] font-extrabold text-[#1E293B] leading-tight my-0.5">{card.value}</p>
              <p className="text-[10px] font-bold text-[#64748B]">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Container with Switch Toggle Header */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">
        {/* Toggle Switch Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-[14px] font-bold text-[#1E293B] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7C3AED] text-[18px]">receipt_long</span>
              Payroll &amp; Compensation Statements
            </h3>
            <p className="text-[11px] text-[#94A3B8] font-medium">Monthly disbursements and historical payslip records</p>
          </div>

          {/* Switch Toggle */}
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] shadow-2xs">
            <button
              onClick={() => setViewMode('current')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'current'
                  ? 'bg-white text-[#003A40] shadow-xs'
                  : 'text-[#64748B] hover:text-[#003A40]'
              }`}
            >
              Current Statement
            </button>
            <button
              onClick={() => { setViewMode('history'); setHistoryPage(1); }}
              className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'history'
                  ? 'bg-[#003A40] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#003A40]'
              }`}
            >
              <span>Payroll History</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                viewMode === 'history' ? 'bg-amber-400 text-slate-900 font-extrabold' : 'bg-slate-200 text-slate-700 font-bold'
              }`}>
                {totalItems}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        {viewMode === 'current' ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <PayrollIntegrationPanel facultyId={facId} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Enterprise Payroll History Table */}
            <div className="flex-1 overflow-y-auto">
              {paginatedHistory.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">receipt_long</span>
                  <p className="text-xs font-bold text-slate-500">No historical payroll statements found</p>
                  <p className="text-[10px] text-slate-400 mt-1">Disbursed payroll records will appear here automatically</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#F1F5F9] z-10">
                    <tr>
                      {['Month / Period', 'Transaction ID', 'Basic Pay', 'Allowances', 'Deductions', 'Net Salary', 'Paid Date', 'Status', 'Action'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {paginatedHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-[#003A40]">{rec.month}</td>
                        <td className="px-4 py-3 text-[11px] font-mono text-[#64748B]">{rec.refNo}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700">₹{rec.basicPay.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs font-medium text-emerald-600">+₹{rec.allowances.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs font-medium text-rose-600">-₹{rec.deductions.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs font-extrabold text-[#003A40]">₹{rec.netSalary.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">{rec.paidDate}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => alert(`Downloading payslip statement for ${rec.month}...`)}
                            className="px-2.5 py-1 bg-indigo-50 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">download</span>
                            <span>Payslip</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Component (5 per page) */}
            <Pagination
              currentPage={historyPage}
              totalPages={totalPages}
              onPageChange={setHistoryPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── CAREER PATH TAB ───────────────────────────────────────────────────────── */
function CareerTab({ faculty, facId }) {
  const summaryCards = [
    { label: 'Current Rank', value: faculty.designation || 'Professor', sub: 'Academic Track', icon: 'workspace_premium', bg: 'linear-gradient(135deg,#7C3AED,#A855F7)', cardBg: '#F5F3FF', border: '#EDE9FE' },
    { label: 'Years of Service', value: `${faculty.experience_years || 12} Years`, sub: 'Tenure Length', icon: 'military_tech', bg: 'linear-gradient(135deg,#059669,#10B981)', cardBg: '#ECFDF5', border: '#A7F3D0' },
    { label: 'Next Career Level', value: 'Head of Dept (HOD)', sub: 'Leadership Pathway', icon: 'trending_up', bg: 'linear-gradient(135deg,#0284C7,#38BDF8)', cardBg: '#F0F9FF', border: '#BAE6FD' },
    { label: 'Promotion Status', value: 'ELIGIBLE', sub: 'Criteria Satisfied', icon: 'verified', bg: 'linear-gradient(135deg,#D97706,#F59E0B)', cardBg: '#FFFBEB', border: '#FDE68A' },
  ];

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs" style={{ background: card.cardBg, border: `1px solid ${card.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm" style={{ background: card.bg }}>
              <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] leading-none uppercase tracking-wider">{card.label}</p>
              <p className="text-[18px] font-extrabold text-[#1E293B] leading-tight my-0.5">{card.value}</p>
              <p className="text-[10px] font-bold text-[#64748B]">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <CareerPathwayTracking facultyId={facId} />
      </div>
    </div>
  );
}

/* ── LEAVE TAB ─────────────────────────────────────────────────────────────── */
function LeaveTab({ faculty, onRequestLeave }) {
  const [leavePage, setLeavePage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const rawLeaves = faculty.leave_history || faculty.leaves;
  const leaveRequests = Array.isArray(rawLeaves)
    ? rawLeaves.map((lev, i) => ({
        id: lev.id || lev._id || `LEV-${i + 1}`,
        type: lev.leave_type || lev.type || 'Leave',
        dates: lev.dates || (lev.start_date ? `${lev.start_date} - ${lev.end_date || ''}` : 'N/A'),
        days: lev.days || lev.duration || 1,
        reason: lev.reason || 'N/A',
        status: lev.status || 'PENDING',
        appliedDate: lev.appliedDate || lev.applied_on || 'N/A'
      }))
    : [];

  const totalItems = leaveRequests.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (leavePage - 1) * pageSize;
  const paginatedLeaves = leaveRequests.slice(startIndex, startIndex + pageSize);

  const summaryCards = [
    { label: 'Casual Leave', value: faculty.casual_leaves != null ? `${faculty.casual_leaves} / 12 Days` : 'N/A', sub: 'Available Balance', icon: 'event_available', bg: 'linear-gradient(135deg,#7C3AED,#A855F7)', cardBg: '#F5F3FF', border: '#EDE9FE' },
    { label: 'Sick Leave', value: faculty.sick_leaves != null ? `${faculty.sick_leaves} / 12 Days` : 'N/A', sub: 'Available Balance', icon: 'medical_services', bg: 'linear-gradient(135deg,#059669,#10B981)', cardBg: '#ECFDF5', border: '#A7F3D0' },
    { label: 'Earned Leave', value: faculty.earned_leaves != null ? `${faculty.earned_leaves} / 20 Days` : 'N/A', sub: 'Accumulated Balance', icon: 'card_giftcard', bg: 'linear-gradient(135deg,#0284C7,#38BDF8)', cardBg: '#F0F9FF', border: '#BAE6FD' },
    { label: 'Leaves Taken', value: `${leaveRequests.length} Leaves`, sub: 'This Academic Term', icon: 'history', bg: 'linear-gradient(135deg,#D97706,#F59E0B)', cardBg: '#FFFBEB', border: '#FDE68A' },
  ];

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs" style={{ background: card.cardBg, border: `1px solid ${card.border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm" style={{ background: card.bg }}>
              <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] leading-none uppercase tracking-wider">{card.label}</p>
              <p className="text-[18px] font-extrabold text-[#1E293B] leading-tight my-0.5">{card.value}</p>
              <p className="text-[10px] font-bold text-[#64748B]">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-0.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7C3AED]">calendar_month</span>
              Leave History &amp; Absence Records
            </h3>
            <p className="text-xs text-slate-500">Track all leave requests and approval status</p>
          </div>
          <button
            onClick={onRequestLeave}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add_task</span>
            <span>Request Leave</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {paginatedLeaves.length === 0 ? (
            <div className="text-center py-16 px-4">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">calendar_month</span>
              <p className="text-xs font-bold text-slate-500">No leave requests submitted yet</p>
              <p className="text-[10px] text-slate-400 mt-1">Click "Request Leave" above to apply for a new leave</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#F1F5F9] z-10">
                <tr>
                  {['Leave ID', 'Leave Type', 'Requested Dates', 'Duration', 'Reason', 'Applied On', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {paginatedLeaves.map((lev) => (
                  <tr key={lev.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-[#003A40]">{lev.id}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{lev.type}</td>
                    <td className="px-4 py-3 text-xs font-bold text-[#7C3AED]">{lev.dates}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">{lev.days} {lev.days === 1 ? 'Day' : 'Days'}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600 truncate max-w-xs">{lev.reason}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{lev.appliedDate}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                        {lev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          currentPage={leavePage}
          totalPages={totalPages}
          onPageChange={setLeavePage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}

/* ── DOCUMENTS TAB ──────────────────────────────────────────────────────────── */
function DocumentsTab({ faculty, onRefresh }) {
  const rawDocs = faculty.documents || [];
  const [viewingDoc, setViewingDoc] = useState(null);
  const [uploading, setUploading] = useState(false);

  const docs = Array.isArray(rawDocs)
    ? rawDocs.map((d, i) => {
        const fileData = (d.data && d.data.data) || (typeof d.data === 'string' ? d.data : null) || d.file_url || d.fileUrl || null;
        const fileName = (d.data && d.data.name) || d.name || 'Faculty Document';
        const fileSize = (d.data && d.data.size) ? `${(d.data.size / 1024 / 1024).toFixed(2)} MB` : (d.size || 'N/A');
        const uploadDateStr = d.uploadDate || d.uploadedAt || new Date().toISOString();
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
          const uploadDateStr = new Date().toISOString();
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
        const res = await fetch(`${API_BASE_URL}/faculty/${faculty.id || faculty.employeeId}`, {
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
      const res = await fetch(`${API_BASE_URL}/faculty/${faculty.id || faculty.employeeId}`, {
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
      <div className="space-y-4">
        <label className={`block bg-[#7C3AED]/5 border-2 border-dashed border-[#7C3AED]/20 rounded-2xl p-6 text-center cursor-pointer hover:bg-[#7C3AED]/10 transition-all group ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <input type="file" className="hidden" onChange={handleUpload} accept="image/*,.pdf,.doc,.docx" disabled={uploading} />
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#7C3AED] shadow-lg shadow-[#7C3AED]/10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">{uploading ? 'hourglass_top' : 'cloud_upload'}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#7C3AED]">{uploading ? 'Uploading...' : 'Upload Qualification Certificate'}</p>
              <p className="text-[10px] text-[#7C3AED]/60 mt-0.5">PDF, Degree Certificates, Marksheets • Click to browse</p>
            </div>
          </div>
        </label>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FolderOpen size={16} className="text-[#7C3AED]" />
              Faculty Certificates &amp; Verification Documents
            </h3>
            <span className="text-xs font-bold text-slate-400">{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
          </div>

          {docs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <span className="material-symbols-outlined text-4xl text-slate-200 mb-2 block">folder_open</span>
              <p className="text-xs font-bold text-slate-400">No qualification documents uploaded yet</p>
              <p className="text-[10px] text-slate-300 mt-0.5">Use the upload area above to attach degree certificates and transcripts</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {docs.map((doc) => {
                const hasData = !!doc.fileData;
                return (
                  <div key={doc.id} className="flex items-center justify-between p-3 sm:px-5 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-100 ${hasData ? 'cursor-pointer' : ''}`}
                        onClick={() => hasData && setViewingDoc(doc)}
                      >
                        {hasData && isImage(doc.fileData) ? (
                          <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-[#7C3AED]">
                            <span className="material-symbols-outlined text-[20px]">
                              {doc.type === 'pdf' || (doc.fileName && doc.fileName.toLowerCase().endsWith('.pdf')) ? 'picture_as_pdf' : 'image'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{doc.name || doc.fileName}</h4>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">
                          {doc.fileSize || doc.size || 'N/A'} • {new Date(doc.uploadDateStr || doc.uploadDate || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {hasData && (
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="p-1.5 text-slate-400 hover:text-[#7C3AED] hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
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
                          className="p-1.5 text-slate-400 hover:text-[#7C3AED] hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                          title="Download"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#7C3AED] flex items-center justify-center flex-shrink-0">
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
                  className="p-2 text-slate-400 hover:text-[#7C3AED] hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                  title="Download"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                  title="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

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
