import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EnterpriseWizardTemplate from '../components/common/EnterpriseWizardTemplate';
import { API_BASE } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';

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
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState(initialData);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
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
    localStorage.setItem('add_student_draft', JSON.stringify(formData));
    alert('Progress saved to draft!');
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
      alert('Student enrolled successfully!');
      localStorage.removeItem('add_student_draft');
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

          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Permanent Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="2"
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white transition-all resize-none"
              placeholder="Enter complete residential address..."
            />
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

      {/* STEP 4: CATEGORY / QUOTA */}
      {step === 4 && (
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-2">Select Seat Allotment Quota *</label>
          {['Government Quota', 'Management Quota', 'NRI Quota'].map(q => (
            <label
              key={q}
              className={`flex items-center p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                formData.quota === q
                  ? 'border-[#003A40] bg-[#E6F4F1]/50 text-[#003A40]'
                  : 'border-[#E6EDF2] hover:border-slate-300 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="quota"
                value={q}
                checked={formData.quota === q}
                onChange={handleChange}
                className="w-4 h-4 text-[#003A40]"
              />
              <span className="ml-3 text-xs font-bold">{q}</span>
            </label>
          ))}
          {errors.quota && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.quota}</p>}
        </div>
      )}

      {/* STEP 5: ACCOMMODATION */}
      {step === 5 && (
        <div className="space-y-4">
          <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-2">Lodging Preference *</label>
          <div className="grid grid-cols-2 gap-3">
            {['Day Scholar', 'Hostel Required'].map(acc => (
              <label
                key={acc}
                className={`flex items-center p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.accommodation === acc
                    ? 'border-[#003A40] bg-[#E6F4F1]/50 text-[#003A40]'
                    : 'border-[#E6EDF2] hover:border-slate-300 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="accommodation"
                  value={acc}
                  checked={formData.accommodation === acc}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#003A40]"
                />
                <span className="ml-3 text-xs font-bold">{acc}</span>
              </label>
            ))}
          </div>

          {formData.accommodation === 'Hostel Required' && (
            <div className="pt-3 border-t border-[#E6EDF2] grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Hostel Room Type *</label>
                <select
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
                >
                  <option value="">Select Room Type</option>
                  <option>Single Occupancy</option>
                  <option>Double Occupancy</option>
                  <option>Triple Sharing</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Hostel Preference</label>
                <input
                  name="hostelName"
                  value={formData.hostelName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
                  placeholder="e.g. Block A"
                />
              </div>
            </div>
          )}
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

      {/* STEP 7: PAYMENT */}
      {step === 7 && (
        <div className="space-y-4">
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
