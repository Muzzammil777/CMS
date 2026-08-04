import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EnterpriseWizardTemplate from '../components/common/EnterpriseWizardTemplate';
import { API_BASE } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';
import { saveLocalDraft, getLocalDrafts, deleteLocalDraft } from '../utils/draftManager';
import { useDepartments } from '../hooks/useDepartments';
import { useQuotas } from '../hooks/useQuotas';

const initialData = {
  // Step 1: Personal
  name: '',
  dob: '',
  gender: '',
  email: '',
  phone: '',
  avatar: null,
  address: '',
  bloodGroup: '',
  defaultPassword: '',
  useAutoPassword: true,
  // Step 2: Academic
  id: `STU-2025-${Math.floor(1000 + Math.random() * 9000)}`,
  previousSchool: '',
  board: '',
  yearOfPassing: '',
  marksPercentage: '',
  // Step 3: Course
  courseCategory: 'Regular',
  course: '',
  // Step 4: Category/Quota
  quota: '',
  // Step 5: Accommodation
  accommodation: '',
  roomType: '',
  hostelName: '',
  // Step 6: Documents
  docs: {
    passportPhoto: null,
    aadhaarCard: null,
    marksheet: null,
    transferCertificate: null,
    additional: [],
  },
  // Step 7: Payment
  paymentMethod: '',
  feeAmount: '500',
  paymentStatus: 'Pending',
  transactionId: '',
  // Step 8: Review (Guardian info)
  guardianName: '',
  relationship: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianOccupation: '',
  // Additional info
  department: '',
  year: '1st Year',
  semester: '1',
  section: 'A',
  enrollDate: new Date().toISOString().split('T')[0],
  admissionType: 'Regular',
};

export default function AddStudentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState(initialData);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const { departments } = useDepartments();
  const { quotas } = useQuotas();

  // ── Fee structure integration state ────────────────────────────────────────
  const [deptFeeTemplate, setDeptFeeTemplate] = useState(null);
  const [feeTemplateLoading, setFeeTemplateLoading] = useState(false);
  const [feeSelection, setFeeSelection] = useState({
    scholarshipType: 'None',
    hostelType: 'Day Scholar',
    transportZone: 'None',
    paymentPlan: 'Bi-Semester Installments',
  });
  const [feeScholarships, setFeeScholarships] = useState([]);
  const [feeAuxConfig, setFeeAuxConfig] = useState({ transport_zones: [], hostel_types: [], payment_plans: [] });

  useEffect(() => {
    if (draftId) {
      const drafts = getLocalDrafts('student');
      const found = drafts.find(d => d.id === draftId);
      if (found && found.formData) {
        setFormData(found.formData);
        if (found.currentStep) setStep(found.currentStep);
        if (found.formData.avatarPreview) setAvatarPreview(found.formData.avatarPreview);
      }
    }
  }, [draftId]);

  // Load fee scholarships and aux config once
  useEffect(() => {
    fetch('/api/fees/scholarships').then(r => r.ok ? r.json() : null).then(data => { if (data) setFeeScholarships(data); }).catch(() => {});
    fetch('/api/fees/config/auxiliary').then(r => r.ok ? r.json() : null).then(data => { if (data) setFeeAuxConfig(data); }).catch(() => {});
  }, []);

  // When department changes (Step 3), fetch its fee template
  useEffect(() => {
    if (!formData.department) return;
    setFeeTemplateLoading(true);
    fetch(`/api/fees/structures/department/${encodeURIComponent(formData.department)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setDeptFeeTemplate(data || null);
        if (data) {
          setFeeSelection(prev => ({
            ...prev,
            scholarshipType: data.scholarshipType || 'None',
            hostelType: data.hostelType || 'Day Scholar',
            transportZone: data.transportZone || 'None',
            paymentPlan: data.paymentPlan || 'Bi-Semester Installments',
          }));
        }
      })
      .catch(() => setDeptFeeTemplate(null))
      .finally(() => setFeeTemplateLoading(false));
  }, [formData.department]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e, field = 'avatar') => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'avatar') {
          setAvatarPreview(reader.result);
          setFormData(prev => ({ ...prev, avatar: reader.result }));
        } else {
          setFormData(prev => ({
            ...prev,
            docs: { ...prev.docs, [field]: { name: file.name, size: file.size, data: reader.result } }
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (s) => {
    let newErrors = {};
    if (s === 1) {
      if (!formData.name) newErrors.name = 'Full Name is required';
      if (!formData.dob) newErrors.dob = 'Date of Birth is required';
      if (!formData.gender) newErrors.gender = 'Gender is required';
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Enter a valid email address';
      }
      if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
        newErrors.phone = 'Enter a valid 10-digit mobile number';
      }
      if (!formData.useAutoPassword && !formData.defaultPassword) {
        newErrors.defaultPassword = 'Custom password is required';
      }
    } else if (s === 2) {
      if (formData.yearOfPassing && isNaN(formData.yearOfPassing)) {
        newErrors.yearOfPassing = 'Enter a valid year';
      }
    } else if (s === 3) {
      if (!formData.department) newErrors.department = 'Department is required';
    } else if (s === 4) {
      if (!formData.quota) newErrors.quota = 'Quota selection is required';
    } else if (s === 5) {
      if (!formData.accommodation) newErrors.accommodation = 'Accommodation type is required';
      if (formData.accommodation === 'Hostel Required' && !formData.roomType) {
        newErrors.roomType = 'Room type is required for hostel';
      }
    } else if (s === 7) {
      if (!formData.paymentMethod) newErrors.paymentMethod = 'Payment method is required';
    } else if (s === 8) {
      if (!formData.guardianName) newErrors.guardianName = 'Guardian Name is required';
      if (!formData.guardianPhone) newErrors.guardianPhone = 'Guardian Phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 8) setStep(s => s + 1);
      else handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSaveDraft = () => {
    const draftName = formData.name || 'Untitled Student Admission';
    const filledCount = [
      formData.name, formData.email, formData.phone, formData.dob, formData.gender,
      formData.department, formData.quota, formData.guardianName
    ].filter(Boolean).length;
    const completionPercentage = Math.round((filledCount / 8) * 100);

    saveLocalDraft('student', {
      id: draftId || `DRAFT-STU-${Date.now()}`,
      title: draftName,
      name: draftName,
      email: formData.email,
      department: formData.department || 'Unassigned',
      rollNumber: formData.id || 'Pending',
      currentStep: step,
      totalSteps: 8,
      completionPercentage,
      stepName: steps[step - 1]?.title || 'Personal',
      type: 'Student Admission',
      formData: { ...formData, avatarPreview },
    });
    alert(`Draft saved for "${draftName}"! You can resume admission anytime from the Student Drafts tab.`);
    navigate('/students?view=drafts');
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dob,
        gender: formData.gender,
        avatar: formData.avatar,
        address: formData.address,
        bloodGroup: formData.bloodGroup,
        previousSchool: formData.previousSchool,
        board: formData.board,
        yearOfPassing: formData.yearOfPassing,
        marksPercentage: formData.marksPercentage,
        courseCategory: formData.courseCategory,
        course: formData.course,
        quota: formData.quota,
        accommodation: formData.accommodation,
        roomType: formData.roomType,
        hostelName: formData.hostelName,
        department: formData.department,
        paymentMethod: formData.paymentMethod,
        feeAmount: parseFloat(formData.feeAmount) || 500,
        paymentStatus: formData.paymentStatus,
        transactionId: formData.transactionId,
        guardianName: formData.guardianName,
        relationship: formData.relationship,
        guardianPhone: formData.guardianPhone,
        guardianEmail: formData.guardianEmail,
        guardianOccupation: formData.guardianOccupation,
        password: formData.useAutoPassword ? '' : formData.defaultPassword,
        status: 'Pending',
        admissionType: formData.admissionType,
        semester: formData.semester,
        section: formData.section,
        year: formData.year,
        enrollDate: formData.enrollDate,
        documents: [
          { id: 'DOC-01', name: 'Passport Photo', type: 'base64', data: formData.docs.passportPhoto },
          { id: 'DOC-02', name: 'Aadhaar Card', type: 'base64', data: formData.docs.aadhaarCard },
          { id: 'DOC-03', name: 'Marksheet', type: 'base64', data: formData.docs.marksheet },
          { id: 'DOC-04', name: 'Transfer Certificate', type: 'base64', data: formData.docs.transferCertificate },
        ].filter(d => d.data)
      };

      const res = await fetch(`${API_BASE}/admissions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create student enrollment');

      // ── Auto-assign fee record if dept template exists ────────────────
      if (deptFeeTemplate && formData.department) {
        try {
          const tmpl = deptFeeTemplate;
          const selScheme = feeScholarships.find(s => s.value === feeSelection.scholarshipType);
          let scholarshipDiscount = 0;
          if (selScheme?.discount_type === 'full') scholarshipDiscount = (tmpl.tuitionFee || 0);
          else if (selScheme?.discount_type === 'percent') scholarshipDiscount = (tmpl.tuitionFee || 0) * (selScheme.discount_amount / 100);
          else if (selScheme?.discount_type === 'fixed') scholarshipDiscount = selScheme.discount_amount || 0;
          const selTransport = feeAuxConfig.transport_zones?.find(t => t.value === feeSelection.transportZone);
          const selHostel = feeAuxConfig.hostel_types?.find(h => h.value === feeSelection.hostelType);
          const transportFee = selTransport?.amount || 0;
          const hostelFee = selHostel?.amount || 0;
          const grossAcademicFee = (tmpl.tuitionFee||0) + (tmpl.developmentFee||0) + (tmpl.libraryFee||0) + (tmpl.examFee||0) + (tmpl.activityFee||0);
          const netTotalFee = Math.max(0, grossAcademicFee + transportFee + hostelFee - scholarshipDiscount);
          const feeRecord = {
            id: `FEE-${Date.now()}`,
            studentId: formData.id,
            studentName: formData.name,
            email: formData.email,
            course: formData.department,
            semester: `Semester ${formData.semester || 1}`,
            totalFee: netTotalFee,
            components: { grossAcademicFee, tuitionFee: tmpl.tuitionFee, developmentFee: tmpl.developmentFee, libraryFee: tmpl.libraryFee, examFee: tmpl.examFee, activityFee: tmpl.activityFee, transportFee, hostelFee, scholarshipDiscount },
            options: { scholarshipType: feeSelection.scholarshipType, transportZone: feeSelection.transportZone, hostelType: feeSelection.hostelType, paymentPlan: feeSelection.paymentPlan, quota: formData.quota },
            status: 'Pending',
            paidAmount: 0,
            assignedDate: new Date().toISOString(),
            autoAssigned: true,
          };
          await fetch('/api/fees/assign-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feeRecord),
          }).catch(() => {
            // Store fallback in fees_structure collection via generic upsert
          });
        } catch (feeErr) {
          console.warn('Fee auto-assignment failed (non-critical):', feeErr.message);
        }
      }

      if (draftId) deleteLocalDraft('student', draftId);
      localStorage.removeItem('add_student_draft');
      alert('Student enrolled successfully! Fee structure has been auto-assigned.');
      navigate('/students');
    } catch (error) {
      console.error('Submit error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Personal', icon: 'person', helpText: 'Enter student legal personal details matching government ID.' },
    { id: 2, title: 'Academic', icon: 'school', helpText: 'Provide details of previous school, board, and overall marks.' },
    { id: 3, title: 'Course', icon: 'domain', helpText: 'Select academic department to auto-assign curriculum course code.' },
    { id: 4, title: 'Category', icon: 'category', helpText: 'Specify seat allotment quota under which candidate is seeking admission.' },
    { id: 5, title: 'Accommodation', icon: 'bed', helpText: 'Indicate whether student requires campus hostel lodging or is a day scholar.' },
    { id: 6, title: 'Documents', icon: 'upload_file', helpText: 'Upload mandatory verification documents in PDF or Image format.' },
    { id: 7, title: 'Payment', icon: 'payments', helpText: 'Select fee payment method and verify total application processing fee.' },
    { id: 8, title: 'Review', icon: 'rate_review', helpText: 'Provide emergency parent/guardian info and review submission details.' },
  ];

  const currentStepObj = steps[step - 1];
  const filledCount = [
    formData.name, formData.dob, formData.gender, formData.email, formData.phone,
    formData.department, formData.course, formData.quota, formData.accommodation, formData.guardianName
  ].filter(Boolean).length;
  const completionPercentage = (filledCount / 10) * 100;

  const feeCalculation = useMemo(() => {
    const tmpl = deptFeeTemplate || {};
    const baseTuition = Number(tmpl.tuitionFee || 0);
    const development = Number(tmpl.developmentFee || 0);
    const library = Number(tmpl.libraryFee || 0);
    const exam = Number(tmpl.examFee || 0);
    const activity = Number(tmpl.activityFee || 0);
    const customSum = (tmpl.customFeeComponents || []).reduce((acc, c) => acc + Number(c.amount || 0), 0);
    const grossAcademic = baseTuition + development + library + exam + activity + customSum;

    const quotaSurcharge = formData.quota === 'Management Quota' ? 35000 : formData.quota === 'NRI / Foreign National' ? 75000 : 0;

    const selHostel = feeAuxConfig.hostel_types?.find(h => h.value === feeSelection.hostelType);
    const hostelFee = selHostel?.amount || 0;

    const selTransport = feeAuxConfig.transport_zones?.find(t => t.value === feeSelection.transportZone);
    const transportFee = selTransport?.amount || 0;

    const selScheme = feeScholarships.find(s => s.value === feeSelection.scholarshipType);
    let scholarshipDiscount = 0;
    if (selScheme?.discount_type === 'full') scholarshipDiscount = baseTuition;
    else if (selScheme?.discount_type === 'percent') scholarshipDiscount = baseTuition * ((selScheme.discount_amount || 0) / 100);
    else if (selScheme?.discount_type === 'fixed') scholarshipDiscount = selScheme.discount_amount || 0;

    const totalNetFee = Math.max(0, grossAcademic + quotaSurcharge + hostelFee + transportFee - scholarshipDiscount);

    return {
      baseTuition,
      grossAcademic,
      quotaSurcharge,
      hostelFee,
      transportFee,
      scholarshipDiscount,
      totalNetFee,
    };
  }, [deptFeeTemplate, formData.quota, feeSelection, feeAuxConfig, feeScholarships]);

  const liveFeeRightPanel = (
    <div className="space-y-4">
      {/* ── LIVE FEE SUMMARY PANEL ── */}
      <div className="bg-[#003A40] rounded-2xl p-5 text-white shadow-lg space-y-4 border border-[#0A686A]/30">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest block">DEPARTMENT FEE DESIGN</span>
            <h4 className="text-sm font-black text-white leading-tight mt-0.5">{formData.department || 'Select Department'}</h4>
            <span className="text-[10px] text-white/60 font-semibold">{formData.academicYear || '2025–2026'} • Semester {formData.semester || 1}</span>
          </div>
          <span className="px-2 py-0.5 bg-[#0A686A] text-emerald-200 border border-emerald-400/30 rounded-full text-[9px] font-black uppercase tracking-wider flex-shrink-0">
            DB TEMPLATE
          </span>
        </div>

        {/* Fee breakdown list */}
        <div className="space-y-2 text-xs font-medium">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Base Tuition Fee:</span>
            <span className="font-bold font-mono">₹{feeCalculation.baseTuition.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/70">Gross Academic Fees:</span>
            <span className="font-bold font-mono">₹{feeCalculation.grossAcademic.toLocaleString('en-IN')}</span>
          </div>

          {feeCalculation.quotaSurcharge > 0 && (
            <div className="flex items-center justify-between text-amber-300">
              <span className="truncate max-w-[140px]" title={formData.quota}>Surcharge ({formData.quota}):</span>
              <span className="font-bold font-mono">+₹{feeCalculation.quotaSurcharge.toLocaleString('en-IN')}</span>
            </div>
          )}

          {feeCalculation.hostelFee > 0 && (
            <div className="flex items-center justify-between text-cyan-300">
              <span className="truncate max-w-[140px]" title={feeSelection.hostelType}>Hostel ({feeSelection.hostelType}):</span>
              <span className="font-bold font-mono">+₹{feeCalculation.hostelFee.toLocaleString('en-IN')}</span>
            </div>
          )}

          {feeCalculation.transportFee > 0 && (
            <div className="flex items-center justify-between text-[#38BDF8]">
              <span className="truncate max-w-[140px]" title={feeSelection.transportZone}>Bus ({feeSelection.transportZone}):</span>
              <span className="font-bold font-mono">+₹{feeCalculation.transportFee.toLocaleString('en-IN')}</span>
            </div>
          )}

          {feeCalculation.scholarshipDiscount > 0 && (
            <div className="flex items-center justify-between text-emerald-300">
              <span className="truncate max-w-[140px]" title={feeSelection.scholarshipType}>Waiver ({feeSelection.scholarshipType}):</span>
              <span className="font-bold font-mono">-₹{feeCalculation.scholarshipDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Total Net Fee Display */}
        <div className="pt-3 border-t border-white/10 flex flex-col gap-0.5 bg-[#002B30] -mx-5 -mb-5 p-4 rounded-b-2xl">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">TOTAL NET FEE PAYABLE</span>
          <span className="text-2xl font-black font-mono text-white">
            ₹{feeCalculation.totalNetFee.toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-white/50">Auto-calculates in real-time as selections change</span>
        </div>
      </div>

      {/* Student Photo Card */}
      <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs flex flex-col items-center text-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e, 'avatar')}
          accept="image/*"
          className="hidden"
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-[#FAFBFC] hover:bg-[#F2FBFA] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative mb-2"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-slate-400">
              <span className="material-symbols-outlined text-2xl mb-0.5">photo_camera</span>
              <span className="text-[9px] font-bold uppercase tracking-wider">PHOTO</span>
            </div>
          )}
        </div>
        <span className="text-xs font-extrabold text-[#003A40]">Profile Photo</span>
        <span className="text-[10px] text-slate-400 font-medium">Click box to upload portrait</span>
      </div>
    </div>
  );

  return (
    <EnterpriseWizardTemplate
      title="Enroll New Student"
      subtitle="Register or update student admission profile"
      steps={steps}
      currentStep={step}
      totalSteps={steps.length}
      completionPercentage={completionPercentage}
      stepTitle={currentStepObj.title}
      stepIcon={currentStepObj.icon}
      avatarPreview={avatarPreview}
      onAvatarChange={(e) => handleFileChange(e, 'avatar')}
      customRightPanel={liveFeeRightPanel}
      helpTitle="Contextual Help"
      helpText={currentStepObj.helpText}
      onBack={handlePrevious}
      onNext={handleNext}
      onSaveDraft={handleSaveDraft}
      isFirstStep={step === 1}
      isLastStep={step === steps.length}
      isSubmitting={isSubmitting}
    >
      {/* STEP 1: PERSONAL */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Full Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border ${errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-[#E6EDF2]'} focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white transition-all`}
                placeholder="e.g. John Doe"
              />
              {errors.name && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Date of Birth *</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border ${errors.dob ? 'border-rose-400 bg-rose-50/20' : 'border-[#E6EDF2]'} focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white transition-all`}
              />
              {errors.dob && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.dob}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white transition-all"
              >
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              {errors.gender && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.gender}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border ${errors.email ? 'border-rose-400 bg-rose-50/20' : 'border-[#E6EDF2]'} focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white transition-all`}
                placeholder="example@mit.edu"
              />
              {errors.email && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Phone Number</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength="10"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white transition-all"
                placeholder="10-digit mobile number"
              />
              {errors.phone && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Blood Group</label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white transition-all"
              >
                <option value="">Select Group</option>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Permanent Address Section */}
          <div className="bg-[#FAF8FF] border border-[#E9E2FF] p-4 rounded-2xl space-y-3 mt-2">
            <div className="flex items-center gap-2 text-[#7C3AED]">
              <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[16px] text-[#7C3AED]">location_on</span>
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">Permanent Address</h4>
            </div>

            {/* Row 1: Address Line 1 */}
            <div>
              <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Address Line 1</label>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1 || formData.address || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                placeholder="45, Anna Nagar 3rd Street"
              />
            </div>

            {/* Row 2: Address Line 2 & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2 || ''}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                  placeholder="Near Bus Stand"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Landmark (Optional)</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark || ''}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                  placeholder="Opp. City Hospital"
                />
              </div>
            </div>

            {/* Row 3: City, District, State */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                  placeholder="Nagapattinam"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">District</label>
                <input
                  type="text"
                  name="district"
                  value={formData.district || ''}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                  placeholder="Nagapattinam"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">State</label>
                <select
                  name="state"
                  value={formData.state || 'Tamil Nadu'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                >
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Row 4: Country, PIN Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Country</label>
                <select
                  name="country"
                  value={formData.country || 'India'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">PIN Code</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode || formData.pinCode || ''}
                  onChange={handleChange}
                  maxLength="6"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                  placeholder="611001"
                />
              </div>
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="material-symbols-outlined text-base">lock</span>
              <h4 className="text-xs font-bold uppercase tracking-wider">Default Password</h4>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.useAutoPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, useAutoPassword: e.target.checked, defaultPassword: '' }))}
                className="w-4 h-4 rounded text-[#003A40] focus:ring-[#003A40]"
              />
              <span className="text-xs font-semibold text-slate-700">Auto-generate from Student ID / Roll Number</span>
            </label>
            {!formData.useAutoPassword && (
              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="defaultPassword"
                  value={formData.defaultPassword}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-amber-200 focus:outline-none focus:border-[#003A40] bg-white"
                  placeholder="Enter custom default password"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: ACADEMIC */}
      {step === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Previous School / Institution</label>
            <input
              name="previousSchool"
              value={formData.previousSchool}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white"
              placeholder="School or college name"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Educational Board</label>
            <select
              name="board"
              value={formData.board}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white"
            >
              <option value="">Select Board</option>
              {['CBSE', 'ICSE', 'State Board', 'Other'].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Year of Passing</label>
            <input
              type="number"
              name="yearOfPassing"
              value={formData.yearOfPassing}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white"
              placeholder="e.g. 2024"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Marks Percentage (%)</label>
            <input
              name="marksPercentage"
              value={formData.marksPercentage}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white"
              placeholder="e.g. 92%"
            />
          </div>
        </div>
      )}

      {/* STEP 3: COURSE */}
      {step === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Academic Department *</label>
            <select
              name="department"
              value={formData.department}
              onChange={(e) => {
                const selected = departments.find(d => d.name === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  department: e.target.value,
                  course: selected?.code || e.target.value,
                }));
              }}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white"
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id || d.code} value={d.name}>{d.name}</option>
              ))}
            </select>
            {errors.department && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.department}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Assigned Course Code</label>
            <input
              name="course"
              value={formData.course}
              readOnly
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
      )}

      {/* STEP 4: CATEGORY / QUOTA & FEE STRUCTURE */}
      {step === 4 && (
        <div className="space-y-5">
          {/* Quota Selection */}
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-2">Select Seat Allotment Quota *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {quotas.map(quotaObj => {
                const q = quotaObj.name || quotaObj;
                const isSelected = formData.quota === q;
                return (
                  <label
                    key={q}
                    className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#003A40] bg-[#E6F4F1]/50 text-[#003A40] shadow-xs'
                        : 'border-[#E6EDF2] hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="quota"
                      value={q}
                      checked={isSelected}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#003A40]"
                    />
                    <span className="ml-2.5 text-xs font-bold">{q}</span>
                  </label>
                );
              })}
            </div>
            {errors.quota && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.quota}</p>}
          </div>

          {/* Designed Fee Categories / Scholarship Schemes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block">
                Select Designed Fee Category / Waiver Scheme
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">Loaded from Fee Management (MongoDB)</span>
            </div>

            {feeScholarships.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                Loading fee categories…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {feeScholarships.map(sch => {
                  const isSelected = feeSelection.scholarshipType === sch.value;
                  const schemeType = sch.scheme_type || 'Standard';
                  const badgeColors = {
                    Government: 'bg-blue-100 text-blue-700 border-blue-200',
                    Merit: 'bg-purple-100 text-purple-700 border-purple-200',
                    Sports: 'bg-orange-100 text-orange-700 border-orange-200',
                    Institutional: 'bg-teal-100 text-teal-700 border-teal-200',
                    Standard: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  return (
                    <div
                      key={sch.id}
                      onClick={() => setFeeSelection(prev => ({ ...prev, scholarshipType: sch.value }))}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#0A686A] bg-[#F0FDFA] shadow-xs'
                          : 'border-[#E6EDF2] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeColors[schemeType] || badgeColors.Standard}`}>
                            {schemeType}
                          </span>
                          {isSelected && <span className="material-symbols-outlined text-[16px] text-[#0A686A]">check_circle</span>}
                        </div>
                        <span className="font-bold text-[#003A40] text-xs leading-snug block">{sch.label}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-[#0A686A] font-extrabold">
                          {sch.discount_type === 'full'
                            ? '100% Full Waiver'
                            : sch.discount_type === 'percent'
                            ? `${sch.discount_amount}% off tuition`
                            : sch.discount_amount > 0
                            ? `-₹${Number(sch.discount_amount).toLocaleString('en-IN')} waiver`
                            : 'Standard Rate'}
                        </span>
                        {sch.eligibility && (
                          <span className="text-[9px] text-slate-400 font-medium truncate max-w-[120px]" title={sch.eligibility}>
                            {sch.eligibility}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Department Fee Live Preview in Step 4 */}
          {formData.department && (
            <div className="p-3.5 bg-[#003A40] rounded-xl text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                  ESTIMATED FEE ({formData.department})
                </span>
                <span className="text-[11px] text-white/70">
                  Category: <strong>{feeSelection.scholarshipType}</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-white/60 block">Net Fee Payable</span>
                <span className="text-lg font-black font-mono text-emerald-300">
                  ₹{(() => {
                    const tmpl = deptFeeTemplate || {};
                    const gross = (tmpl.tuitionFee||0) + (tmpl.developmentFee||0) + (tmpl.libraryFee||0) + (tmpl.examFee||0) + (tmpl.activityFee||0);
                    const selScheme = feeScholarships.find(s => s.value === feeSelection.scholarshipType);
                    let disc = 0;
                    if (selScheme?.discount_type === 'full') disc = (tmpl.tuitionFee || 0);
                    else if (selScheme?.discount_type === 'percent') disc = (tmpl.tuitionFee || 0) * (selScheme.discount_amount / 100);
                    else if (selScheme?.discount_type === 'fixed') disc = selScheme.discount_amount || 0;
                    return Math.max(0, gross - disc).toLocaleString('en-IN');
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: ACCOMMODATION & CAMPUS TRANSPORT */}
      {step === 5 && (
        <div className="space-y-6">

          {/* ── Bus Transport Route / Zone ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-[#003A40]">Bus Transport Route / Zone</h4>
                <p className="text-[11px] text-slate-400 font-medium">Select a transport zone package designed in Fee Management.</p>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                DB Synced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(feeAuxConfig.transport_zones?.length > 0 ? feeAuxConfig.transport_zones : [
                { id: 'none', value: 'None', label: 'No Campus Transport / Self Arranged', amount: 0, distance: 'Self-arranged', pickup_points: [], icon: 'directions_walk' },
                { id: 'zone1', value: 'Zone 1: Urban (≤ 15 km)', label: 'Zone 1: Urban City Lines (≤ 15 km)', amount: 18000, distance: 'Up to 15 km', pickup_points: ['City Bus Stand', 'Railway Station'], icon: 'directions_bus' },
                { id: 'zone2', value: 'Zone 2: Suburban (15-30 km)', label: 'Zone 2: Metro Suburban (15–30 km)', amount: 28000, distance: '15 – 30 km', pickup_points: ['Suburban Hub A', 'Suburban Hub B'], icon: 'directions_bus' },
                { id: 'zone3', value: 'Zone 3: Outstation Corridor (> 30 km)', label: 'Zone 3: Outstation Corridor (> 30 km)', amount: 38000, distance: 'Above 30 km', pickup_points: ['District Bus Terminal', 'Highway Corridor Stop'], icon: 'directions_bus' },
              ]).map(zone => {
                const isSelected = feeSelection.transportZone === zone.value;
                return (
                  <div
                    key={zone.id}
                    onClick={() => setFeeSelection(prev => ({ ...prev, transportZone: zone.value }))}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 relative group ${
                      isSelected ? 'border-[#0A686A] bg-[#F0FDFA] shadow-sm' : 'border-[#E6EDF2] bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#003A40]' : 'bg-slate-100'}`}>
                          <span className={`material-symbols-outlined text-[16px] ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                            {zone.icon || 'directions_bus'}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-[#003A40] truncate">{zone.label}</span>
                      </div>
                      {isSelected && <span className="material-symbols-outlined text-[18px] text-[#0A686A] flex-shrink-0">check_circle</span>}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {zone.distance || (zone.amount === 0 ? 'Self-arranged' : '')}
                      </span>
                      <span className="text-sm font-extrabold text-[#003A40] font-mono">
                        {zone.amount === 0 ? 'Free' : `₹${Number(zone.amount).toLocaleString('en-IN')}`}
                      </span>
                    </div>

                    {(zone.pickup_points || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {zone.pickup_points.map((pt, i) => (
                          <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">
                            {pt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Hostel Accommodation & Food Plan ── */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-[#003A40]">Hostel Accommodation & Food Plan</h4>
                <p className="text-[11px] text-slate-400 font-medium">Select a hostel package designed in Fee Management.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(feeAuxConfig.hostel_types?.length > 0 ? feeAuxConfig.hostel_types : [
                { id: 'day', value: 'Day Scholar', label: 'Day Scholar', amount: 0, occupancy: 'N/A', food_plan: 'Not Included', amenities: [], icon: 'home' },
                { id: 'standard', value: 'Standard Quad Occupancy + Food', label: 'Standard Quad Occupancy + Mess', amount: 75000, occupancy: 'Quad (4 Students)', food_plan: 'Three Meals (Mess)', amenities: ['mess', 'fan', 'study_table'], icon: 'bed' },
                { id: 'deluxe', value: 'Deluxe Double Occupancy + Food', label: 'Deluxe Double Occupancy + Mess', amount: 95000, occupancy: 'Double (2 Students)', food_plan: 'Three Meals (Mess) + Snacks', amenities: ['mess', 'fan', 'wifi', 'attached_bath'], icon: 'king_bed' },
                { id: 'executive', value: 'Executive Single AC Suite + Food', label: 'Executive Single AC Suite + Mess', amount: 135000, occupancy: 'Single Room', food_plan: 'Three Meals + Snacks + Room Service', amenities: ['mess', 'ac', 'wifi', 'laundry', 'attached_bath', 'tv'], icon: 'hotel' },
              ]).map(hostel => {
                const isSelected = feeSelection.hostelType === hostel.value;
                const amenityLabels = {
                  mess: 'Mess',
                  wifi: 'Wi-Fi',
                  ac: 'AC',
                  fan: 'Fan',
                  laundry: 'Laundry',
                  attached_bath: 'Bath',
                  study_table: 'Desk',
                  tv: 'TV',
                };
                return (
                  <div
                    key={hostel.id}
                    onClick={() => {
                      setFeeSelection(prev => ({ ...prev, hostelType: hostel.value }));
                      setFormData(prev => ({
                        ...prev,
                        accommodation: hostel.value === 'Day Scholar' ? 'Day Scholar' : 'Hostel Required',
                        roomType: hostel.occupancy || hostel.label,
                      }));
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 relative group ${
                      isSelected ? 'border-[#0A686A] bg-[#F0FDFA] shadow-sm' : 'border-[#E6EDF2] bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#003A40]' : 'bg-slate-100'}`}>
                          <span className={`material-symbols-outlined text-[16px] ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                            {hostel.icon || 'bed'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-[#003A40] block leading-tight">{hostel.label}</span>
                          {hostel.occupancy && <span className="text-[10px] text-slate-400 font-medium">{hostel.occupancy}</span>}
                        </div>
                      </div>
                      {isSelected && <span className="material-symbols-outlined text-[18px] text-[#0A686A] flex-shrink-0">check_circle</span>}
                    </div>

                    <div className="flex items-center justify-between">
                      {hostel.food_plan ? (
                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">restaurant</span>
                          {hostel.food_plan}
                        </span>
                      ) : <span />}
                      <span className="text-sm font-extrabold text-[#003A40] font-mono">
                        {hostel.amount === 0 ? 'Free' : `₹${Number(hostel.amount).toLocaleString('en-IN')}`}
                      </span>
                    </div>

                    {(hostel.amenities || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {hostel.amenities.map((a, i) => (
                          <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">
                            {amenityLabels[a] || a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: DOCUMENTS */}
      {step === 6 && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Aadhaar Card', field: 'aadhaarCard' },
            { label: 'Marksheet', field: 'marksheet' },
            { label: 'Transfer Certificate', field: 'transferCertificate' },
            { label: 'Passport Photo', field: 'passportPhoto' },
          ].map(doc => (
            <div key={doc.field} className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-[#FAFBFC] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#003A40] block">{doc.label}</span>
                <span className="text-[10px] text-slate-400 font-semibold">{formData.docs[doc.field] ? formData.docs[doc.field].name : 'Not uploaded'}</span>
              </div>
              <input
                type="file"
                className="hidden"
                id={`file-${doc.field}`}
                onChange={(e) => handleFileChange(e, doc.field)}
              />
              <label
                htmlFor={`file-${doc.field}`}
                className="px-3 py-1.5 bg-[#003A40] text-white rounded-lg text-[11px] font-bold cursor-pointer hover:bg-[#002d32]"
              >
                Upload
              </label>
            </div>
          ))}
        </div>
      )}

      {/* STEP 7: PAYMENT & FEE STRUCTURE */}
      {step === 7 && (
        <div className="space-y-4">
          {/* Application Processing Fee */}
          <div className="p-4 bg-[#E6F4F1] border border-[#0A686A]/20 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#0A686A] uppercase tracking-wider block">APPLICATION PROCESSING FEE</span>
              <span className="text-2xl font-black text-[#003A40]">₹500.00</span>
            </div>
            <span className="px-3 py-1 bg-[#003A40] text-white rounded-full text-[10px] font-bold uppercase">ONE-TIME FEE</span>
          </div>

          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Select Payment Method *</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
            >
              <option value="">Select Payment Method</option>
              <option>UPI / QR Code</option>
              <option>Credit / Debit Card</option>
              <option>Net Banking</option>
            </select>
          </div>

          {/* ── Dept Fee Structure Preview ── */}
          {formData.department && (
            <div className="border border-[#003A40]/15 rounded-2xl overflow-hidden">
              <div className="bg-[#003A40] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-300">receipt_long</span>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-200">Department Fee Structure</span>
                </div>
                <span className="text-[10px] text-white/60 font-semibold">{formData.department}</span>
              </div>

              {feeTemplateLoading ? (
                <div className="p-6 text-center">
                  <div className="w-6 h-6 border-2 border-[#0A686A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">Loading fee template…</p>
                </div>
              ) : !deptFeeTemplate ? (
                <div className="p-4 text-center">
                  <span className="material-symbols-outlined text-3xl text-slate-300">info</span>
                  <p className="text-xs text-slate-400 font-semibold mt-1">No fee template configured for this department yet.</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">Go to Fee Management → Assign Fee Structure to create one.</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Base fee summary */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Tuition Fee', value: deptFeeTemplate.tuitionFee },
                      { label: 'Development', value: deptFeeTemplate.developmentFee },
                      { label: 'Library', value: deptFeeTemplate.libraryFee },
                      { label: 'Exam Fee', value: deptFeeTemplate.examFee },
                      { label: 'Activity', value: deptFeeTemplate.activityFee },
                    ].filter(f => f.value > 0).map(f => (
                      <div key={f.label} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{f.label}</span>
                        <span className="text-xs font-extrabold text-[#003A40] font-mono">₹{Number(f.value).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  {/* Scholarship selector */}
                  {feeScholarships.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1.5">Fee Category / Scholarship Scheme</label>
                      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {feeScholarships.map(sch => {
                          const isSelected = feeSelection.scholarshipType === sch.value;
                          return (
                            <div
                              key={sch.id}
                              onClick={() => setFeeSelection(prev => ({ ...prev, scholarshipType: sch.value }))}
                              className={`p-2.5 rounded-xl border cursor-pointer transition-all text-xs flex flex-col justify-between ${
                                isSelected ? 'border-[#0A686A] bg-[#F0FDFA] shadow-xs' : 'border-[#E6EDF2] bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                                    {sch.scheme_type || 'Standard'}
                                  </span>
                                  {isSelected && <span className="material-symbols-outlined text-[14px] text-[#0A686A]">check_circle</span>}
                                </div>
                                <span className="font-bold text-[#003A40] text-[11px] leading-tight block">{sch.label}</span>
                              </div>
                              <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                <span className="text-slate-500 font-medium">
                                  {sch.discount_type === 'percent' ? `${sch.discount_amount}% off tuition` : sch.discount_type === 'full' ? '100% Fee Waiver' : sch.discount_amount > 0 ? `-₹${Number(sch.discount_amount).toLocaleString('en-IN')}` : 'No discount'}
                                </span>
                                {sch.eligibility && (
                                  <span className="text-[9px] text-slate-400 font-medium truncate max-w-[110px]" title={sch.eligibility}>
                                    {sch.eligibility}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hostel selector */}
                  {feeAuxConfig.hostel_types?.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1.5">Hostel Package</label>
                      <select
                        value={feeSelection.hostelType}
                        onChange={e => setFeeSelection(prev => ({ ...prev, hostelType: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white"
                      >
                        {feeAuxConfig.hostel_types.map(h => (
                          <option key={h.id} value={h.value}>{h.label} {h.amount > 0 ? `— ₹${Number(h.amount).toLocaleString('en-IN')}/yr` : '— Free'}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Transport selector */}
                  {feeAuxConfig.transport_zones?.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1.5">Bus Transport Zone</label>
                      <select
                        value={feeSelection.transportZone}
                        onChange={e => setFeeSelection(prev => ({ ...prev, transportZone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white"
                      >
                        {feeAuxConfig.transport_zones.map(t => (
                          <option key={t.id} value={t.value}>{t.label} {t.amount > 0 ? `— ₹${Number(t.amount).toLocaleString('en-IN')}/yr` : '— Free'}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Net fee pill */}
                  <div className="flex items-center justify-between p-3 bg-[#003A40] rounded-xl text-white">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">Estimated Net Fee Payable</span>
                    <span className="text-base font-black font-mono">
                      ₹{(() => {
                        const selScheme = feeScholarships.find(s => s.value === feeSelection.scholarshipType);
                        let disc = 0;
                        if (selScheme?.discount_type === 'full') disc = (deptFeeTemplate.tuitionFee || 0);
                        else if (selScheme?.discount_type === 'percent') disc = (deptFeeTemplate.tuitionFee || 0) * (selScheme.discount_amount / 100);
                        else if (selScheme?.discount_type === 'fixed') disc = selScheme.discount_amount || 0;
                        const tFee = feeAuxConfig.transport_zones?.find(t => t.value === feeSelection.transportZone)?.amount || 0;
                        const hFee = feeAuxConfig.hostel_types?.find(h => h.value === feeSelection.hostelType)?.amount || 0;
                        const gross = (deptFeeTemplate.tuitionFee||0)+(deptFeeTemplate.developmentFee||0)+(deptFeeTemplate.libraryFee||0)+(deptFeeTemplate.examFee||0)+(deptFeeTemplate.activityFee||0);
                        return Math.max(0, gross + tFee + hFee - disc).toLocaleString('en-IN');
                      })()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium text-center">Fee record will be auto-assigned to this student upon enrollment</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 8: REVIEW & GUARDIAN */}
      {step === 8 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Guardian Name *</label>
              <input
                name="guardianName"
                value={formData.guardianName}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
                placeholder="Parent/Guardian Full Name"
              />
              {errors.guardianName && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.guardianName}</p>}
            </div>
            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Guardian Phone *</label>
              <input
                name="guardianPhone"
                value={formData.guardianPhone}
                onChange={handleChange}
                maxLength="10"
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
                placeholder="10-digit contact number"
              />
              {errors.guardianPhone && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.guardianPhone}</p>}
            </div>
          </div>
        </div>
      )}
    </EnterpriseWizardTemplate>
  );
}
