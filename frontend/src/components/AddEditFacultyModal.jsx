import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function AddEditFacultyModal({ isOpen, onClose, onSuccess, editMode, initialData, faculty }) {
  // Support both 'faculty' and 'initialData' props for edit
  const editData = faculty || initialData;
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    designation: '',
    employment_status: 'Active',
    office_location: '',
    qualification: '',
    gender: '',
    dob: '',
    college: '',
    university: '',
    nationality: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchDepts = async () => {
      try {
        const response = await fetch(buildApiUrl('/departments'));
        if (response.ok) {
          const data = await response.json();
          setDepartments(data || []);
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepts();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      // Edit mode - populate from existing data
      setFormData({
        employeeId: editData.employeeId || editData.employee_id || '',
        name: editData.name || '',
        email: editData.email || '',
        phone: editData.phone || '',
        departmentId: editData.departmentId || editData.department_id || '',
        designation: editData.designation || '',
        employment_status: editData.employment_status || 'Active',
        office_location: editData.office_location || '',
        qualification: editData.qualification || '',
        gender: editData.gender || '',
        dob: editData.dob ? editData.dob.split('T')[0] : '',
        college: editData.college || '',
        university: editData.university || '',
        nationality: editData.nationality || '',
      });
      setError(null);
    } else {
      // Create mode - new empty form
      setFormData({
        employeeId: `FAC-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        email: '',
        phone: '',
        departmentId: '',
        designation: '',
        employment_status: 'Active',
        office_location: '',
        qualification: '',
        gender: '',
        dob: '',
        college: '',
        university: '',
        nationality: '',
      });
      setError(null);
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Client-side validation: verify all fields are filled
    const requiredFields = [
      'employeeId', 'name', 'email', 'phone', 'departmentId', 'designation', 
      'office_location', 'qualification', 'gender', 'dob', 'college', 'university', 'nationality'
    ];
    for (const f of requiredFields) {
      if (!formData[f] || !formData[f].toString().trim()) {
        setError(`All fields are mandatory. Please fill in "${f.replace('_', ' ').replace('Id', '')}".`);
        setLoading(false);
        return;
      }
    }
    
    try {
      const isEditing = !!editData;
      const url = isEditing
        ? buildApiUrl(`/faculty/${formData.employeeId}`)
        : buildApiUrl('/faculty');
        
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save faculty');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {editData ? 'Edit Faculty Member' : 'Add New Faculty Member'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {editData ? 'Update existing records' : 'Enter details to create a new profile'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form id="facultyForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Employee ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                  readOnly={editMode}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="e.g. Dr. John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email Address <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Department <span className="text-red-500">*</span></label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all bg-white"
                >
                  <option value="">Select Department</option>
                  <option value="Administration">Administration</option>
                  {departments.map(d => (
                    <option key={d.code || d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Designation <span className="text-red-500">*</span></label>
                <select
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all bg-white"
                >
                  <option value="">Select Designation</option>
                  <option value="Administrator">Administrator</option>
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Office Location <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="office_location"
                  value={formData.office_location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="e.g. Room 402, Block A"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Status <span className="text-red-500">*</span></label>
                <select
                  name="employment_status"
                  value={formData.employment_status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="On-Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Qualification <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="e.g. M.Tech / Ph.D."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Gender <span className="text-red-500">*</span></label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Date of Birth <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">College <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="e.g. Movi Institute of Technology"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">University <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="e.g. Anna University"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nationality <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  placeholder="e.g. Indian"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="facultyForm"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-green-700 rounded-xl hover:bg-green-800 active:scale-95 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Saving...' : editData ? 'Update Faculty' : 'Add Faculty'}
          </button>
        </div>
      </div>
    </div>
  );
}
