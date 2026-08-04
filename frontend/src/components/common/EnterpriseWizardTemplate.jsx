import React from 'react';
import Layout from '../Layout';

export default function EnterpriseWizardTemplate({
  noLayout = false,
  title = 'New Staff Registration',
  subtitle = 'Register or update employee profile',
  steps = [],
  currentStep = 1,
  totalSteps = 5,
  completionPercentage = 0,
  stepTitle = 'Identity Details',
  stepIcon = 'person',
  avatarPreview = null,
  onAvatarChange = null,
  avatarTitle = 'Profile Photo',
  avatarSubtext = 'Upload a high-resolution professional portrait. Max 2MB.',
  customRightPanel = null,
  helpTitle = 'Contextual Help',
  helpText = 'Ensure all basic information matches government-issued ID for credentialing verification.',
  onBack = null,
  onNext = null,
  onSaveDraft = null,
  isFirstStep = true,
  isLastStep = false,
  isSubmitting = false,
  children,
}) {
  const fileInputRef = React.useRef(null);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handleBack = () => {
    if (currentStep > 1) {
      if (onBack) onBack();
    } else {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  const inner = (
    <div className="flex flex-col h-full min-h-0 bg-[#F8FAFC] overflow-hidden">
      {/* ── MAIN SCROLL / VIEWPORT CONTAINER ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4 custom-scrollbar">
        {/* ── PROGRESS BAR CARD ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xs font-extrabold text-[#003A40] uppercase tracking-wider">Registration Progress</h2>
              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                DRAFT
              </span>
            </div>
            <span className="text-xs font-black text-[#003A40] tracking-wider uppercase">
              STEP {currentStep} OF {totalSteps}
            </span>
          </div>

          {/* PROGRESS STEPS BAR */}
          <div className="grid grid-cols-4 gap-2">
            {steps.map((st, idx) => {
              const stepNum = idx + 1;
              const isCompleted = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;

              return (
                <div key={st.title || idx} className="space-y-1.5">
                  <div className="h-1.5 rounded-full overflow-hidden bg-[#E6EDF2]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-[#003A40]'
                          : isCurrent
                          ? 'bg-[#0A686A]'
                          : 'bg-transparent'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-extrabold block truncate ${
                      isCurrent
                        ? 'text-[#003A40]'
                        : isCompleted
                        ? 'text-slate-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {st.title || st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── MAIN CONTENT GRID (8 COLS FORM + 4 COLS SIDEBAR) ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[460px]">
          {/* LEFT FORM CARD (8 COLS) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E6EDF2] p-6 shadow-2xs space-y-6 flex flex-col justify-between">
            {/* STEP TITLE HEADER */}
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#E6EDF2]">
              <div className="w-8 h-8 rounded-xl bg-[#E6F4F1] text-[#003A40] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg leading-none">{stepIcon}</span>
              </div>
              <h3 className="text-base font-extrabold text-[#003A40]">{stepTitle}</h3>
            </div>

            {/* FORM BODY */}
            <div className="space-y-4">{children}</div>
          </div>

          {/* RIGHT SIDEBAR CARDS (4 COLS) */}
          <div className="lg:col-span-4 space-y-5">
            {customRightPanel ? (
              customRightPanel
            ) : (
              <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 shadow-2xs flex flex-col items-center text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="relative group mb-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-36 h-36 rounded-2xl border-2 border-dashed border-slate-200 bg-[#FAFBFC] hover:bg-[#F2FBFA] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-1">photo_camera</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">PHOTO</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#003A40] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Upload image"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                </div>

                <h4 className="text-sm font-extrabold text-[#003A40] mb-1">{avatarTitle}</h4>
                <p className="text-xs font-semibold text-[#5F6B7A] leading-relaxed max-w-xs mb-5">
                  {avatarSubtext}
                </p>

                <div className="w-full pt-4 border-t border-[#E6EDF2] flex items-center justify-between text-xs font-bold text-[#5F6B7A]">
                  <span>COMPLETION</span>
                  <span className="text-[#003A40] font-black">{Math.round(completionPercentage)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#E6EDF2] rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#003A40] to-[#0A686A] transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
                  />
                </div>
              </div>
            )}

            {/* CONTEXTUAL HELP CARD */}
            <div className="bg-[#E6F4F1]/60 rounded-2xl border border-[#0A686A]/20 p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-[#003A40]">
                <span className="material-symbols-outlined text-xl">info</span>
                <h4 className="text-xs font-extrabold uppercase tracking-wider">{helpTitle}</h4>
              </div>
              <p className="text-xs font-semibold text-[#0A686A] leading-relaxed">
                {helpText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY FOOTER ACTION BAR ─────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t border-[#E6EDF2] px-6 py-3 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-[#5F6B7A] hover:text-[#003A40] hover:bg-[#F4F7FF] active:scale-95"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>BACK</span>
        </button>

        <div className="flex items-center gap-3">
          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              className="px-5 py-2 rounded-xl border border-[#E6EDF2] bg-white hover:bg-[#FAFBFC] text-xs font-extrabold text-[#5F6B7A] hover:text-[#003A40] transition-all cursor-pointer shadow-2xs"
            >
              SAVE DRAFT
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#003A40] hover:bg-[#002d32] text-white text-xs font-extrabold transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>PROCESSING...</span>
            ) : isLastStep ? (
              <>
                <span>SUBMIT ENROLLMENT</span>
                <span className="material-symbols-outlined text-base">check_circle</span>
              </>
            ) : (
              <>
                <span>NEXT STEP</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
  return noLayout ? inner : <Layout title={title} noPadding showBack={true} onBack={handleBack}>{inner}</Layout>;
}
