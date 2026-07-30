import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { useAdmission } from '../context/AdmissionContext';
import { getUserSession } from '../auth/sessionController';
import { listFees, assignFee, deleteFeeAssignment } from '../api/feesApi';
import { createInvoice } from '../api/invoicesApi';
import { fetchStudents } from '../api/studentsApi';
import { Eye, Plus, Trash2, DollarSign, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function AdminFeesPage() {
  const session = getUserSession();
  const { approvedStudents } = useAdmission();
  const [feeAssignments, setFeeAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({ status: '', semester: '' });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedEnrolledStudentId, setSelectedEnrolledStudentId] = useState('');
  const [expandedFee, setExpandedFee] = useState(null);

  const [assignFormData, setAssignFormData] = useState({
    semester: '',
    course: '',
    isFirstGraduate: false,
    needsHostel: false,
    isAcHostel: false,
  });

  // Fetch enrolled students
  useEffect(() => {
    fetchStudents()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setEnrolledStudents(list.filter((s) => s.status?.toLowerCase() === 'active' || !s.status));
      })
      .catch((err) => console.error('Failed to load enrolled students:', err));
  }, []);

  // Fetch fee assignments
  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFees();
      setFeeAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch fee assignments:', err);
      setFeeAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  // Fee calculation helper
  const calculateFees = (semester, isFirstGraduate, needsHostel, isAcHostel) => {
    const semesterFee = isFirstGraduate ? 85000 : 110000;
    const bookFee = 3950;
    const examFee = 250;
    const hostelFee = needsHostel ? (isAcHostel ? 115000 : 85000) : 0;
    const miscFee = 10000;
    return {
      semesterFee,
      bookFee,
      examFee,
      hostelFee,
      miscFee,
      totalFee: semesterFee + bookFee + examFee + hostelFee + miscFee,
    };
  };

  const handleConfirmAssignFee = async () => {
    if (!selectedStudent || !assignFormData.semester || !selectedEnrolledStudentId) {
      alert('Please fill all required fields');
      return;
    }
    const targetStudent = enrolledStudents.find((s) => (s._id || s.id || s.rollNumber) === selectedEnrolledStudentId);
    const fees = calculateFees(
      assignFormData.semester,
      assignFormData.isFirstGraduate,
      assignFormData.needsHostel,
      assignFormData.isAcHostel
    );

    const newFeeRecord = {
      id: `FEE-${Date.now()}`,
      applicationId: selectedStudent.id,
      studentId: targetStudent?.rollNumber || targetStudent?.id || selectedEnrolledStudentId,
      studentName: targetStudent?.name || selectedStudent.name,
      email: targetStudent?.email || selectedStudent.email,
      course: targetStudent?.department || selectedStudent.course || 'Computer Science',
      semester: assignFormData.semester,
      totalFee: fees.totalFee,
      components: fees,
      options: {
        isFirstGraduate: assignFormData.isFirstGraduate,
        needsHostel: assignFormData.needsHostel,
        isAcHostel: assignFormData.isAcHostel,
      },
      status: 'Pending',
      paidAmount: 0,
      assignedBy: session?.userId || 'Admin',
      assignedDate: new Date().toISOString(),
    };

    try {
      await assignFee(newFeeRecord);
      alert('Fee structure assigned successfully!');
      setShowAssignModal(false);
      fetchFees();
    } catch (err) {
      alert(`Error assigning fee: ${err.message}`);
    }
  };

  const handleDeleteFee = async (feeId) => {
    if (!deleteReason) return alert('Reason is required');
    try {
      await deleteFeeAssignment(feeId, deleteReason);
      setDeleteConfirm(null);
      setDeleteReason('');
      fetchFees();
    } catch (err) {
      alert(`Error deleting fee: ${err.message}`);
    }
  };

  // Filtered fee records
  const filteredFees = useMemo(() => {
    return feeAssignments.filter((f) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (f.studentName || '').toLowerCase().includes(q) ||
        (f.studentId || f.id || '').toLowerCase().includes(q) ||
        (f.course || '').toLowerCase().includes(q);

      const st = (f.status || 'Pending').toLowerCase();
      const matchStatus = !activeFilters.status || st === activeFilters.status.toLowerCase();

      const sem = String(f.semester || '').toLowerCase();
      const matchSem = !activeFilters.semester || sem.includes(activeFilters.semester.toLowerCase());

      return matchSearch && matchStatus && matchSem;
    });
  }, [feeAssignments, searchQuery, activeFilters]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredFees.length) return alert('No fee data to export');
    const rows = filteredFees.map((f) => ({
      'Fee ID': f.id,
      Student: f.studentName,
      'Student ID': f.studentId,
      Course: f.course,
      Semester: f.semester,
      'Total Amount': f.totalFee,
      Status: f.status,
    }));
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // KPI Cards
  const totalRevenue = feeAssignments.reduce((acc, f) => acc + (f.totalFee || 0), 0);
  const paidCount = feeAssignments.filter((f) => (f.status || '').toLowerCase() === 'paid').length;
  const pendingCount = feeAssignments.filter((f) => (f.status || '').toLowerCase() === 'pending').length;

  const kpiCards = [
    {
      title: 'Total Fee Revenue',
      value: `₹${(totalRevenue / 100000).toFixed(2)}L`,
      sub: 'Assigned accounts',
      trend: 'Fee structure active',
      trendUp: true,
      icon: <DollarSign className="w-5 h-5" />,
      gradient: 'indigo',
    },
    {
      title: 'Assigned Students',
      value: feeAssignments.length.toLocaleString(),
      sub: 'Students with fee plans',
      trend: `${approvedStudents.length} total approved`,
      trendUp: true,
      icon: <CheckCircle2 className="w-5 h-5" />,
      gradient: 'emerald',
    },
    {
      title: 'Paid Accounts',
      value: paidCount.toLocaleString(),
      sub: 'Fees cleared',
      trend: `${(((paidCount || 0) / (feeAssignments.length || 1)) * 100).toFixed(1)}% cleared`,
      trendUp: true,
      icon: <Clock className="w-5 h-5" />,
      gradient: 'teal',
    },
    {
      title: 'Pending / Overdue',
      value: pendingCount.toLocaleString(),
      sub: 'Awaiting payment',
      trend: 'Action required',
      trendUp: false,
      icon: <AlertTriangle className="w-5 h-5" />,
      gradient: 'amber',
    },
  ];

  const statusStyles = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const columns = [
    {
      key: 'studentName',
      label: 'Student',
      render: (_, f) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#003A40] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            {(f.studentName || 'S').charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#003A40] truncate leading-tight">{f.studentName}</p>
            <p className="text-[10px] text-[#8C98A5] font-medium truncate">{f.studentId || f.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      label: 'Course & Sem',
      render: (_, f) => (
        <div>
          <span className="text-xs font-bold text-[#003A40] block truncate">{f.course || 'CS'}</span>
          <span className="text-[10px] text-[#8C98A5]">Sem {f.semester || 1}</span>
        </div>
      ),
    },
    {
      key: 'totalFee',
      label: 'Total Fee',
      render: (_, f) => (
        <span className="text-xs font-extrabold text-[#003A40] font-['Outfit']">
          ₹{(f.totalFee || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, f) => {
        const st = (f.status || 'Pending').toUpperCase();
        const cls = statusStyles[st] || statusStyles.PENDING;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
            {f.status || 'Pending'}
          </span>
        );
      },
    },
  ];

  const tableActions = [
    {
      icon: <Eye className="w-3.5 h-3.5" />,
      label: 'View Breakdown',
      color: 'teal',
      onClick: (f) => setExpandedFee(expandedFee?.id === f.id ? null : f),
    },
    {
      icon: <Trash2 className="w-3.5 h-3.5" />,
      label: 'Delete Fee',
      color: 'red',
      onClick: (f) => setDeleteConfirm(f.id),
    },
  ];

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Paid', label: 'Paid' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Overdue', label: 'Overdue' },
      ],
    },
  ];

  return (
    <Layout title="Fee Management">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <EnterprisePageTemplate
          kpiCards={kpiCards}
          columns={columns}
          rows={filteredFees}
          actions={tableActions}
          rowKey="id"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search fee by student name, ID, course..."
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters((prev) => ({ ...prev, [key]: val }))}
          onExportCSV={handleExportCSV}
          onAdd={() => {
            if (approvedStudents.length > 0) {
              setSelectedStudent(approvedStudents[0]);
              setShowAssignModal(true);
            } else {
              alert('No approved students available to assign fees.');
            }
          }}
          addLabel="Assign Fee Structure"
          loading={false}
          emptyMessage="No fee structures match your search."
        />
      )}

      {/* Expanded Breakdown Modal */}
      {expandedFee && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-[#003A40] mb-4">Fee Structure Breakdown — {expandedFee.studentName}</h3>
            <div className="space-y-2 text-xs text-[#5F6B7A] mb-6">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Tuition / Semester Fee:</span>
                <span className="font-bold text-[#003A40]">₹{(expandedFee.components?.semesterFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Books & Learning Material:</span>
                <span className="font-bold text-[#003A40]">₹{(expandedFee.components?.bookFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Exam Fee:</span>
                <span className="font-bold text-[#003A40]">₹{(expandedFee.components?.examFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Hostel & Mess:</span>
                <span className="font-bold text-[#003A40]">₹{(expandedFee.components?.hostelFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-sm text-[#003A40] pt-2">
                <span>Total Semester Fee:</span>
                <span>₹{(expandedFee.totalFee || 0).toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => setExpandedFee(null)}
              className="w-full py-2 bg-[#003A40] text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-[#0A686A] transition-colors"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
