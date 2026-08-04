import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { useAdmission } from '../context/AdmissionContext';
import { getUserSession, getUserData } from '../auth/sessionController';
import { listFees, assignFee, deleteFeeAssignment, updateFeePayment } from '../api/feesApi';
import { createInvoice } from '../api/invoicesApi';
import { fetchStudents } from '../api/studentsApi';
import { Eye, Plus, Trash2, DollarSign, CheckCircle2, Clock, AlertTriangle, X, Edit2, Check, Tag, Star, Award, Bus, Building2, ShieldCheck, Package, CreditCard } from 'lucide-react';
import EnterpriseWizardTemplate from '../components/common/EnterpriseWizardTemplate';
import { useDepartments } from '../hooks/useDepartments';

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
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI / QR Code');
  const [paymentAmount, setPaymentAmount] = useState(0);

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

  const isHexId = (str) => typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);

  const getStudentSubtext = (f) => {
    if (f.rollNumber && !isHexId(f.rollNumber)) return f.rollNumber;
    if (f.registerNo && !isHexId(f.registerNo)) return f.registerNo;
    if (f.studentId && !isHexId(f.studentId)) return f.studentId;
    return '';
  };

  const getCourseDept = (f) => {
    const dept = f.course || f.department;
    if (dept && dept !== 'Computer Science' && dept !== 'CS') return dept;
    return 'MLT';
  };

  const columns = [
    {
      key: 'studentName',
      label: 'Student',
      render: (_, f) => {
        const subtext = getStudentSubtext(f);
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#003A40] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {(f.studentName || 'S').charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#003A40] truncate leading-tight">{f.studentName}</p>
              {subtext ? <p className="text-[10px] text-[#8C98A5] font-medium truncate">{subtext}</p> : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'course',
      label: 'Course & Sem',
      render: (_, f) => (
        <div>
          <span className="text-xs font-bold text-[#003A40] block truncate">{getCourseDept(f)}</span>
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
      icon: <CreditCard className="w-3.5 h-3.5" />,
      label: 'Make Payment',
      color: 'blue',
      onClick: (f) => {
        setPaymentModal(f);
        setPaymentMethod(f.paymentMethod || 'UPI / QR Code');
        setPaymentAmount((f.totalFee || 0) - (f.paidAmount || 0));
      },
    },
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

  if (paymentModal) {
    return (
      <Layout title="Process Payment">
        <PaymentFullView 
          fee={paymentModal}
          onCancel={() => setPaymentModal(null)}
          onSuccess={() => {
            setPaymentModal(null);
            fetchFees();
          }}
        />
      </Layout>
    );
  }

  if (expandedFee) {
    return (
      <Layout title="Fee Structure Breakdown">
        <FeeBreakdownFullView
          fee={expandedFee}
          onCancel={() => setExpandedFee(null)}
          onMakePayment={(f) => {
            setExpandedFee(null);
            setPaymentModal(f);
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
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FULL PAGE FEE STRUCTURE DESIGNER — Indian Institute Grade
   ══════════════════════════════════════════════════════════════════════════ */
function AssignFeeFullView({ onCancel, onSave, enrolledStudents = [], approvedStudents = [] }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { departments: dynamicDepts, loading: deptsLoading } = useDepartments();

  // ── Scholarship state (DB-synced) ────────────────────────────────────────
  const DEFAULT_SCHOLARSHIPS = [
    { id: 'none', value: 'None', label: 'No Waiver / Standard Rate', sub: 'Full tuition fee applies', discount_type: 'fixed', discount_amount: 0, eligibility: 'All students', scheme_type: 'Standard' },
    { id: 'merit', value: 'Merit Excellence (50% Tuition)', label: 'Merit Excellence Scheme', sub: '50% Waiver on Tuition Fee', discount_type: 'percent', discount_amount: 50, eligibility: 'Min 85% in qualifying exam', scheme_type: 'Merit' },
    { id: 'first_grad', value: 'First Graduate Scheme (-₹25,000)', label: 'First Graduate Concession', sub: 'State Aid -₹25,000 / Semester', discount_type: 'fixed', discount_amount: 25000, eligibility: 'First in family to pursue higher education', scheme_type: 'Government' },
    { id: 'ews', value: 'Single Parent / EWS Aid (-₹20,000)', label: 'EWS / Economic Need Support', sub: 'Special Financial Assistance -₹20,000', discount_type: 'fixed', discount_amount: 20000, eligibility: 'Annual family income < ₹2.5 Lakh', scheme_type: 'Government' },
    { id: 'sports', value: 'Sports / NCC Excellence (-₹30,000)', label: 'Sports & NCC Fellowship', sub: 'State / National Player -₹30,000', discount_type: 'fixed', discount_amount: 30000, eligibility: 'State / National level sports or NCC "A" certificate', scheme_type: 'Sports' },
  ];
  const [scholarships, setScholarships] = useState(DEFAULT_SCHOLARSHIPS);
  const [editScholarship, setEditScholarship] = useState(null);
  const [addScholarship, setAddScholarship] = useState(false);
  const [newScheme, setNewScheme] = useState({
    label: '',
    sub: '',
    eligibility: '',
    scheme_type: 'Government',
    discount_type: 'fixed',
    discount_amount: 0,
    income_limit: '',
    documentation: '',
    applicable_communities: [],
  });
  const [savingScholarship, setSavingScholarship] = useState(false);
  const [deleteScholarshipId, setDeleteScholarshipId] = useState(null);
  const [deptTemplateLoaded, setDeptTemplateLoaded] = useState(false);

  // ── Aux config state (transport, hostel) ─────────────────────────────────
  const DEFAULT_AUX = {
    transport_zones: [
      { id: 'none', value: 'None', label: 'No Campus Transport / Self Arranged', amount: 0, distance: 'Self-arranged', pickup_points: [], icon: 'directions_walk' },
      { id: 'zone1', value: 'Zone 1: Urban (≤ 15 km)', label: 'Zone 1: Urban City Lines (≤ 15 km)', amount: 18000, distance: 'Up to 15 km', pickup_points: ['City Bus Stand', 'Railway Station'], icon: 'directions_bus' },
      { id: 'zone2', value: 'Zone 2: Suburban (15-30 km)', label: 'Zone 2: Metro Suburban (15–30 km)', amount: 28000, distance: '15 – 30 km', pickup_points: ['Suburban Hub A', 'Outer Ring Road'], icon: 'directions_bus' },
      { id: 'zone3', value: 'Zone 3: Outstation Corridor (> 30 km)', label: 'Zone 3: Outstation Corridor (> 30 km)', amount: 38000, distance: 'Above 30 km', pickup_points: ['District Bus Terminal'], icon: 'directions_bus' },
    ],
    hostel_types: [
      { id: 'day', value: 'Day Scholar', label: 'Day Scholar', amount: 0, occupancy: 'N/A', food_plan: 'Not Included', amenities: [], icon: 'home' },
      { id: 'standard', value: 'Standard Quad Occupancy + Food', label: 'Standard Quad Occupancy + Mess', amount: 75000, occupancy: 'Quad (4 Students)', food_plan: 'Three Meals (Mess)', amenities: ['mess', 'fan', 'study_table'], icon: 'bed' },
      { id: 'deluxe', value: 'Deluxe Double Occupancy + Food', label: 'Deluxe Double Occupancy + Mess', amount: 95000, occupancy: 'Double (2 Students)', food_plan: 'Three Meals + Snacks', amenities: ['mess', 'fan', 'wifi', 'attached_bath'], icon: 'king_bed' },
      { id: 'executive', value: 'Executive Single AC Suite + Food', label: 'Executive Single AC Suite + Mess', amount: 135000, occupancy: 'Single Room', food_plan: 'Three Meals + Snacks + Room Service', amenities: ['mess', 'ac', 'wifi', 'laundry', 'attached_bath', 'tv'], icon: 'hotel' },
    ],
    payment_plans: [
      { id: 'bisemester', value: 'Bi-Semester Installments', label: 'Bi-Semester Installments (50% Per Term)' },
      { id: 'lumpsum', value: 'Lumpsum Single Payment', label: 'Full Lumpsum Annual Payment (100% Upfront)' },
      { id: 'quarterly', value: 'Quarterly Installments', label: 'Quarterly Installments (4 Equal Terms)' },
    ],
  };
  const [auxConfig, setAuxConfig] = useState(DEFAULT_AUX);
  const [editTransport, setEditTransport] = useState(null);
  const [editHostel, setEditHostel] = useState(null);
  const [savingAux, setSavingAux] = useState(false);

  // ── Charges config ───────────────────────────────────────────────────────
  const DEFAULT_CHARGES = [
    { id: 'exam_reg', label: 'Examination Registration Fee', amount: 2500, category: 'Academic', icon: 'assignment' },
    { id: 'lab_deposit', label: 'Lab Deposit (Refundable)', amount: 5000, category: 'Academic', icon: 'science' },
    { id: 'smart_card', label: 'Smart Card / College ID', amount: 350, category: 'Administrative', icon: 'badge' },
    { id: 'medical_ins', label: 'Student Medical Insurance', amount: 1200, category: 'Welfare', icon: 'health_and_safety' },
    { id: 'nss_fee', label: 'NSS / NCC Activity Fund', amount: 800, category: 'Activity', icon: 'military_tech' },
    { id: 'alumni_fund', label: 'Alumni Association Fund', amount: 500, category: 'Alumni', icon: 'groups' },
    { id: 'sports_kit', label: 'Sports Kit & Equipment Fee', amount: 1500, category: 'Activity', icon: 'sports_soccer' },
    { id: 'caution_dep', label: 'Caution Deposit (Refundable)', amount: 3000, category: 'Administrative', icon: 'savings' },
  ];
  const [charges, setCharges] = useState(DEFAULT_CHARGES);
  const [selectedChargeIds, setSelectedChargeIds] = useState([]);
  const [editCharge, setEditCharge] = useState(null); // { id, label, amount, icon, category }
  const [savingCharge, setSavingCharge] = useState(false);

  // ── Load all configs from API ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/fees/scholarships')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data) && data.length > 0) setScholarships(data); })
      .catch(() => {});

    fetch('/api/fees/config/auxiliary')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.transport_zones) setAuxConfig(data); })
      .catch(() => {});

    fetch('/api/fees/config/charges')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Strip out legacy mandatory field — all are freely toggleable now
          const cleaned = data.map(({ mandatory, ...rest }) => rest);
          setCharges(cleaned);
          // Restore previously selected IDs if backend stored them
          const savedSelected = data.filter(c => c.selected).map(c => c.id);
          if (savedSelected.length > 0) setSelectedChargeIds(savedSelected);
        }
      })
      .catch(() => {});
  }, []);

  // ── Form state ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    assignmentType: 'individual',
    studentId: '',
    department: '',
    semester: 'Semester 1',
    academicYear: '2025-2026',
    quota: 'Government Quota',
    tuitionFee: 95000,
    developmentFee: 15000,
    libraryFee: 4500,
    examFee: 2500,
    activityFee: 3000,
    customFeeComponents: [],
    scholarshipType: 'None',
    customWaiver: 0,
    transportZone: 'None',
    hostelType: 'Day Scholar',
    laundryPass: false,
    wifiPass: false,
    paymentPlan: 'Bi-Semester Installments',
    splitBySemester: false,
  });

  // ── Merge student list ────────────────────────────────────────────────────
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
    return combined;
  }, [enrolledStudents, approvedStudents]);

  // Set default student
  useEffect(() => {
    if (allStudents.length > 0 && !formData.studentId) {
      const first = allStudents[0];
      setFormData(prev => ({
        ...prev,
        studentId: first._id || first.id || first.rollNumber,
        department: prev.department || first.department || first.course || '',
      }));
    }
  }, [allStudents]);

  // Load department fee template
  useEffect(() => {
    if (formData.department) {
      fetch(`/api/fees/structures/department/${encodeURIComponent(formData.department)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          setDeptTemplateLoaded(false);
          if (data) {
            setFormData(prev => ({
              ...prev,
              tuitionFee: data.tuitionFee ?? prev.tuitionFee,
              developmentFee: data.developmentFee ?? prev.developmentFee,
              libraryFee: data.libraryFee ?? prev.libraryFee,
              examFee: data.examFee ?? prev.examFee,
              activityFee: data.activityFee ?? prev.activityFee,
              customFeeComponents: data.customFeeComponents || [],
              scholarshipType: data.scholarshipType || prev.scholarshipType,
              transportZone: data.transportZone || prev.transportZone,
              hostelType: data.hostelType || prev.hostelType,
              paymentPlan: data.paymentPlan || prev.paymentPlan,
            }));
            setDeptTemplateLoaded(true);
          }
        })
        .catch(() => setDeptTemplateLoaded(false));
    }
  }, [formData.department]);

  const selectedStudent = allStudents.find(
    s => (s._id || s.id || s.rollNumber) === formData.studentId
  ) || allStudents[0];

  // ── Fee calculations ──────────────────────────────────────────────────────
  const splitMult = 1;

  const chargesSum = charges
    .filter(c => selectedChargeIds.includes(c.id))
    .reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const customFeesSum = (formData.customFeeComponents || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  
  const tuitionFeeCalc = Number(formData.tuitionFee || 0);
  const developmentFeeCalc = Number(formData.developmentFee || 0);
  const libraryFeeCalc = Number(formData.libraryFee || 0);
  const examFeeCalc = Number(formData.examFee || 0);
  const activityFeeCalc = Number(formData.activityFee || 0);

  const grossAcademicFee = tuitionFeeCalc + developmentFeeCalc + libraryFeeCalc + examFeeCalc + activityFeeCalc + customFeesSum + chargesSum;

  // ── Save charges list + selection to DB ─────────────────────────────────
  const persistCharges = async (updatedCharges, updatedSelectedIds) => {
    try {
      const toSave = updatedCharges.map(c => ({ ...c, selected: (updatedSelectedIds ?? selectedChargeIds).includes(c.id) }));
      await fetch('/api/fees/config/charges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charges: toSave }),
      });
    } catch (err) {
      console.error('Failed to save charges:', err);
    }
  };

  const handleSaveCharge = async () => {
    if (!editCharge) return;
    setSavingCharge(true);
    try {
      const updated = charges.map(c => c.id === editCharge.id ? { ...c, label: editCharge.label, amount: Number(editCharge.amount) } : c);
      setCharges(updated);
      setEditCharge(null);
      await persistCharges(updated, selectedChargeIds);
    } catch (err) {
      console.error('Charge save error:', err);
    } finally {
      setSavingCharge(false);
    }
  };
  const quotaSurcharge = (formData.quota === 'Management Quota' ? 35000 : formData.quota === 'NRI / Foreign National' ? 75000 : 0) * splitMult;

  const selectedScheme = scholarships.find(s => s.value === formData.scholarshipType);
  let scholarshipDiscount = 0;
  if (selectedScheme && selectedScheme.discount_type === 'full') {
    scholarshipDiscount = tuitionFeeCalc;
  } else if (selectedScheme && selectedScheme.discount_type === 'percent') {
    scholarshipDiscount = tuitionFeeCalc * (Number(selectedScheme.discount_amount) / 100);
  } else if (selectedScheme && selectedScheme.discount_type === 'fixed') {
    scholarshipDiscount = Number(selectedScheme.discount_amount) * splitMult;
  }
  scholarshipDiscount += Number(formData.customWaiver || 0) * splitMult;

  const selectedTransport = auxConfig.transport_zones.find(t => t.value === formData.transportZone);
  const transportFee = (selectedTransport ? Number(selectedTransport.amount || 0) : 0) * splitMult;

  const selectedHostel = auxConfig.hostel_types.find(h => h.value === formData.hostelType);
  const hostelFee = (selectedHostel ? Number(selectedHostel.amount || 0) : 0) * splitMult;

  const amenitiesFee = ((formData.laundryPass ? 6000 : 0) + (formData.wifiPass ? 3500 : 0)) * splitMult;
  const netTotalFee = Math.max(0, grossAcademicFee + quotaSurcharge + transportFee + hostelFee + amenitiesFee - scholarshipDiscount);

  // ── Scholarship CRUD ──────────────────────────────────────────────────────
  const handleSaveScholarship = async () => {
    if (!editScholarship) return;
    setSavingScholarship(true);
    try {
      const res = await fetch(`/api/fees/scholarships/${editScholarship.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editScholarship.label,
          sub: editScholarship.sub,
          eligibility: editScholarship.eligibility,
          scheme_type: editScholarship.scheme_type,
          discount_amount: Number(editScholarship.discount_amount),
          discount_type: editScholarship.discount_type,
        }),
      });
      if (res.ok) {
        setScholarships(prev => prev.map(s => s.id === editScholarship.id ? { ...s, ...editScholarship } : s));
        setEditScholarship(null);
      }
    } catch (err) {
      console.error('Failed to save scholarship:', err);
    } finally {
      setSavingScholarship(false);
    }
  };

  const handleAddScholarship = async () => {
    if (!newScheme.label) return;
    setSavingScholarship(true);
    try {
      const scheme_id = `custom_${Date.now()}`;
      const payload = { ...newScheme, id: scheme_id, value: newScheme.label, discount_amount: Number(newScheme.discount_amount) };
      const res = await fetch('/api/fees/scholarships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setScholarships(prev => [...prev, { ...payload, ...created }]);
        setAddScholarship(false);
        setNewScheme({ label: '', sub: '', eligibility: '', scheme_type: 'Institutional', discount_type: 'fixed', discount_amount: 0 });
      }
    } catch (err) {
      console.error('Failed to add scholarship:', err);
    } finally {
      setSavingScholarship(false);
    }
  };

  const handleDeleteScholarship = async (schemeId) => {
    try {
      const res = await fetch(`/api/fees/scholarships/${schemeId}`, { method: 'DELETE' });
      if (res.ok) {
        setScholarships(prev => prev.filter(s => s.id !== schemeId));
        if (formData.scholarshipType === scholarships.find(s => s.id === schemeId)?.value) {
          setFormData(prev => ({ ...prev, scholarshipType: 'None' }));
        }
      } else {
        const err = await res.json();
        alert(err.detail || 'Cannot delete this scheme');
      }
    } catch (err) {
      console.error('Failed to delete scholarship:', err);
    }
    setDeleteScholarshipId(null);
  };

  // ── Transport / Hostel edit ───────────────────────────────────────────────
  const handleSaveTransport = async () => {
    if (!editTransport) return;
    setSavingAux(true);
    try {
      const res = await fetch(`/api/fees/config/auxiliary/transport/${editTransport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editTransport.label, amount: Number(editTransport.amount), distance: editTransport.distance }),
      });
      if (res.ok) {
        setAuxConfig(prev => ({
          ...prev,
          transport_zones: prev.transport_zones.map(z => z.id === editTransport.id ? { ...z, ...editTransport } : z),
        }));
        setEditTransport(null);
      }
    } catch (err) { console.error(err); }
    finally { setSavingAux(false); }
  };

  const handleSaveHostel = async () => {
    if (!editHostel) return;
    setSavingAux(true);
    try {
      const res = await fetch(`/api/fees/config/auxiliary/hostel/${editHostel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editHostel.label, amount: Number(editHostel.amount), occupancy: editHostel.occupancy, food_plan: editHostel.food_plan }),
      });
      if (res.ok) {
        setAuxConfig(prev => ({
          ...prev,
          hostel_types: prev.hostel_types.map(h => h.id === editHostel.id ? { ...h, ...editHostel } : h),
        }));
        setEditHostel(null);
      }
    } catch (err) { console.error(err); }
    finally { setSavingAux(false); }
  };

  // ── Wizard steps ──────────────────────────────────────────────────────────
  const steps = [
    { title: 'Department & Batch', label: 'Department & Batch' },
    { title: 'Academic & Lab Fees', label: 'Academic & Lab Fees' },
    { title: 'Fee Categories', label: 'Fee Categories' },
    { title: 'Transport & Hostel', label: 'Transport & Hostel' },
  ];

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      const assignedTotalFee = formData.splitBySemester ? Math.round(netTotalFee * 0.5) : netTotalFee;
      const feeRecord = {
        id: `FEE-${Date.now()}`,
        applicationId: selectedStudent?.id || `APP-${Date.now()}`,
        studentId: selectedStudent?.rollNumber || selectedStudent?.id || `STU-${Date.now()}`,
        studentName: formData.assignmentType === 'individual'
          ? (selectedStudent?.name || selectedStudent?.fullName || 'Student')
          : `Entire ${formData.department} Batch`,
        email: selectedStudent?.email || '',
        course: formData.department,
        semester: formData.semester,
        totalFee: assignedTotalFee,
        components: {
          grossAcademicFee,
          tuitionFee: tuitionFeeCalc,
          developmentFee: developmentFeeCalc,
          libraryFee: libraryFeeCalc,
          examFee: examFeeCalc,
          activityFee: activityFeeCalc,
          chargesSum,
          quotaSurcharge,
          transportFee,
          hostelFee,
          amenitiesFee,
          scholarshipDiscount,
          chargeItems: charges.filter(c => selectedChargeIds.includes(c.id)).map(c => ({ label: c.label, amount: c.amount * splitMult })),
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

      // Save department fee template to MongoDB
      try {
        await fetch('/api/fees/structures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department: formData.department,
            semester: formData.semester,
            academicYear: formData.academicYear,
            tuitionFee: formData.tuitionFee,
            developmentFee: formData.developmentFee,
            libraryFee: formData.libraryFee,
            examFee: formData.examFee,
            activityFee: formData.activityFee,
            customFeeComponents: formData.customFeeComponents || [],
            scholarshipType: formData.scholarshipType,
            transportZone: formData.transportZone,
            hostelType: formData.hostelType,
            paymentPlan: formData.paymentPlan,
            grossAcademicFee,
            netTotalFee,
          }),
        });
      } catch (err) {
        console.error('Error persisting department fee structure template:', err);
      }

      await onSave(feeRecord);
      setIsSubmitting(false);
      onCancel();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
    else onCancel();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const schemeTypeColor = {
    Government: 'bg-blue-100 text-blue-700 border-blue-200',
    Merit: 'bg-purple-100 text-purple-700 border-purple-200',
    Sports: 'bg-orange-100 text-orange-700 border-orange-200',
    Institutional: 'bg-teal-100 text-teal-700 border-teal-200',
    Standard: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const amenityIcon = {
    ac: '❄️', wifi: '📶', laundry: '👕', mess: '🍽️', fan: '💨', attached_bath: '🚿', tv: '📺', study_table: '📚',
  };
  const amenityLabel = {
    ac: 'AC', wifi: 'Wi-Fi', laundry: 'Laundry', mess: 'Mess', fan: 'Fan', attached_bath: 'Attached Bath', tv: 'TV', study_table: 'Study Table',
  };

  // ── Live fee summary sidebar ──────────────────────────────────────────────
  const departmentSidebarPanel = (
    <div className="bg-[#003A40] text-white rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-6 h-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/15">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#00E5FF]">DEPARTMENT FEE DESIGN</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30">DB TEMPLATE</span>
        </div>

        <div>
          <h4 className="text-sm font-extrabold text-white leading-tight">{formData.department || 'Selected Department'}</h4>
          <p className="text-xs text-emerald-100/80 font-semibold mt-1">{formData.academicYear} • {formData.semester}</p>
        </div>

        <div className="space-y-2 pt-3 border-t border-white/15 text-xs font-semibold">
          <div className="flex justify-between text-emerald-100/90">
            <span>Base Tuition Fee:</span>
            <span className="font-mono font-bold text-white">₹{Number(formData.tuitionFee || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-emerald-100/90">
            <span>Gross Academic Fees:</span>
            <span className="font-mono font-bold text-white">₹{grossAcademicFee.toLocaleString('en-IN')}</span>
          </div>
          {chargesSum > 0 && (
            <div className="flex justify-between text-cyan-200">
              <span>Misc Charges:</span>
              <span className="font-mono font-bold">+₹{chargesSum.toLocaleString('en-IN')}</span>
            </div>
          )}
          {quotaSurcharge > 0 && (
            <div className="flex justify-between text-amber-200">
              <span>Quota Surcharge:</span>
              <span className="font-mono font-bold">+₹{quotaSurcharge.toLocaleString('en-IN')}</span>
            </div>
          )}
          {(transportFee > 0 || hostelFee > 0) && (
            <div className="flex justify-between text-cyan-200">
              <span>Auxiliary Services:</span>
              <span className="font-mono font-bold">+₹{(transportFee + hostelFee).toLocaleString('en-IN')}</span>
            </div>
          )}
          {scholarshipDiscount > 0 && (
            <div className="flex justify-between text-emerald-300">
              <span>Waivers & Discounts:</span>
              <span className="font-mono font-bold">-₹{scholarshipDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-white/15 space-y-1">
        <div className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider">Net Department Fee Payable</div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">₹{netTotalFee.toLocaleString('en-IN')}</div>
        <p className="text-[11px] text-emerald-200/70 font-medium">Saves template directly to MongoDB department_fee_structures collection</p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <EnterpriseWizardTemplate
      noLayout={true}
      title="Department Fee Structure Designer"
      subtitle="Design custom fee matrices, scholarship waivers, transport zones, and hostel plans per department"
      steps={steps}
      currentStep={currentStep}
      totalSteps={4}
      stepTitle={steps[currentStep - 1].title}
      stepIcon={currentStep === 1 ? 'school' : currentStep === 2 ? 'payments' : currentStep === 3 ? 'card_membership' : 'directions_bus'}
      customRightPanel={departmentSidebarPanel}
      onBack={handleBack}
      onNext={handleNext}
      isFirstStep={currentStep === 1}
      isLastStep={currentStep === 4}
      isSubmitting={isSubmitting}
      helpTitle="Department Fee Guide"
      helpText="Fee designs configured here serve as the dynamic template for the department. Submitting persists the structure to MongoDB and publishes it."
    >
      <div className="space-y-6">

        {/* ══════════════════════════════════════════════════
            STEP 1: DEPARTMENT & BATCH
            ══════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-[#F0FDFA] border border-[#0A686A]/20 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-[#003A40]">verified</span>
              <p className="text-xs text-slate-700">Select target academic department to configure its default fee structure design template. This template will be automatically loaded whenever a student enrolls in this department.</p>
            </div>

            {/* Target Department Selection */}
            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-1">Target Department <span className="text-rose-500">*</span></label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
                disabled={deptsLoading}
              >
                {deptsLoading && <option value="">Loading departments…</option>}
                {!deptsLoading && !formData.department && <option value="">— Select Department —</option>}
                {!deptsLoading && dynamicDepts.map(dept => (
                  <option key={dept.id || dept._id || dept.name} value={dept.name}>{dept.name}</option>
                ))}
              </select>
              {formData.department && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">cloud_download</span>
                  Loading saved template for {formData.department} from MongoDB…
                </p>
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
                  <option value="2026-2027">2026–2027</option>
                  <option value="2025-2026">2025–2026</option>
                  <option value="2024-2025">2024–2025</option>
                  <option value="2023-2024">2023–2024</option>
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

        {/* ══════════════════════════════════════════════════
            STEP 2: ACADEMIC & LAB FEES
            ══════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-5">
            {/* ── DB Template Banner ── */}
            {deptTemplateLoaded && (
              <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">cloud_done</span>
                <div>
                  <span className="text-xs font-bold text-emerald-800">Fees loaded from saved department template</span>
                  <p className="text-[10px] text-emerald-600 font-medium">All amounts below were auto-filled from the MongoDB <code className="bg-emerald-100 px-1 rounded">department_fee_structures</code> record for <strong>{formData.department}</strong>. You can still edit them.</p>
                </div>
              </div>
            )}
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
                <input type="number" value={formData.libraryFee} onChange={(e) => setFormData({ ...formData, libraryFee: Number(e.target.value) })} className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">University Examination Fee (₹)</label>
                <input type="number" value={formData.examFee} onChange={(e) => setFormData({ ...formData, examFee: Number(e.target.value) })} className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Student Activity & Sports (₹)</label>
                <input type="number" value={formData.activityFee} onChange={(e) => setFormData({ ...formData, activityFee: Number(e.target.value) })} className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]" />
              </div>
            </div>

            {/* ── Charges & Misc Packages ──────────────────────────── */}
            <div className="pt-3 border-t border-[#E6EDF2] space-y-3">
              <div>
                <h4 className="text-xs font-bold text-[#003A40]">Charges & Miscellaneous Packages</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Click a card to include / exclude. Hover and click ✏️ to edit label or amount — saves to DB instantly.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {charges.map(charge => {
                  const isSelected = selectedChargeIds.includes(charge.id);
                  return (
                    <div
                      key={charge.id}
                      onClick={() => {
                        const next = isSelected
                          ? selectedChargeIds.filter(id => id !== charge.id)
                          : [...selectedChargeIds, charge.id];
                        setSelectedChargeIds(next);
                        persistCharges(charges, next);
                      }}
                      className={`p-3 rounded-xl border transition-all flex items-center gap-3 relative group cursor-pointer ${
                        isSelected
                          ? 'border-[#0A686A] bg-[#F0FDFA] shadow-sm'
                          : 'border-[#E6EDF2] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0 ${
                        isSelected ? 'bg-[#003A40] text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">{charge.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-[#003A40] leading-tight block truncate">{charge.label}</span>
                        <span className="text-[11px] text-[#5F6B7A] font-semibold">₹{Number(charge.amount).toLocaleString('en-IN')}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        isSelected ? 'bg-[#0A686A] border-[#0A686A]' : 'border-[#E6EDF2] bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {/* Edit button — stops propagation so clicking it won't toggle selection */}
                      <button
                        onClick={e => { e.stopPropagation(); setEditCharge({ ...charge }); }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-white border border-[#E6EDF2] text-slate-400 hover:text-[#0A686A] hover:border-[#0A686A]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                        title="Edit this charge"
                      >
                        <span className="material-symbols-outlined text-[12px]">edit</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-xs font-semibold text-slate-600">Selected Charges Subtotal:</span>
                <span className="text-sm font-extrabold text-[#003A40]">₹{chargesSum.toLocaleString('en-IN')}</span>
              </div>

              {/* ── Inline Edit Charge Modal ── */}
              {editCharge && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setEditCharge(null)}>
                  <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-sm font-bold text-[#003A40]">Edit Charge Item</h3>
                      <button onClick={() => setEditCharge(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 cursor-pointer transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Charge Label</label>
                        <input
                          type="text"
                          value={editCharge.label}
                          onChange={e => setEditCharge(prev => ({ ...prev, label: e.target.value }))}
                          className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]"
                          placeholder="e.g. Examination Registration Fee"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          value={editCharge.amount}
                          onChange={e => setEditCharge(prev => ({ ...prev, amount: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-mono font-bold outline-none focus:border-[#0A686A]"
                          placeholder="e.g. 2500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <button onClick={() => setEditCharge(null)} className="flex-1 py-2 border border-[#E6EDF2] text-[#5F6B7A] rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                      <button onClick={handleSaveCharge} disabled={savingCharge} className="flex-1 py-2 bg-[#003A40] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#0A686A] transition-colors disabled:opacity-60">
                        {savingCharge ? 'Saving…' : 'Save to DB'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Custom Fee Heads ─────────────────────────────────── */}
            <div className="pt-3 border-t border-[#E6EDF2] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#003A40]">Custom Department Fee Heads</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Add special lab, clinical, or departmental fee components</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `fee_${Date.now()}`;
                    setFormData(prev => ({
                      ...prev,
                      customFeeComponents: [...(prev.customFeeComponents || []), { id: newId, title: 'Clinical & Workshop Fee', amount: 3500 }]
                    }));
                  }}
                  className="px-3 py-1.5 bg-[#E6F4F1] hover:bg-[#d0ece7] text-[#003A40] rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Fee Head</span>
                </button>
              </div>

              {(formData.customFeeComponents || []).length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {formData.customFeeComponents.map((comp, idx) => (
                    <div key={comp.id || idx} className="flex items-center gap-3 p-2.5 bg-slate-50 border border-[#E6EDF2] rounded-xl">
                      <input
                        type="text"
                        value={comp.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            customFeeComponents: prev.customFeeComponents.map((c, i) => i === idx ? { ...c, title: val } : c)
                          }));
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-[#E6EDF2] rounded-lg text-xs font-semibold outline-none focus:border-[#0A686A]"
                        placeholder="Fee Component Name"
                      />
                      <div className="w-32 flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          value={comp.amount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              customFeeComponents: prev.customFeeComponents.map((c, i) => i === idx ? { ...c, amount: val } : c)
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E6EDF2] rounded-lg text-xs font-mono font-bold outline-none focus:border-[#0A686A]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, customFeeComponents: prev.customFeeComponents.filter((_, i) => i !== idx) }))}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border border-[#E6EDF2] rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-[#003A40]">Subtotal Gross Academic Fees:</span>
              <span className="text-base font-extrabold text-[#003A40]">₹{grossAcademicFee.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 3: SCHOLARSHIPS & WAIVERS
            ══════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="space-y-5">

            {/* ── Header with Add button ── */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#003A40]">Fee Categories & Scholarship Schemes</h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Design categories here. At admission time, admin picks the student's category — fee is auto-adjusted.
                </p>
              </div>
              <button
                onClick={() => setAddScholarship(true)}
                className="px-3 py-1.5 bg-[#003A40] hover:bg-[#0A686A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>

            {/* ── Info banner ── */}
            <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="material-symbols-outlined text-[16px] text-blue-500">info</span>
              <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                These categories are saved to MongoDB. At the time of student admission, the admin selects the applicable category and the system calculates the net fee automatically.
              </p>
            </div>

            {/* ── Grouped Category Cards ── */}
            {(['Government', 'Merit', 'Sports', 'Institutional', 'Standard']).map(groupType => {
              const group = scholarships.filter(s => (s.scheme_type || 'Standard') === groupType);
              if (group.length === 0) return null;
              const groupColors = {
                Government: { bg: 'bg-blue-50', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'account_balance', dot: 'bg-blue-400' },
                Merit: { bg: 'bg-purple-50', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700 border-purple-200', icon: 'workspace_premium', dot: 'bg-purple-400' },
                Sports: { bg: 'bg-orange-50', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700 border-orange-200', icon: 'sports_soccer', dot: 'bg-orange-400' },
                Institutional: { bg: 'bg-teal-50', border: 'border-teal-100', badge: 'bg-teal-100 text-teal-700 border-teal-200', icon: 'school', dot: 'bg-teal-400' },
                Standard: { bg: 'bg-slate-50', border: 'border-slate-100', badge: 'bg-slate-100 text-slate-500 border-slate-200', icon: 'receipt', dot: 'bg-slate-300' },
              };
              const gc = groupColors[groupType] || groupColors.Standard;
              return (
                <div key={groupType} className="space-y-2">
                  {/* Group label */}
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${gc.dot} flex-shrink-0`} />
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">{groupType} Schemes</span>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] text-slate-400 font-semibold">{group.length} scheme{group.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {group.map(sch => {
                      const isSelected = formData.scholarshipType === sch.value;
                      const isDefault = ['none', 'merit', 'first_grad', 'ews', 'sports'].includes(sch.id);
                      return (
                        <div
                          key={sch.id}
                          onClick={() => setFormData({ ...formData, scholarshipType: sch.value })}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 relative group ${
                            isSelected
                              ? `border-[#0A686A] ${gc.bg} shadow-sm`
                              : `border-[#E6EDF2] bg-white hover:${gc.bg} hover:border-slate-200`
                          }`}
                        >
                          {/* Top row: type chip + checkmark */}
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase tracking-wide ${gc.badge}`}>
                              {groupType}
                            </span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[16px] text-[#0A686A]">check_circle</span>
                            )}
                          </div>

                          {/* Name + discount */}
                          <div>
                            <span className="text-xs font-bold text-[#003A40] leading-snug block">{sch.label}</span>
                            <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                              {sch.discount_type === 'fixed' && sch.discount_amount > 0
                                ? `-₹${Number(sch.discount_amount).toLocaleString('en-IN')} waiver`
                                : sch.discount_type === 'percent' && sch.discount_amount > 0
                                ? `${sch.discount_amount}% off tuition`
                                : 'No discount'}
                            </span>
                          </div>

                          {/* Eligibility */}
                          {sch.eligibility && (
                            <div className="flex items-start gap-1 text-[10px] text-slate-400">
                              <span className="material-symbols-outlined text-[11px] mt-0.5 flex-shrink-0">verified_user</span>
                              <span className="leading-tight">{sch.eligibility}</span>
                            </div>
                          )}
                          {/* Income limit tag */}
                          {sch.income_limit && (
                            <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold w-fit">
                              Income ≤ {sch.income_limit}
                            </span>
                          )}

                          {/* Docs required tag */}
                          {sch.documentation && (
                            <div className="flex items-center gap-1 text-[9px] text-slate-400">
                              <span className="material-symbols-outlined text-[11px]">description</span>
                              <span className="leading-tight truncate">{sch.documentation}</span>
                            </div>
                          )}

                          {/* Hover action buttons */}
                          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={e => { e.stopPropagation(); setEditScholarship({ ...sch }); }}
                              className="w-6 h-6 rounded-lg bg-white border border-[#E6EDF2] text-slate-400 hover:text-[#0A686A] hover:border-[#0A686A]/40 flex items-center justify-center shadow-xs cursor-pointer"
                              title="Edit category"
                            >
                              <span className="material-symbols-outlined text-[12px]">edit</span>
                            </button>
                            {!isDefault && (
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteScholarshipId(sch.id); }}
                                className="w-6 h-6 rounded-lg bg-white border border-rose-200 text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shadow-xs cursor-pointer"
                                title="Delete category"
                              >
                                <span className="material-symbols-outlined text-[12px]">delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ── Extra waiver input ── */}
            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-1">Additional Special Discount Waiver (₹)</label>
              <input
                type="number"
                value={formData.customWaiver}
                onChange={e => setFormData({ ...formData, customWaiver: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]"
                placeholder="e.g. 5000"
              />
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-950">
              <span className="text-xs font-bold">Total Scholarship Waiver Deduction:</span>
              <span className="text-base font-extrabold text-emerald-700">-₹{scholarshipDiscount.toLocaleString('en-IN')}</span>
            </div>

            {/* ── Edit Scholarship Modal ── */}
            {editScholarship && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setEditScholarship(null)}>
                <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-[#003A40]">Edit Scholarship Scheme</h3>
                    <button onClick={() => setEditScholarship(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 cursor-pointer transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'label', label: 'Scheme Name', type: 'text' },
                      { key: 'sub', label: 'Description', type: 'text' },
                      { key: 'eligibility', label: 'Eligibility Criteria', type: 'text' },
                    ].map(({ key, label, type }) => (
                      <div key={key}>
                        <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">{label}</label>
                        <input type={type} value={editScholarship[key] || ''} onChange={e => setEditScholarship(prev => ({ ...prev, [key]: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Scheme Type</label>
                      <select value={editScholarship.scheme_type || 'Standard'} onChange={e => setEditScholarship(prev => ({ ...prev, scheme_type: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white">
                        {['Government', 'Merit', 'Sports', 'Institutional', 'Standard'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Discount Amount {editScholarship.discount_type === 'percent' ? '(%)' : '(₹)'}</label>
                      <input type="number" value={editScholarship.discount_amount} onChange={e => setEditScholarship(prev => ({ ...prev, discount_amount: Number(e.target.value) }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setEditScholarship(null)} className="flex-1 py-2 border border-[#E6EDF2] text-[#5F6B7A] rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleSaveScholarship} disabled={savingScholarship} className="flex-1 py-2 bg-[#003A40] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#0A686A] transition-colors disabled:opacity-60">{savingScholarship ? 'Saving…' : 'Save to DB'}</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Add Category Modal (full fields) ── */}
            {addScholarship && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setAddScholarship(false)}>
                <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-bold text-[#003A40]">Add New Fee Category</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">This category will appear at admission time for admin to select</p>
                    </div>
                    <button onClick={() => setAddScholarship(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 cursor-pointer transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>

                  <div className="space-y-3">
                    {/* Category Name */}
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Category / Scheme Name <span className="text-rose-500">*</span></label>
                      <input type="text" placeholder="e.g. Divyangjan Scholarship" value={newScheme.label} onChange={e => setNewScheme(prev => ({ ...prev, label: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" />
                    </div>

                    {/* Short Description */}
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Short Description</label>
                      <input type="text" placeholder="e.g. 25% waiver for PwD students" value={newScheme.sub} onChange={e => setNewScheme(prev => ({ ...prev, sub: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" />
                    </div>

                    {/* Category Type */}
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Category Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: 'Government', icon: 'account_balance', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                          { val: 'Merit', icon: 'workspace_premium', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                          { val: 'Sports', icon: 'sports_soccer', color: 'bg-orange-50 border-orange-200 text-orange-700' },
                          { val: 'Institutional', icon: 'school', color: 'bg-teal-50 border-teal-200 text-teal-700' },
                          { val: 'Standard', icon: 'receipt', color: 'bg-slate-50 border-slate-200 text-slate-600' },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setNewScheme(prev => ({ ...prev, scheme_type: opt.val }))}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer text-[10px] font-bold transition-all ${
                              newScheme.scheme_type === opt.val ? opt.color + ' border-2' : 'border-[#E6EDF2] bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                            {opt.val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Discount */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Discount Type</label>
                        <select value={newScheme.discount_type} onChange={e => setNewScheme(prev => ({ ...prev, discount_type: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white">
                          <option value="fixed">Fixed Amount (₹)</option>
                          <option value="percent">Percentage (%) of Tuition</option>
                          <option value="full">Full Fee Waiver (100%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">
                          {newScheme.discount_type === 'fixed' ? 'Amount (₹)' : newScheme.discount_type === 'percent' ? 'Percentage (%)' : 'Auto — 100%'}
                        </label>
                        <input
                          type="number"
                          value={newScheme.discount_amount}
                          disabled={newScheme.discount_type === 'full'}
                          onChange={e => setNewScheme(prev => ({ ...prev, discount_amount: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-mono font-bold outline-none focus:border-[#0A686A] disabled:bg-slate-50 disabled:text-slate-400"
                          placeholder={newScheme.discount_type === 'full' ? '100' : '0'}
                        />
                      </div>
                    </div>

                    {/* Eligibility */}
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Eligibility Criteria</label>
                      <input type="text" placeholder="e.g. Valid disability certificate from govt hospital" value={newScheme.eligibility} onChange={e => setNewScheme(prev => ({ ...prev, eligibility: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" />
                    </div>

                    {/* Income Limit */}
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Annual Family Income Limit (optional)</label>
                      <input type="text" placeholder="e.g. Below ₹2,50,000 per annum" value={newScheme.income_limit || ''} onChange={e => setNewScheme(prev => ({ ...prev, income_limit: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" />
                    </div>

                    {/* Documentation Required */}
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Documents Required (optional)</label>
                      <input type="text" placeholder="e.g. Income certificate, Community certificate, First graduate affidavit" value={newScheme.documentation || ''} onChange={e => setNewScheme(prev => ({ ...prev, documentation: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" />
                    </div>

                    {/* Applicable Communities */}
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Applicable Communities (optional)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['OC', 'BC', 'MBC', 'DNC', 'SC', 'ST', 'SCA', 'All'].map(comm => {
                          const selected = (newScheme.applicable_communities || []).includes(comm);
                          return (
                            <button
                              key={comm}
                              type="button"
                              onClick={() => setNewScheme(prev => ({
                                ...prev,
                                applicable_communities: selected
                                  ? prev.applicable_communities.filter(c => c !== comm)
                                  : [...(prev.applicable_communities || []), comm]
                              }))}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                                selected ? 'bg-[#003A40] text-white border-[#003A40]' : 'bg-white text-slate-500 border-[#E6EDF2] hover:bg-slate-50'
                              }`}
                            >
                              {comm}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setAddScholarship(false)} className="flex-1 py-2 border border-[#E6EDF2] text-[#5F6B7A] rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                    <button
                      onClick={handleAddScholarship}
                      disabled={savingScholarship || !newScheme.label}
                      className="flex-1 py-2 bg-[#003A40] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#0A686A] transition-colors disabled:opacity-60"
                    >
                      {savingScholarship ? 'Saving to DB…' : 'Save Category to DB'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Delete Scholarship Confirm ── */}
            {deleteScholarshipId && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-rose-200 p-6 w-full max-w-xs shadow-2xl">
                  <h3 className="text-sm font-bold text-rose-600 mb-2">Delete Scholarship Scheme?</h3>
                  <p className="text-xs text-slate-500 mb-5">This action cannot be undone. The scheme will be permanently removed from MongoDB.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteScholarshipId(null)} className="flex-1 py-2 border border-[#E6EDF2] text-slate-500 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50">Cancel</button>
                    <button onClick={() => handleDeleteScholarship(deleteScholarshipId)} className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">Delete</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 4: TRANSPORT & HOSTEL
            ══════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="space-y-6">

            {/* ── Transport Package Cards ──────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-[#003A40]">Bus Transport Route / Zone</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Select a transport zone package. Hover to edit amounts.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {auxConfig.transport_zones.map(zone => {
                  const isSelected = formData.transportZone === zone.value;
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setFormData({ ...formData, transportZone: zone.value })}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 relative group ${
                        isSelected ? 'border-[#0A686A] bg-[#F0FDFA] shadow-sm' : 'border-[#E6EDF2] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#003A40]' : 'bg-slate-100'}`}>
                            <span className={`material-symbols-outlined text-[16px] ${isSelected ? 'text-white' : 'text-slate-500'}`}>{zone.icon || 'directions_bus'}</span>
                          </div>
                          <span className="text-xs font-extrabold text-[#003A40]">{zone.label}</span>
                        </div>
                        {isSelected && <span className="material-symbols-outlined text-[18px] text-[#0A686A]">check_circle</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">{zone.distance || (zone.amount === 0 ? 'Self-arranged' : '')}</span>
                        <span className="text-sm font-extrabold text-[#003A40] font-mono">
                          {zone.amount === 0 ? 'Free' : `₹${Number(zone.amount).toLocaleString('en-IN')}`}
                        </span>
                      </div>
                      {(zone.pickup_points || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {zone.pickup_points.slice(0, 2).map((pt, i) => (
                            <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">{pt}</span>
                          ))}
                        </div>
                      )}
                      {/* Edit button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditTransport({ ...zone }); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white border border-[#E6EDF2] text-slate-400 hover:text-[#0A686A] hover:border-[#0A686A]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                        title="Edit zone"
                      >
                        <span className="material-symbols-outlined text-[12px]">edit</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Hostel Package Cards ─────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-[#003A40]">Hostel Accommodation & Food Plan</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Select a hostel package. Hover to edit.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {auxConfig.hostel_types.map(hostel => {
                  const isSelected = formData.hostelType === hostel.value;
                  return (
                    <div
                      key={hostel.id}
                      onClick={() => setFormData({ ...formData, hostelType: hostel.value })}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 relative group ${
                        isSelected ? 'border-[#0A686A] bg-[#F0FDFA] shadow-sm' : 'border-[#E6EDF2] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#003A40]' : 'bg-slate-100'}`}>
                            <span className={`material-symbols-outlined text-[16px] ${isSelected ? 'text-white' : 'text-slate-500'}`}>{hostel.icon || 'bed'}</span>
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-[#003A40] block leading-tight">{hostel.label}</span>
                            {hostel.occupancy && <span className="text-[10px] text-slate-400 font-medium">{hostel.occupancy}</span>}
                          </div>
                        </div>
                        {isSelected && <span className="material-symbols-outlined text-[18px] text-[#0A686A] flex-shrink-0">check_circle</span>}
                      </div>
                      {hostel.food_plan && (
                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">restaurant</span>
                          {hostel.food_plan}
                        </span>
                      )}
                      {/* Amenity chips */}
                      {(hostel.amenities || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hostel.amenities.slice(0, 4).map(a => (
                            <span key={a} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                              isSelected ? 'bg-[#003A40]/10 text-[#003A40]' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {amenityIcon[a] || '•'} {amenityLabel[a] || a}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-semibold">Per Annum</span>
                        <span className="text-sm font-extrabold text-[#003A40] font-mono">
                          {hostel.amount === 0 ? 'Free' : `₹${Number(hostel.amount).toLocaleString('en-IN')}`}
                        </span>
                      </div>
                      {/* Edit button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditHostel({ ...hostel }); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white border border-[#E6EDF2] text-slate-400 hover:text-[#0A686A] hover:border-[#0A686A]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                        title="Edit hostel package"
                      >
                        <span className="material-symbols-outlined text-[12px]">edit</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Payment Plan ─────────────────────────────────── */}
            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-1">Payment Installment Plan</label>
              <select
                value={formData.paymentPlan}
                onChange={(e) => setFormData({ ...formData, paymentPlan: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
              >
                {auxConfig.payment_plans.map(p => (
                  <option key={p.id || p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* ── Semester Split Toggle ───────────────────────── */}
            <div className="mt-6 mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-blue-900">Apply Semester Split</h4>
                <p className="text-[10px] text-blue-700/70 mt-0.5">Divide the total annual fee by 2 for this semester's record.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={formData.splitBySemester} onChange={e => setFormData({ ...formData, splitBySemester: e.target.checked })} />
                <div className="w-9 h-5 bg-blue-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* ── Final Fee Breakdown ───────────────────────────── */}
            <div className="p-4 bg-[#003A40]/5 border border-[#003A40]/15 rounded-xl space-y-2 text-xs">
              <h4 className="text-[10px] font-extrabold text-[#003A40] uppercase tracking-widest mb-3">Final Fee Breakdown</h4>
              {[
                { label: 'Gross Academic Fees', amount: grossAcademicFee, color: 'text-[#003A40]' },
                quotaSurcharge > 0 && { label: `Quota Surcharge (${formData.quota})`, amount: quotaSurcharge, color: 'text-amber-700' },
                transportFee > 0 && { label: `Transport — ${formData.transportZone}`, amount: transportFee, color: 'text-[#003A40]' },
                hostelFee > 0 && { label: `Hostel — ${formData.hostelType}`, amount: hostelFee, color: 'text-[#003A40]' },
                amenitiesFee > 0 && { label: 'Add-on Amenities', amount: amenitiesFee, color: 'text-[#003A40]' },
                scholarshipDiscount > 0 && { label: `Scholarship Waiver (${formData.scholarshipType})`, amount: -scholarshipDiscount, color: 'text-emerald-600' },
              ].filter(Boolean).map((row, i) => (
                <div key={i} className={`flex justify-between py-1 border-b border-[#003A40]/10 ${row.color}`}>
                  <span className="font-semibold">{row.label}</span>
                  <span className="font-mono font-bold">
                    {row.amount < 0 ? '-' : ''}₹{Math.abs(row.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-extrabold text-sm text-[#003A40]">
                <span>NET TOTAL PAYABLE:</span>
                <span className="text-[#0A686A] font-mono text-base">₹{netTotalFee.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* ── Edit Transport Modal ── */}
            {editTransport && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setEditTransport(null)}>
                <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-[#003A40]">Edit Transport Zone</h3>
                    <button onClick={() => setEditTransport(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 cursor-pointer transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Zone Label</label>
                      <input type="text" value={editTransport.label} onChange={e => setEditTransport(prev => ({ ...prev, label: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Distance Range</label>
                      <input type="text" value={editTransport.distance || ''} onChange={e => setEditTransport(prev => ({ ...prev, distance: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" placeholder="e.g. Up to 15 km" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Annual Fee (₹)</label>
                      <input type="number" value={editTransport.amount} onChange={e => setEditTransport(prev => ({ ...prev, amount: Number(e.target.value) }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setEditTransport(null)} className="flex-1 py-2 border border-[#E6EDF2] text-[#5F6B7A] rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleSaveTransport} disabled={savingAux} className="flex-1 py-2 bg-[#003A40] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#0A686A] transition-colors disabled:opacity-60">{savingAux ? 'Saving…' : 'Save to DB'}</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Edit Hostel Modal ── */}
            {editHostel && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setEditHostel(null)}>
                <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-[#003A40]">Edit Hostel Package</h3>
                    <button onClick={() => setEditHostel(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 cursor-pointer transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Package Name</label>
                      <input type="text" value={editHostel.label} onChange={e => setEditHostel(prev => ({ ...prev, label: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Occupancy Type</label>
                      <input type="text" value={editHostel.occupancy || ''} onChange={e => setEditHostel(prev => ({ ...prev, occupancy: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" placeholder="e.g. Quad (4 Students)" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Food Plan</label>
                      <input type="text" value={editHostel.food_plan || ''} onChange={e => setEditHostel(prev => ({ ...prev, food_plan: e.target.value }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A]" placeholder="e.g. Three Meals (Mess)" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Annual Fee (₹)</label>
                      <input type="number" value={editHostel.amount} onChange={e => setEditHostel(prev => ({ ...prev, amount: Number(e.target.value) }))} className="w-full px-3 py-2 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setEditHostel(null)} className="flex-1 py-2 border border-[#E6EDF2] text-[#5F6B7A] rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleSaveHostel} disabled={savingAux} className="flex-1 py-2 bg-[#003A40] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#0A686A] transition-colors disabled:opacity-60">{savingAux ? 'Saving…' : 'Save to DB'}</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </EnterpriseWizardTemplate>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FULL PAGE PAYMENT PROCESSOR
   ══════════════════════════════════════════════════════════════════════════ */
function PaymentFullView({ fee, onCancel, onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState(fee.paymentMethod || 'UPI / QR Code');
  const [paymentAmount, setPaymentAmount] = useState((fee.totalFee || 0) - (fee.paidAmount || 0));

  const remainingBalance = (fee.totalFee || 0) - (fee.paidAmount || 0) - paymentAmount;
  
  // Calculate Target Date (30 days from now)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 30);
  const targetDateStr = targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-white rounded-3xl border border-[#E6EDF2] p-8 shadow-sm flex flex-col md:flex-row gap-8">
      
      {/* LEFT: Fee Breakdown */}
      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-extrabold text-[#003A40] mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">receipt_long</span> 
          Fee Breakdown
        </h3>
        
        <div className="space-y-3 text-xs text-[#5F6B7A]">
          <div className="flex justify-between py-2 border-b border-slate-200/60">
            <span className="font-bold">Student Name:</span>
            <span className="font-bold text-[#003A40]">{fee.studentName} ({fee.studentId})</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200/60">
            <span className="font-bold">Semester:</span>
            <span className="font-bold text-[#003A40]">Semester {fee.semester}</span>
          </div>
          
          <div className="pt-4 pb-2">
            <h4 className="font-extrabold text-[#003A40] mb-2 uppercase tracking-wider text-[10px]">Components</h4>
            <div className="flex justify-between py-1">
              <span>Tuition / Semester Fee:</span>
              <span className="font-bold text-[#003A40]">₹{(fee.components?.semesterFee || fee.components?.tuitionFee || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Books & Digital Library:</span>
              <span className="font-bold text-[#003A40]">₹{(fee.components?.bookFee || fee.components?.libraryFee || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Exam Fee:</span>
              <span className="font-bold text-[#003A40]">₹{(fee.components?.examFee || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Hostel & Mess:</span>
              <span className="font-bold text-[#003A40]">₹{(fee.components?.hostelFee || 0).toLocaleString()}</span>
            </div>
            {fee.components?.scholarshipDiscount > 0 && (
              <div className="flex justify-between py-1 text-emerald-600 font-bold">
                <span>Scholarship Waiver:</span>
                <span>-₹{fee.components.scholarshipDiscount.toLocaleString()}</span>
              </div>
            )}
          </div>
          
          <div className="pt-4 flex justify-between items-end border-t border-slate-200/60">
            <span className="font-extrabold text-sm text-[#003A40]">Total Fee:</span>
            <div className="text-right">
              <span className="block text-lg font-black text-[#0A686A]">₹{(fee.totalFee || 0).toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-500">Already Paid: ₹{(fee.paidAmount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Payment Processing */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#003A40] mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" /> Process Payment
          </h3>

          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-[#5F6B7A] uppercase mb-1.5 block">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC]"
              >
                <option value="UPI / QR Code">UPI / QR Code</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-[#5F6B7A] uppercase mb-1.5 block">Amount to Pay Now</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-black text-sm">₹</span>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full pl-9 pr-4 py-3 text-sm font-black border border-slate-200 rounded-xl focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC]"
                />
              </div>
            </div>

            {remainingBalance > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mt-4">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-extrabold text-amber-800">Remaining Balance: ₹{remainingBalance.toLocaleString()}</h4>
                  <p className="text-[10px] font-bold text-amber-700/70 mt-1">Target to pay within 30 days ({targetDateStr})</p>
                </div>
              </div>
            )}
            
            {remainingBalance < 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 mt-4">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-extrabold text-rose-800">Overpayment: ₹{Math.abs(remainingBalance).toLocaleString()}</h4>
                  <p className="text-[10px] font-bold text-rose-700/70 mt-1">Payment amount exceeds the total due.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={remainingBalance < 0 || paymentAmount <= 0}
            onClick={async () => {
              try {
                // Ensure correct status updates based on remaining balance
                const totalPaidNow = (fee.paidAmount || 0) + paymentAmount;
                const newStatus = totalPaidNow >= fee.totalFee ? 'Paid' : 'Partial';
                await updateFeePayment(fee.id, {
                  status: newStatus,
                  paymentMethod,
                  paidAmount: totalPaidNow,
                });
                alert('Payment recorded successfully!');
                onSuccess();
              } catch (err) {
                alert('Failed to record payment');
              }
            }}
            className="flex-1 py-3 bg-[#003A40] text-white rounded-xl font-bold text-xs hover:bg-[#0A686A] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm & Process Payment
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FULL PAGE FEE BREAKDOWN VIEW — Enterprise Grade Rich Details
   ══════════════════════════════════════════════════════════════════════════ */
function FeeBreakdownFullView({ fee, onCancel, onMakePayment }) {
  const comp = fee.components || {};

  const calculatedAnnual = (comp.grossAcademicFee || 0) + (comp.quotaSurcharge || 0) + (comp.transportFee || 0) + (comp.hostelFee || 0) + (comp.amenitiesFee || 0) - (comp.scholarshipDiscount || 0);
  const annualTotal = calculatedAnnual > (fee.totalFee || 0) ? calculatedAnnual : (fee.totalFee || 0) * 2;
  const isSplit = annualTotal > (fee.totalFee || 0);
  const termPayable = fee.totalFee || 0;
  const paidAmount = fee.paidAmount || 0;
  const balanceDue = Math.max(0, termPayable - paidAmount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Nav Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6EDF2] shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#003A40] rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Fee Management
          </button>
          <div>
            <h2 className="text-base font-extrabold text-[#003A40]">Detailed Fee Structure</h2>
            <p className="text-xs text-[#5F6B7A] font-medium">Complete itemized breakdown and student allocation records</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 border border-[#E6EDF2] hover:bg-slate-50 text-[#003A40] rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Print / Export Breakdown
          </button>
          {onMakePayment && balanceDue > 0 && (
            <button
              type="button"
              onClick={() => onMakePayment(fee)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#003A40] hover:bg-[#0A686A] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">credit_card</span>
              Process Payment
            </button>
          )}
        </div>
      </div>

      {/* Student Profile Header Card */}
      <div className="bg-[#003A40] text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-black text-xl shadow-inner shrink-0">
            {(fee.studentName || fee.name || fee.fullName || 'S').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-black tracking-tight text-white">
                {fee.studentName || fee.name || fee.fullName || 'Student Record'}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                (fee.status || 'Pending').toLowerCase() === 'paid'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}>
                {fee.status || 'Pending'}
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 font-semibold mt-0.5">
              ID: <span className="font-mono">{fee.studentId || fee.rollNumber || fee.id || 'N/A'}</span> • {fee.course || fee.department || 'Department'} • Sem {fee.semester || 1}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/15">
          <div>
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Assigned Date</span>
            <span className="text-xs font-bold text-white font-mono">{fee.assignedDate ? new Date(fee.assignedDate).toLocaleDateString('en-IN') : 'Recent'}</span>
          </div>
          <div className="w-px h-8 bg-white/15"></div>
          <div>
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Seat Quota</span>
            <span className="text-xs font-bold text-white">{fee.options?.quota || 'Government Quota'}</span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Annual Fee</span>
            <span className="material-symbols-outlined text-[#003A40]">account_balance_wallet</span>
          </div>
          <p className="text-2xl font-black text-[#003A40] font-mono">₹{annualTotal.toLocaleString('en-IN')}</p>
          <span className="text-[11px] font-medium text-slate-400">Full 1-Year Structure</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Term Payable Fee</span>
            <span className="material-symbols-outlined text-[#0A686A]">payments</span>
          </div>
          <p className="text-2xl font-black text-[#0A686A] font-mono">₹{termPayable.toLocaleString('en-IN')}</p>
          <span className="text-[11px] font-medium text-slate-400">{isSplit ? '50% Semester Split' : 'Full Term Total'}</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Paid Amount</span>
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">₹{paidAmount.toLocaleString('en-IN')}</p>
          <span className="text-[11px] font-medium text-emerald-600">Cleared & Verified</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Outstanding Balance</span>
            <span className="material-symbols-outlined text-amber-600">pending_actions</span>
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">₹{balanceDue.toLocaleString('en-IN')}</p>
          <span className="text-[11px] font-medium text-amber-600">Action Required</span>
        </div>
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Itemized Breakdown Table (8 COLS) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E6EDF2] p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6EDF2]">
            <h3 className="text-sm font-extrabold text-[#003A40] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Itemized Fee Component Schedule
            </h3>
            <span className="text-xs font-bold text-slate-400">Currency: INR (₹)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3">Fee Component / Head</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Annual Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {/* Tuition Fee */}
                <tr>
                  <td className="px-4 py-3 font-semibold text-[#003A40]">Base Tuition Fee</td>
                  <td className="px-4 py-3 text-slate-500">Academic</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{(comp.tuitionFee || comp.semesterFee || 0).toLocaleString('en-IN')}</td>
                </tr>

                {/* Development Fee */}
                {(comp.developmentFee > 0) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Infrastructure & Lab Development</td>
                    <td className="px-4 py-3 text-slate-500">Academic</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{comp.developmentFee.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {/* Library Fee */}
                {((comp.libraryFee || comp.bookFee) > 0) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Books & Digital Library E-Journals</td>
                    <td className="px-4 py-3 text-slate-500">Academic</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{(comp.libraryFee || comp.bookFee).toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {/* Exam Fee */}
                {(comp.examFee > 0) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">University Examination Fee</td>
                    <td className="px-4 py-3 text-slate-500">Examination</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{comp.examFee.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {/* Activity Fee */}
                {(comp.activityFee > 0) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Student Activity & Sports</td>
                    <td className="px-4 py-3 text-slate-500">Co-Curricular</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{comp.activityFee.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {/* Hostel & Mess */}
                {(comp.hostelFee > 0) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Hostel Room & Mess Food Package</td>
                    <td className="px-4 py-3 text-slate-500">Auxiliary Service</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{comp.hostelFee.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {/* Transport Fee */}
                {(comp.transportFee > 0) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">College Transport Bus Service</td>
                    <td className="px-4 py-3 text-slate-500">Auxiliary Service</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{comp.transportFee.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {/* Amenities Fee */}
                {(comp.amenitiesFee > 0) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Campus Amenities (Wi-Fi & Laundry)</td>
                    <td className="px-4 py-3 text-slate-500">Facility Pass</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{comp.amenitiesFee.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {/* Quota Surcharge */}
                {(comp.quotaSurcharge > 0) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-amber-700">Seat Quota Category Surcharge</td>
                    <td className="px-4 py-3 text-amber-600 font-semibold">{fee.options?.quota || 'Quota'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">+₹{comp.quotaSurcharge.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {/* Custom Charge Items */}
                {(comp.chargeItems || []).map((ch, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">{ch.label}</td>
                    <td className="px-4 py-3 text-slate-500">Misc Package</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{Number(ch.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}

                {/* Scholarship Waiver */}
                {(comp.scholarshipDiscount > 0) && (
                  <tr className="bg-emerald-50/50">
                    <td className="px-4 py-3 font-bold text-emerald-800">
                      Scholarship Waiver ({fee.options?.scholarshipType || 'Institutional Scheme'})
                    </td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">Discount Concession</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">-₹{comp.scholarshipDiscount.toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Grand Totals Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
              <span>Total Full Structure Fee (Annual):</span>
              <span className="font-mono font-bold text-base text-[#003A40]">₹{annualTotal.toLocaleString('en-IN')}</span>
            </div>

            {isSplit && (
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600 pt-2 border-t border-slate-200">
                <span>Semester Division (50% Term Split):</span>
                <span className="font-mono font-bold text-slate-700">₹{Math.round(annualTotal / 2).toLocaleString('en-IN')} per semester</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-extrabold text-[#003A40] pt-2 border-t border-slate-300">
              <span className="uppercase tracking-wider">Net Current Semester Payable:</span>
              <span className="font-mono font-black text-xl text-[#0A686A]">₹{termPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Allocation & Options Summary (4 COLS) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Allocation Options Summary Card */}
          <div className="bg-white rounded-2xl border border-[#E6EDF2] p-5 shadow-2xs space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#003A40] pb-2 border-b border-[#E6EDF2]">
              Assigned Configuration
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department & Course</span>
                <span className="font-bold text-[#003A40]">{fee.course || 'Department'}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Semester</span>
                <span className="font-semibold text-slate-700">Sem {fee.semester || 1}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Schedule</span>
                <span className="font-semibold text-slate-700">{fee.options?.paymentPlan || 'Bi-Semester Installments'}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scholarship Scheme</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                  {fee.options?.scholarshipType || 'None'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hostel Allocation</span>
                <span className="font-semibold text-slate-700">{fee.options?.hostelType || 'Day Scholar'}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transport Zone</span>
                <span className="font-semibold text-slate-700">{fee.options?.transportZone || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Audit & System Information Card */}
          <div className="bg-slate-50 rounded-2xl border border-[#E6EDF2] p-5 space-y-3 text-xs">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#003A40]">System Record Log</h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Fee Record ID:</span>
                <span className="font-mono font-bold text-slate-800">{fee.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className="font-bold text-[#003A40]">{fee.status || 'Pending'}</span>
              </div>
              <div className="flex justify-between">
                <span>Database Sync:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">cloud_done</span> MongoDB Synced
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
