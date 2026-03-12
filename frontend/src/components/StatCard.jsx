const colorMap = {
  blue: { bg: 'bg-[#1162d4]/10', text: 'text-[#1162d4]', iconBg: 'bg-[#1162d4]/10' },
  green: { bg: 'bg-emerald-100', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', iconBg: 'bg-purple-100' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', iconBg: 'bg-orange-100' },
  red: { bg: 'bg-red-100', text: 'text-red-600', iconBg: 'bg-red-100' },
}

export default function StatCard({ icon, label, value, trend, color = 'blue' }) {
  const theme = colorMap[color] || colorMap.blue

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className={`p-3 rounded-xl ${theme.iconBg} flex items-center justify-center ${theme.text}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="mb-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          {trend && (
            <span className="text-[10px] font-bold text-slate-400">
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
