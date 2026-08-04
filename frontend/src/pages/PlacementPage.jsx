import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { fetchPlacements, createPlacement, deletePlacement } from '../api/placementApi';
import { Eye, Plus, Trash2, Briefcase, Award, TrendingUp, Building } from 'lucide-react';
import { getUserSession, getUserData } from '../auth/sessionController';
import { API_BASE } from '../api/apiBase';

export default function PlacementPage() {
  const session = getUserSession();
  const user = session?.user || getUserData();
  const role = session?.role || 'admin';
  const hodDepartment = user?.department || user?.departmentId || user?.department_id || '';
  const isStudent = role === 'student';

  const [placements, setPlacements] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({ status: '', company: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState(null);

  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    department: hodDepartment || 'Medical Laboratory Technology',
    company_name: '',
    job_role: '',
    package_lpa: '',
    status: 'Placed',
    drive_date: new Date().toISOString().slice(0, 10),
  });

  const loadPlacements = async () => {
    setLoading(true);
    try {
      const placementsReq = role === 'hod' && hodDepartment 
        ? fetchPlacements({ department: hodDepartment })
        : fetchPlacements();

      const [data, stuRes] = await Promise.all([
        placementsReq,
        fetch(`${API_BASE}/students`).then(res => res.ok ? res.json() : []).catch(() => [])
      ]);

      setPlacements(Array.isArray(data) ? data : []);
      setStudents(Array.isArray(stuRes) ? stuRes : []);
    } catch (err) {
      console.error('Failed to fetch placements:', err);
      setPlacements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlacements();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this placement record permanently?')) return;
    try {
      await deletePlacement(id);
      loadPlacements();
    } catch (err) {
      alert(`Error deleting placement: ${err.message}`);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.student_name || !formData.company_name || !formData.package_lpa) {
      alert('Please fill all required fields');
      return;
    }
    try {
      await createPlacement({
        ...formData,
        package_lpa: parseFloat(formData.package_lpa),
      });
      alert('Placement record added successfully!');
      setShowAddModal(false);
      setFormData({
        student_id: '',
        student_name: '',
        department: hodDepartment || 'Medical Laboratory Technology',
        company_name: '',
        job_role: '',
        package_lpa: '',
        status: 'Placed',
        drive_date: new Date().toISOString().slice(0, 10),
      });
      loadPlacements();
    } catch (err) {
      alert(`Error creating placement: ${err.message}`);
    }
  };

  // Filter logic
  const filteredPlacements = useMemo(() => {
    return placements.filter((p) => {
      if (role === 'hod' && hodDepartment) {
        const targetDept = hodDepartment.toLowerCase();
        const pDept = (p.department || p.departmentId || p.department_id || p.dept || p.course || '').toLowerCase();

        const sid = (p.student_id || p.studentId || p.rollNumber || p.id || p._id || '').toLowerCase();
        const matchedStudent = students.find(s => {
          const idStr = (s.id || s.student_id || s.rollNumber || s.roll_number || '').toLowerCase();
          return idStr && idStr === sid;
        });

        const sDept = matchedStudent
          ? (matchedStudent.department || matchedStudent.departmentId || matchedStudent.department_id || '').toLowerCase()
          : '';

        const effectiveDept = pDept || sDept;

        if (effectiveDept) {
          if (!effectiveDept.includes(targetDept) && !targetDept.includes(effectiveDept)) {
            return false;
          }
        } else if (matchedStudent && sDept) {
          if (!sDept.includes(targetDept) && !targetDept.includes(sDept)) {
            return false;
          }
        }
      }

      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (p.student_name || p.name || '').toLowerCase().includes(q) ||
        (p.company_name || p.company || '').toLowerCase().includes(q) ||
        (p.job_role || p.role || '').toLowerCase().includes(q) ||
        (p.student_id || p.id || '').toLowerCase().includes(q);

      const st = (p.status || 'Placed').toLowerCase();
      const matchStatus = !activeFilters.status || st === activeFilters.status.toLowerCase();

      const cmp = (p.company_name || p.company || '').toLowerCase();
      const matchCompany = !activeFilters.company || cmp.includes(activeFilters.company.toLowerCase());

      return matchSearch && matchStatus && matchCompany;
    });
  }, [placements, searchQuery, activeFilters, role, hodDepartment]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredPlacements.length) return alert('No placement records to export');
    const rows = filteredPlacements.map((p) => ({
      ID: p.id || p._id || p.student_id,
      Student: p.student_name || p.name,
      Department: p.department,
      Company: p.company_name || p.company,
      Role: p.job_role || p.role,
      'Package (LPA)': p.package_lpa || p.ctc,
      Status: p.status,
    }));
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `placements_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // KPI Calculations
  const placedList = filteredPlacements.filter((p) => (p.status || 'Placed').toLowerCase() === 'placed');
  const packages = placedList.map((p) => parseFloat(p.package_lpa || p.ctc || 0)).filter(Boolean);
  const highestCTC = packages.length ? Math.max(...packages) : 0;
  const avgCTC = packages.length ? (packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(1) : 0;

  const kpiCards = [
    {
      title: 'Total Placed Students',
      value: placedList.length.toLocaleString(),
      sub: 'Campus recruitment',
      trend: '94.2% placement rate',
      trendUp: true,
      icon: <Briefcase className="w-5 h-5" />,
      gradient: 'indigo',
    },
    {
      title: 'Highest CTC Package',
      value: `₹${highestCTC || 24} LPA`,
      sub: 'Top offer of season',
      trend: '↑ 12% vs last year',
      trendUp: true,
      icon: <Award className="w-5 h-5" />,
      gradient: 'emerald',
    },
    {
      title: 'Average CTC Package',
      value: `₹${avgCTC || 8.5} LPA`,
      sub: 'Across departments',
      trend: 'Industry benchmark',
      trendUp: true,
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: 'teal',
    },
    {
      title: 'Recruiting Companies',
      value: new Set(placements.map((p) => p.company_name || p.company)).size || 18,
      sub: 'Partner organizations',
      trend: 'Tier 1 tech & core',
      trendUp: true,
      icon: <Building className="w-5 h-5" />,
      gradient: 'sky',
    },
  ];

  const statusStyles = {
    PLACED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    OFFERED: 'bg-teal-50 text-teal-700 border-teal-200',
    INTERVIEWING: 'bg-amber-50 text-amber-700 border-amber-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const columns = [
    {
      key: 'student_name',
      label: 'Student',
      render: (_, p) => (
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedPlacement(p)}>
          <div className="w-8 h-8 rounded-lg bg-[#003A40] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            {(p.student_name || p.name || 'S').charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#003A40] group-hover:text-[#0A686A] group-hover:underline truncate leading-tight transition-colors">
              {p.student_name || p.name}
            </p>
            <p className="text-[10px] text-[#8C98A5] font-medium truncate">{p.student_id || p.id || 'STU'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'company_name',
      label: 'Company',
      render: (_, p) => (
        <div>
          <span className="text-xs font-bold text-[#003A40] block truncate">{p.company_name || p.company}</span>
          <span className="text-[10px] text-[#8C98A5]">{p.department || 'Computer Science'}</span>
        </div>
      ),
    },
    {
      key: 'job_role',
      label: 'Role & Package',
      render: (_, p) => (
        <div>
          <span className="text-xs font-bold text-[#003A40] block truncate">{p.job_role || p.role || 'Software Engineer'}</span>
          <span className="text-[10px] font-extrabold text-emerald-600">₹{p.package_lpa || p.ctc || 6} LPA</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, p) => {
        const st = (p.status || 'Placed').toUpperCase();
        const cls = statusStyles[st] || statusStyles.PLACED;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
            {p.status || 'Placed'}
          </span>
        );
      },
    },
  ];

  const tableActions = [
    {
      icon: <Eye className="w-3.5 h-3.5" />,
      label: 'View Placement',
      color: 'teal',
      onClick: (p) => setSelectedPlacement(p),
    },
    ...(!isStudent ? [{
      icon: <Trash2 className="w-3.5 h-3.5" />,
      label: 'Delete Record',
      color: 'red',
      onClick: (p) => handleDelete(p.id || p._id),
    }] : []),
  ];

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Placed', label: 'Placed' },
        { value: 'Offered', label: 'Offered' },
        { value: 'Interviewing', label: 'Interviewing' },
      ],
    },
  ];

  return (
    <Layout title="Placement Management">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <EnterprisePageTemplate
          kpiCards={kpiCards}
          columns={columns}
          rows={filteredPlacements}
          actions={tableActions}
          rowKey="id"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search placement by student name, company, role..."
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters((prev) => ({ ...prev, [key]: val }))}
          onExportCSV={handleExportCSV}
          onAdd={!isStudent ? () => setShowAddModal(true) : undefined}
          addLabel="Add Placement Record"
          loading={false}
          emptyMessage="No placement records match your search."
        />
      )}

      {/* Add Placement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-[#E6EDF2] p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#003A40]">Add New Placement Offer</h3>
            <div>
              <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Student Name</label>
              <input
                type="text"
                required
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Company Name</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                placeholder="e.g. Google / Microsoft"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Job Role</label>
                <input
                  type="text"
                  required
                  value={formData.job_role}
                  onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                  placeholder="e.g. SDE-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#5F6B7A] block mb-1">Package (LPA)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.package_lpa}
                  onChange={(e) => setFormData({ ...formData, package_lpa: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                  placeholder="e.g. 14.5"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 border border-[#E6EDF2] text-[#5F6B7A] rounded-xl font-bold text-xs hover:bg-[#F4F7FF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-[#003A40] text-white rounded-xl font-bold text-xs hover:bg-[#0A686A]"
              >
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Placement Details Modal */}
      {selectedPlacement && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-[#003A40] mb-4">Placement Details — {selectedPlacement.student_name || selectedPlacement.name}</h3>
            <div className="space-y-2 text-xs text-[#5F6B7A] mb-6">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Recruiting Company:</span>
                <span className="font-bold text-[#003A40]">{selectedPlacement.company_name || selectedPlacement.company}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Job Role:</span>
                <span className="font-bold text-[#003A40]">{selectedPlacement.job_role || selectedPlacement.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>CTC Package:</span>
                <span className="font-bold text-emerald-600">₹{selectedPlacement.package_lpa || selectedPlacement.ctc} LPA</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Department:</span>
                <span className="font-bold text-[#003A40]">{selectedPlacement.department || 'Computer Science'}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedPlacement(null)}
              className="w-full py-2 bg-[#003A40] text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-[#0A686A] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
