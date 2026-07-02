import { useNavigate } from 'react-router-dom';

/**
 * Unified two-column settings shell used by all roles.
 * Left: sidebar with tab navigation
 * Right: active panel content
 */
export default function SettingsShell({ tabs, activeTab, onSelect, children, role }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row gap-0 w-full min-h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] md:overflow-hidden">

      {/* ── Left: Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-full md:w-72 flex-shrink-0 md:border-r border-slate-200 bg-white md:h-full md:overflow-y-auto">
        <div className="flex flex-col h-full">


          {/* Nav Items */}
          <nav className="px-3 py-4 flex flex-col gap-0.5 flex-1">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelect(tab.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-150 group ${
                    isActive
                      ? 'bg-[#00236f]/10 text-[#00236f] font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  {/* Icon */}
                  {tab.icon && (
                    <span
                      className={`material-symbols-outlined text-[20px] flex-shrink-0 transition-colors ${
                        isActive ? 'text-[#00236f]' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {tab.icon}
                    </span>
                  )}

                  {/* Label */}
                  <span className="flex-1 truncate">{tab.label}</span>

                  {/* Active indicator */}
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#00236f] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Divider + Back Link */}
          <div className="px-3 pb-6 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => navigate(`/dashboard?role=${encodeURIComponent(role)}`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all duration-150 group"
            >
              <span className="material-symbols-outlined text-[20px] flex-shrink-0 group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Right: Panel Content ───────────────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-[#f8fafc] px-6 md:px-8 py-8 md:h-full md:overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
