/**
 * KpiCard Component
 * Standardized KPI/Statistic Card used across all pages
 * 
 * Updated:
 * - Compact horizontal layout (reduced KPI card size)
 * - Harmonious color tokens
 */

export default function KpiCard({ 
  icon, 
  label, 
  value,
  colorScheme = 'blue',
  sub
}) {
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-50/50',
      border: 'border-blue-100',
      text: 'text-blue-700',
      icon: 'bg-blue-100/50'
    },
    green: {
      bg: 'bg-[#00236f]/5',
      border: 'border-[#00236f]/15',
      text: 'text-[#00236f]',
      icon: 'bg-[#00236f]/10'
    },
    emerald: {
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-100',
      text: 'text-emerald-700',
      icon: 'bg-emerald-100/50'
    },
    red: {
      bg: 'bg-red-50/50',
      border: 'border-red-100',
      text: 'text-red-700',
      icon: 'bg-red-100/50'
    },
    purple: {
      bg: 'bg-purple-50/50',
      border: 'border-purple-100',
      text: 'text-purple-700',
      icon: 'bg-purple-100/50'
    },
    orange: {
      bg: 'bg-orange-50/50',
      border: 'border-orange-100',
      text: 'text-orange-700',
      icon: 'bg-orange-100/50'
    },
    cyan: {
      bg: 'bg-cyan-50/50',
      border: 'border-cyan-100',
      text: 'text-cyan-700',
      icon: 'bg-cyan-100/50'
    },
    amber: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-100',
      text: 'text-amber-700',
      icon: 'bg-amber-100/50'
    }
  };

  const colors = colorSchemes[colorScheme] || colorSchemes.blue;

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 transition-all duration-300 hover:shadow-sm hover:translate-y-[-1px] flex items-center gap-4`}>
      {/* Icon Container */}
      <div className={`${colors.icon} ${colors.text} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>
      
      {/* Text Container */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-xl font-extrabold ${colors.text} mt-0.5 truncate leading-tight`}>{value}</p>
        {sub && <p className="text-[9px] text-gray-500 font-medium truncate mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
