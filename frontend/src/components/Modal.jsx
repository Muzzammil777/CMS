export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  maxWidth = 'max-w-2xl',
  footer,
  children,
}) {
  if (!isOpen) return null

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Modal'}
    >
      <div className={`w-full ${maxWidth} rounded-t-xl sm:rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden max-h-[95vh] sm:max-h-[85vh] flex flex-col`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="material-symbols-outlined text-slate-600 flex-shrink-0">{icon}</span>}
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1">{children}</div>

        {footer && <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
