import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import { Users, Search, Filter, BookOpen, Mail, Phone, Plus, X } from 'lucide-react';
import { API_BASE } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';

const API_BASE_URL = API_BASE;

// Add Student Modal Component
function AddStudentModal({ isOpen, onClose, onAdd, departments }) {
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    phone: '',
    department: '',
    section: 'A'
  });

  useEffect(() => {
    if (isOpen && departments && departments.length > 0) {
      setFormData(prev => ({
        ...prev,
        department: prev.department || departments[0].name
      }));
    }
  }, [isOpen, departments]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (formData.name && formData.rollNumber && formData.email) {
      onAdd(formData);
      setFormData({
        name: '',
        rollNumber: '',
        email: '',
        phone: '',
        department: departments && departments.length > 0 ? departments[0].name : '',
        section: 'A'
      });
      alert('Student added to class successfully!');
      onClose();
    } else {
      alert('Please fill in all required fields');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            Add Student to Class
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Student Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter name"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Roll Number *
            </label>
            <input
              type="text"
              name="rollNumber"
              value={formData.rollNumber}
              onChange={handleChange}
              placeholder="e.g., 001"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@mit.edu"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91-XXXXXXXXXX"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Department
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              {(departments || []).map((dept) => (
                <option key={dept.id || dept.code} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Section
            </label>
            <select
              name="section"
              value={formData.section}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
            onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 16px',
              background: '#00236f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#001a54'}
            onMouseLeave={(e) => e.target.style.background = '#00236f'}
          >
            Add Student
          </button>
        </div>
      </div>
    </div>
  );
}

// Student Details Modal
function StudentDetailsModal({ student, isOpen, onClose }) {
  if (!isOpen || !student) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            Student Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <div style={{
          background: '#f9fafb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00236f 0%, #1a3c85 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '18px'
            }}>
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                {student.name}
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {student.rollNumber}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#00236f', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, marginBottom: '4px' }}>
              Department
            </p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              {student.department || 'Computer Science'}
            </p>
          </div>
          <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, marginBottom: '4px' }}>
              Status
            </p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#15803d', margin: 0 }}>
              {student.status || 'Active'}
            </p>
          </div>
        </div>

        <div style={{ background: '#faf5ff', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <Mail size={16} color="#ec4899" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Email</span>
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            {student.email}
          </p>
        </div>

        {student.phone && (
          <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <Phone size={16} color="#1a3c85" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Phone</span>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
              {student.phone}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#00236f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#001a54'}
            onMouseLeave={(e) => e.target.style.background = '#00236f'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FacultyStudentsPage() {
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await settingsApi.getDepartments();
        setDepartments(data || []);
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [departmentFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/students`;
      if (departmentFilter) {
        url += `?department=${encodeURIComponent(departmentFilter)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setStudentsList(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = studentsList.filter(s =>
    (s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!departmentFilter || s.department === departmentFilter)
  );

  const stats = {
    total: studentsList.length,
    active: studentsList.filter(s => s.status === 'active' || s.status === 'Active').length,
    departments: new Set(studentsList.map(s => s.department)).size
  };

  const handleAddStudent = (studentData) => {
    // In a real app, this would send data to the backend
    const newStudent = {
      ...studentData,
      _id: `student-${Date.now()}`,
      status: 'Active'
    };
    setStudentsList([...studentsList, newStudent]);
    console.log('Student added:', studentData);
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
  };

  return (
    <Layout title="Students">
      <div style={{ paddingBottom: '40px' }}>

        {/* Stats Grid */}
        <KpiGrid>
          <KpiCard
            icon="group"
            label="Total Students"
            value={studentsList.length.toString()}
            colorScheme="green"
          />
          <KpiCard
            icon="bolt"
            label="Active Students"
            value={stats.active.toString()}
            colorScheme="green"
          />
          <KpiCard
            icon="domain"
            label="Departments"
            value={stats.departments.toString()}
            colorScheme="emerald"
          />
        </KpiGrid>

        {/* Search and Filter Bar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            minWidth: '200px',
            padding: '8px 12px',
            background: '#f3f4f6',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <Search size={18} style={{ color: '#9ca3af', marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Search by name, roll number or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '14px',
                color: '#374151',
                width: '100%'
              }}
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            style={{
              padding: '8px 16px',
              background: filterOpen ? '#00236f' : '#f3f4f6',
              color: filterOpen ? 'white' : '#374151',
              border: `1px solid ${filterOpen ? '#00236f' : '#e5e7eb'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!filterOpen) e.target.style.background = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              if (!filterOpen) e.target.style.background = '#f3f4f6';
            }}
          >
            <Filter size={16} />
            Filter
          </button>
        </div>

        {/* Filter Dropdown */}
        {filterOpen && (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Departments</option>
                {(departments || []).map((dept) => (
                  <option key={dept.id || dept.code} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Students Table */}
        {loading ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            Loading students...
          </div>
        ) : filteredStudents.length > 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Roll Number
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Name
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Department
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Email
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student._id || index}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: '#1f2937', fontWeight: '500' }}>
                      {student.rollNumber}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#1f2937' }}>
                      {student.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {student.department || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>
                      {student.email}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: student.status === 'active' || student.status === 'Active' ? '#dcfce7' : '#fecaca',
                        color: student.status === 'active' || student.status === 'Active' ? '#15803d' : '#991b1b'
                      }}>
                        {student.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleViewDetails(student)}
                          style={{
                            padding: '6px 10px',
                            background: '#06b6d4',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#1a3c85'}
                          onMouseLeave={(e) => e.target.style.background = '#06b6d4'}
                          title="View student details"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => {
                            if (student._id && student._id.startsWith('student-')) {
                              alert('This student was just added and needs to be saved to the system first. Please use the Details button to view information.');
                            } else {
                              navigate(`/students/${encodeURIComponent(student.rollNumber || student.id)}`);
                            }
                          }}
                          style={{
                            padding: '6px 10px',
                            background: student._id && student._id.startsWith('student-') ? '#a0aec0' : '#00236f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: student._id && student._id.startsWith('student-') ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (!student._id || !student._id.startsWith('student-')) {
                              e.target.style.background = '#001a54';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!student._id || !student._id.startsWith('student-')) {
                              e.target.style.background = '#00236f';
                            }
                          }}
                          title={student._id && student._id.startsWith('student-') ? 'Newly added students must be saved first' : 'View full student profile'}
                        >
                          Profile
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>No students found matching your criteria.</p>
          </div>
        )}

        {/* Modals */}
        <AddStudentModal
          isOpen={isAddStudentOpen}
          onClose={() => setIsAddStudentOpen(false)}
          onAdd={handleAddStudent}
          departments={departments}
        />

        <StudentDetailsModal
          student={selectedStudent}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
      </div>
    </Layout>
  );
}
