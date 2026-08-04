import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DashboardSkeleton from '../components/DashboardSkeleton';
import {
  Building2, Users, GraduationCap, BookOpen, Mail, Phone, MapPin,
  Search, Plus, Pencil, Trash2, X, Award, ArrowUpRight, ArrowRight, Check, ChevronRight
} from 'lucide-react';
import { getUserData, getUserSession } from '../auth/sessionController';
import { settingsApi } from '../api/settingsApi';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/common/Pagination';
import EnterpriseWizardTemplate from '../components/common/EnterpriseWizardTemplate';
import { API_BASE } from '../api/apiBase';

// Helper to generate clean 2-4 letter uppercase short code
function getCleanCode(dept) {
  if (dept.code && dept.code.length <= 5 && !dept.code.includes(' ')) {
    return dept.code.toUpperCase();
  }
  const name = dept.name || dept.code || 'DEPT';
  const words = name.split(/\s+/).filter((w) => w.length > 0 && !['and', '&', 'of', 'in', 'the'].includes(w.toLowerCase()));
  if (words.length > 1) {
    return words.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
  }
  return name.slice(0, 3).toUpperCase();
}

/* ── Full Page Enterprise Add Department View ──────────────────────────── */
function AddDepartmentFullView({ onCancel, onSave, allFaculty = [], initialData = null }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildInitialFormState = (data) => ({
    id: data?.id || '',
    name: data?.name || '',
    code: data?.code || '',
    category: data?.category || 'Medical & Allied Health',
    established_year: data?.established_year || data?.establishedYear || new Date().getFullYear().toString(),
    office_location: data?.office_location || data?.location || 'DSCHS Main Building, Floor 1',
    description: data?.description || '',
    head: data?.head || data?.hod || '',
    head_id: data?.head_id || data?.headId || '',
    email: data?.email || '',
    phone: data?.phone || '',
    deputy_head: data?.deputy_head || data?.deputyHead || '',
    programs: data?.programs || (data?.degree ? [data.degree] : ['B.Sc (Medical Lab Technology)', 'B.Sc (Operation Theatre and Anaesthesia Technology)', 'B.Sc (Radiography and Imaging Technology)']),
    totalStudents: data?.totalStudents ?? 0,
    totalFaculty: data?.totalFaculty ?? 0,
    courses: data?.courses ?? 1,
    accreditation: data?.accreditation || 'NBA Tier-1 Accredited',
    budget: data?.budget || '5000000',
  });

  const [formData, setFormData] = useState(() => buildInitialFormState(initialData));

  useEffect(() => {
    if (initialData) {
      setFormData(buildInitialFormState(initialData));
    }
  }, [initialData]);

  const steps = [
    { title: 'General Info', label: 'General Info' },
    { title: 'HOD & Leadership', label: 'HOD & Leadership' },
    { title: 'Intake & Academics', label: 'Intake & Academics' },
    { title: 'Facilities & Budget', label: 'Facilities & Budget' },
  ];

  const handleHodSelect = (facId) => {
    if (!facId) {
      setFormData(prev => ({ ...prev, head_id: '', head: '', email: '', phone: '' }));
      return;
    }
    const fac = allFaculty.find(f => (f.id === facId || f._id === facId));
    if (fac) {
      setFormData(prev => ({
        ...prev,
        head_id: facId,
        head: fac.name || fac.fullName || '',
        email: fac.email || prev.email,
        phone: fac.phone || fac.contactNumber || prev.phone,
      }));
    }
  };

  const handleProgramToggle = (prog) => {
    setFormData(prev => {
      const exists = prev.programs.includes(prog);
      return {
        ...prev,
        programs: exists ? prev.programs.filter(p => p !== prog) : [...prev.programs, prog]
      };
    });
  };

  const handleNext = async () => {
    if (currentStep === 1 && !formData.name) {
      alert('Department name is required');
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsSubmitting(true);
      const code = formData.code ? formData.code.toUpperCase() : getCleanCode({ name: formData.name });
      const payload = {
        ...formData,
        code,
        id: formData.id || initialData?.id || `DEPT-${Date.now()}`
      };
      await onSave(payload);
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

  const code = formData.code || (formData.name ? getCleanCode({ name: formData.name }) : 'DEPT');

  return (
    <EnterpriseWizardTemplate
      noLayout={true}
      title={initialData ? `Edit Department: ${initialData.name}` : "Create New Academic Department"}
      subtitle={initialData ? "Update department metadata, assign HOD leadership, and set academic intake capacity" : "Configure department metadata, assign HOD leadership, and set academic intake capacity"}
      steps={steps}
      currentStep={currentStep}
      totalSteps={4}
      stepTitle={steps[currentStep - 1].title}
      stepIcon={currentStep === 1 ? 'domain' : currentStep === 2 ? 'person_search' : currentStep === 3 ? 'school' : 'verified'}
      onBack={handleBack}
      onNext={handleNext}
      isFirstStep={currentStep === 1}
      isLastStep={currentStep === 4}
      isSubmitting={isSubmitting}
      helpTitle="Department Setup Guidance"
      helpText="Ensure department short code matches official academic records. Selected HOD faculty member will receive administrative permissions."
    >
      <div className="space-y-6">

        {/* STEP 1: GENERAL INFO */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-[#003A40]">info</span>
              <p className="text-xs text-slate-700">Enter basic identity and building location details for the new academic department.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Department Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({ ...formData, name, code: getCleanCode({ name }) });
                  }}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A] focus:ring-2 focus:ring-[#0A686A]/20"
                  placeholder="e.g. Computer Science & Engineering"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Short Code / Prefix <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono font-bold outline-none focus:border-[#0A686A] focus:ring-2 focus:ring-[#0A686A]/20"
                  placeholder="e.g. CSE"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Academic Category / Discipline</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A] bg-white cursor-pointer"
                >
                  <option value="Engineering & Technology">Engineering & Technology</option>
                  <option value="Medical & Allied Health">Medical & Allied Health</option>
                  <option value="Basic & Applied Sciences">Basic & Applied Sciences</option>
                  <option value="Management & Commerce">Management & Commerce</option>
                  <option value="Humanities & Social Sciences">Humanities & Social Sciences</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Establishment Year</label>
                <input
                  type="text"
                  value={formData.established_year}
                  onChange={(e) => setFormData({ ...formData, established_year: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                  placeholder="e.g. 2016"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-1">Building & Office Location</label>
              <input
                type="text"
                value={formData.office_location}
                onChange={(e) => setFormData({ ...formData, office_location: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                placeholder="e.g. Academic Block A, 3rd Floor, Room 301"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-1">Department Description & Scope</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A] resize-none"
                placeholder="Detailed department overview, academic mission, research vision..."
              />
            </div>
          </div>
        )}

        {/* STEP 2: LEADERSHIP & HOD */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#EEF4F7]">
              <label className="text-xs font-bold text-[#003A40] block mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-[#0A686A]">person_search</span>
                Select Head of Department (HOD) from Faculty Directory
              </label>
              <select
                value={formData.head_id}
                onChange={(e) => handleHodSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-semibold outline-none focus:border-[#0A686A] bg-white cursor-pointer"
              >
                <option value="">-- Choose Assigned Faculty Member --</option>
                {allFaculty.map((fac) => (
                  <option key={fac.id || fac._id} value={fac.id || fac._id}>
                    {fac.name || fac.fullName} ({fac.designation || 'Faculty'} - {fac.department || 'General'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">Selecting a faculty member automatically fills HOD profile details.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">HOD Display Name</label>
                <input
                  type="text"
                  value={formData.head}
                  onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                  placeholder="Dr. HOD Name"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Deputy HOD / Vice Chair</label>
                <input
                  type="text"
                  value={formData.deputy_head}
                  onChange={(e) => setFormData({ ...formData, deputy_head: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                  placeholder="Dr. Vice Chair Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Official Department Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                  placeholder="hod.cse@mit.edu"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Direct Phone / Extension</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INTAKE & ACADEMICS */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#003A40] block mb-2">Degree Programs Offered</label>
              <div className="flex flex-wrap gap-2">
                {['B.Tech', 'M.Tech', 'Ph.D.', 'B.Sc', 'M.Sc', 'Diploma', 'Post-Doc'].map((prog) => {
                  const isSelected = formData.programs.includes(prog);
                  return (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => handleProgramToggle(prog)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#003A40] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                      <span>{prog}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Sanctioned Student Intake</label>
                <input
                  type="number"
                  value={formData.totalStudents}
                  onChange={(e) => setFormData({ ...formData, totalStudents: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Sanctioned Faculty Cadre</label>
                <input
                  type="number"
                  value={formData.totalFaculty}
                  onChange={(e) => setFormData({ ...formData, totalFaculty: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Curriculum Courses</label>
                <input
                  type="number"
                  value={formData.courses}
                  onChange={(e) => setFormData({ ...formData, courses: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: FACILITIES & ACCREDITATION */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Accreditation Status</label>
                <select
                  value={formData.accreditation}
                  onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs outline-none focus:border-[#0A686A] bg-white cursor-pointer"
                >
                  <option value="NBA Tier-1 Accredited">NBA Tier-1 Accredited</option>
                  <option value="NAAC Grade A++">NAAC Grade A++</option>
                  <option value="ABET Certified">ABET Certified</option>
                  <option value="Provisional Approval">Provisional Approval</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#003A40] block mb-1">Annual Department Budget (₹)</label>
                <input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#E6EDF2] rounded-xl text-xs font-mono outline-none focus:border-[#0A686A]"
                  placeholder="e.g. 5000000"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </EnterpriseWizardTemplate>
  );
}



/* ── View Department Detail Modal / Drawer ───────────────────────────────── */
function DepartmentDetailModal({ department, onClose, facultyList }) {
  const navigate = useNavigate();
  if (!department) return null;

  const code = getCleanCode(department);
  const sampleCourses = [
    { code: `${code} 101`, title: 'Foundations & Core Principles', credits: 4, sem: 'Sem 1' },
    { code: `${code} 201`, title: 'System Architecture & Design', credits: 4, sem: 'Sem 3' },
    { code: `${code} 301`, title: 'Advanced Analytics & Practice', credits: 3, sem: 'Sem 5' },
    { code: `${code} 401`, title: 'Capstone Industry Research', credits: 6, sem: 'Sem 7' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E6EDF2] max-w-3xl w-full shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#EEF4F7] bg-[#FAFBFF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003A40] to-[#0A686A] text-white font-extrabold text-sm flex items-center justify-center font-['Outfit'] shadow-sm">
              {code}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#003A40] font-['Outfit'] leading-tight">
                {department.name}
              </h3>
              <p className="text-xs text-[#5F6B7A] font-medium">HOD: {department.head || 'Dr. Department Head'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8C98A5] hover:text-rose-500 transition-colors p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7]">
              <span className="text-[10px] font-bold text-[#8C98A5] uppercase">Faculty Staff</span>
              <p className="text-base font-extrabold text-[#003A40] font-['Outfit']">{facultyList.length || department.totalFaculty || 10}</p>
            </div>
            <div className="p-3 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7]">
              <span className="text-[10px] font-bold text-[#8C98A5] uppercase">Students</span>
              <p className="text-base font-extrabold text-[#003A40] font-['Outfit']">{department.totalStudents || 320}</p>
            </div>
            <div className="p-3 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7]">
              <span className="text-[10px] font-bold text-[#8C98A5] uppercase">Courses</span>
              <p className="text-base font-extrabold text-[#003A40] font-['Outfit']">{department.courses || 8}</p>
            </div>
            <div className="p-3 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7]">
              <span className="text-[10px] font-bold text-[#8C98A5] uppercase">Pass Rate</span>
              <p className="text-base font-extrabold text-emerald-600 font-['Outfit']">95.4%</p>
            </div>
          </div>

          {/* Curriculum */}
          <div>
            <h4 className="text-xs font-extrabold text-[#003A40] uppercase tracking-wider mb-2 font-['Outfit']">
              Department Curriculum Courses
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {sampleCourses.map((c, idx) => (
                <div key={idx} className="p-3 bg-white border border-[#E6EDF2] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#0A686A] bg-[#F2FBFA] px-2 py-0.5 rounded border border-[#0A686A]/20">
                      {c.code}
                    </span>
                    <p className="text-xs font-bold text-[#003A40] mt-1 truncate">{c.title}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#8C98A5] block">{c.sem}</span>
                    <span className="text-[10px] font-bold text-[#003A40]">{c.credits} Crs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Faculty Roster */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold text-[#003A40] uppercase tracking-wider font-['Outfit']">
                Assigned Faculty Members ({facultyList.length})
              </h4>
              <button
                onClick={() => { onClose(); navigate('/faculty'); }}
                className="text-xs font-bold text-[#0A686A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                All Faculty Directory <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="border border-[#E6EDF2] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFF] border-b border-[#EEF4F7]">
                    <th className="px-3 py-2 text-[10px] font-extrabold text-[#8C98A5] uppercase font-['Outfit']">Member</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold text-[#8C98A5] uppercase font-['Outfit']">Designation</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold text-[#8C98A5] uppercase font-['Outfit']">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-xs text-[#8C98A5]">
                        No faculty members currently listed for this department.
                      </td>
                    </tr>
                  ) : (
                    facultyList.map((f, idx) => (
                      <tr key={idx} className="border-b border-[#F4F7FF] last:border-b-0 hover:bg-[#F9FBFF]">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || 'F')}&background=003A40&color=fff&size=80`}
                              alt={f.name}
                              className="w-7 h-7 rounded-lg object-cover border border-[#E6EDF2]"
                            />
                            <div>
                              <p className="text-xs font-bold text-[#003A40] leading-tight">{f.name || f.fullName}</p>
                              <p className="text-[10px] text-[#8C98A5]">{f.employeeId || f.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[#5F6B7A] font-medium">{f.designation || 'Professor'}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {f.employment_status || f.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EEF4F7] bg-[#FAFBFF] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#003A40] text-white rounded-xl text-xs font-bold hover:bg-[#0A686A] transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Faculty Department Page (Grid Card Format) ─────────────────────── */
export default function FacultyDepartmentPage() {
  const navigate = useNavigate();
  const session = getUserSession();
  const role = session?.role || 'admin';

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allFaculty, setAllFaculty] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const DEFAULT_DEPARTMENTS = [
    {
      id: 'DEPT-MLT',
      name: 'Medical Laboratory Technology',
      code: 'MLT',
      degree: 'B.Sc (Medical Laboratory Technology)',
      duration: '3 Years + 1 Year Internship',
      head: 'Department Head',
      email: 'mlt@dschs.edu.in',
      phone: '+91 98765 43210',
      office_location: 'Health Sciences Block, Room 101',
      totalFaculty: 0,
      totalStudents: 0,
      courses: 1,
      description: 'Laboratory services play a vital role in the diagnosis and study of various diseases, forming the backbone of effective medical treatment. With rapid advancements in laboratory science, Dindigul Shifa College of Health Sciences (DSCHS) offers B.Sc. Medical Laboratory Technology, affiliated with The Tamil Nadu Dr. M.G.R. Medical University, Chennai.'
    },
    {
      id: 'DEPT-OTAT',
      name: 'Operation Theatre & Anaesthesia Technology',
      code: 'OTAT',
      degree: 'B.Sc (Operation Theatre and Anaesthesia Technology)',
      duration: '3 Years + 1 Year Internship',
      head: 'Department Head',
      email: 'otat@dschs.edu.in',
      phone: '+91 98765 43211',
      office_location: 'Operation Theatre Complex, Block B',
      totalFaculty: 0,
      totalStudents: 0,
      courses: 1,
      description: 'Provides comprehensive training in subjects such as anatomy, physiology, biochemistry, pharmacology, microbiology, medicine, sterilization techniques, and medical ethics, equipping students for ICUs and surgical operating theatres.'
    },
    {
      id: 'DEPT-RIT',
      name: 'Radiography & Imaging Technology',
      code: 'RIT',
      degree: 'B.Sc (Radiography and Imaging Technology)',
      duration: '3 Years + 1 Year Internship',
      head: 'Department Head',
      email: 'rit@dschs.edu.in',
      phone: '+91 98765 43212',
      office_location: 'Department of Radiology, Block C',
      totalFaculty: 0,
      totalStudents: 0,
      courses: 1,
      description: 'Provides structured training across key radiological modalities including X-ray, CT, MRI, ultrasound, and DSA under the affiliation of The Tamil Nadu Dr. M.G.R. Medical University, Chennai.'
    },
  ];

  // Fetch departments & faculty
  const loadData = async () => {
    setLoading(true);
    try {
      let deptsData = [];
      try {
        deptsData = await settingsApi.getDepartments();
      } catch (e) {
        console.warn('Departments API error:', e);
      }

      let facData = [];
      try {
        const facRes = await fetch(`${API_BASE}/faculty/dropdown`);
        if (facRes.ok) facData = await facRes.json();
      } catch (e) {
        console.warn('Faculty API error:', e);
      }

      setAllFaculty(facData || []);

      const deptsList = Array.isArray(deptsData) ? deptsData : [];
      const finalDepts = deptsList.length ? deptsList : DEFAULT_DEPARTMENTS;

      setDepartments(finalDepts);
    } catch (err) {
      console.error('Failed to load department metrics:', err);
      setDepartments(DEFAULT_DEPARTMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditSave = async (updatedData) => {
    try {
      const saved = await settingsApi.updateDepartment(updatedData.id, updatedData);
      setDepartments(departments.map((d) => (d.id === updatedData.id ? (saved || updatedData) : d)));
    } catch (err) {
      setDepartments(departments.map((d) => (d.id === updatedData.id ? updatedData : d)));
    }
  };

  const handleAddDepartment = async (newDept) => {
    try {
      const saved = await settingsApi.createDepartment(newDept);
      setDepartments([...departments, saved || newDept]);
    } catch (err) {
      setDepartments([...departments, newDept]);
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm('Delete this department permanently?')) return;
    try {
      await settingsApi.deleteDepartment(deptId);
      setDepartments(departments.filter((d) => d.id !== deptId));
    } catch (err) {
      setDepartments(departments.filter((d) => d.id !== deptId));
    }
  };

  const getFilteredFaculty = (dept) => {
    if (!dept || !allFaculty.length) return [];
    return allFaculty.filter((fac) => {
      const fDept = (fac.departmentId || fac.department || '').toLowerCase();
      const dName = (dept.name || '').toLowerCase();
      const dCode = (dept.code || '').toLowerCase();
      return fDept === dName || fDept === dCode || dName.includes(fDept) || fDept.includes(dName);
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(3);

  const user = session?.user || getUserData();
  const hodDepartment = user?.department || user?.departmentId || user?.department_id || '';

  // Filtered list
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      if (role === 'hod' && hodDepartment) {
        const dName = (d.name || d.code || '').toLowerCase();
        const target = hodDepartment.toLowerCase();
        if (!dName.includes(target) && !target.includes(dName)) {
          return false;
        }
      }
      const q = searchQuery.toLowerCase();
      return !q || d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q) || d.head?.toLowerCase().includes(q);
    });
  }, [departments, searchQuery, role, hodDepartment]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalItems = filteredDepartments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDepartments = useMemo(() => {
    return filteredDepartments.slice(startIndex, startIndex + pageSize);
  }, [filteredDepartments, startIndex, pageSize]);

  const totalFacultyCount = departments.reduce((sum, d) => sum + (d.totalFaculty || 10), 0);
  const totalStudentCount = departments.reduce((sum, d) => sum + (d.totalStudents || 300), 0);

  if (isAddOpen || editingDept) {
    return (
      <Layout title={editingDept ? "Edit Department" : "Add Department"}>
        <AddDepartmentFullView
          onCancel={() => {
            setIsAddOpen(false);
            setEditingDept(null);
          }}
          onSave={editingDept ? handleEditSave : handleAddDepartment}
          allFaculty={allFaculty}
          initialData={editingDept}
        />
      </Layout>
    );
  }

  return (
    <Layout title="Departments">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-4 font-['Plus_Jakarta_Sans'] h-full overflow-y-auto pr-1 custom-scrollbar">

          {/* ── KPI Header Summary Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
            <div className="relative overflow-hidden rounded-xl border border-[#E6EDF2] bg-white p-4 flex items-center gap-3.5 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-t-xl" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C98A5]">Departments</p>
                <p className="text-xl font-extrabold text-[#003A40] leading-none font-['Outfit'] mt-0.5">{departments.length}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#E6EDF2] bg-white p-4 flex items-center gap-3.5 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-xl" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C98A5]">Faculty Members</p>
                <p className="text-xl font-extrabold text-[#003A40] leading-none font-['Outfit'] mt-0.5">{totalFacultyCount}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#E6EDF2] bg-white p-4 flex items-center gap-3.5 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-sky-500 to-blue-600 rounded-t-xl" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C98A5]">Enrolled Students</p>
                <p className="text-xl font-extrabold text-[#003A40] leading-none font-['Outfit'] mt-0.5">{totalStudentCount.toLocaleString()}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#E6EDF2] bg-white p-4 flex items-center gap-3.5 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-t-xl" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C98A5]">Courses Offered</p>
                <p className="text-xl font-extrabold text-[#003A40] leading-none font-['Outfit'] mt-0.5">{departments.length * 8}</p>
              </div>
            </div>
          </div>

          {/* ── Toolbar Row ────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E6EDF2] shadow-xs">
            {/* Search */}
            <div className="flex items-center gap-2 h-9 px-3.5 bg-[#F8FAFC] border border-[#E6EDF2] rounded-xl flex-1 min-w-[220px] max-w-sm focus-within:border-[#0A686A]">
              <Search className="w-4 h-4 text-[#8C98A5]" />
              <input
                type="text"
                placeholder="Search department by name, code, HOD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs text-[#1B1F24] placeholder-[#A0AEC0] font-medium"
              />
            </div>

            {/* Add Department CTA */}
            {role !== 'student' && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#003A40] to-[#0A686A] text-white text-xs font-bold hover:from-[#0A686A] hover:to-[#003A40] transition-all flex items-center gap-2 shadow-xs cursor-pointer ml-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department</span>
              </button>
            )}
          </div>

          {/* ── Department Card Grid (3 columns) ────────────────────────────── */}
          {filteredDepartments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E6EDF2] p-12 text-center text-[#8C98A5]">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#003A40]" />
              <p className="text-xs font-bold text-[#003A40]">No departments match your search query.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                {paginatedDepartments.map((dept) => {
                  const code = getCleanCode(dept);
                  const facCount = dept.totalFaculty || getFilteredFaculty(dept).length || 10;
                  return (
                    <div
                      key={dept.id}
                      className="relative overflow-hidden bg-white border border-[#E6EDF2] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
                    >
                      {/* Top gradient accent line */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#003A40] to-[#0A686A] rounded-t-2xl" />

                      <div>
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#003A40] to-[#0A686A] text-white flex items-center justify-center font-extrabold text-xs font-['Outfit'] shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
                              {code}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-extrabold text-[#003A40] font-['Outfit'] truncate leading-tight group-hover:text-[#0A686A] transition-colors">
                                {dept.name}
                              </h3>
                              <span className="inline-block mt-0.5 px-2 py-0.5 bg-[#F2FBFA] border border-[#0A686A]/20 rounded-md text-[10px] font-bold text-[#0A686A] uppercase">
                                Code: {code}
                              </span>
                            </div>
                          </div>

                          {role !== 'student' && (
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingDept(dept);
                                  setIsEditOpen(true);
                                }}
                                className="w-7 h-7 rounded-lg text-[#5F6B7A] hover:text-[#003A40] hover:bg-[#F4F7FF] flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit Department"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDepartment(dept.id)}
                                className="w-7 h-7 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete Department"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* HOD & Contact Info */}
                        <div className="p-3.5 bg-[#F9FBFF] rounded-xl border border-[#EEF4F7] space-y-1.5 mb-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-[#003A40] flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0A686A]" />
                              HOD: <span className="font-bold">{dept.head || 'Dr. Department Head'}</span>
                            </p>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider flex-shrink-0">
                              NBA Tier-1
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5F6B7A] flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 text-[#8C98A5]" /> {dept.email || `${code.toLowerCase()}@mit.edu`}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-[#5F6B7A] gap-2">
                            <p className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3 h-3 text-[#8C98A5]" /> {dept.office_location || 'Main Academic Bldg'}
                            </p>
                            <p className="flex items-center gap-1 truncate font-mono text-[10px] text-[#0A686A]">
                              <Phone className="w-3 h-3 text-[#8C98A5]" /> {dept.phone || '+91 98765 43210'}
                            </p>
                          </div>
                          <p className="text-[11px] text-[#5F6B7A] leading-relaxed pt-1.5 border-t border-slate-200/60 italic line-clamp-2">
                            {dept.description || `Specialized curriculum & advanced research labs in ${dept.name} equipped with state-of-the-art academic facilities.`}
                          </p>
                        </div>

                        {/* Stats Pills */}
                        <div className="grid grid-cols-3 gap-2 text-center mb-4">
                          <div className="p-2 bg-slate-50 rounded-lg border border-[#EEF4F7]">
                            <span className="text-[9px] font-bold text-[#8C98A5] uppercase block">Faculty</span>
                            <span className="text-xs font-extrabold text-[#003A40]">{facCount} Staff</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg border border-[#EEF4F7]">
                            <span className="text-[9px] font-bold text-[#8C98A5] uppercase block">Students</span>
                            <span className="text-xs font-extrabold text-[#003A40]">{dept.totalStudents || 280}</span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg border border-[#EEF4F7]">
                            <span className="text-[9px] font-bold text-[#8C98A5] uppercase block">Courses</span>
                            <span className="text-xs font-extrabold text-[#003A40]">{dept.courses || 8} Units</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer CTA */}
                      <button
                        onClick={() => setSelectedDept(dept)}
                        className="w-full py-2.5 px-3 rounded-xl border border-[#E6EDF2] bg-white text-xs font-bold text-[#003A40] hover:bg-[#F2FBFA] hover:border-[#0A686A]/40 transition-all flex items-center justify-between cursor-pointer group/btn mt-2"
                      >
                        <span>Explore Department</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#0A686A] group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Pagination Bar */}
              <div className="mt-auto pb-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          )}

          {/* Detail Inspector Modal */}
          {selectedDept && (
            <DepartmentDetailModal
              department={selectedDept}
              onClose={() => setSelectedDept(null)}
              facultyList={getFilteredFaculty(selectedDept)}
            />
          )}


        </div>
      )}
    </Layout>
  );
}
