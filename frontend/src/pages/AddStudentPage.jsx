import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
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

  // Load departments on mount
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

  const handleChange = (e) =>{
    const { name, value } = e.target;
    setFormData(prev =>({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev =>({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e, field = 'avatar') =>{
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>{
        if (field === 'avatar') {
          setAvatarPreview(reader.result);
          setFormData(prev =>({ ...prev, avatar: reader.result }));
        } else {
          setFormData(prev =>({
            ...prev,
            docs: { ...prev.docs, [field]: { name: file.name, size: file.size, data: reader.result } }
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (s) =>{
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
      // Academic validation - optional fields
      if (formData.yearOfPassing && isNaN(formData.yearOfPassing)) {
        newErrors.yearOfPassing = 'Enter a valid year';
      }
    } else if (s === 3) {
      // Course validation
      if (!formData.department) newErrors.department = 'Department is required';
      if (!formData.course) newErrors.course = 'Course is required';
    } else if (s === 4) {
      // Category/Quota validation
      if (!formData.quota) newErrors.quota = 'Quota selection is required';
    } else if (s === 5) {
      // Accommodation validation
      if (!formData.accommodation) newErrors.accommodation = 'Accommodation type is required';
      if (formData.accommodation === 'Hostel' && !formData.roomType) {
        newErrors.roomType = 'Room type is required for hostel';
      }
    } else if (s === 6) {
      // Documents validation
      if (!formData.docs.transferCertificate) newErrors.transferCertificate = 'Transfer Certificate is required';
      if (!formData.docs.aadhaarCard) newErrors.aadhaarCard = 'Aadhaar Card is required';
      if (!formData.docs.marksheet) newErrors.marksheet = 'Marksheet is required';
    } else if (s === 7) {
      // Payment validation
      if (!formData.paymentMethod) newErrors.paymentMethod = 'Payment method is required';
      if (!formData.feeAmount) {
        newErrors.feeAmount = 'Fee amount is required';
      } else if (isNaN(formData.feeAmount) || parseFloat(formData.feeAmount) <= 0) {
        newErrors.feeAmount = 'Enter a valid fee amount';
      }
    } else if (s === 8) {
      // Guardian validation (in review step)
      if (!formData.guardianName) newErrors.guardianName = 'Guardian Name is required';
      if (!formData.guardianPhone) {
        newErrors.guardianPhone = 'Guardian Phone is required';
      } else if (!/^\d{10}$/.test(formData.guardianPhone.replace(/\D/g, ''))) {
        newErrors.guardianPhone = 'Enter a valid 10-digit mobile number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () =>{
    if (validateStep(step)) {
      setStep(s =>s + 1);
    }
  };

  const handlePrevious = () =>{
    setStep(s =>s - 1);
  };

  const handleSaveDraft = () =>{
    localStorage.setItem('add_student_draft', JSON.stringify(formData));
    alert('Progress saved to draft!');
  };

  const handleSubmit = async (e) =>{
    e.preventDefault();
    if (validateStep(step)) {
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
          ].filter(d =>d.data)
        };

        console.log(' Submitting student data:', payload);

        // Set up timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() =>controller.abort(), 10000); // 10 second timeout

        // Try the correct API endpoint
        const res = await fetch(`${API_BASE}/admissions/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(' Response status:', res.status);

        if (!res.ok) {
          let errorMessage = `HTTP ${res.status}: Failed to save student`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.detail || errorMessage;
          } catch (e) {
            // Error response is not JSON
          }
          throw new Error(errorMessage);
        }

        let result;
        try {
          result = await res.json();
          console.log(' Student enrollment successful:', result);
        } catch (parseError) {
          console.warn(' Response is not JSON, but submission was successful');
          result = { id: 'STU-' + Date.now() };
        }

        alert(` Student enrolled successfully!\n\nApplication ID: ${result.id || result.admission_id || result.name || 'Processing'}\n\nYour application is now under review.`);
        localStorage.removeItem('add_student_draft');
        navigate('/students');
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(' Request timeout:', error);
          alert(' Connection timeout. Please check if backend server is running on port 5000.\n\nTroubleshoot:\n1. Start backend: python -m uvicorn main:app --host 0.0.0.0 --port 5000\n2. Check CORS policy\n3. Verify API_BASE URL in frontend');
        } else if (error instanceof TypeError) {
          console.error(' Network error:', error);
          alert(' Network error - Failed to reach backend server.\n\nPlease ensure:\n1. Backend is running (port 5000)\n2. No network firewall blocking\n3. API_BASE is correctly configured');
        } else {
          console.error(' Submit error:', error);
          alert(` Error: ${error.message}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getSemOptions = () =>{
    const yearNum = parseInt(formData.year);
    if (yearNum === 1) return ['1', '2'];
    if (yearNum === 2) return ['3', '4'];
    if (yearNum === 3) return ['5', '6'];
    if (yearNum === 4) return ['7', '8'];
    return [];
  };

  const steps = [
    { id: 1, label: 'Personal' },
    { id: 2, label: 'Academic' },
    { id: 3, label: 'Course' },
    { id: 4, label: 'Category' },
    { id: 5, label: 'Accommodation' },
    { id: 6, label: 'Documents' },
    { id: 7, label: 'Payment' },
    { id: 8, label: 'Review' },
  ];

  return (
    <Layout title="Add New Student"><div className="space-y-4">{/* Page Header */}
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-[#4c1d95]/10 rounded-lg"><span className="material-symbols-outlined text-lg text-[#4c1d95]">person_add</span></div><div><h1 className="text-lg font-bold text-gray-900">Enroll New Student</h1><p className="text-xs text-gray-600 mt-0.5">Step {step} of 8: {steps[step-1].label}</p></div></div><button
            onClick={() =>navigate('/students')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          ><span className="material-symbols-outlined text-base">arrow_back</span><span className="font-medium">Back</span></button></div>{/* Progress Bar */}
        <div className="bg-white rounded-lg shadow overflow-hidden"><div className="flex h-1.5">{steps.map((s) =>(
              <div
                key={s.id}
                className={`flex-1 transition-all duration-500 ${step >= s.id ? 'bg-[#4c1d95]' : 'bg-gray-200'}`}
              />))}
          </div></div>{/* Form Container */}
        <div className="bg-white rounded-lg shadow p-6"><form onSubmit={handleSubmit} className="space-y-6">{/* Step 1: Personal */}
            {step === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><div className="flex flex-col md:flex-row gap-4 items-start"><div className="flex flex-col items-center gap-2"><div 
                      className="w-24 h-24 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-green-400 hover:bg-green-50/50 transition-all"
                      onClick={() =>fileInputRef.current.click()}
                    >{avatarPreview ? (
                        <img src={avatarPreview} className="w-full h-full object-cover" alt="Profile" />) : (
                        <div className="text-center p-2"><span className="material-symbols-outlined text-gray-300 text-2xl mb-1 block">add_a_photo</span><p className="text-[8px] text-gray-400 font-bold uppercase">Photo</p></div>)}
                      <div className="absolute inset-0 bg-green-700/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-white text-xs font-bold">CHANGE</span></div>{avatarPreview && !avatarPreview.startsWith('https://ui-avatars.com') && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to remove the profile photo?')) {
                              setAvatarPreview(null);
                              setFormData(prev => ({ ...prev, avatar: null }));
                            }
                          }}
                          className="absolute top-1 right-1 z-20 p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border border-white/10"
                          title="Remove profile photo"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      )}</div><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) =>handleFileChange(e, 'avatar')} /></div><div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Full Name <span className="text-red-500">*</span></label><input name="name" value={formData.name} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.name ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#4c1d95]/20`} placeholder="e.g. John Doe" />{errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                    </div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Date of Birth <span className="text-red-500">*</span></label><input type="date" name="dob" value={formData.dob} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.dob ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2`} />{errors.dob && <p className="text-xs text-red-500 font-medium">{errors.dob}</p>}
                    </div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Gender <span className="text-red-500">*</span></label><select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"><option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option></select></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Email <span className="text-red-500">*</span></label><input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.email ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2`} placeholder="example@mit.edu" />{errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
                    </div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Phone Number</label><input name="phone" value={formData.phone} onChange={handleChange} maxLength="10" pattern="[0-9]{10}" className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.phone ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2`} placeholder="10-digit number" />{errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
                    </div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Blood Group</label><select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"><option value="">Select Group</option>{['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg =><option key={bg} value={bg}>{bg}</option>)}
                      </select></div></div></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Permanent Address</label><textarea name="address" value={formData.address} onChange={handleChange} rows="2" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-gray-50/30 resize-none" placeholder="Enter complete home address..." /></div>
                {/* Default Password */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-amber-600 text-lg">lock</span>
                    <label className="text-xs font-bold text-amber-800 uppercase tracking-wider">Default Password</label>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.useAutoPassword} onChange={(e) => setFormData(prev => ({ ...prev, useAutoPassword: e.target.checked, defaultPassword: '' }))} className="w-4 h-4 rounded text-[#4c1d95] focus:ring-[#4c1d95]" />
                    <span className="text-xs text-gray-700 font-medium">Auto-generate from Student ID / Roll Number</span>
                  </label>
                  {!formData.useAutoPassword && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Custom Password <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} name="defaultPassword" value={formData.defaultPassword} onChange={handleChange} className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border ${errors.defaultPassword ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#4c1d95]/20`} placeholder="Enter default password" />
                        <button type="button" onClick={() => setShowPassword(prev => !prev)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors" title={showPassword ? 'Hide password' : 'Show password'}>
                          <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                      {errors.defaultPassword && <p className="text-xs text-red-500 font-medium">{errors.defaultPassword}</p>}
                    </div>
                  )}
                </div></div>)}

            {/* Step 2: Academic */}
            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Previous School/College</label><input name="previousSchool" value={formData.previousSchool} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="School/College name" /></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Board</label><select name="board" value={formData.board} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"><option value="">Select Board</option>{['CBSE', 'ICSE', 'State', 'Other'].map(b =><option key={b}>{b}</option>)}
                    </select></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Year of Passing</label><input type="number" name="yearOfPassing" value={formData.yearOfPassing} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.yearOfPassing ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2`} placeholder="e.g. 2023" />{errors.yearOfPassing && <p className="text-xs text-red-500 font-medium">{errors.yearOfPassing}</p>}
                  </div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Marks Percentage</label><input name="marksPercentage" value={formData.marksPercentage} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="e.g. 92%" /></div></div></div>)}

            {/* Step 3: Course / Department */}
            {step === 3 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                {departments.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <span className="material-symbols-outlined text-amber-500 text-2xl mb-2 block">warning</span>
                    <p className="text-sm font-semibold text-amber-800">No departments available</p>
                    <p className="text-xs text-amber-600 mt-1">Please add departments in Settings before enrolling a student.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Department <span className="text-red-500">*</span></label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={(e) => {
                          const selected = departments.find(d => d.name === e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            department: e.target.value,
                            // Auto-set course to the department code
                            course: selected?.code || e.target.value,
                            courseCategory: selected?.category || prev.courseCategory || 'Regular',
                          }));
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg border ${
                          errors.department ? 'border-red-400' : 'border-gray-200'
                        } focus:outline-none focus:ring-2 focus:ring-[#4c1d95]/20 bg-white`}
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={d.id || d.code} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                      {errors.department && <p className="text-xs text-red-500 font-medium">{errors.department}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Course</label>
                      <input
                        name="course"
                        value={formData.course}
                        readOnly
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                        placeholder="Auto-filled from department"
                      />
                      <p className="text-[10px] text-gray-400">Auto-filled based on selected department</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Category/Quota */}
            {step === 4 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><h3 className="text-sm font-semibold text-gray-800 mb-4">Select Admission Category</h3><div className="space-y-2">{['Government Quota', 'Management Quota', 'NRI Quota'].map((option) =>(
                    <label
                      key={option}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.quota === option
                          ? 'border-[#4c1d95] bg-[#4c1d95]/5'
                          : 'border-gray-200 hover:border-[#4c1d95]/50'
                      }`}
                    ><input
                        type="radio"
                        name="quota"
                        value={option}
                        checked={formData.quota === option}
                        onChange={handleChange}
                        className="w-4 h-4 text-[#4c1d95] cursor-pointer"
                      /><span className="ml-3 font-medium text-gray-700">{option}</span></label>))}
                </div>{errors.quota && <p className="text-xs text-red-500 font-medium">{errors.quota}</p>}
              </div>)}

            {/* Step 5: Accommodation */}
            {step === 5 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><h3 className="text-sm font-semibold text-gray-800 mb-4">Accommodation Preference</h3><div className="space-y-2 mb-4">{['Day Scholar', 'Hostel Required'].map((option) =>(
                    <label
                      key={option}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.accommodation === option
                          ? 'border-[#4c1d95] bg-[#4c1d95]/5'
                          : 'border-gray-200 hover:border-[#4c1d95]/50'
                      }`}
                    ><input
                        type="radio"
                        name="accommodation"
                        value={option}
                        checked={formData.accommodation === option}
                        onChange={handleChange}
                        className="w-4 h-4 text-[#4c1d95] cursor-pointer"
                      /><span className="ml-3 font-medium text-gray-700">{option}</span></label>))}
                </div>{errors.accommodation && <p className="text-xs text-red-500 font-medium">{errors.accommodation}</p>}

                {formData.accommodation === 'Hostel Required' && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-gray-200"><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Hostel Name (Optional)</label><input name="hostelName" value={formData.hostelName} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="Preferred hostel" /></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Room Type <span className="text-red-500">*</span></label><select name="roomType" value={formData.roomType} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.roomType ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 bg-white`}><option value="">Select Room Type</option>{['Single', 'Double', 'Triple'].map(r =><option key={r}>{r}</option>)}
                      </select>{errors.roomType && <p className="text-xs text-red-500 font-medium">{errors.roomType}</p>}
                    </div></div>)}
              </div>)}

            {/* Step 6: Documents */}
            {step === 6 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2"><span className="material-symbols-outlined text-orange-600 flex-shrink-0 text-lg">file_upload</span><p className="text-xs text-orange-700 leading-relaxed">Please upload valid documents in PDF, JPG, or PNG format. Verification is mandatory.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[
                    { label: 'Passport Photo', field: 'passportPhoto', required: false },
                    { label: 'Aadhaar Card', field: 'aadhaarCard', required: true },
                    { label: 'Marksheet', field: 'marksheet', required: true },
                    { label: 'Transfer Certificate', field: 'transferCertificate', required: true },
                  ].map((doc) =>(
                    <div key={doc.field} className={`relative border-2 border-dashed rounded-lg p-3 transition-all ${formData.docs[doc.field] ? 'border-green-200 bg-green-50' : errors[doc.field] ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-green-300'} group`}><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) =>handleFileChange(e, doc.field)} /><div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${formData.docs[doc.field] ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}><span className="material-symbols-outlined text-sm">{formData.docs[doc.field] ? 'verified' : 'upload'}</span></div><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-700">{doc.label} {doc.required && <span className="text-red-500">*</span>}</p><p className="text-[10px] text-gray-400 truncate">{formData.docs[doc.field] ? formData.docs[doc.field].name : 'Click to browse'}
                          </p></div></div></div>))}
                </div></div>)}

            {/* Step 7: Payment */}
            {step === 7 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><div className="bg-green-50 border-2 border-green-200 rounded-lg p-4"><h3 className="text-sm font-bold text-gray-800 mb-3">Application Fee</h3><div className="bg-white rounded-lg p-3 mb-3 border border-green-300"><p className="text-2xl font-bold text-[#4c1d95]">₹{parseFloat(formData.feeAmount) || 500}</p><p className="text-xs text-gray-600 mt-1">One-time application processing fee</p></div></div><div className="space-y-3"><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Payment Method <span className="text-red-500">*</span></label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.paymentMethod ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 bg-white`}><option value="">Select Payment Method</option>{['Debit Card', 'Credit Card', 'UPI', 'Net Banking'].map(m =><option key={m}>{m}</option>)}
                    </select>{errors.paymentMethod && <p className="text-xs text-red-500 font-medium">{errors.paymentMethod}</p>}
                  </div><div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-xs text-green-800 font-medium">Proceed to the next step to complete your payment securely</p></div></div></div>)}

            {/* Step 8: Review & Guardian */}
            {step === 8 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">{/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4"><div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-[10px] text-blue-600 font-bold uppercase">Course</p><p className="text-sm font-semibold text-gray-800">{formData.course} ({formData.courseCategory})</p></div><div className="bg-purple-50 border border-purple-200 rounded-lg p-3"><p className="text-[10px] text-purple-600 font-bold uppercase">Accommodation</p><p className="text-sm font-semibold text-gray-800">{formData.accommodation} {formData.roomType && `- ${formData.roomType}`}</p></div><div className="bg-orange-50 border border-orange-200 rounded-lg p-3"><p className="text-[10px] text-orange-600 font-bold uppercase">Quota</p><p className="text-sm font-semibold text-gray-800">{formData.quota}</p></div><div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-[10px] text-green-600 font-bold uppercase">Payment</p><p className="text-sm font-semibold text-gray-800">₹{parseFloat(formData.feeAmount) || 500} via {formData.paymentMethod}</p></div></div>{/* Guardian Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4"><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Guardian Information <span className="text-red-500">*</span></h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="space-y-1 md:col-span-2"><label className="text-xs font-semibold text-gray-700">Guardian Name <span className="text-red-500">*</span></label><input name="guardianName" value={formData.guardianName} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.guardianName ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2`} placeholder="Full name" />{errors.guardianName && <p className="text-xs text-red-500 font-medium">{errors.guardianName}</p>}
                    </div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Relationship <span className="text-red-500">*</span></label><select name="relationship" value={formData.relationship} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"><option value="">Select Relationship</option>{['Father', 'Mother', 'Legal Guardian', 'Sibling', 'Relative'].map(r =><option key={r}>{r}</option>)}
                      </select></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Phone <span className="text-red-500">*</span></label><input name="guardianPhone" value={formData.guardianPhone} onChange={handleChange} maxLength="10" pattern="[0-9]{10}" className={`w-full px-3 py-2 text-sm rounded-lg border ${errors.guardianPhone ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2`} placeholder="10-digit" />{errors.guardianPhone && <p className="text-xs text-red-500 font-medium">{errors.guardianPhone}</p>}
                    </div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Email</label><input type="email" name="guardianEmail" value={formData.guardianEmail} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="optional" /></div><div className="space-y-1 md:col-span-2"><label className="text-xs font-semibold text-gray-700">Occupation</label><input name="guardianOccupation" value={formData.guardianOccupation} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="e.g. Business, Engineer" /></div></div></div>{/* Confirmation */}
                <div className="bg-[#4c1d95]/5 border border-[#4c1d95]/20 rounded-lg p-3"><p className="text-xs text-gray-700">By clicking "Submit Enrollment", you confirm that all information provided is accurate and complete.
                  </p></div></div>)}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200"><div className="flex gap-2">{step >1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >← Previous
                  </button>)}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors font-medium"
                >Save Draft
                </button></div><div className="flex gap-2">{step < 8 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-4 py-2 bg-[#4c1d95] text-white text-sm rounded-lg hover:bg-[#3b0764] transition-colors font-medium"
                  >Next →
                  </button>)}
                {step === 8 && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#4c1d95] text-white text-sm rounded-lg hover:bg-[#3b0764] disabled:opacity-50 transition-colors font-medium"
                  >{isSubmitting ? 'Submitting...' : 'Submit Enrollment'}
                  </button>)}
              </div></div></form></div></div></Layout>);
}
