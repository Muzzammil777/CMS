import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EnterpriseWizardTemplate from '../components/common/EnterpriseWizardTemplate';
import { useAdmission } from '../context/AdmissionContext';
import { buildApiUrl } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';
import { saveLocalDraft, getLocalDrafts, deleteLocalDraft } from '../utils/draftManager';
import { useDepartments } from '../hooks/useDepartments';

export default function AddFacultyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');

  const { addFacultyApp } = useAdmission();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { departments } = useDepartments();
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (draftId) {
      const drafts = getLocalDrafts('faculty');
      const found = drafts.find(d => d.id === draftId);
      if (found && found.formData) {
        setFormData(found.formData);
        if (found.currentStep) setCurrentStep(found.currentStep);
        if (found.formData.avatarPreview) setAvatarPreview(found.formData.avatarPreview);
      }
    }
  }, [draftId]);

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
      if (draftId) deleteLocalDraft('faculty', draftId);
      alert('Faculty registered successfully!');
      navigate('/faculty');
    } catch (err) {
      console.error('Error adding faculty:', err);
      alert(`Registration error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = () => {
    const draftName = formData.fullName || 'Untitled Faculty Staff';
    saveLocalDraft('faculty', {
      id: draftId || `DRAFT-FAC-${Date.now()}`,
      title: draftName,
      name: draftName,
      email: formData.email,
      department: formData.department || 'Unassigned',
      role: formData.role || 'Assistant Professor',
      currentStep,
      totalSteps: steps.length,
      completionPercentage: Math.round(completionPercentage),
      stepName: currentStepObj.title,
      type: 'Faculty Registration',
      formData: { ...formData, avatarPreview },
    });
    alert(`Draft saved for "${draftName}"! You can resume registration anytime from the Drafts tab.`);
    navigate('/faculty?view=drafts');
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
      onBack={handlePrevious}
      onNext={handleNext}
      onSaveDraft={handleSaveDraft}
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

          {/* Permanent Address Section */}
          <div className="sm:col-span-2 bg-[#FAF8FF] border border-[#E9E2FF] p-4 rounded-2xl space-y-3 mt-2">
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
                onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                  placeholder="Nagapattinam"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">State</label>
                <select
                  name="state"
                  value={formData.state || 'Tamil Nadu'}
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  maxLength="6"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-white transition-all"
                  placeholder="611001"
                />
              </div>
            </div>
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
              <option>Head of Department (HOD)</option>
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

      {/* STEP 3: QUALIFICATION & DOCUMENTS */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Academic Credentials */}
          <div className="bg-white p-5 rounded-2xl border border-[#E6EDF2] shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#7C3AED] border-b border-[#F1F5F9] pb-3">
              <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[18px] text-[#7C3AED]">school</span>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">Academic Qualifications</h4>
                <p className="text-[10px] text-[#64748B] font-medium">Provide degree qualifications, university details, and academic rank</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Highest Degree / Qualification *</label>
                <input
                  name="highestQualification"
                  value={formData.highestQualification || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
                  placeholder="e.g. Ph.D. in Computer Science"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Specialization / Major *</label>
                <input
                  name="specialization"
                  value={formData.specialization || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
                  placeholder="e.g. Artificial Intelligence"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">University / Institute</label>
                <input
                  name="university"
                  value={formData.university || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
                  placeholder="e.g. Anna University / IIT Madras"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Year of Graduation</label>
                <input
                  type="number"
                  name="graduationYear"
                  value={formData.graduationYear || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
                  placeholder="e.g. 2018"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">Grade / Class / CGPA</label>
                <input
                  name="academicGrade"
                  value={formData.academicGrade || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
                  placeholder="e.g. First Class with Distinction (8.8 CGPA)"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5F6B7A] uppercase tracking-wider block mb-1">NET / SET / GATE Qualified</label>
                <select
                  name="netGateQualified"
                  value={formData.netGateQualified || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-[#E6EDF2] focus:outline-none focus:border-[#7C3AED] bg-[#FAFBFC] focus:bg-white"
                >
                  <option value="">Select Status</option>
                  <option value="UGC-NET Qualified">UGC-NET Qualified</option>
                  <option value="CSIR-NET JRF">CSIR-NET JRF</option>
                  <option value="SLET / SET Qualified">SLET / SET Qualified</option>
                  <option value="GATE Qualified">GATE Qualified</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>
            </div>
          </div>

          {/* Qualification Document Upload Cards */}
          <div className="bg-white p-5 rounded-2xl border border-[#E6EDF2] shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#7C3AED] border-b border-[#F1F5F9] pb-3">
              <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[18px] text-[#7C3AED]">upload_file</span>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">Qualification Certificates & Documents</h4>
                <p className="text-[10px] text-[#64748B] font-medium">Attach verified transcripts, degree certificates, and resume (PDF, Word, or Image format)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'phdCertificate', label: 'Ph.D. / Doctorate Certificate', icon: 'workspace_premium' },
                { key: 'pgCertificate', label: 'PG Degree Certificate & Marksheet', icon: 'description' },
                { key: 'ugCertificate', label: 'UG Degree Certificate', icon: 'school' },
                { key: 'netGateCertificate', label: 'NET / SET / GATE Scorecard', icon: 'verified' },
                { key: 'experienceCertificate', label: 'Experience & Relieving Certificates', icon: 'badge' },
                { key: 'resumeCV', label: 'Curriculum Vitae (CV) / Resume', icon: 'article' },
              ].map(doc => {
                const uploaded = formData.docs?.[doc.key];
                return (
                  <div key={doc.key} className="p-3.5 rounded-xl border border-[#E6EDF2] bg-[#FAFBFC] flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-[#E6EDF2] flex items-center justify-center text-[#7C3AED] flex-shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">{doc.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1E293B] truncate">{doc.label}</p>
                        <p className="text-[10px] text-[#64748B] font-medium mt-0.5 truncate">
                          {uploaded ? `${uploaded.name || 'Document Attached'}` : 'Not uploaded yet'}
                        </p>
                      </div>
                    </div>
                    <label className="ml-2 px-3 py-1.5 bg-white border border-[#E6EDF2] hover:border-[#7C3AED] text-[#7C3AED] text-[11px] font-bold rounded-lg cursor-pointer transition-all flex-shrink-0">
                      {uploaded ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData(prev => ({
                                ...prev,
                                docs: {
                                  ...prev.docs,
                                  [doc.key]: { name: file.name, size: `${(file.size/1024/1024).toFixed(2)} MB`, data: reader.result }
                                }
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        accept="image/*,.pdf,.doc,.docx"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
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
