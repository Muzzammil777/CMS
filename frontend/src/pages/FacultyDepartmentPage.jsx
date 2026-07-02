import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Building2, Users, BookOpen, Mail, Phone, MapPin, 
  Share2, Edit, X, Save, ArrowRight, Trash2
} from 'lucide-react';
import { getUserData, getUserSession } from '../auth/sessionController';
import { settingsApi } from '../api/settingsApi';
import { buildApiUrl } from '../api/apiBase';
import KpiCard from '../components/KpiCard';
import './FacultyDepartmentPage.css';

// Edit Department Modal
function EditDepartmentModal({ isOpen, onClose, department, onSave }) {
  const [formData, setFormData] = useState(department || {});

  useEffect(() => {
    if (department) {
      setFormData(department);
    }
  }, [department]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
    alert('Department information updated successfully!');
    onClose();
  };

  if (!isOpen || !department) return null;

  return (
    <div className="dept-modal-overlay" onClick={onClose}>
      <div className="dept-modal-content" onClick={e => e.stopPropagation()}>
        <div className="dept-modal-header">
          <h2 className="dept-modal-title">Edit Department Details</h2>
          <button className="dept-modal-close-btn" onClick={onClose}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Department Name</label>
          <input
            type="text"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            className="dept-form-input"
          />
        </div>

        <div className="dept-form-row">
          <div className="dept-form-group">
            <label className="dept-form-label">Department Code</label>
            <input
              type="text"
              name="code"
              value={formData.code || ''}
              onChange={handleChange}
              className="dept-form-input"
            />
          </div>
          <div className="dept-form-group">
            <label className="dept-form-label">HOD</label>
            <input
              type="text"
              name="head"
              value={formData.head || ''}
              onChange={handleChange}
              className="dept-form-input"
            />
          </div>
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="dept-form-input"
          />
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            className="dept-form-input"
          />
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location || ''}
            onChange={handleChange}
            className="dept-form-input"
          />
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Description</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows="3"
            className="dept-form-textarea"
          />
        </div>

        <div className="dept-form-actions">
          <button className="dept-btn dept-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="dept-btn dept-btn-primary" onClick={handleSubmit}>
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Department Modal
function AddDepartmentModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    head: '',
    totalFaculty: 0,
    totalStudents: 0,
    courses: 0,
    email: '',
    phone: '',
    location: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name.includes('total') || name === 'courses' ? (value === '' ? '' : Number(value)) : value 
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code) {
      alert('Please fill in all required fields');
      return;
    }
    
    const newDept = {
      ...formData,
      totalFaculty: formData.totalFaculty === '' ? 0 : Number(formData.totalFaculty),
      totalStudents: formData.totalStudents === '' ? 0 : Number(formData.totalStudents),
      courses: formData.courses === '' ? 0 : Number(formData.courses)
    };
    
    onSave(newDept);
    setFormData({
      name: '',
      code: '',
      head: '',
      totalFaculty: 0,
      totalStudents: 0,
      courses: 0,
      email: '',
      phone: '',
      location: '',
      description: ''
    });
    alert('Department added successfully!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dept-modal-overlay" onClick={onClose}>
      <div className="dept-modal-content" onClick={e => e.stopPropagation()}>
        <div className="dept-modal-header">
          <h2 className="dept-modal-title">Add New Department</h2>
          <button className="dept-modal-close-btn" onClick={onClose}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Department Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Computer Science & Engineering"
            className="dept-form-input"
          />
        </div>

        <div className="dept-form-row">
          <div className="dept-form-group">
            <label className="dept-form-label">Department Code *</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g., CSE"
              className="dept-form-input"
            />
          </div>
          <div className="dept-form-group">
            <label className="dept-form-label">HOD</label>
            <input
              type="text"
              name="head"
              value={formData.head}
              onChange={handleChange}
              placeholder="e.g., Dr. Rajesh Kumar"
              className="dept-form-input"
            />
          </div>
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="dept@mit.edu"
            className="dept-form-input"
          />
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91-9876543210"
            className="dept-form-input"
          />
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Building A, Floor 3"
            className="dept-form-input"
          />
        </div>

        <div className="dept-form-row">
          <div className="dept-form-group">
            <label className="dept-form-label">Faculty Count</label>
            <input
              type="number"
              name="totalFaculty"
              value={formData.totalFaculty}
              onChange={handleChange}
              min="0"
              className="dept-form-input"
            />
          </div>
          <div className="dept-form-group">
            <label className="dept-form-label">Student Count</label>
            <input
              type="number"
              name="totalStudents"
              value={formData.totalStudents}
              onChange={handleChange}
              min="0"
              className="dept-form-input"
            />
          </div>
        </div>

        <div className="dept-form-group">
          <label className="dept-form-label">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            placeholder="Brief description of the department"
            className="dept-form-textarea"
          />
        </div>

        <div className="dept-form-actions">
          <button className="dept-btn dept-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="dept-btn dept-btn-primary" onClick={handleSubmit}>
            <Save size={16} /> Add Department
          </button>
        </div>
      </div>
    </div>
  );
}

// Share Department Modal
function ShareDepartmentModal({ isOpen, onClose, departmentName }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/#/department`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareEmail = () => {
    const subject = `Department Information - ${departmentName}`;
    const body = `View the department portal at: ${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="dept-modal-overlay" onClick={onClose}>
      <div className="dept-modal-content" onClick={e => e.stopPropagation()}>
        <div className="dept-modal-header">
          <h2 className="dept-modal-title">Share Department</h2>
          <button className="dept-modal-close-btn" onClick={onClose}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label className="dept-form-label">Share Link</label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '10px'
          }}>
            <input
              type="text"
              value={shareUrl}
              readOnly
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.85rem',
                color: '#334155'
              }}
            />
            <button
              onClick={handleCopyLink}
              className="dept-btn dept-btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <button
          onClick={handleShareEmail}
          className="dept-btn dept-btn-secondary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Share via Email
        </button>

        <div className="dept-form-actions">
          <button className="dept-btn dept-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Department Details Display
function DepartmentDetailsView({ department, isAdmin, onEdit, onShare, onDelete, facultyList }) {
  return (
    <div className="dept-detail-card">
      <div className="dept-hero-banner">
        <div className="dept-hero-circle-1" />
        <div className="dept-hero-circle-2" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="dept-badge">
            <Building2 size={14} />
            <span>{department.code}</span>
          </div>
          <h2 className="dept-title">{department.name}</h2>
          <p className="dept-desc">{department.description || `${department.name} department at MIT Connect.`}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isAdmin && (
              <>
                <button className="dept-btn" style={{ background: '#f8fafc', color: '#0f172a' }} onClick={onEdit}>
                  <Edit size={15} /> Edit Details
                </button>
                <button className="dept-btn" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }} onClick={onDelete}>
                  <Trash2 size={15} /> Delete Department
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="dept-stats-row">
        <div className="dept-stat-box faculty">
          <div className="dept-stat-box-label">Faculty Members</div>
          <div className="dept-stat-box-val">{department.totalFaculty || 0}</div>
        </div>
        <div className="dept-stat-box students">
          <div className="dept-stat-box-label">Total Students</div>
          <div className="dept-stat-box-val">{department.totalStudents || 0}</div>
        </div>
        <div className="dept-stat-box courses">
          <div className="dept-stat-box-label">Courses Offered</div>
          <div className="dept-stat-box-val">{department.courses || 0}</div>
        </div>
      </div>

      <div className="dept-info-block">
        <div className="dept-info-card">
          <div className="dept-info-card-title">HOD</div>
          <div className="dept-hod-flex">
            <div className="dept-hod-avatar">
              {(department.head || 'H').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="dept-hod-name">{department.head || 'Not Assigned'}</div>
              <div className="dept-hod-badge">
                <div className="dept-hod-dot" />
                <span>Department Head</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dept-info-card">
          <div className="dept-info-card-title">Contact & Location</div>
          <div className="dept-contact-list">
            <div className="dept-contact-item">
              <div className="dept-contact-icon"><Mail size={16} /></div>
              <div>
                <div className="dept-contact-label">Email</div>
                {department.email ? (
                  <a href={`mailto:${department.email}`} className="dept-contact-value">{department.email}</a>
                ) : (
                  <span className="dept-contact-value">—</span>
                )}
              </div>
            </div>
            <div className="dept-contact-item">
              <div className="dept-contact-icon"><MapPin size={16} /></div>
              <div>
                <div className="dept-contact-label">Location</div>
                <span className="dept-contact-value">{department.location || 'Campus'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dept-faculty-section">
        <h3 className="dept-faculty-title">
          <Users size={18} className="text-[#00236f]" />
          Department Faculty Directory
        </h3>
        {facultyList.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
            No faculty members registered under this department.
          </p>
        ) : (
          <div className="dept-faculty-grid">
            {facultyList.map((fac, idx) => (
              <div key={fac.employeeId || idx} className="dept-faculty-member-card">
                <div className="dept-faculty-member-avatar">
                  {fac.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'F'}
                </div>
                <div className="dept-faculty-member-info">
                  <div className="dept-faculty-member-name" title={fac.name}>{fac.name}</div>
                  <div className="dept-faculty-member-role">{fac.designation || 'Faculty Member'}</div>
                  <div className="dept-faculty-member-email" title={fac.email}>{fac.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FacultyDepartmentPage() {
  const userData = getUserData();
  const session = getUserSession();
  const role = session?.role || 'student';
  const userDept = userData?.departmentId || userData?.department || '';

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allFaculty, setAllFaculty] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState('list');

  // Fetch departments and faculty list on mount
  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setLoading(true);
      try {
        // Fetch departments
        const deptsData = await settingsApi.getDepartments();
        const deptsList = Array.isArray(deptsData) ? deptsData : [];

        // Fetch all faculty members
        const facRes = await fetch(buildApiUrl('/faculty'));
        const facData = facRes.ok ? await facRes.json() : [];

        if (!active) return;
        setAllFaculty(facData || []);

        if (role === 'faculty') {
          // Match faculty's own department
          const matched = deptsList.filter(d =>
            d.code?.toLowerCase() === userDept.toLowerCase() ||
            d.name?.toLowerCase() === userDept.toLowerCase() ||
            d.name?.toLowerCase().includes(userDept.toLowerCase()) ||
            userDept.toLowerCase().includes(d.name?.toLowerCase())
          );

          setDepartments(matched);
          setSelectedDept(matched[0] || null);
        } else {
          setDepartments(deptsList);
          // Auto select user's department or first one
          const match = deptsList.find(d =>
            d.code?.toLowerCase() === userDept.toLowerCase() ||
            d.name?.toLowerCase().includes(userDept.toLowerCase())
          );
          setSelectedDept(match || deptsList[0] || null);
        }
      } catch (err) {
        console.error('Failed to load department metrics:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialData();
    return () => { active = false; };
  }, [userDept, role]);

  const handleEditSave = async (updatedData) => {
    try {
      const saved = await settingsApi.updateDepartment(updatedData.id, updatedData);
      setSelectedDept(saved);
      setDepartments(departments.map(d => d.id === saved.id ? saved : d));
    } catch (err) {
      console.error('Failed to update department:', err);
      // Optimistic fallback
      setSelectedDept(updatedData);
      setDepartments(departments.map(d => d.id === updatedData.id ? updatedData : d));
    }
  };

  const handleAddDepartment = async (newDept) => {
    try {
      const saved = await settingsApi.createDepartment(newDept);
      setDepartments([...departments, saved]);
      setSelectedDept(saved);
    } catch (err) {
      console.error('Failed to add department:', err);
      setDepartments([...departments, newDept]);
      setSelectedDept(newDept);
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm("Are you sure you want to delete this department? This action cannot be undone.")) {
      return;
    }
    try {
      await settingsApi.deleteDepartment(deptId);
      const remaining = departments.filter(d => d.id !== deptId);
      setDepartments(remaining);
      setSelectedDept(remaining[0] || null);
      alert('Department deleted successfully!');
    } catch (err) {
      console.error('Failed to delete department:', err);
      alert(`Error deleting department: ${err.message || err}`);
    }
  };

  // Filter faculty members associated with selected department
  const getFilteredFaculty = () => {
    if (!selectedDept || !allFaculty.length) return [];
    return allFaculty.filter(fac => {
      const fDept = (fac.departmentId || fac.department || '').toLowerCase();
      const dName = (selectedDept.name || '').toLowerCase();
      const dCode = (selectedDept.code || '').toLowerCase();
      return fDept === dName || fDept === dCode || dName.includes(fDept) || fDept.includes(dName);
    });
  };

  // Filter departments by search query (for admin sidebar)
  const filteredDepartments = departments.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const aggregateStats = {
    totalDepts: departments.length,
    totalFaculty: departments.reduce((sum, d) => sum + (d.totalFaculty || 0), 0),
    totalStudents: departments.reduce((sum, d) => sum + (d.totalStudents || 0), 0),
    totalCourses: departments.reduce((sum, d) => sum + (d.courses || 0), 0),
  };

  const isFacultyRole = role === 'faculty';

  return (
    <Layout title={isFacultyRole ? "My Department" : "Departments"}>
      <div className="dept-page-container">
        
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e2e8f0',
                borderTopColor: '#00236f',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }}/>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading department profile details...</p>
            </div>
          </div>
        ) : !selectedDept ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#64748b' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '64px', opacity: 0.2, display: 'block', marginBottom: '12px' }}>domain</span>
            <p>No department configuration found.</p>
          </div>
        ) : isFacultyRole ? (
          /* Faculty View: Full width single department profile */
          <DepartmentDetailsView 
            department={selectedDept}
            isAdmin={false}
            onEdit={() => setIsEditOpen(true)}
            facultyList={getFilteredFaculty()}
          />
        ) : (
          /* Admin View: Dashboard stats on top, Sidebar and detail split below */
          <>
            {/* On mobile, only show Add Department when on 'list' view */}
            <div className={`${mobileActiveTab === 'details' ? 'hidden md:flex' : 'flex'} justify-end mb-6`}>
              <button className="dept-btn dept-btn-primary w-full md:w-auto justify-center" onClick={() => setIsAddOpen(true)}>
                + Add Department
              </button>
            </div>

            {/* KPI grid hidden on mobile when viewing details */}
            <div className={`dept-kpi-grid ${mobileActiveTab === 'details' ? 'hidden md:grid' : 'grid'}`}>
              <KpiCard icon="domain" label="Departments" value={aggregateStats.totalDepts} colorScheme="blue" />
              <KpiCard icon="person" label="Total Faculty" value={aggregateStats.totalFaculty} colorScheme="purple" />
              <KpiCard icon="group" label="Total Students" value={aggregateStats.totalStudents} colorScheme="green" />
              <KpiCard icon="menu_book" label="Total Courses" value={aggregateStats.totalCourses} colorScheme="amber" />
            </div>

            <div className="dept-main-grid">
              {/* Sidebar hidden on mobile when viewing details */}
              <div className={`dept-sidebar ${mobileActiveTab === 'details' ? 'hidden md:flex' : 'flex'}`}>
                <div className="dept-sidebar-header">
                  <span className="material-symbols-outlined">domain</span>
                  <span>Departments List</span>
                </div>
                <div className="dept-search-wrapper">
                  <input
                    type="text"
                    placeholder="Search department..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="dept-search-input"
                  />
                </div>
                <div className="dept-list-items">
                  {filteredDepartments.map(dept => (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setSelectedDept(dept);
                        setMobileActiveTab('details');
                      }}
                      className={`dept-list-btn ${selectedDept.id === dept.id ? 'active' : ''}`}
                    >
                      {dept.code !== dept.name && <div className="dept-list-code">{dept.code}</div>}
                      <div className="dept-list-name">{dept.name}</div>
                    </button>
                  ))}
                  {filteredDepartments.length === 0 && (
                    <p style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                      No matches found
                    </p>
                  )}
                </div>
              </div>

              {/* Detail view hidden on mobile when viewing list */}
              <div className={`dept-detail-container ${mobileActiveTab === 'list' ? 'hidden md:block' : 'block'} w-full`}>
                {/* Back button visible only on mobile */}
                <button 
                  className="flex md:hidden items-center gap-2 text-sm font-bold text-[#00236f] mb-4 hover:underline"
                  onClick={() => setMobileActiveTab('list')}
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  Back to Departments List
                </button>
                
                <DepartmentDetailsView 
                  department={selectedDept}
                  isAdmin={true}
                  onEdit={() => setIsEditOpen(true)}
                  onDelete={() => handleDeleteDepartment(selectedDept.id)}
                  facultyList={getFilteredFaculty()}
                />
              </div>
            </div>
          </>
        )}

        {/* Modals */}
        <AddDepartmentModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSave={handleAddDepartment} />
        <EditDepartmentModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} department={selectedDept} onSave={handleEditSave} />
      </div>
    </Layout>
  );
}
