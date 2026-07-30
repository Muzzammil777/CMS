import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DashboardSkeleton from '../components/DashboardSkeleton';
import {
  Building2, Users, GraduationCap, BookOpen, Mail, Phone, MapPin,
  Search, Plus, Pencil, Trash2, X, Award, ArrowUpRight, ArrowRight, Check, ChevronRight
} from 'lucide-react';
import { getUserData, getUserSession } from '../auth/sessionController';
import { settingsApi } from '../api/settingsApi';
import { buildApiUrl } from '../api/apiBase';
import { useNavigate } from 'react-router-dom';

// Helper to generate clean 2-4 letter uppercase short code
function getCleanCode(dept) {
  if (dept.code && dept.code.length <= 5 && !dept.code.includes(' ')) {
    return dept.code.toUpperCase();
  }
  const name = dept.name || dept.code || 'DEPT';
  const words = name.split(/\s+/).filter((w) => w.length > 0 && !['and', '&', 'of', 'in', 'the'].includes(w.toLowerCase()));
  if (words.length > 1) {
    return words.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
  }
  return name.slice(0, 3).toUpperCase();
}

/* ── Add Department Modal ────────────────────────────────────────────────── */
function AddDepartmentModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    head: '',
    email: '',
    phone: '',
    office_location: '',
    description: '',
    totalFaculty: 10,
    totalStudents: 280,
    courses: 8,
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Department name is required');
    const code = formData.code ? formData.code.toUpperCase() : getCleanCode({ name: formData.name });
    onSave({ ...formData, code, id: `DEPT-${Date.now()}` });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E6EDF2] p-6 max-w-lg w-full shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#EEF4F7] pb-3">
          <h3 className="text-base font-bold text-[#003A40] font-['Outfit'] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0A686A]" /> Add New Department
          </h3>
          <button type="button" onClick={onClose} className="text-[#8C98A5] hover:text-rose-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Department Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData({ ...formData, name, code: getCleanCode({ name }) });
              }}
              className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
              placeholder="e.g. Artificial Intelligence"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Short Code</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
              placeholder="e.g. AI"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Head of Department (HOD)</label>
            <input
              type="text"
              value={formData.head}
              onChange={(e) => setFormData({ ...formData, head: e.target.value })}
              className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
              placeholder="Dr. HOD Name"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Contact Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
              placeholder="hod@mit.edu"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-[#EEF4F7]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-[#E6EDF2] text-[#5F6B7A] rounded-xl font-bold text-xs hover:bg-[#F4F7FF]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2 bg-gradient-to-r from-[#003A40] to-[#0A686A] text-white rounded-xl font-bold text-xs hover:from-[#0A686A] hover:to-[#003A40]"
          >
            Create Department
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Edit Department Modal ────────────────────────────────────────────────── */
function EditDepartmentModal({ isOpen, onClose, department, onSave }) {
  const [formData, setFormData] = useState(department || {});

  useEffect(() => {
    if (department) setFormData(department);
  }, [department]);

  if (!isOpen || !department) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E6EDF2] p-6 max-w-lg w-full shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#EEF4F7] pb-3">
          <h3 className="text-base font-bold text-[#003A40] font-['Outfit'] flex items-center gap-2">
            <Pencil className="w-4 h-4 text-[#0A686A]" /> Edit Department — {getCleanCode(department)}
          </h3>
          <button type="button" onClick={onClose} className="text-[#8C98A5] hover:text-rose-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Department Name</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Short Code</label>
            <input
              type="text"
              required
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] block mb-1">HOD Name</label>
            <input
              type="text"
              value={formData.head || ''}
              onChange={(e) => setFormData({ ...formData, head: e.target.value })}
              className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Contact Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-[#EEF4F7]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-[#E6EDF2] text-[#5F6B7A] rounded-xl font-bold text-xs hover:bg-[#F4F7FF]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2 bg-[#003A40] text-white rounded-xl font-bold text-xs hover:bg-[#0A686A]"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── View Department Detail Modal / Drawer ───────────────────────────────── */
function DepartmentDetailModal({ department, onClose, facultyList }) {
  const navigate = useNavigate();
  if (!department) return null;

  const code = getCleanCode(department);
  const sampleCourses = [
    { code: `${code} 101`, title: 'Foundations & Core Principles', credits: 4, sem: 'Sem 1' },
    { code: `${code} 201`, title: 'System Architecture & Design', credits: 4, sem: 'Sem 3' },
    { code: `${code} 301`, title: 'Advanced Analytics & Practice', credits: 3, sem: 'Sem 5' },
    { code: `${code} 401`, title: 'Capstone Industry Research', credits: 6, sem: 'Sem 7' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E6EDF2] max-w-3xl w-full shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#EEF4F7] bg-[#FAFBFF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003A40] to-[#0A686A] text-white font-extrabold text-sm flex items-center justify-center font-['Outfit'] shadow-sm">
              {code}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#003A40] font-['Outfit'] leading-tight">
                {department.name}
              </h3>
              <p className="text-xs text-[#5F6B7A] font-medium">HOD: {department.head || 'Dr. Department Head'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8C98A5] hover:text-rose-500 transition-colors p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7]">
              <span className="text-[10px] font-bold text-[#8C98A5] uppercase">Faculty Staff</span>
              <p className="text-base font-extrabold text-[#003A40] font-['Outfit']">{facultyList.length || department.totalFaculty || 10}</p>
            </div>
            <div className="p-3 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7]">
              <span className="text-[10px] font-bold text-[#8C98A5] uppercase">Students</span>
              <p className="text-base font-extrabold text-[#003A40] font-['Outfit']">{department.totalStudents || 320}</p>
            </div>
            <div className="p-3 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7]">
              <span className="text-[10px] font-bold text-[#8C98A5] uppercase">Courses</span>
              <p className="text-base font-extrabold text-[#003A40] font-['Outfit']">{department.courses || 8}</p>
            </div>
            <div className="p-3 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7]">
              <span className="text-[10px] font-bold text-[#8C98A5] uppercase">Pass Rate</span>
              <p className="text-base font-extrabold text-emerald-600 font-['Outfit']">95.4%</p>
            </div>
          </div>

          {/* Curriculum */}
          <div>
            <h4 className="text-xs font-extrabold text-[#003A40] uppercase tracking-wider mb-2 font-['Outfit']">
              Department Curriculum Courses
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {sampleCourses.map((c, idx) => (
                <div key={idx} className="p-3 bg-white border border-[#E6EDF2] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#0A686A] bg-[#F2FBFA] px-2 py-0.5 rounded border border-[#0A686A]/20">
                      {c.code}
                    </span>
                    <p className="text-xs font-bold text-[#003A40] mt-1 truncate">{c.title}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#8C98A5] block">{c.sem}</span>
                    <span className="text-[10px] font-bold text-[#003A40]">{c.credits} Crs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Faculty Roster */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold text-[#003A40] uppercase tracking-wider font-['Outfit']">
                Assigned Faculty Members ({facultyList.length})
              </h4>
              <button
                onClick={() => { onClose(); navigate('/faculty'); }}
                className="text-xs font-bold text-[#0A686A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                All Faculty Directory <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="border border-[#E6EDF2] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFF] border-b border-[#EEF4F7]">
                    <th className="px-3 py-2 text-[10px] font-extrabold text-[#8C98A5] uppercase font-['Outfit']">Member</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold text-[#8C98A5] uppercase font-['Outfit']">Designation</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold text-[#8C98A5] uppercase font-['Outfit']">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-xs text-[#8C98A5]">
                        No faculty members currently listed for this department.
                      </td>
                    </tr>
                  ) : (
                    facultyList.map((f, idx) => (
                      <tr key={idx} className="border-b border-[#F4F7FF] last:border-b-0 hover:bg-[#F9FBFF]">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || 'F')}&background=003A40&color=fff&size=80`}
                              alt={f.name}
                              className="w-7 h-7 rounded-lg object-cover border border-[#E6EDF2]"
                            />
                            <div>
                              <p className="text-xs font-bold text-[#003A40] leading-tight">{f.name || f.fullName}</p>
                              <p className="text-[10px] text-[#8C98A5]">{f.employeeId || f.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[#5F6B7A] font-medium">{f.designation || 'Professor'}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {f.employment_status || f.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EEF4F7] bg-[#FAFBFF] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#003A40] text-white rounded-xl text-xs font-bold hover:bg-[#0A686A] transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Faculty Department Page (Grid Card Format) ─────────────────────── */
export default function FacultyDepartmentPage() {
  const navigate = useNavigate();
  const session = getUserSession();
  const role = session?.role || 'admin';

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allFaculty, setAllFaculty] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  // Fetch departments & faculty
  const loadData = async () => {
    setLoading(true);
    try {
      const [deptsData, facRes] = await Promise.all([
        settingsApi.getDepartments(),
        fetch(buildApiUrl('/faculty')),
      ]);
      const deptsList = Array.isArray(deptsData) ? deptsData : [];
      const facData = facRes.ok ? await facRes.json() : [];

      setAllFaculty(facData || []);

      const finalDepts = deptsList.length
        ? deptsList
        : [
            { id: 'DEPT-1', name: 'Computer Science', code: 'CS', head: 'Dr. Ramesh Kumar', email: 'hod.cs@mit.edu', phone: '+91 98765 43210', office_location: 'Building A, Room 301', totalFaculty: 14, totalStudents: 420, courses: 12 },
            { id: 'DEPT-2', name: 'Electronics & Communication', code: 'ECE', head: 'Dr. Sunita Sharma', email: 'hod.ece@mit.edu', phone: '+91 98765 43213', office_location: 'Building B, Room 201', totalFaculty: 10, totalStudents: 310, courses: 9 },
            { id: 'DEPT-3', name: 'Mechanical Engineering', code: 'ME', head: 'Dr. Venkat Reddy', email: 'hod.me@mit.edu', phone: '+91 98765 43221', office_location: 'Building D, Room 301', totalFaculty: 8, totalStudents: 260, courses: 8 },
            { id: 'DEPT-4', name: 'Mathematics', code: 'MATH', head: 'Dr. Deepak Gupta', email: 'hod.math@mit.edu', phone: '+91 98765 43218', office_location: 'Building C, Room 301', totalFaculty: 6, totalStudents: 180, courses: 6 },
            { id: 'DEPT-5', name: 'Information Technology', code: 'IT', head: 'Dr. Geetha V', email: 'hod.it@mit.edu', phone: '+91 98765 43230', office_location: 'Building A, Room 305', totalFaculty: 11, totalStudents: 350, courses: 10 },
            { id: 'DEPT-6', name: 'Medical Laboratory Technology', code: 'MLT', head: 'Dr. K. Rahini', email: 'hod.mlt@mit.edu', phone: '+91 98765 43240', office_location: 'Building E, Room 101', totalFaculty: 7, totalStudents: 210, courses: 6 },
          ];

      setDepartments(finalDepts);
    } catch (err) {
      console.error('Failed to load department metrics:', err);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditSave = async (updatedData) => {
    try {
      const saved = await settingsApi.updateDepartment(updatedData.id, updatedData);
      setDepartments(departments.map((d) => (d.id === updatedData.id ? (saved || updatedData) : d)));
    } catch (err) {
      setDepartments(departments.map((d) => (d.id === updatedData.id ? updatedData : d)));
    }
  };

  const handleAddDepartment = async (newDept) => {
    try {
      const saved = await settingsApi.createDepartment(newDept);
      setDepartments([...departments, saved || newDept]);
    } catch (err) {
      setDepartments([...departments, newDept]);
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm('Delete this department permanently?')) return;
    try {
      await settingsApi.deleteDepartment(deptId);
      setDepartments(departments.filter((d) => d.id !== deptId));
    } catch (err) {
      setDepartments(departments.filter((d) => d.id !== deptId));
    }
  };

  const getFilteredFaculty = (dept) => {
    if (!dept || !allFaculty.length) return [];
    return allFaculty.filter((fac) => {
      const fDept = (fac.departmentId || fac.department || '').toLowerCase();
      const dName = (dept.name || '').toLowerCase();
      const dCode = (dept.code || '').toLowerCase();
      return fDept === dName || fDept === dCode || dName.includes(fDept) || fDept.includes(dName);
    });
  };

  // Filtered list
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const q = searchQuery.toLowerCase();
      return !q || d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q) || d.head?.toLowerCase().includes(q);
    });
  }, [departments, searchQuery]);

  const totalFacultyCount = departments.reduce((sum, d) => sum + (d.totalFaculty || 10), 0);
  const totalStudentCount = departments.reduce((sum, d) => sum + (d.totalStudents || 300), 0);

  return (
    <Layout title="Departments">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-4 font-['Plus_Jakarta_Sans'] h-full overflow-y-auto pr-1 custom-scrollbar">

          {/* ── KPI Header Summary Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
            <div className="relative overflow-hidden rounded-xl border border-[#E6EDF2] bg-white p-4 flex items-center gap-3.5 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-t-xl" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C98A5]">Departments</p>
                <p className="text-xl font-extrabold text-[#003A40] leading-none font-['Outfit'] mt-0.5">{departments.length}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#E6EDF2] bg-white p-4 flex items-center gap-3.5 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-xl" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C98A5]">Faculty Members</p>
                <p className="text-xl font-extrabold text-[#003A40] leading-none font-['Outfit'] mt-0.5">{totalFacultyCount}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#E6EDF2] bg-white p-4 flex items-center gap-3.5 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-sky-500 to-blue-600 rounded-t-xl" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C98A5]">Enrolled Students</p>
                <p className="text-xl font-extrabold text-[#003A40] leading-none font-['Outfit'] mt-0.5">{totalStudentCount.toLocaleString()}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#E6EDF2] bg-white p-4 flex items-center gap-3.5 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-t-xl" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C98A5]">Courses Offered</p>
                <p className="text-xl font-extrabold text-[#003A40] leading-none font-['Outfit'] mt-0.5">{departments.length * 8}</p>
              </div>
            </div>
          </div>

          {/* ── Toolbar Row ────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E6EDF2] shadow-xs">
            {/* Search */}
            <div className="flex items-center gap-2 h-9 px-3.5 bg-[#F8FAFC] border border-[#E6EDF2] rounded-xl flex-1 min-w-[220px] max-w-sm focus-within:border-[#0A686A]">
              <Search className="w-4 h-4 text-[#8C98A5]" />
              <input
                type="text"
                placeholder="Search department by name, code, HOD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs text-[#1B1F24] placeholder-[#A0AEC0] font-medium"
              />
            </div>

            {/* Add Department CTA */}
            {role !== 'student' && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#003A40] to-[#0A686A] text-white text-xs font-bold hover:from-[#0A686A] hover:to-[#003A40] transition-all flex items-center gap-2 shadow-xs cursor-pointer ml-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department</span>
              </button>
            )}
          </div>

          {/* ── Department Card Grid (3 columns) ────────────────────────────── */}
          {filteredDepartments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E6EDF2] p-12 text-center text-[#8C98A5]">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#003A40]" />
              <p className="text-xs font-bold text-[#003A40]">No departments match your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
              {filteredDepartments.map((dept) => {
                const code = getCleanCode(dept);
                const facCount = dept.totalFaculty || getFilteredFaculty(dept).length || 10;
                return (
                  <div
                    key={dept.id}
                    className="relative overflow-hidden bg-white border border-[#E6EDF2] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
                  >
                    {/* Top gradient accent line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#003A40] to-[#0A686A] rounded-t-2xl" />

                    <div>
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#003A40] to-[#0A686A] text-white flex items-center justify-center font-extrabold text-xs font-['Outfit'] shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
                            {code}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-[#003A40] font-['Outfit'] truncate leading-tight group-hover:text-[#0A686A] transition-colors">
                              {dept.name}
                            </h3>
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-[#F2FBFA] border border-[#0A686A]/20 rounded-md text-[10px] font-bold text-[#0A686A] uppercase">
                              Code: {code}
                            </span>
                          </div>
                        </div>

                        {role !== 'student' && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingDept(dept);
                                setIsEditOpen(true);
                              }}
                              className="w-7 h-7 rounded-lg text-[#5F6B7A] hover:text-[#003A40] hover:bg-[#F4F7FF] flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit Department"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDepartment(dept.id)}
                              className="w-7 h-7 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Department"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* HOD & Contact Info */}
                      <div className="p-3 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7] space-y-1.5 mb-4 text-xs">
                        <p className="font-semibold text-[#003A40] flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0A686A]" />
                          HOD: <span className="font-bold">{dept.head || 'Dr. Department Head'}</span>
                        </p>
                        <p className="text-[11px] text-[#5F6B7A] flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-[#8C98A5]" /> {dept.email || `${code.toLowerCase()}@mit.edu`}
                        </p>
                        <p className="text-[11px] text-[#5F6B7A] flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 text-[#8C98A5]" /> {dept.office_location || 'Main Academic Building'}
                        </p>
                      </div>

                      {/* Stats Pills */}
                      <div className="grid grid-cols-3 gap-2 text-center mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg border border-[#EEF4F7]">
                          <span className="text-[9px] font-bold text-[#8C98A5] uppercase block">Faculty</span>
                          <span className="text-xs font-extrabold text-[#003A40]">{facCount} Staff</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-[#EEF4F7]">
                          <span className="text-[9px] font-bold text-[#8C98A5] uppercase block">Students</span>
                          <span className="text-xs font-extrabold text-[#003A40]">{dept.totalStudents || 280}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-[#EEF4F7]">
                          <span className="text-[9px] font-bold text-[#8C98A5] uppercase block">Courses</span>
                          <span className="text-xs font-extrabold text-[#003A40]">{dept.courses || 8} Units</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer CTA */}
                    <button
                      onClick={() => setSelectedDept(dept)}
                      className="w-full py-2.5 px-3 rounded-xl border border-[#E6EDF2] bg-white text-xs font-bold text-[#003A40] hover:bg-[#F2FBFA] hover:border-[#0A686A]/40 transition-all flex items-center justify-between cursor-pointer group/btn mt-2"
                    >
                      <span>Explore Department</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0A686A] group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detail Inspector Modal */}
          {selectedDept && (
            <DepartmentDetailModal
              department={selectedDept}
              onClose={() => setSelectedDept(null)}
              facultyList={getFilteredFaculty(selectedDept)}
            />
          )}

          {/* Add Modal */}
          <AddDepartmentModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSave={handleAddDepartment} />

          {/* Edit Modal */}
          <EditDepartmentModal
            isOpen={isEditOpen}
            onClose={() => {
              setIsEditOpen(false);
              setEditingDept(null);
            }}
            department={editingDept}
            onSave={handleEditSave}
          />
        </div>
      )}
    </Layout>
  );
}
