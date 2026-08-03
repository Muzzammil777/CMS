import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { useAdmission } from '../context/AdmissionContext';
import AdmissionDetailsModal from '../components/AdmissionDetailsModal';
import { Eye, Check, X, Trash2, Users, UserCheck, CheckCircle2, XCircle } from 'lucide-react';

export default function AdmissionPage() {
  const navigate = useNavigate();
  const {
    studentApps,
    facultyApps,
    updateStudentStatus,
    updateFacultyStatus,
    deleteStudentApp,
    deleteFacultyApp,
    loading,
  } = useAdmission();

  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({ status: '' });
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // ── Raw List Filter ──────────────────────────────────────────────────────
  const filteredApps = useMemo(() => {
    let rawApps = activeTab === 'students' ? studentApps : facultyApps;

    return rawApps
      .map((app) => {
        if (activeTab === 'faculty' || app.designation) {
          return {
            ...app,
            role: app.designation || app.role || 'Faculty Member',
            experience: app.yearsOfExperience,
            highestQualification: app.qualification,
          };
        }
        return app;
      })
      .filter((app) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          !q ||
          (app.name || app.fullName || '').toLowerCase().includes(q) ||
          (app.id || app.rollNumber || app.employeeId || '').toLowerCase().includes(q) ||
          (app.email || '').toLowerCase().includes(q);

        const st = (app.status || 'Pending').toLowerCase();
        const matchStatus = !activeFilters.status || st === activeFilters.status.toLowerCase();

        return matchSearch && matchStatus;
      });
  }, [activeTab, studentApps, facultyApps, searchQuery, activeFilters]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    try {
      if (activeTab === 'students') {
        await updateStudentStatus(id, 'Approved');
      } else {
        await updateFacultyStatus(id, 'Approved');
      }
    } catch (error) {
      alert(`Error approving application: ${error.message}`);
    }
  };

  const handleReject = (id) => {
    if (activeTab === 'students') {
      updateStudentStatus(id, 'Rejected');
    } else {
      updateFacultyStatus(id, 'Rejected');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this application permanently?')) {
      if (activeTab === 'students') {
        deleteStudentApp(id);
      } else {
        deleteFacultyApp(id);
      }
    }
  };

  const handleView = (app) => {
    setSelectedApp({
      ...app,
      type: activeTab === 'students' ? 'student' : 'faculty',
    });
    setShowDetailsModal(true);
  };

  // ── Export CSV/PDF ───────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!filteredApps.length) return alert('No data to export');
    const rows = filteredApps.map((a) => ({
      ID: a.id || a.employeeId || '',
      Name: a.name || a.fullName || '',
      Type: activeTab,
      Course_Role: a.course || a.role || a.designation || '',
      Department: a.department || a.departmentId || '',
      Status: a.status || 'Pending',
    }));
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admissions_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── KPI Cards ────────────────────────────────────────────────────────────
  const approvedCount =
    studentApps.filter((a) => a.status === 'Approved').length +
    facultyApps.filter((a) => a.status === 'Approved').length;
  const rejectedCount =
    studentApps.filter((a) => a.status === 'Rejected').length +
    facultyApps.filter((a) => a.status === 'Rejected').length;

  const kpiCards = [
    {
      title: 'Student Applicants',
      value: studentApps.length.toLocaleString(),
      sub: 'Pending admissions',
      trend: 'New intake cycle',
      trendUp: true,
      icon: <Users className="w-5 h-5" />,
      gradient: 'indigo',
    },
    {
      title: 'Faculty Applicants',
      value: facultyApps.length.toLocaleString(),
      sub: 'Faculty recruitment',
      trend: 'Teaching staff',
      trendUp: true,
      icon: <UserCheck className="w-5 h-5" />,
      gradient: 'teal',
    },
    {
      title: 'Approved Applications',
      value: approvedCount.toLocaleString(),
      sub: 'Enrolled & Verified',
      trend: `${(((approvedCount || 0) / ((studentApps.length + facultyApps.length) || 1)) * 100).toFixed(1)}% approved`,
      trendUp: true,
      icon: <CheckCircle2 className="w-5 h-5" />,
      gradient: 'emerald',
    },
    {
      title: 'Rejected Applications',
      value: rejectedCount.toLocaleString(),
      sub: 'Did not qualify',
      trend: 'Archived files',
      trendUp: false,
      icon: <XCircle className="w-5 h-5" />,
      gradient: 'rose',
    },
  ];

  // ── Status Badge ─────────────────────────────────────────────────────────
  const statusStyles = {
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const columns = [
    {
      key: 'name',
      label: 'Applicant Name',
      render: (_, a) => (
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => handleView(a)}>
          <img
            src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name || a.fullName || 'A')}&background=003A40&color=fff&size=80`}
            alt={a.name}
            className="w-9 h-9 rounded-lg object-cover border border-[#E6EDF2] flex-shrink-0 group-hover:border-[#0A686A] transition-all"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#003A40] group-hover:text-[#0A686A] group-hover:underline truncate leading-tight transition-colors">
              {a.name || a.fullName}
            </p>
            <p className="text-[10px] text-[#8C98A5] font-medium truncate">{a.id || a.employeeId || 'APP'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email / Contact',
      render: (_, a) => <span className="text-xs text-[#5F6B7A] font-medium">{a.email || a.phone || '—'}</span>,
    },
    {
      key: 'role_course',
      label: activeTab === 'students' ? 'Applied Course' : 'Role / Designation',
      render: (_, a) => (
        <span className="inline-block px-2.5 py-1 bg-[#F4F7FF] border border-[#E6EDF2] rounded-lg text-xs font-bold text-[#003A40]">
          {activeTab === 'students'
            ? (typeof a.course === 'object' ? a.course?.name || a.course?.course : a.course) || 'Computer Science'
            : a.role || a.designation || 'Assistant Professor'}
        </span>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (_, a) => (
        <span className="text-xs text-[#5F6B7A] font-medium">
          {a.department || a.departmentId || 'Main Department'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, a) => {
        const st = (a.status || 'Pending').toUpperCase();
        const cls = statusStyles[st] || statusStyles.PENDING;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
            {a.status || 'Pending'}
          </span>
        );
      },
    },
  ];

  const tableActions = [
    {
      icon: <Eye className="w-3.5 h-3.5" />,
      label: 'View Application',
      color: 'teal',
      onClick: (a) => handleView(a),
    },
    {
      icon: <Check className="w-3.5 h-3.5" />,
      label: 'Approve Applicant',
      color: 'green',
      onClick: (a) => handleApprove(a.id),
    },
    {
      icon: <X className="w-3.5 h-3.5" />,
      label: 'Reject Applicant',
      color: 'red',
      onClick: (a) => handleReject(a.id),
    },
    {
      icon: <Trash2 className="w-3.5 h-3.5" />,
      label: 'Delete Record',
      color: 'red',
      onClick: (a) => handleDelete(a.id),
    },
  ];

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Pending', label: 'Pending' },
        { value: 'Approved', label: 'Approved' },
        { value: 'Rejected', label: 'Rejected' },
      ],
    },
  ];

  const tabToggleFilter = (
    <div className="flex items-center p-0.5 bg-[#F8FAFC] border border-[#E6EDF2] rounded-lg h-8">
      <button
        onClick={() => setActiveTab('students')}
        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
          activeTab === 'students'
            ? 'bg-gradient-to-r from-[#003A40] to-[#0A686A] text-white shadow-2xs'
            : 'text-[#5F6B7A] hover:bg-slate-200/50'
        }`}
      >
        Student Admissions ({studentApps.length})
      </button>
      <button
        onClick={() => setActiveTab('faculty')}
        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
          activeTab === 'faculty'
            ? 'bg-gradient-to-r from-[#003A40] to-[#0A686A] text-white shadow-2xs'
            : 'text-[#5F6B7A] hover:bg-slate-200/50'
        }`}
      >
        Faculty Applications ({facultyApps.length})
      </button>
    </div>
  );

  return (
    <Layout title="Admission Management">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <EnterprisePageTemplate
          kpiCards={kpiCards}
          columns={columns}
          rows={filteredApps}
          actions={tableActions}
          rowKey="id"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={`Search ${activeTab} by name, ID, email...`}
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters((prev) => ({ ...prev, [key]: val }))}
          customFilters={tabToggleFilter}
          onExportCSV={handleExportCSV}
          onAdd={() => navigate('/add-student')}
          addLabel="New Admission"
          loading={false}
          emptyMessage={`No ${activeTab} applications match your search.`}
        />
      )}


      {/* Details Modal */}
      {showDetailsModal && selectedApp && (
        <AdmissionDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          application={selectedApp}
          onApprove={() => {
            handleApprove(selectedApp.id);
            setShowDetailsModal(false);
          }}
          onReject={() => {
            handleReject(selectedApp.id);
            setShowDetailsModal(false);
          }}
        />
      )}
    </Layout>
  );
}
