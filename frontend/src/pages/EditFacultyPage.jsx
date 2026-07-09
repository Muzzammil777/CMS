import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { API_BASE } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';

export default function EditFacultyPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', gender: '', dateOfBirth: '',
    department: '', designation: '', employmentType: '',
    highestQualification: '', specialization: '', university: '',
    yearsOfExperience: '', employment_status: 'Active',
    nationality: '', college: '', office_location: '',
    // Academic Assignment
    courses: '',   // comma-separated course names
    classes: '',   // comma-separated class/section names
  });

  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await settingsApi.getDepartments();
        setDepartments(data || []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepts();
  }, []);

  const CLASSES_OPTIONS = [
    'CSE-A', 'CSE-B', 'CSE-C',
    'ECE-A', 'ECE-B',
    'ME-A', 'ME-B',
    'CE-A', 'CE-B',
    'IT-A', 'IT-B',
    'Year 1', 'Year 2', 'Year 3', 'Year 4',
  ];

  useEffect(() => {
    fetchFaculty();
  }, [id]);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/faculty/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Faculty not found');
      const data = await res.json();
      setFormData({
        name: data.name || data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        gender: data.gender || '',
        dateOfBirth: data.dateOfBirth || data.dob || '',
        department: data.department || data.department_id || '',
        designation: data.designation || data.role || '',
        employmentType: data.employmentType || data.employment_type || '',
        highestQualification: data.highestQualification || data.qualification || '',
        specialization: data.specialization || (data.specializations && data.specializations[0]) || '',
        university: data.university || '',
        yearsOfExperience: data.yearsOfExperience?.toString() || data.years_of_experience?.toString() || '',
        employment_status: data.employment_status || data.status || 'Active',
        nationality: data.nationality || '',
        college: data.college || '',
        office_location: data.office_location || '',
        courses: Array.isArray(data.courses) ? data.courses.join(', ') : (data.courses || ''),
        classes: Array.isArray(data.classes) ? data.classes.join(', ') : (data.classes || data.assignedClasses || ''),
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching faculty:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { alert('Name is required'); return; }
    if (!formData.email.trim()) { alert('Email is required'); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/faculty/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          fullName: formData.name,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          dob: formData.dateOfBirth,
          department: formData.department,
          departmentId: formData.department,
          designation: formData.designation,
          role: formData.designation,
          employmentType: formData.employmentType,
          highestQualification: formData.highestQualification,
          qualification: formData.highestQualification,
          specialization: formData.specialization,
          specializations: [formData.specialization].filter(Boolean),
          university: formData.university,
          yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
          employment_status: formData.employment_status,
          status: formData.employment_status,
          nationality: formData.nationality,
          college: formData.college,
          office_location: formData.office_location,
          courses: formData.courses.split(',').map(s => s.trim()).filter(Boolean),
          classes: formData.classes.split(',').map(s => s.trim()).filter(Boolean),
          assignedClasses: formData.classes.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Failed to update faculty');
      alert('Faculty updated successfully!');
      navigate('/faculty');
    } catch (err) {
      console.error('Error updating faculty:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Edit Faculty">
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col items-center justify-center h-64 gap-4 animate-pulse">
              <div className="w-12 h-12 bg-slate-200 rounded-full" />
              <div className="w-48 h-4 bg-slate-200 rounded" />
              <div className="w-32 h-3 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Edit Faculty">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <span className="material-symbols-outlined text-red-400 text-5xl mb-4">error</span>
            <h3 className="text-lg font-bold text-red-900">Error</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button onClick={() => navigate('/faculty')} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all">
              Back to Faculty
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Edit Faculty">
      <div className="space-y-4">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6d28d9]/10 rounded-lg">
              <span className="material-symbols-outlined text-lg text-[#6d28d9]">edit</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Edit Faculty</h1>
              <p className="text-xs text-gray-600 mt-0.5">Update faculty information for {formData.name}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/faculty')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span className="font-medium">Back</span>
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Full Name <span className="text-red-500">*</span></label>
                  <input name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Email <span className="text-red-500">*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Phone</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} maxLength="10" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white">
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Nationality</label>
                  <input name="nationality" value={formData.nationality} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20" placeholder="e.g. Indian" />
                </div>
              </div>
            </div>

            {/* Professional Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Designation</label>
                  <select name="designation" value={formData.designation} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white">
                    <option value="">Select</option>
                    <option>Lecturer</option><option>Assistant Professor</option><option>Associate Professor</option><option>Professor</option><option>HOD</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Department</label>
                  <select name="department" value={formData.department} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Employment Type</label>
                  <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white">
                    <option value="">Select</option>
                    <option>Full-Time</option><option>Part-Time</option><option>Contract</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Years of Experience</label>
                  <input type="number" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Office Location / Room</label>
                  <input name="office_location" value={formData.office_location} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20" placeholder="e.g. Room 302, Main Block" />
                </div>
              </div>
            </div>

            {/* ── Academic Assignment ── */}
            <div className="border border-[#6d28d9]/20 rounded-xl p-5 bg-[#f0fdf4]/60">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 bg-[#6d28d9] rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm">school</span>
                </div>
                <h3 className="text-sm font-bold text-[#6d28d9] uppercase tracking-widest">Academic Assignment</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Courses */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Assigned Courses</label>
                  <p className="text-xs text-gray-400">Enter course names separated by commas</p>
                  <textarea
                    name="courses"
                    value={formData.courses}
                    onChange={handleChange}
                    rows={3}
                    placeholder="e.g. Data Structures, Algorithms, DBMS"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20 resize-none"
                  />
                  {/* Tag preview */}
                  {formData.courses && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {formData.courses.split(',').map(c => c.trim()).filter(Boolean).map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#6d28d9]/10 text-[#6d28d9] text-xs font-semibold rounded-full">
                          <span className="material-symbols-outlined text-xs">menu_book</span>{c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Classes */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Assigned Classes / Sections</label>
                  <p className="text-xs text-gray-400">Click to add or type manually separated by commas</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {CLASSES_OPTIONS.map(cls => {
                      const selected = formData.classes.split(',').map(s => s.trim()).includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            const current = formData.classes.split(',').map(s => s.trim()).filter(Boolean);
                            const next = selected
                              ? current.filter(c => c !== cls)
                              : [...current, cls];
                            setFormData(prev => ({ ...prev, classes: next.join(', ') }));
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            selected
                              ? 'bg-[#6d28d9] text-white border-[#6d28d9]'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-[#6d28d9] hover:text-[#6d28d9]'
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    name="classes"
                    value={formData.classes}
                    onChange={handleChange}
                    placeholder="or type: CSE-A, Year 2, ..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20"
                  />
                </div>

              </div>
            </div>

            {/* Qualifications */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Qualifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Highest Qualification</label>
                  <select name="highestQualification" value={formData.highestQualification} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white">
                    <option value="">Select</option>
                    <option value="B.Tech">B.Tech (Bachelor of Technology)</option>
                    <option value="M.Tech">M.Tech (Master of Technology)</option>
                    <option value="B.E.">B.E. (Bachelor of Engineering)</option>
                    <option value="M.E.">M.E. (Master of Engineering)</option>
                    <option value="MBBS">MBBS (Bachelor of Medicine, Surgery)</option>
                    <option value="MD">MD (Doctor of Medicine)</option>
                    <option value="MS">MS (Master of Surgery)</option>
                    <option value="BDS">BDS (Bachelor of Dental Surgery)</option>
                    <option value="MDS">MDS (Master of Dental Surgery)</option>
                    <option value="B.Pharm">B.Pharm (Bachelor of Pharmacy)</option>
                    <option value="M.Pharm">M.Pharm (Master of Pharmacy)</option>
                    <option value="B.A.">B.A. (Bachelor of Arts)</option>
                    <option value="M.A.">M.A. (Master of Arts)</option>
                    <option value="B.F.A.">B.F.A. (Bachelor of Fine Arts)</option>
                    <option value="M.F.A.">M.F.A. (Master of Fine Arts)</option>
                    <option value="B.Sc">B.Sc (Bachelor of Science)</option>
                    <option value="M.Sc">M.Sc (Master of Science)</option>
                    <option value="B.Com">B.Com (Bachelor of Commerce)</option>
                    <option value="M.Com">M.Com (Master of Commerce)</option>
                    <option value="BBA">BBA (Bachelor of Business Admin)</option>
                    <option value="MBA">MBA (Master of Business Admin)</option>
                    <option value="LL.B.">LL.B. (Bachelor of Laws)</option>
                    <option value="LL.M.">LL.M. (Master of Laws)</option>
                    <option value="M.Phil">M.Phil (Master of Philosophy)</option>
                    <option value="Ph.D.">Ph.D. (Doctor of Philosophy)</option>
                    <option value="Post-Doc">Post-Doctoral Fellowship</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Specialization</label>
                  <input name="specialization" value={formData.specialization} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">University</label>
                  <input name="university" value={formData.university} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">College / Institution</label>
                  <input name="college" value={formData.college} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20" placeholder="e.g. ABC College of Engineering" />
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Employment Status</h3>
              <select name="employment_status" value={formData.employment_status} onChange={handleChange} className="w-full max-w-xs px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white">
                <option value="Active">Active</option>
                <option value="On-Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button type="button" onClick={() => navigate('/faculty')} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors font-medium">
                ← Cancel
              </button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-[#6d28d9] text-white text-sm rounded-lg hover:bg-[#4c1d95] disabled:opacity-50 transition-colors font-medium">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
