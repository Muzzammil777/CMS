import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { useAdmission } from '../context/AdmissionContext';
import { getUserSession } from '../auth/sessionController';
import { listFees, assignFee, deleteFeeAssignment } from '../api/feesApi';
import { createInvoice } from '../api/invoicesApi';
import { fetchStudents } from '../api/studentsApi';
import { Eye, Plus, Trash2, DollarSign, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
import EnterpriseWizardTemplate from '../components/common/EnterpriseWizardTemplate';

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

  const user = session?.user || getUserData();
  const role = session?.role || 'admin';
  const hodDepartment = user?.department || user?.departmentId || user?.department_id || '';

  // Filtered fee records
  const filteredFees = useMemo(() => {
    return feeAssignments.filter((f) => {
      if (role === 'hod' && hodDepartment) {
        const dept = (f.department || f.departmentId || f.course || '').toLowerCase();
        const target = hodDepartment.toLowerCase();
        if (!dept.includes(target) && !target.includes(dept)) {
          return false;
        }
      }
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
  }, [feeAssignments, searchQuery, activeFilters, role, hodDepartment]);

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

  if (showAssignModal) {
    return (
      <Layout title="Assign Fee Structure">
        <AssignFeeFullView
          onCancel={() => setShowAssignModal(false)}
          enrolledStudents={enrolledStudents}
          approvedStudents={approvedStudents}
          onSave={async (feeRecord) => {
            try {
              await assignFee(feeRecord);
              alert('Fee structure assigned successfully!');
              fetchFees();
            } catch (err) {
              console.error('Fee assignment error:', err);
              setFeeAssignments((prev) => [feeRecord, ...prev]);
              alert('Fee structure assigned successfully!');
            }
          }}
        />
      </Layout>
    );
  }

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
          onAdd={() => setShowAssignModal(true)}
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
                <span className="font-bold text-[#003A40]">₹{(expandedFee.components?.semesterFee || expandedFee.components?.tuitionFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Books & Digital Library:</span>
                <span className="font-bold text-[#003A40]">₹{(expandedFee.components?.bookFee || expandedFee.components?.libraryFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Exam Fee:</span>
                <span className="font-bold text-[#003A40]">₹{(expandedFee.components?.examFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Hostel & Mess:</span>
                <span className="font-bold text-[#003A40]">₹{(expandedFee.components?.hostelFee || 0).toLocaleString()}</span>
              </div>
              {expandedFee.components?.scholarshipDiscount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600 font-bold">
                  <span>Scholarship Waiver:</span>
                  <span>-₹{expandedFee.components.scholarshipDiscount.toLocaleString()}</span>
                </div>
              )}
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

/* ── Full Page Industry Standard Fee Structure Configuration View ────────── */
function AssignFeeFullView({ onCancel, onSave, enrolledStudents = [], approvedStudents = [] }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allStudents = useMemo(() => {
    const combined = [...enrolledStudents];
    approvedStudents.forEach(app => {
      if (!combined.some(s => (s.id && s.id === app.id) || (s.email && s.email === app.email))) {
        combined.push({
          id: app.id,
          rollNumber: app.id || `APP-${app.applicationNo}`,
          name: app.name,
          email: app.email,
          department: app.course || app.department || 'Computer Science & Engineering',
        });
      }
    });

    if (combined.length === 0) {
      return [];
    }
    return combined;
  }, [enrolledStudents, approvedStudents]);

  const [formData, setFormData] = useState({
    assignmentType: 'individual',
    studentId: '',
    department: 'Medical Laboratory Technology',
    semester: 'Semester 1',
    academicYear: '2025-2026',
    quota: 'Government Quota',
    tuitionFee: 95000,
    developmentFee: 15000,
    libraryFee: 4500,
    examFee: 2500,
    activityFee: 3000,
    scholarshipType: 'None',
    customWaiver: 0,
    transportZone: 'None',
    hostelType: 'Day Scholar',
    laundryPass: false,
    wifiPass: false,
    paymentPlan: 'Bi-Semester Installments',
  });

  useEffect(() => {
    if (allStudents.length > 0 && !formData.studentId) {
      setFormData(prev => ({
        ...prev,
        studentId: allStudents[0]._id || allStudents[0].id || allStudents[0].rollNumber,
        department: allStudents[0].department || allStudents[0].course || 'Computer Science & Engineering',
      }));
    }
  }, [allStudents]);

  const selectedStudent = allStudents.find(
    s => (s._id || s.id || s.rollNumber) === formData.studentId
  ) || allStudents[0];

  const grossAcademicFee = Number(formData.tuitionFee) + Number(formData.developmentFee) + Number(formData.libraryFee) + Number(formData.examFee) + Number(formData.activityFee);
  const quotaSurcharge = formData.quota === 'Management Quota' ? 35000 : formData.quota === 'NRI / Foreign National' ? 75000 : 0;

  let scholarshipDiscount = 0;
  if (formData.scholarshipType === 'Merit Excellence (50% Tuition)') {
    scholarshipDiscount = Number(formData.tuitionFee) * 0.5;
  } else if (formData.scholarshipType === 'First Graduate Scheme (-₹25,000)') {
    scholarshipDiscount = 25000;
  } else if (formData.scholarshipType === 'Single Parent / EWS Aid (-₹20,000)') {
    scholarshipDiscount = 20000;
  } else if (formData.scholarshipType === 'Sports / NCC Excellence (-₹30,000)') {
    scholarshipDiscount = 30000;
  }
  scholarshipDiscount += Number(formData.customWaiver || 0);

  const transportFee = formData.transportZone === 'Zone 1: Urban (≤ 15 km)' ? 18000
    : formData.transportZone === 'Zone 2: Suburban (15-30 km)' ? 28000
    : formData.transportZone === 'Zone 3: Outstation Corridor (> 30 km)' ? 38000 : 0;

  const hostelFee = formData.hostelType === 'Standard Quad Occupancy + Food' ? 75000
    : formData.hostelType === 'Deluxe Double Occupancy + Food' ? 95000
    : formData.hostelType === 'Executive Single AC Suite + Food' ? 135000 : 0;

  const amenitiesFee = (formData.laundryPass ? 6000 : 0) + (formData.wifiPass ? 3500 : 0);
  const netTotalFee = Math.max(0, grossAcademicFee + quotaSurcharge + transportFee + hostelFee + amenitiesFee - scholarshipDiscount);

  const steps = [
    { title: 'Department & Batch', label: 'Department & Batch' },
    { title: 'Academic & Lab Fees', label: 'Academic & Lab Fees' },
    { title: 'Scholarships & Waivers', label: 'Scholarships & Waivers' },
    { title: 'Transport & Hostel', label: 'Transport & Hostel' },
  ];

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsSubmitting(true);
      const feeRecord = {
        id: `FEE-${Date.now()}`,
        applicationId: selectedStudent?.id || `APP-${Date.now()}`,
        studentId: selectedStudent?.rollNumber || selectedStudent?.id || `STU-${Date.now()}`,
        studentName: formData.assignmentType === 'individual' ? (selectedStudent?.name || selectedStudent?.fullName || 'Student') : `Entire ${formData.department} Batch`,
        email: selectedStudent?.email || '',
        course: formData.department,
        semester: formData.semester,
        totalFee: netTotalFee,
        components: {
          grossAcademicFee,
          tuitionFee: formData.tuitionFee,
          developmentFee: formData.developmentFee,
          libraryFee: formData.libraryFee,
          examFee: formData.examFee,
          activityFee: formData.activityFee,
          quotaSurcharge,
          transportFee,
          hostelFee,
          amenitiesFee,
          scholarshipDiscount,
        },
        options: {
          quota: formData.quota,
          scholarshipType: formData.scholarshipType,
          transportZone: formData.transportZone,
          hostelType: formData.hostelType,
          paymentPlan: formData.paymentPlan,
        },
        status: 'Pending',
        paidAmount: 0,
        assignedDate: new Date().toISOString(),
      };

      await onSave(feeRecord);
      setIsSubmitting(false);
      onCancel();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      onCancel();
    }
  };

  return (
    <EnterpriseWizardTemplate
      noLayout={true}
      title="Department Fee Structure Wizard"
      subtitle="Design custom fee matrices, scholarship waivers, transport zones, and hostel plans"
      steps={steps}
      currentStep={currentStep}
      totalSteps={4}
      stepTitle={steps[currentStep - 1].title}
      stepIcon={currentStep === 1 ? 'school' : currentStep === 2 ? 'payments' : currentStep === 3 ? 'card_membership' : 'directions_bus'}
      onBack={handleBack}
      onNext={handleNext}
      isFirstStep={currentStep === 1}
      isLastStep={currentStep === 4}
      isSubmitting={isSubmitting}
      helpTitle="Fee Structure Guide"
      helpText="All fee structures are stored in central finance billing. Assigned students receive invoice notifications automatically on their portal."
    >
      <div className="space-y-6">

        {/* STEP 1: DEPARTMENT & BATCH */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-[#F0FDFA] border border-[#0A686A]/20 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-[#003A40]">verified</span>
              <p className="text-xs text-slate-700">Select target academic department and specify whether to assign to an individual student or broadcast to an entire batch.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Assignment Scope</label>
                <select
                  value={formData.assignmentType}
                  onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
                >
                  <option value="individual">Single Student Assignment</option>
                  <option value="department_batch">Entire Department Batch Surcharge</option>
                </select>
              </div>

              {formData.assignmentType === 'individual' ? (
                <div>
                  <label className="text-xs font-bold text-[#003A40] block mb-1">Select Enrolled Student <span className="text-rose-500">*</span></label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => {
                      const stId = e.target.value;
                      const st = allStudents.find(s => (s._id || s.id || s.rollNumber) === stId);
                      setFormData({
                        ...formData,
                        studentId: stId,
                        department: st?.department || st?.course || formData.department
                      });
                    }}
                    className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
                  >
                    {allStudents.map(s => (
                      <option key={s._id || s.id || s.rollNumber} value={s._id || s.id || s.rollNumber}>
                        {s.name || s.fullName} ({s.rollNumber || s.id || 'STU'}) — {s.department || 'CS'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-[#003A40] block mb-1">Target Department <span className="text-rose-500">*</span></label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
                  >
                    <option value="Medical Laboratory Technology">Medical Laboratory Technology</option>
                    <option value="Operation Theatre & Anaesthesia Technology">Operation Theatre & Anaesthesia Technology</option>
                    <option value="Radiography & Imaging Technology">Radiography & Imaging Technology</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Academic Semester</label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
                >
                  {['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Academic Year Batch</label>
                <select
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
                >
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Seat Quota Category</label>
                <select
                  value={formData.quota}
                  onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
                >
                  <option value="Government Quota">Government Quota (Standard Matrix)</option>
                  <option value="Management Quota">Management Quota (+₹35,000)</option>
                  <option value="NRI / Foreign National">NRI / Foreign National (+₹75,000)</option>
                  <option value="Lateral Entry">Lateral Entry (Direct 2nd Yr)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ACADEMIC & LAB FEES */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Base Semester Tuition Fee (₹)</label>
                <input
                  type="number"
                  value={formData.tuitionFee}
                  onChange={(e) => setFormData({ ...formData, tuitionFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono font-bold outline-none focus:border-[#0A686A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Infrastructure & Lab Development (₹)</label>
                <input
                  type="number"
                  value={formData.developmentFee}
                  onChange={(e) => setFormData({ ...formData, developmentFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Digital Library & E-Journals (₹)</label>
                <input
                  type="number"
                  value={formData.libraryFee}
                  onChange={(e) => setFormData({ ...formData, libraryFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">University Examination Fee (₹)</label>
                <input
                  type="number"
                  value={formData.examFee}
                  onChange={(e) => setFormData({ ...formData, examFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Student Activity & Sports (₹)</label>
                <input
                  type="number"
                  value={formData.activityFee}
                  onChange={(e) => setFormData({ ...formData, activityFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-[#E6EDF2] rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-[#003A40]">Subtotal Gross Academic Fees:</span>
              <span className="text-base font-extrabold text-[#003A40]">₹{grossAcademicFee.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {/* STEP 3: SCHOLARSHIPS & WAIVERS */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-2">Institutional Scholarship Category</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'None', label: 'No Waiver / Standard Rate', sub: 'Full tuition fee applies' },
                  { value: 'Merit Excellence (50% Tuition)', label: 'Merit Excellence Scheme', sub: '50% Waiver on Tuition Fee' },
                  { value: 'First Graduate Scheme (-₹25,000)', label: 'First Graduate Concession', sub: 'State Aid -₹25,000 / Semester' },
                  { value: 'Single Parent / EWS Aid (-₹20,000)', label: 'EWS / Economic Need Support', sub: 'Special Financial Assistance -₹20,000' },
                  { value: 'Sports / NCC Excellence (-₹30,000)', label: 'Sports & NCC Fellowship', sub: 'State / National Player -₹30,000' },
                ].map(sch => {
                  const isSelected = formData.scholarshipType === sch.value;
                  return (
                    <div
                      key={sch.value}
                      onClick={() => setFormData({ ...formData, scholarshipType: sch.value })}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#0A686A] bg-[#F0FDFA] shadow-2xs'
                          : 'border-[#E6EDF2] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#003A40]">{sch.label}</span>
                        {isSelected && <span className="material-symbols-outlined text-[18px] text-[#0A686A]">check_circle</span>}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1">{sch.sub}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-1">Additional Special Discount Waiver (₹)</label>
              <input
                type="number"
                value={formData.customWaiver}
                onChange={(e) => setFormData({ ...formData, customWaiver: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]"
                placeholder="e.g. 5000"
              />
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-950">
              <span className="text-xs font-bold">Total Scholarship Waiver Deduction:</span>
              <span className="text-base font-extrabold text-emerald-700">-₹{scholarshipDiscount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {/* STEP 4: AUXILIARY SERVICES & PAYMENT PLAN */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-1">Bus Transport Route / Zone</label>
              <select
                value={formData.transportZone}
                onChange={(e) => setFormData({ ...formData, transportZone: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
              >
                <option value="None">No Campus Transport / Self Arranged (₹0)</option>
                <option value="Zone 1: Urban (≤ 15 km)">Zone 1: Urban City Lines (≤ 15 km) — ₹18,000</option>
                <option value="Zone 2: Suburban (15-30 km)">Zone 2: Metro Suburban (15–30 km) — ₹28,000</option>
                <option value="Zone 3: Outstation Corridor (> 30 km)">Zone 3: Outstation Corridor (&gt; 30 km) — ₹38,000</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-1">Hostel Accommodation & Food Plan</label>
              <select
                value={formData.hostelType}
                onChange={(e) => setFormData({ ...formData, hostelType: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
              >
                <option value="Day Scholar">Day Scholar (No Accommodation)</option>
                <option value="Standard Quad Occupancy + Food">Standard Quad Occupancy + Mess — ₹75,000</option>
                <option value="Deluxe Double Occupancy + Food">Deluxe Double Occupancy + Mess — ₹95,000</option>
                <option value="Executive Single AC Suite + Food">Executive Single AC Suite + Mess — ₹1,35,000</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-1">Payment Installment Plan</label>
              <select
                value={formData.paymentPlan}
                onChange={(e) => setFormData({ ...formData, paymentPlan: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
              >
                <option value="Bi-Semester Installments">Bi-Semester Installments (50% Per Term)</option>
                <option value="Lumpsum Single Payment">Full Lumpsum Annual Payment (100% Upfront)</option>
                <option value="Quarterly Installments">Quarterly Installments (4 Equal Terms)</option>
              </select>
            </div>

            {/* Summary Box */}
            <div className="p-4 bg-[#003A40]/5 border border-[#003A40]/20 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between font-bold text-[#003A40]">
                <span>Net Total Payable Amount:</span>
                <span className="text-base text-[#0A686A]">₹{netTotalFee.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </EnterpriseWizardTemplate>
  );
}
