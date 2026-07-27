import { useNavigate } from 'react-router-dom'

export default function FacultyTable({ faculty, onEdit, onDelete, onViewDetails }) {
  const navigate = useNavigate()

  const statusStyles = {
    Top: 'bg-yellow-100 text-yellow-800',
    Good: 'bg-green-100 text-green-800',
    Watch: 'bg-orange-100 text-orange-800',
  }

  const getDepartmentColors = (dept) => {
    const colors = {
      'CS': 'bg-green-100 text-green-800',
      'ECE': 'bg-purple-100 text-purple-800',
      'ME': 'bg-cyan-100 text-cyan-800',
      'MATH': 'bg-green-100 text-green-800',
      'CE': 'bg-red-100 text-red-800',
      'BT': 'bg-pink-100 text-pink-800',
    }
    return colors[dept] || 'bg-slate-100 text-slate-700'
  }

  const getEmploymentStatusStyle = (status) => {
    if (status === 'On-Leave') return 'bg-amber-100 text-amber-800'
    if (status === 'Active') return 'bg-emerald-100 text-emerald-800'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
      <table className="w-full text-left min-w-[700px]">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
            <th className="px-6 py-4">Faculty Information</th>
            <th className="px-6 py-4">Department</th>
            <th className="px-6 py-4">Subject</th>
            <th className="px-6 py-4">Performance</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {faculty.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-10 py-24 text-center text-slate-400 bg-slate-50/30">
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-6xl mb-4 opacity-10 text-slate-900">group_off</span>
                  <p className="text-base font-bold text-slate-500">No faculty members found</p>
                  <p className="text-xs font-medium text-slate-400 mt-1">Try adjusting your filters or search terms</p>
                </div>
              </td>
            </tr>
          ) : (
            faculty.map((f) => (
              <tr
                key={f.employeeId || f._id}
                className="hover:bg-green-50/30 transition-colors cursor-pointer border-slate-100"
                onClick={() => {
                  const profileId = f._id || f.employeeId
                  if (!profileId) return
                  navigate(`/faculty/${encodeURIComponent(profileId)}`)
                }}
              >
                {(() => {
                  const performanceSummary = f.performance_summary || {}
                  const leaveSummary = f.leave_attendance_summary || {}
                  const attendanceValue = Number(leaveSummary.attendance_rate ?? f.attendance_rate ?? f.attendance ?? 0)
                  const passRateValue = performanceSummary.pass_rate ?? f.pass_rate ?? f.passRate ?? 0
                  const performanceStatus = performanceSummary.overall_status || f.status || 'Good'
                  const departmentLabel = f.departmentId || f.department_id || 'General'
                  const departmentCode = (f.department_id || f.departmentId || '').toString().toUpperCase()
                  const employmentStatus = leaveSummary.employment_status || f.employment_status || 'Active'

                  return (
                    <>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-xs ${getDepartmentColors(departmentCode)}`}>
                      {f.name ? f.name.split(' ').slice(0, 2).map(n => n[0]).join('') : 'FA'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{f.name}</p>
                      <p className="text-xs text-slate-500">{f.employeeId || 'N/A'}</p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{departmentLabel}</p>
                    <p className="text-xs text-slate-500">{f.designation || 'Faculty'}</p>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  {(() => {
                    const courseList = Array.isArray(f.courses) ? f.courses : (f.courses ? f.courses.split(',').map(s=>s.trim()).filter(Boolean) : []);
                    const classList  = Array.isArray(f.classes) ? f.classes : ((f.classes || f.assignedClasses) ? (f.classes || f.assignedClasses).toString().split(',').map(s=>s.trim()).filter(Boolean) : []);
                    const primary    = courseList[0] || f.subject || f.specialization || 'N/A';
                    return (
                      <div>
                        <p className="text-sm font-medium text-slate-700">{primary}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {courseList.length > 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                              +{courseList.length - 1} courses
                            </span>
                          )}
                          {classList.slice(0, 2).map(c => (
                            <span key={c} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{c}</span>
                          ))}
                          {classList.length > 2 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">+{classList.length - 2}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-900">{performanceStatus}</p>
                  <p className="text-xs text-slate-500">Attendance {attendanceValue}% • Pass {passRateValue}%</p>
                </td>

                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[performanceStatus] || 'bg-slate-100 text-slate-700'}`}>
                      {performanceStatus}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEmploymentStatusStyle(employmentStatus)}`}>
                      {employmentStatus}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onEdit && onEdit(f)}
                      className="p-1.5 text-slate-400 hover:text-[#4c1d95] hover:bg-[#4c1d95]/10 rounded-lg transition-colors"
                      title="Edit Faculty"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button 
                      onClick={() => onDelete && onDelete(f)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Faculty"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </td>
                    </>
                  )
                })()}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
