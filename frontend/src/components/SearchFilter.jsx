export default function SearchFilter({ searchQuery, onSearchChange, onAddClick, addButtonLabel = 'Add Student', placeholder = 'Search students by name, ID, or department...', onFilterClick, onExportClick, onBulkClick, bulkButtonLabel = 'Bulk Upload' }) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 mb-6 md:mb-8">
      <div className="relative flex-1 group w-full">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00236f] text-[20px] transition-colors">search</span>
        <input
          type="text"
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-lg pl-11 pr-5 py-2.5 text-sm focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] outline-none transition-all placeholder:text-slate-400 shadow-sm"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <button onClick={onFilterClick} className="flex items-center justify-center gap-2 h-10 px-3 sm:px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
          <span className="material-symbols-outlined text-lg">filter_list</span>
          <span className="hidden sm:inline">Filter</span>
        </button>
        <button onClick={onExportClick} className="flex items-center justify-center gap-2 h-10 px-3 sm:px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
          <span className="material-symbols-outlined text-lg">ios_share</span>
          <span className="hidden sm:inline">Export</span>
        </button>
        <div className="w-px h-6 bg-slate-200 mx-1 hidden lg:block" />
        {onBulkClick && (
          <button
            onClick={onBulkClick}
            className="flex items-center justify-center gap-2 h-10 px-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 active:scale-[0.98] transition-all shadow-sm flex-1 sm:flex-none whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">upload_file</span>
            <span>{bulkButtonLabel}</span>
          </button>
        )}
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="flex items-center justify-center gap-2 h-10 px-4 sm:px-6 bg-[#00236f] text-white rounded-lg text-sm font-semibold hover:bg-[#00236f]/90 active:scale-[0.98] transition-all shadow-sm flex-1 sm:flex-none whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>{addButtonLabel}</span>
          </button>
        )}
      </div>
    </div>
  )
}
