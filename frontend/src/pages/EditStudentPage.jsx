import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EnterpriseWizardTemplate from '../components/common/EnterpriseWizardTemplate';
import { API_BASE, buildApiUrl } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';

export default function EditStudentPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
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
    id: id || '',
    previousSchool: '',
    board: '',
    yearOfPassing: '',
    marksPercentage: '',
    // Step 3: Course
    courseCategory: 'Regular',
    course: '',
    department: '',
    year: '1st Year',
    semester: '1',
    section: 'A',
    enrollDate: new Date().toISOString().split('T')[0],
    admissionType: 'Regular',
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
    paymentStatus: 'Paid',
    transactionId: '',
    // Step 8: Guardian info
    guardianName: '',
    relationship: 'Father',
    guardianPhone: '',
    guardianEmail: '',
    guardianOccupation: '',
  });

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
    if (id) {
      fetchStudent();
    }
  }, [id]);

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toISOString().split('T')[0];
    } catch (e) {
      return dateStr;
    }
  };

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const res = await fetch(buildApiUrl(`/students/${encodeURIComponent(id)}`));
      if (!res.ok) throw new Error('Student record not found');
      const data = await res.json();

      setAvatarPreview(data.avatar || null);

      setFormData({
        name: data.name || data.fullName || '',
        dob: formatDateForInput(data.dob || data.dateOfBirth),
        gender: data.gender || '',
        email: data.email || '',
        phone: data.phone || '',
        avatar: data.avatar || null,
        address: data.address || '',
        bloodGroup: data.bloodGroup || data.blood_group || '',
        defaultPassword: '',
        useAutoPassword: true,

        id: data.id || data.rollNumber || id,
        previousSchool: data.previousSchool || data.previousInstitution || '',
        board: data.board || 'CBSE',
        yearOfPassing: data.yearOfPassing?.toString() || '',
        marksPercentage: data.marksPercentage?.toString() || '',

        courseCategory: data.courseCategory || 'Regular',
        course: data.course || '',
        department: data.department || data.department_id || '',
        year: data.year ? `${data.year}${data.year == 1 ? 'st' : data.year == 2 ? 'nd' : data.year == 3 ? 'rd' : 'th'} Year` : '1st Year',
        semester: data.semester?.toString() || '1',
        section: data.section || 'A',
        enrollDate: formatDateForInput(data.enrollDate) || new Date().toISOString().split('T')[0],
        admissionType: data.admissionType || 'Regular',

        quota: data.quota || 'Government Quota',
        accommodation: data.accommodation || 'Day Scholar',
        roomType: data.roomType || '',
        hostelName: data.hostelName || '',

        docs: {
          passportPhoto: Array.isArray(data.documents)
            ? data.documents.find(d => d && d.name === 'Passport Photo')?.data || null
            : (data.documents?.passportPhoto || null),
          aadhaarCard: Array.isArray(data.documents)
            ? data.documents.find(d => d && d.name === 'Aadhaar Card')?.data || null
            : (data.documents?.aadhaarCard || null),
          marksheet: Array.isArray(data.documents)
            ? data.documents.find(d => d && d.name === 'Marksheet')?.data || null
            : (data.documents?.marksheet || null),
          transferCertificate: Array.isArray(data.documents)
            ? data.documents.find(d => d && d.name === 'Transfer Certificate')?.data || null
            : (data.documents?.transferCertificate || null),
          additional: [],
        },

        paymentMethod: data.paymentMethod || data.payment?.payment_method || 'Online Banking',
        feeAmount: data.feeAmount?.toString() || data.payment?.application_fee?.toString() || '500',
        paymentStatus: data.paymentStatus || data.payment?.status || 'Paid',
        transactionId: data.transactionId || data.payment?.transaction_id || '',

        guardianName: data.guardianName || data.guardian || '',
        relationship: data.relationship || 'Father',
        guardianPhone: data.guardianPhone || '',
        guardianEmail: data.guardianEmail || '',
        guardianOccupation: data.guardianOccupation || '',
      });
      setErrors({});
    } catch (err) {
      console.error('Error fetching student:', err);
      alert(`Failed to load student: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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
    } else if (s === 3) {
      if (!formData.department) newErrors.department = 'Department is required';
    } else if (s === 8) {
      if (!formData.guardianName) newErrors.guardianName = 'Guardian Name is required';
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

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dob,
        dob: formData.dob,
        gender: formData.gender,
        avatar: formData.avatar,
        address: formData.address,
        bloodGroup: formData.bloodGroup,
        previousSchool: formData.previousSchool,
        board: formData.board,
        yearOfPassing: parseInt(formData.yearOfPassing) || 0,
        marksPercentage: parseFloat(formData.marksPercentage) || 0,
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
        admissionType: formData.admissionType,
        semester: parseInt(formData.semester) || 1,
        section: formData.section,
        year: parseInt(formData.year) || 1,
        enrollDate: formData.enrollDate,
      };

      const res = await fetch(buildApiUrl(`/students/${encodeURIComponent(id)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update student profile');
      alert('Student profile updated successfully!');
      navigate(`/students/${encodeURIComponent(id)}`);
    } catch (error) {
      console.error('Update error:', error);
      alert(`Error updating student: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Personal', icon: 'person', helpText: 'Update student legal personal details and identity info.' },
    { id: 2, title: 'Academic', icon: 'school', helpText: 'Update previous educational background and performance.' },
    { id: 3, title: 'Course', icon: 'domain', helpText: 'Select academic department, batch, and current semester.' },
    { id: 4, title: 'Category', icon: 'category', helpText: 'Seat allotment quota under which candidate was admitted.' },
    { id: 5, title: 'Accommodation', icon: 'bed', helpText: 'Campus lodging or day-scholar options.' },
    { id: 6, title: 'Documents', icon: 'upload_file', helpText: 'Upload or replace verification documents.' },
    { id: 7, title: 'Payment', icon: 'payments', helpText: 'Fee payment history and transaction records.' },
    { id: 8, title: 'Review', icon: 'rate_review', helpText: 'Review all updated details before saving.' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7C3AED] rounded-full animate-spin"></div>
          <p className="text-slate-600 font-semibold text-sm">Loading Student Details...</p>
        </div>
      </div>
    );
  }

  const currentStepObj = steps[step - 1];
  const filledCount = [
    formData.name, formData.dob, formData.gender, formData.email, formData.phone,
    formData.department, formData.course, formData.quota, formData.accommodation, formData.guardianName
  ].filter(Boolean).length;
  const completionPercentage = (filledCount / 10) * 100;

  return (
    <EnterpriseWizardTemplate
      title="Edit Student Profile"
      subtitle={`Update enrollment details for ${formData.name || 'Student'}`}
      steps={steps}
      currentStep={step}
      totalSteps={steps.length}
      completionPercentage={completionPercentage}
      stepTitle={currentStepObj.title}
      stepIcon={currentStepObj.icon}
      avatarPreview={avatarPreview}
      onAvatarChange={(e) => handleFileChange(e, 'avatar')}
      helpTitle="Editing Help"
      helpText={currentStepObj.helpText}
      onBack={handlePrevious}
      onNext={handleNext}
      onSaveDraft={handleSubmit}
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
                className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border ${errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-[#E6EDF2]'} focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white transition-all`}
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
                className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border ${errors.dob ? 'border-rose-400 bg-rose-50/20' : 'border-[#E6EDF2]'} focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white transition-all`}
              />
              {errors.dob && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.dob}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white transition-all"
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
                className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border ${errors.email ? 'border-rose-400 bg-rose-50/20' : 'border-[#E6EDF2]'} focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white transition-all`}
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
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white transition-all"
                placeholder="10-digit mobile number"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Blood Group</label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white transition-all"
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
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
              placeholder="School or college name"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Educational Board</label>
            <select
              name="board"
              value={formData.board}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
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
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
              placeholder="e.g. 2024"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Marks Percentage (%)</label>
            <input
              name="marksPercentage"
              value={formData.marksPercentage}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
              placeholder="e.g. 92%"
            />
          </div>
        </div>
      )}

      {/* STEP 3: COURSE */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Academic Department *</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border ${errors.department ? 'border-rose-400 bg-rose-50/20' : 'border-[#E6EDF2]'} focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white`}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id || dept.code || dept.name} value={dept.name}>
                    {dept.name} ({dept.code || 'DEPT'})
                  </option>
                ))}
              </select>
              {errors.department && <p className="text-[11px] font-bold text-rose-500 mt-1">{errors.department}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Year / Batch</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
              >
                {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Semester</label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s.toString()}>Semester {s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Section</label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
              >
                {['A', 'B', 'C', 'D'].map(sec => <option key={sec}>{sec}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: CATEGORY */}
      {step === 4 && (
        <div className="space-y-4">
          <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Seat Allotment Quota</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'Government Quota', label: 'Government Quota', desc: 'State entrance merit list allotment' },
              { id: 'Management Quota', label: 'Management Quota', desc: 'Direct institutional admission' },
              { id: 'NRI / Sports Quota', label: 'NRI / Sports Quota', desc: 'Special international or athletic reservation' }
            ].map(q => (
              <div
                key={q.id}
                onClick={() => setFormData(prev => ({ ...prev, quota: q.id }))}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${formData.quota === q.id ? 'border-[#7C3AED] bg-[#7C3AED]/5 shadow-sm' : 'border-[#E6EDF2] bg-white hover:border-[#7C3AED]/30'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-[#1E293B]">{q.label}</h4>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.quota === q.id ? 'border-[#7C3AED] bg-[#7C3AED]' : 'border-slate-300'}`}>
                    {formData.quota === q.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] font-medium">{q.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 5: ACCOMMODATION */}
      {step === 5 && (
        <div className="space-y-4">
          <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Accommodation Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'Day Scholar', label: 'Day Scholar', desc: 'Student resides off-campus or commutes daily' },
              { id: 'Hostel Required', label: 'Hostel Required', desc: 'Campus boarding & mess facilities requested' }
            ].map(acc => (
              <div
                key={acc.id}
                onClick={() => setFormData(prev => ({ ...prev, accommodation: acc.id }))}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${formData.accommodation === acc.id ? 'border-[#7C3AED] bg-[#7C3AED]/5 shadow-sm' : 'border-[#E6EDF2] bg-white hover:border-[#7C3AED]/30'}`}
              >
                <h4 className="text-xs font-bold text-[#1E293B] mb-1">{acc.label}</h4>
                <p className="text-[11px] text-[#64748B] font-medium">{acc.desc}</p>
              </div>
            ))}
          </div>

          {formData.accommodation === 'Hostel Required' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Room Occupancy</label>
                <select
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
                >
                  <option value="">Select Room Type</option>
                  <option>Single Sharing AC</option>
                  <option>Double Sharing Non-AC</option>
                  <option>Four Sharing Standard</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Hostel Block Name</label>
                <input
                  name="hostelName"
                  value={formData.hostelName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
                  placeholder="e.g. Block C (Boys / Girls)"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: DOCUMENTS */}
      {step === 6 && (
        <div className="space-y-4">
          <p className="text-xs text-[#64748B] font-medium">Click any document field below to replace uploaded files.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'passportPhoto', label: 'Passport Size Photograph' },
              { key: 'aadhaarCard', label: 'Aadhaar / National ID Card' },
              { key: 'marksheet', label: '10th / 12th Marksheet' },
              { key: 'transferCertificate', label: 'Transfer Certificate (TC)' },
            ].map(doc => (
              <div key={doc.key} className="p-3.5 rounded-xl border border-[#E6EDF2] bg-[#FAFBFC] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1E293B]">{doc.label}</p>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">
                    {formData.docs[doc.key] ? 'File Attached' : 'Not uploaded yet'}
                  </p>
                </div>
                <label className="px-3 py-1.5 bg-white border border-[#E6EDF2] hover:border-[#7C3AED] text-[#7C3AED] text-[11px] font-bold rounded-lg cursor-pointer transition-all">
                  {formData.docs[doc.key] ? 'Replace' : 'Upload'}
                  <input type="file" className="hidden" onChange={(e) => handleFileChange(e, doc.key)} accept="image/*,.pdf" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 7: PAYMENT */}
      {step === 7 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Payment Method</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
              >
                <option value="Online Banking">Online Banking / UPI</option>
                <option value="Credit/Debit Card">Credit / Debit Card</option>
                <option value="Cash / Demand Draft">Cash / Demand Draft</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Application Fee (₹)</label>
              <input
                name="feeAmount"
                value={formData.feeAmount}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Transaction Ref / ID</label>
              <input
                name="transactionId"
                value={formData.transactionId}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
                placeholder="e.g. TXN987654321"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 8: REVIEW & GUARDIAN */}
      {step === 8 && (
        <div className="space-y-5">
          <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Parent / Guardian Information *</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Guardian Name *</label>
                <input
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Relationship</label>
                <select
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 focus:outline-none bg-white"
                >
                  <option>Father</option>
                  <option>Mother</option>
                  <option>Guardian</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Guardian Phone</label>
                <input
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Guardian Email</label>
                <input
                  name="guardianEmail"
                  value={formData.guardianEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Update Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div><span className="text-slate-500">Name:</span> <span className="font-bold text-slate-800">{formData.name}</span></div>
              <div><span className="text-slate-500">Dept:</span> <span className="font-bold text-slate-800">{formData.department}</span></div>
              <div><span className="text-slate-500">Quota:</span> <span className="font-bold text-slate-800">{formData.quota}</span></div>
              <div><span className="text-slate-500">Hostel:</span> <span className="font-bold text-slate-800">{formData.accommodation}</span></div>
            </div>
          </div>
        </div>
      )}
    </EnterpriseWizardTemplate>
  );
}
