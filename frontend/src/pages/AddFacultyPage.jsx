import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAdmission } from '../context/AdmissionContext';
import { buildApiUrl } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';

export default function AddFacultyPage() {
  const navigate = useNavigate();
  const { addFacultyApp } = useAdmission();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await settingsApi.getDepartments();
        setDepartments(data || []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepts();
  }, []);

  const [formData, setFormData] = useState({
    // Step 1: Personal
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    defaultPassword: '',
    useAutoPassword: true,
    // Step 2: Professional
    role: '',
    department: '',
    yearsOfExperience: '',
    // Step 3: Qualification
    highestQualification: '',
    specialization: '',
    university: '',
    // Step 4: Employment Type
    employmentType: '',
  });

  const steps = [
    { number: 1, title: 'Personal' },
    { number: 2, title: 'Professional' },
    { number: 3, title: 'Qualification' },
    { number: 4, title: 'Employment' },
    { number: 5, title: 'Review' },
  ];

  const handleInputChange = (e) =>{
    const { name, value } = e.target;
    let finalValue = value;

    // Enforce 10-digit phone number
    if (name === 'phone') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData(prev =>({ ...prev, [name]: finalValue }));
  };

  const handleNext = () =>{
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () =>{
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () =>{
    // Validate required fields BEFORE submitting
    if (!formData.fullName || !formData.fullName.trim()) {
      alert(' Full Name is required');
      setIsLoading(false);
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      alert(' Email is required');
      setIsLoading(false);
      return;
    }
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert(' Please enter a valid email address');
      setIsLoading(false);
      return;
    }
    if (!formData.phone || !formData.phone.trim()) {
      alert(' Phone number is required');
      setIsLoading(false);
      return;
    }
    // Validate phone format (10 digits)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      alert(' Phone number must be exactly 10 digits');
      setIsLoading(false);
      return;
    }
    if (!formData.dateOfBirth) {
      alert(' Date of Birth is required');
      setIsLoading(false);
      return;
    }
    if (!formData.role || !formData.role.trim()) {
      alert(' Designation is required');
      setIsLoading(false);
      return;
    }
    if (!formData.department || !formData.department.trim()) {
      alert(' Department is required');
      setIsLoading(false);
      return;
    }
    if (!formData.useAutoPassword && (!formData.defaultPassword || !formData.defaultPassword.trim())) {
      alert(' Custom Password is required when auto-password is not selected');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const facultyData = {
      fullName: formData.fullName,
      name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      role: formData.role,
      designation: formData.role,
      department: formData.department,
      yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
      highestQualification: formData.highestQualification,
      qualification: formData.highestQualification,
      specialization: formData.specialization,
      university: formData.university,
      employmentType: formData.employmentType,
      password: formData.useAutoPassword ? '' : formData.defaultPassword,
      status: 'Pending',
      type: 'faculty',
    };

    try {
      console.log(' Submitting faculty data:', facultyData);

      // Set up timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() =>controller.abort(), 10000); // 10 second timeout

      const response = await fetch(buildApiUrl('/faculty/admission/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(' Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to save admission`;
        try {
          const errorData = await response.json();
          console.log(' Error response:', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.log(' Could not parse error response:', e);
          // Error response is not JSON
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
        console.log(' Faculty application saved successfully:', result);
      } catch (parseError) {
        console.warn(' Response is not JSON, but submission was successful');
        result = { employeeId: 'FAC-' + Date.now(), id: 'FAC-' + Date.now() };
      }

      addFacultyApp(facultyData);
      
      const empId = result.employeeId || result.id || 'Processing';
      alert(` Faculty application submitted successfully!\n\nEmployee ID: ${empId}\n\nYour application is now under review.`);
      navigate('/faculty');
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(' Request timeout:', error);
        alert(' Connection timeout. Please check if backend server is running on port 8000.\n\nTroubleshoot:\n1. Start backend: python -m uvicorn main:app --host 0.0.0.0 --port 8000\n2. Check vite.config.js proxy settings\n3. Verify API base URL');
      } else if (error instanceof TypeError) {
        console.error(' Network error:', error);
        alert(' Network error - Failed to reach backend server.\n\nPlease ensure:\n1. Backend is running on port 8000\n2. No network firewall blocking\n3. API base URL is correctly configured');
      } else {
        console.error(' Error submitting faculty admission:', error);
        alert(` Error: ${error.message}`);
      }
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Add New Faculty"><div className="space-y-4">{/* Page Header */}
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-[#4c1d95]/10 rounded-lg"><span className="material-symbols-outlined text-lg text-[#4c1d95]">school</span></div><div><h1 className="text-lg font-bold text-gray-900">Add New Faculty</h1><p className="text-xs text-gray-600 mt-0.5">Step {currentStep} of 5: {steps[currentStep-1].title}</p></div></div><button
            onClick={() =>navigate('/faculty')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          ><span className="material-symbols-outlined text-base">arrow_back</span><span className="font-medium">Back</span></button></div>{/* Progress Bar */}
        <div className="bg-white rounded-lg shadow overflow-hidden"><div className="flex h-1.5">{steps.map((s) =>(
              <div
                key={s.number}
                className={`flex-1 transition-all duration-500 ${currentStep >= s.number ? 'bg-[#4c1d95]' : 'bg-gray-200'}`}
              />))}
          </div></div>{/* Form Container */}
        <div className="bg-white rounded-lg shadow p-6"><div className="space-y-6">{/* Step 1: Personal */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Full Name <span className="text-red-500">*</span></label><input name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4c1d95]/20" placeholder="Enter full name" /></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Email <span className="text-red-500">*</span></label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="example@edu.com" /></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Phone <span className="text-red-500">*</span></label><input name="phone" value={formData.phone} onChange={handleInputChange} maxLength="10" pattern="[0-9]{10}" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="10-digit number" /></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Date of Birth <span className="text-red-500">*</span></label><input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" /></div><div className="space-y-1 md:col-span-2"><label className="text-xs font-semibold text-gray-700">Gender <span className="text-red-500">*</span></label><select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"><option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div></div>
                {/* Default Password */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-amber-600 text-lg">lock</span>
                    <label className="text-xs font-bold text-amber-800 uppercase tracking-wider">Default Password</label>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.useAutoPassword} onChange={(e) => setFormData(prev => ({ ...prev, useAutoPassword: e.target.checked, defaultPassword: '' }))} className="w-4 h-4 rounded text-[#4c1d95] focus:ring-[#4c1d95]" />
                    <span className="text-xs text-gray-700 font-medium">Auto-generate from Employee ID</span>
                  </label>
                  {!formData.useAutoPassword && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Custom Password <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} name="defaultPassword" value={formData.defaultPassword} onChange={handleInputChange} className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4c1d95]/20" placeholder="Enter default password" />
                        <button type="button" onClick={() => setShowPassword(prev => !prev)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors" title={showPassword ? 'Hide password' : 'Show password'}>
                          <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div></div>)}

            {/* Step 2: Professional */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Designation <span className="text-red-500">*</span></label><select name="role" value={formData.role} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"><option value="">Select Designation</option><option value="Lecturer">Lecturer</option><option value="Assistant Professor">Assistant Professor</option><option value="Associate Professor">Associate Professor</option><option value="Professor">Professor</option></select></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Department <span className="text-red-500">*</span></label><select name="department" value={formData.department} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"><option value="">Select Department</option>{departments.map(d =><option key={d.code} value={d.name}>{d.name}</option>)}
                    </select></div><div className="space-y-1 md:col-span-2"><label className="text-xs font-semibold text-gray-700">Years of Experience <span className="text-red-500">*</span></label><input type="number" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="e.g. 5" /></div></div></div>)}

            {/* Step 3: Qualification */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Highest Qualification <span className="text-red-500">*</span></label><select name="highestQualification" value={formData.highestQualification} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"><option value="">Select Qualification</option><option value="B.Tech">B.Tech (Bachelor of Technology)</option><option value="M.Tech">M.Tech (Master of Technology)</option><option value="B.E.">B.E. (Bachelor of Engineering)</option><option value="M.E.">M.E. (Master of Engineering)</option><option value="MBBS">MBBS (Bachelor of Medicine, Surgery)</option><option value="MD">MD (Doctor of Medicine)</option><option value="MS">MS (Master of Surgery)</option><option value="BDS">BDS (Bachelor of Dental Surgery)</option><option value="MDS">MDS (Master of Dental Surgery)</option><option value="B.Pharm">B.Pharm (Bachelor of Pharmacy)</option><option value="M.Pharm">M.Pharm (Master of Pharmacy)</option><option value="B.A.">B.A. (Bachelor of Arts)</option><option value="M.A.">M.A. (Master of Arts)</option><option value="B.F.A.">B.F.A. (Bachelor of Fine Arts)</option><option value="M.F.A.">M.F.A. (Master of Fine Arts)</option><option value="B.Sc">B.Sc (Bachelor of Science)</option><option value="M.Sc">M.Sc (Master of Science)</option><option value="B.Com">B.Com (Bachelor of Commerce)</option><option value="M.Com">M.Com (Master of Commerce)</option><option value="BBA">BBA (Bachelor of Business Admin)</option><option value="MBA">MBA (Master of Business Admin)</option><option value="LL.B.">LL.B. (Bachelor of Laws)</option><option value="LL.M.">LL.M. (Master of Laws)</option><option value="M.Phil">M.Phil (Master of Philosophy)</option><option value="Ph.D.">Ph.D. (Doctor of Philosophy)</option><option value="Post-Doc">Post-Doctoral Fellowship</option></select></div><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Specialization <span className="text-red-500">*</span></label><input name="specialization" value={formData.specialization} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="e.g. Artificial Intelligence" /></div><div className="space-y-1 md:col-span-2"><label className="text-xs font-semibold text-gray-700">University <span className="text-red-500">*</span></label><input name="university" value={formData.university} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2" placeholder="University name" /></div></div></div>)}

            {/* Step 4: Employment */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><div className="space-y-1"><label className="text-xs font-semibold text-gray-700">Employment Type <span className="text-red-500">*</span></label><select name="employmentType" value={formData.employmentType} onChange={handleInputChange} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 bg-white"><option value="">Select Employment Type</option><option value="Full-Time">Full-Time</option><option value="Part-Time">Part-Time</option><option value="Contract">Contract</option></select></div></div>)}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300"><div className="bg-[#4c1d95]/5 border border-[#4c1d95]/10 rounded-lg p-4"><h3 className="font-bold text-gray-900 text-sm">Review Your Information</h3><div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4"><div><p className="text-xs font-bold text-gray-400 uppercase">Personal Info</p><div className="mt-2 space-y-1"><div className="flex justify-between text-xs"><span className="text-gray-500">Name:</span><span className="font-semibold">{formData.fullName}</span></div><div className="flex justify-between text-xs"><span className="text-gray-500">Email:</span><span className="font-semibold">{formData.email}</span></div><div className="flex justify-between text-xs"><span className="text-gray-500">Phone:</span><span className="font-semibold">{formData.phone}</span></div></div></div><div><p className="text-xs font-bold text-gray-400 uppercase">Professional Info</p><div className="mt-2 space-y-1"><div className="flex justify-between text-xs"><span className="text-gray-500">Designation:</span><span className="font-semibold">{formData.role}</span></div><div className="flex justify-between text-xs"><span className="text-gray-500">Department:</span><span className="font-semibold">{formData.department}</span></div><div className="flex justify-between text-xs"><span className="text-gray-500">Experience:</span><span className="font-semibold">{formData.yearsOfExperience} years</span></div></div></div></div></div><button 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-[#4c1d95] text-white text-sm rounded-lg hover:bg-[#3b0764] disabled:opacity-50 transition-colors font-medium"
                >{isLoading ? 'Submitting...' : 'Complete Registration'}
                </button></div>)}

            {/* Form Actions */}
            {currentStep < 5 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200"><div>{currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >← Previous
                    </button>)}
                </div><div className="flex gap-2"><button
                    type="button"
                    onClick={handleNext}
                    className="px-4 py-2 bg-[#4c1d95] text-white text-sm rounded-lg hover:bg-[#3b0764] transition-colors font-medium"
                  >Next →
                  </button>
                </div></div>)}
          </div></div></div></Layout>);
}
