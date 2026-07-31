import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EnterpriseWizardTemplate from '../components/common/EnterpriseWizardTemplate';
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
  const [avatarPreview, setAvatarPreview] = useState(null);

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
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    defaultPassword: '',
    useAutoPassword: true,
    role: '',
    department: '',
    yearsOfExperience: '',
    highestQualification: '',
    specialization: '',
    university: '',
    employmentType: 'Full-Time',
  });

  const steps = [
    { id: 1, title: 'Personal', icon: 'person', helpText: 'Ensure full name, email, DOB, and phone match legal identification.' },
    { id: 2, title: 'Professional', icon: 'work', helpText: 'Select faculty designation, teaching department, and years of experience.' },
    { id: 3, title: 'Qualification', icon: 'school', helpText: 'Provide details of highest degree, specialization, and university.' },
    { id: 4, title: 'Employment', icon: 'badge', helpText: 'Select employment contract type and onboarding status.' },
    { id: 5, title: 'Review', icon: 'rate_review', helpText: 'Review faculty credentials before submitting registration.' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'phone') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
    else handleSubmit();
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.dateOfBirth) {
      alert('Please fill in all required personal details');
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
      role: formData.role || 'Assistant Professor',
      designation: formData.role || 'Assistant Professor',
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
      const response = await fetch(buildApiUrl('/faculty/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyData),
      });

      if (!response.ok) throw new Error('Failed to register faculty');
      alert('Faculty registered successfully!');
      navigate('/faculty');
    } catch (err) {
      console.error('Error adding faculty:', err);
      alert(`Registration error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentStepObj = steps[currentStep - 1];
  const filledCount = [
    formData.fullName, formData.email, formData.phone, formData.dateOfBirth, formData.gender,
    formData.role, formData.department, formData.highestQualification
  ].filter(Boolean).length;
  const completionPercentage = (filledCount / 8) * 100;

  return (
    <EnterpriseWizardTemplate
      title="New Staff Registration"
      subtitle="Register or update institution faculty profile"
      steps={steps}
      currentStep={currentStep}
      totalSteps={steps.length}
      completionPercentage={completionPercentage}
      stepTitle={currentStepObj.title}
      stepIcon={currentStepObj.icon}
      avatarPreview={avatarPreview}
      onAvatarChange={(e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setAvatarPreview(reader.result);
          reader.readAsDataURL(file);
        }
      }}
      helpTitle="Contextual Help"
      helpText={currentStepObj.helpText}
      onBack={handlePrevious}
      onNext={handleNext}
      onSaveDraft={() => alert('Draft saved successfully!')}
      isFirstStep={currentStep === 1}
      isLastStep={currentStep === steps.length}
      isSubmitting={isLoading}
    >
      {/* STEP 1: PERSONAL */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Full Name *</label>
            <input
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white"
              placeholder="e.g. Dr. Jane Smith"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white"
              placeholder="faculty@mit.edu"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Phone Number *</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              maxLength="10"
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white"
              placeholder="10-digit number"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Date of Birth *</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#0A686A] bg-[#FAFBFC] focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* STEP 2: PROFESSIONAL */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Designation *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
            >
              <option value="">Select Designation</option>
              <option>Professor</option>
              <option>Associate Professor</option>
              <option>Assistant Professor</option>
              <option>Lecturer</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Department *</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id || d.code} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Years of Experience</label>
            <input
              type="number"
              name="yearsOfExperience"
              value={formData.yearsOfExperience}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
              placeholder="e.g. 8"
            />
          </div>
        </div>
      )}

      {/* STEP 3: QUALIFICATION */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Highest Degree *</label>
            <input
              name="highestQualification"
              value={formData.highestQualification}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
              placeholder="e.g. Ph.D. in Computer Science"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Specialization</label>
            <input
              name="specialization"
              value={formData.specialization}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] bg-[#FAFBFC]"
              placeholder="e.g. Artificial Intelligence"
            />
          </div>
        </div>
      )}

      {/* STEP 4: EMPLOYMENT */}
      {currentStep === 4 && (
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider block mb-2">Employment Type</label>
          {['Full-Time', 'Part-Time', 'Visiting Faculty', 'Contractual'].map(type => (
            <label
              key={type}
              className={`flex items-center p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                formData.employmentType === type
                  ? 'border-[#003A40] bg-[#E6F4F1]/50 text-[#003A40]'
                  : 'border-[#E6EDF2] hover:border-slate-300 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="employmentType"
                value={type}
                checked={formData.employmentType === type}
                onChange={handleInputChange}
                className="w-4 h-4 text-[#003A40]"
              />
              <span className="ml-3 text-xs font-bold">{type}</span>
            </label>
          ))}
        </div>
      )}

      {/* STEP 5: REVIEW */}
      {currentStep === 5 && (
        <div className="space-y-3">
          <div className="p-4 bg-[#E6F4F1] border border-[#0A686A]/20 rounded-xl space-y-2 text-xs">
            <div className="font-extrabold text-[#003A40] text-sm mb-1">Review Registration Details</div>
            <div><strong>Name:</strong> {formData.fullName}</div>
            <div><strong>Email:</strong> {formData.email}</div>
            <div><strong>Designation:</strong> {formData.role} ({formData.department})</div>
            <div><strong>Qualification:</strong> {formData.highestQualification}</div>
            <div><strong>Employment:</strong> {formData.employmentType}</div>
          </div>
        </div>
      )}
    </EnterpriseWizardTemplate>
  );
}
