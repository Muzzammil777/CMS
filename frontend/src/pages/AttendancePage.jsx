import { useState, useEffect, useMemo, Fragment } from 'react'
import Layout from '../components/Layout'
import KpiCard from '../components/KpiCard'
import KpiGrid from '../components/KpiGrid'
import { TableSkeleton } from '../components/common'
import { getUserSession, getUserData } from '../auth/sessionController'
import { buildApiUrl } from '../api/apiBase'
import { settingsApi } from '../api/settingsApi'

// List of all 8 college hours
const HOURS_LIST = ['Hour 1', 'Hour 2', 'Hour 3', 'Hour 4', 'Hour 5', 'Hour 6', 'Hour 7', 'Hour 8']

export default function AttendancePage({ noLayout = false }) {
  const session = getUserSession()
  const user = session?.user || getUserData()
  const role = session?.role || 'student'
  const userId = session?.userId || ''
  const hodDepartment = user?.department || user?.departmentId || user?.department_id || ''

  const isAdmin = role === 'admin' || role === 'hod'
  const isStudent = role === 'student'
  const isFaculty = role === 'faculty'
  const isFinance = role === 'finance'

  // --- Global States ---
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [toast, setToast] = useState(null) // { message, type: 'success' | 'error' }

  // --- Show Toast Helper ---
  const showToast = (message, type = 'success') => {
    let finalMessage = message
    if (message && typeof message === 'object') {
      if (Array.isArray(message)) {
        finalMessage = message.map(err => {
          const locStr = err.loc ? err.loc.join('.') : ''
          return `${locStr ? locStr + ': ' : ''}${err.msg || JSON.stringify(err)}`
        }).join(', ')
      } else {
        finalMessage = message.detail || message.message || JSON.stringify(message)
      }
    }
    setToast({ message: finalMessage || 'An error occurred', type })
    setTimeout(() => setToast(null), 4000)
  }

  // --- Admin / HOD States ---
  const [adminTab, setAdminTab] = useState('students') // 'students' | 'faculty'
  const [adminOverview, setAdminOverview] = useState({
    totalStudents: 0,
    totalSessions: 0,
    averageAttendance: 0.0,
    belowThresholdCount: 0
  })
  const [adminRecords, setAdminRecords] = useState([])
  const [adminSearch, setAdminSearch] = useState('')
  const [adminFilters, setAdminFilters] = useState({
    department: role === 'hod' && hodDepartment ? hodDepartment : '',
    semester: '',
    section: '',
    subject: '',
    faculty: '',
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [adminSelectedRecord, setAdminSelectedRecord] = useState(null) // For detailed log & history modal
  const [adminRecordHistory, setAdminRecordHistory] = useState([])

  // Admin Faculty Marking States
  const [adminFacultyDate, setAdminFacultyDate] = useState(new Date().toISOString().split('T')[0])
  const [adminFacultySearch, setAdminFacultySearch] = useState('')
  const [adminFacultyDept, setAdminFacultyDept] = useState('')
  const [adminFacultyMarking, setAdminFacultyMarking] = useState(null)

  // --- Faculty States ---
  const [facultySubjects, setFacultySubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null) // Selected subject metadata
  const [facultyDate, setFacultyDate] = useState(new Date().toISOString().split('T')[0])
  const [facultyHour, setFacultyHour] = useState(HOURS_LIST[0])
  const [studentList, setStudentList] = useState([]) // Student rows to mark
  const [attendanceStatuses, setAttendanceStatuses] = useState({}) // { studentId: 'Present' | 'Absent' | 'Leave' | 'On Duty' }
  const [attendanceRemarks, setAttendanceRemarks] = useState({}) // { studentId: remarks }
  const [facultyMarkingsHistory, setFacultyMarkingsHistory] = useState([])
  const [facultyTab, setFacultyTab] = useState('mark') // 'mark' | 'history' | 'leaves'

  // Faculty Leave States
  const [leaveBalance, setLeaveBalance] = useState(null)
  const [leaveHistory, setLeaveHistory] = useState([])
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' })

  // --- Student States ---
  const [studentSummary, setStudentSummary] = useState({
    overallAttendancePct: 100.0,
    totalClassesAttended: 0,
    totalClassesMissed: 0,
    subjectWise: [],
    detailedLog: []
  })
  const [studentSelectedSubjectCode, setStudentSelectedSubjectCode] = useState('')

  // --- Finance States ---
  const [financeEligibility, setFinanceEligibility] = useState([])
  const [financeSearch, setFinanceSearch] = useState('')
  const [financeFilters, setFinanceFilters] = useState({
    department: '',
    semester: '',
    section: ''
  })

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  // ---------------------------------------------------------------------------
  // --- Effects & API Requests ---
  // ---------------------------------------------------------------------------

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await settingsApi.getDepartments()
        setDepartments(data || [])
      } catch (err) {
        console.error('Failed to fetch departments:', err)
      }
    }
    fetchDepts()
  }, [])

  // Load Admin Data
  // Lock the department filter for HOD role
  useEffect(() => {
    if (role === 'hod' && hodDepartment && adminFilters.department !== hodDepartment) {
      setAdminFilters(prev => ({ ...prev, department: hodDepartment }))
    }
  }, [role, hodDepartment])

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData()
    }
  }, [isAdmin, adminFilters])

  useEffect(() => {
    if (isStudent) {
      setLoading(true)
      const timer = setTimeout(() => {
        setLoading(false)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [isStudent])

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      const qParams = new URLSearchParams(adminFilters).toString()
      const overviewRes = await fetch(buildApiUrl(`/academics/attendance/admin/overview?${qParams}`))
      const overviewJson = await overviewRes.json()
      if (overviewJson.success) {
        setAdminOverview(overviewJson.data)
      }

      const recordsRes = await fetch(buildApiUrl(`/academics/attendance/admin/records?${qParams}`))
      const recordsJson = await recordsRes.json()
      if (recordsJson.success) {
        setAdminRecords(recordsJson.data)
      }
    } catch (err) {
      console.error('Failed to load admin attendance data:', err)
      showToast('Error loading attendance data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchFacultyMarkings = async (date) => {
    setLoading(true)
    try {
      const res = await fetch(buildApiUrl(`/academics/attendance/faculty/markings?date=${date}`))
      const json = await res.json()
      if (json.success) {
        setAdminFacultyMarking(json.data)
      }
    } catch (err) {
      console.error('Failed to load faculty markings:', err)
      showToast('Failed to load faculty attendance', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFacultyAttendance = async () => {
    if (!adminFacultyMarking) return
    setLoading(true)
    try {
      const res = await fetch(buildApiUrl('/academics/attendance/faculty/markings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminFacultyMarking)
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showToast('Faculty attendance saved successfully!')
        fetchFacultyMarkings(adminFacultyDate)
      } else {
        showToast(json.detail || 'Failed to save faculty attendance', 'error')
      }
    } catch (err) {
      showToast('Network error saving faculty attendance', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateFacultyStatus = (facId, newStatus) => {
    setAdminFacultyMarking(prev => {
      if (!prev) return prev
      const updatedEntries = prev.entries.map(e => {
        if (e.facultyId === facId) {
          return { ...e, status: newStatus }
        }
        return e
      })
      return { ...prev, entries: updatedEntries }
    })
  }

  const updateFacultyRemarks = (facId, text) => {
    setAdminFacultyMarking(prev => {
      if (!prev) return prev
      const updatedEntries = prev.entries.map(e => {
        if (e.facultyId === facId) {
          return { ...e, remarks: text }
        }
        return e
      })
      return { ...prev, entries: updatedEntries }
    })
  }

  const fetchLeaveBalance = async () => {
    try {
      const res = await fetch(buildApiUrl(`/faculty/${userId}/leave-balance?academic_year=2025-26`))
      const json = await res.json()
      if (res.ok) {
        setLeaveBalance(json)
      }
    } catch (err) {
      console.error('Failed to fetch leave balance:', err)
    }
  }

  const fetchLeaveHistory = async () => {
    try {
      const res = await fetch(buildApiUrl(`/faculty/${userId}/leaves`))
      const json = await res.json()
      if (res.ok) {
        setLeaveHistory(json)
      }
    } catch (err) {
      console.error('Failed to fetch leave history:', err)
    }
  }

  const handleSubmitLeave = async (e) => {
    e.preventDefault()
    if (!leaveForm.start_date || !leaveForm.end_date) {
      showToast('Please select start and end dates', 'error')
      return
    }
    if (new Date(leaveForm.end_date) < new Date(leaveForm.start_date)) {
      showToast('End date must be on or after start date', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(buildApiUrl(`/faculty/${userId}/leaves`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...leaveForm,
          facultyId: userId
        })
      })
      const json = await res.json()
      if (res.ok) {
        showToast('Leave request submitted successfully!')
        setLeaveForm({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' })
        fetchLeaveBalance()
        fetchLeaveHistory()
      } else {
        showToast(json.detail || 'Failed to submit leave request', 'error')
      }
    } catch (err) {
      showToast('Error submitting leave request', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load Admin Faculty Markings
  useEffect(() => {
    if (isAdmin && adminTab === 'faculty') {
      fetchFacultyMarkings(adminFacultyDate)
    }
  }, [isAdmin, adminTab, adminFacultyDate])

  // Load Faculty Leaves
  useEffect(() => {
    if (isFaculty && facultyTab === 'leaves') {
      fetchLeaveBalance()
      fetchLeaveHistory()
    }
  }, [isFaculty, facultyTab])

  // Load Faculty Subjects on Mount
  useEffect(() => {
    if (isFaculty) {
      fetchFacultySubjects()
      fetchFacultyMarkingsHistory()
    }
  }, [isFaculty])

  const fetchFacultySubjects = async () => {
    try {
      const res = await fetch(buildApiUrl(`/academics/attendance/faculty/${userId}/subjects`))
      const json = await res.json()
      if (json.success) {
        setFacultySubjects(json.data)
        if (json.data.length > 0) {
          setSelectedSubject(json.data[0])
        }
      }
    } catch (err) {
      console.error('Failed to load faculty subjects:', err)
    }
  }

  const fetchFacultyMarkingsHistory = async () => {
    try {
      const res = await fetch(buildApiUrl(`/academics/attendance/markings?faculty=${userId}`))
      const json = await res.json()
      if (json.success) {
        setFacultyMarkingsHistory(json.data)
      }
    } catch (err) {
      console.error('Failed to load marking history:', err)
    }
  }

  // Auto Load Students when Faculty selects Subject
  useEffect(() => {
    if (isFaculty && selectedSubject) {
      loadStudentsForMarking()
    }
  }, [isFaculty, selectedSubject, facultyDate, facultyHour])

  const loadStudentsForMarking = async () => {
    setLoading(true)
    try {
      // 1. Fetch Student List
      const sq = new URLSearchParams({
        dept: selectedSubject.department,
        semester: selectedSubject.semester,
        section: selectedSubject.section
      }).toString()

      const studRes = await fetch(buildApiUrl(`/academics/attendance/students?${sq}`))
      const studJson = await studRes.json()
      if (studJson.success) {
        setStudentList(studJson.data)

        // 2. Fetch existing marking for this slot to populate status if it exists
        const mq = new URLSearchParams({
          class_id: selectedSubject.classId,
          date: facultyDate,
          hour: facultyHour
        }).toString()

        const markRes = await fetch(buildApiUrl(`/academics/attendance/markings?${mq}`))
        const markJson = await markRes.json()

        const initialStatuses = {}
        const initialRemarks = {}

        if (markJson.success && markJson.data.length > 0) {
          const savedMarking = markJson.data[0]
          savedMarking.entries.forEach(e => {
            initialStatuses[e.studentId] = e.status
            initialRemarks[e.studentId] = e.remarks || ''
          })
        } else {
          // Default all to Present
          studJson.data.forEach(s => {
            initialStatuses[s.id] = 'Present'
            initialRemarks[s.id] = ''
          })
        }

        setAttendanceStatuses(initialStatuses)
        setAttendanceRemarks(initialRemarks)
      }
    } catch (err) {
      console.error('Failed to load students for marking:', err)
      showToast('Failed to load students list', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load Student Summary
  useEffect(() => {
    if (isStudent) {
      fetchStudentSummary()
    }
  }, [isStudent])

  const fetchStudentSummary = async () => {
    setLoading(true)
    try {
      const res = await fetch(buildApiUrl(`/academics/attendance/student/${userId}/summary`))
      const json = await res.json()
      if (json.success) {
        setStudentSummary(json.data)
      }
    } catch (err) {
      console.error('Failed to load student summary:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load Finance Eligibility Data
  useEffect(() => {
    if (isFinance) {
      fetchFinanceData()
    }
  }, [isFinance, financeFilters])

  const fetchFinanceData = async () => {
    setLoading(true)
    try {
      const qParams = new URLSearchParams(financeFilters).toString()
      const res = await fetch(buildApiUrl(`/academics/attendance/finance/eligibility?${qParams}`))
      const json = await res.json()
      if (json.success) {
        setFinanceEligibility(json.data)
      }
    } catch (err) {
      console.error('Failed to load eligibility data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch modification history log for a record (Admin view)
  const loadRecordHistory = async (record) => {
    try {
      const res = await fetch(buildApiUrl(`/academics/attendance/markings/${record.classId}/${record.date}/${record.hour}/history`))
      const json = await res.json()
      if (json.success) {
        setAdminRecordHistory(json.data)
      }
    } catch (err) {
      console.error('Failed to load history log:', err)
    }
  }

  // Toggle Lock State (Admin)
  const handleToggleLock = async (record) => {
    try {
      const res = await fetch(buildApiUrl(`/academics/attendance/markings/lock`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: record.classId,
          date: record.date,
          hour: record.hour,
          locked: !record.locked
        })
      })
      const json = await res.json()
      if (json.success) {
        showToast(`Record ${!record.locked ? 'Locked' : 'Unlocked'} successfully`)
        fetchAdminData()
        if (adminSelectedRecord && adminSelectedRecord.id === record.id) {
          setAdminSelectedRecord(prev => ({ ...prev, locked: !prev.locked }))
        }
      } else {
        showToast(json.detail || 'Failed to update lock state', 'error')
      }
    } catch (err) {
      showToast('Error updating lock status', 'error')
    }
  }

  // Submit/Save Attendance Marking (Faculty)
  const handleSaveAttendance = async () => {
    if (!selectedSubject) return

    const entries = studentList.map(s => ({
      studentId: s.id,
      rollNumber: s.rollNumber,
      name: s.name,
      status: attendanceStatuses[s.id] || 'Present',
      remarks: attendanceRemarks[s.id] || ''
    }))

    const payload = {
      classId: selectedSubject.classId,
      classLabel: `${selectedSubject.department} - ${selectedSubject.semester} - ${selectedSubject.section}`,
      date: facultyDate,
      hour: facultyHour,
      subjectCode: selectedSubject.code,
      subjectName: selectedSubject.name,
      markedBy: userId,
      entries
    }

    try {
      const res = await fetch(buildApiUrl('/academics/attendance/markings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showToast('Attendance saved successfully!')
        fetchFacultyMarkingsHistory()
      } else {
        showToast(json.detail || 'Failed to save attendance', 'error')
      }
    } catch (err) {
      showToast('Network error saving attendance', 'error')
    }
  }

  // --- Export Reports Helper (CSV format) ---
  const handleExportCSV = (data, headers, filename) => {
    if (!data || data.length === 0) {
      showToast('No records to export', 'error')
      return
    }
    const csvRows = [headers.join(',')]
    data.forEach(row => {
      const values = headers.map(header => {
        const val = row[header]
        return `"${String(val || '').replace(/"/g, '""')}"`
      })
      csvRows.push(values.join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Report exported successfully')
  }

  // Filter & Search Records (Admin)
  const filteredAdminRecords = useMemo(() => {
    return adminRecords.filter(r => {
      const code = String(r.subjectCode || '').toLowerCase()
      const name = String(r.subjectName || '').toLowerCase()
      const fac = String(r.faculty || '').toLowerCase()
      const term = adminSearch.toLowerCase()
      return code.includes(term) || name.includes(term) || fac.includes(term)
    })
  }, [adminRecords, adminSearch])

  // Filter & Search Students (Finance)
  const filteredFinanceEligibility = useMemo(() => {
    return financeEligibility.filter(e => {
      const name = String(e.studentName || '').toLowerCase()
      const roll = String(e.rollNumber || '').toLowerCase()
      const term = financeSearch.toLowerCase()
      return name.includes(term) || roll.includes(term)
    })
  }, [financeEligibility, financeSearch])

  // Paginated Data
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAdminRecords.slice(start, start + pageSize)
  }, [filteredAdminRecords, currentPage, pageSize])

  const totalPages = Math.ceil(filteredAdminRecords.length / pageSize)

  const activeFilterCount = Object.values(adminFilters).filter(Boolean).length

  const inner = (
    <div className="flex flex-col h-full min-h-0 gap-0 overflow-hidden bg-[#F8FAFC]">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl transition-all duration-300 animate-slide-in ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
          <span className="material-symbols-outlined text-lg">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}


      {/* ========================================================================= */}
      {/* ======================= ADMIN ATTENDANCE LAYOUT ======================== */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="flex flex-col h-full min-h-0 gap-0">

          {/* ── TOP CONTROL BAR ─────────────────────────────────────── */}
          <div className="flex-shrink-0 bg-white border-b border-[#E6EDF2] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">

              {/* Tab pill switcher */}
              <div className="inline-flex bg-[#F2FBFA] border border-[#E6EDF2] rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setAdminTab('students')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${adminTab === 'students'
                      ? 'bg-[#003A40] text-white shadow-sm'
                      : 'text-[#5F6B7A] hover:text-[#003A40]'
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">groups</span>
                  Student Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('faculty')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${adminTab === 'faculty'
                      ? 'bg-[#003A40] text-white shadow-sm'
                      : 'text-[#5F6B7A] hover:text-[#003A40]'
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">badge</span>
                  Faculty Attendance
                </button>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-[#E6EDF2] hidden sm:block" />

              {/* Search Bar */}
              <div className="relative flex-shrink-0">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#9AAAB4] pointer-events-none">search</span>
                <input
                  type="text"
                  placeholder="Search records, subject..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs font-medium border border-[#E6EDF2] rounded-xl bg-[#F8FAFC] text-[#003A40] placeholder-[#9AAAB4] outline-none focus:border-[#0A686A] focus:ring-2 focus:ring-[#0A686A]/10 w-52 transition-all"
                />
                {adminSearch && (
                  <button
                    onClick={() => setAdminSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AAAB4] hover:text-[#003A40] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {/* Toggle Filters Button */}
              <button
                type="button"
                onClick={() => setShowFilters(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${showFilters || activeFilterCount > 0
                    ? 'bg-[#F2FBFA] text-[#0A686A] border border-[#0A686A]/30'
                    : 'bg-[#F4F7FF] text-[#5F6B7A] border border-[#E6EDF2] hover:text-[#003A40]'
                  }`}
              >
                <span className="material-symbols-outlined text-sm">filter_alt</span>
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#0A686A] text-white text-[9px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Export CSV button */}
            <button
              onClick={() => handleExportCSV(adminRecords, ['date', 'subjectCode', 'subjectName', 'faculty', 'department', 'semester', 'section', 'presentCount', 'absentCount', 'attendancePct'], 'Admin-Attendance-Report.csv')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#003A40] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export CSV
            </button>
          </div>

          {/* ── COLLAPSIBLE FILTERS DRAWER ───────────────────────────── */}
          {showFilters && adminTab === 'students' && (
            <div className="flex-shrink-0 bg-white border-b border-[#E6EDF2] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#5F6B7A] uppercase mb-1">Department</label>
                  {role === 'hod' ? (
                    <div className="w-full px-2.5 py-1.5 border border-[#E6EDF2] rounded-xl text-xs text-[#003A40] font-semibold bg-[#F0F7FF] cursor-not-allowed" title="HOD can only view their department">
                      {hodDepartment}
                    </div>
                  ) : (
                    <select
                      className="w-full px-2.5 py-1.5 border border-[#E6EDF2] rounded-xl outline-none text-xs text-[#003A40] font-semibold bg-[#FAFBFC]"
                      value={adminFilters.department}
                      onChange={(e) => setAdminFilters({ ...adminFilters, department: e.target.value })}
                    >
                      <option value="">All Depts</option>
                      {departments.map(d => (
                        <option key={d.code} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[#5F6B7A] uppercase mb-1">Semester</label>
                  <select
                    className="w-full px-2.5 py-1.5 border border-[#E6EDF2] rounded-xl outline-none text-xs text-[#003A40] font-semibold bg-[#FAFBFC]"
                    value={adminFilters.semester}
                    onChange={(e) => setAdminFilters({ ...adminFilters, semester: e.target.value })}
                  >
                    <option value="">All Sems</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={String(s)}>{`Semester ${s}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[#5F6B7A] uppercase mb-1">Section</label>
                  <select
                    className="w-full px-2.5 py-1.5 border border-[#E6EDF2] rounded-xl outline-none text-xs text-[#003A40] font-semibold bg-[#FAFBFC]"
                    value={adminFilters.section}
                    onChange={(e) => setAdminFilters({ ...adminFilters, section: e.target.value })}
                  >
                    <option value="">All Secs</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[#5F6B7A] uppercase mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="Subject code/name..."
                    className="w-full px-2.5 py-1.5 border border-[#E6EDF2] rounded-xl outline-none text-xs text-[#003A40] font-semibold bg-[#FAFBFC]"
                    value={adminFilters.subject}
                    onChange={(e) => setAdminFilters({ ...adminFilters, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[#5F6B7A] uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full px-2.5 py-1.5 border border-[#E6EDF2] rounded-xl outline-none text-xs text-[#003A40] font-semibold bg-[#FAFBFC]"
                    value={adminFilters.startDate}
                    onChange={(e) => setAdminFilters({ ...adminFilters, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[#5F6B7A] uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full px-2.5 py-1.5 border border-[#E6EDF2] rounded-xl outline-none text-xs text-[#003A40] font-semibold bg-[#FAFBFC]"
                    value={adminFilters.endDate}
                    onChange={(e) => setAdminFilters({ ...adminFilters, endDate: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setAdminFilters({ department: role === 'hod' ? hodDepartment : '', semester: '', section: '', subject: '', faculty: '', startDate: '', endDate: '' })
                      setAdminSearch('')
                    }}
                    className="w-full px-3 py-1.5 bg-[#F4F7FF] hover:bg-slate-200 text-[#5F6B7A] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MAIN CONTENT AREA ─────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col p-5 gap-4">

            {adminTab === 'students' && (
              <Fragment>
                {/* KPI Cards */}
                <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-blue-600">group</span>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-[#003A40] leading-none">{adminOverview.totalStudents}</p>
                      <p className="text-[10px] font-extrabold text-[#5F6B7A] mt-0.5 uppercase tracking-wider">Total Students</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-emerald-600">fact_check</span>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-[#003A40] leading-none">{adminOverview.totalSessions}</p>
                      <p className="text-[10px] font-extrabold text-[#5F6B7A] mt-0.5 uppercase tracking-wider">Total Sessions</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-indigo-600">analytics</span>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-[#003A40] leading-none">{adminOverview.averageAttendance}%</p>
                      <p className="text-[10px] font-extrabold text-[#5F6B7A] mt-0.5 uppercase tracking-wider">Avg Attendance %</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-orange-600">warning</span>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-[#003A40] leading-none">{adminOverview.belowThresholdCount}</p>
                      <p className="text-[10px] font-extrabold text-[#5F6B7A] mt-0.5 uppercase tracking-wider">Below Threshold (&lt;75%)</p>
                    </div>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
                  <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] text-[#5F6B7A] text-[10px] font-extrabold uppercase tracking-widest border-b border-[#E6EDF2] sticky top-0 z-10">
                          <th className="px-5 py-3">Date &amp; Hour</th>
                          <th className="px-5 py-3">Subject</th>
                          <th className="px-5 py-3">Faculty</th>
                          <th className="px-5 py-3">Class</th>
                          <th className="px-4 py-3 text-center">Present</th>
                          <th className="px-4 py-3 text-center">Absent</th>
                          <th className="px-4 py-3 text-center">Attendance %</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6EDF2]">
                        {loading ? (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <TableSkeleton cols={8} rows={6} />
                            </td>
                          </tr>
                        ) : paginatedRecords.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-[#5F6B7A] text-xs font-semibold">No attendance records found matching filters.</td>
                          </tr>
                        ) : (
                          paginatedRecords.map((r, idx) => (
                            <tr key={r.id} className={`hover:bg-[#F2FBFA] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`}>
                              <td className="px-5 py-3.5 text-xs font-bold text-[#003A40]">
                                <div>{r.date}</div>
                                <div className="text-[11px] text-[#5F6B7A] font-medium mt-0.5">{r.hour}</div>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="text-xs font-bold text-[#003A40] leading-tight">{r.subjectName}</div>
                                <span className="inline-block text-[9px] font-extrabold text-[#0A686A] bg-[#F2FBFA] border border-[#0A686A]/20 px-1.5 py-0.5 rounded mt-0.5">
                                  {r.subjectCode}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold text-[#5F6B7A]">{r.faculty}</td>
                              <td className="px-5 py-3.5">
                                <div className="text-xs font-bold text-[#003A40]">{r.department}</div>
                                <div className="text-[11px] text-[#5F6B7A] font-medium">{r.semester} • {r.section}</div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {r.presentCount}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                  {r.absentCount}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border ${r.attendancePct >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                  {r.attendancePct}%
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setAdminSelectedRecord(r)
                                      loadRecordHistory(r)
                                    }}
                                    className="p-1 rounded-lg text-[#5F6B7A] hover:text-[#003A40] hover:bg-[#F2FBFA] transition-colors cursor-pointer"
                                    title="View Details &amp; History"
                                  >
                                    <span className="material-symbols-outlined text-base">info</span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleLock(r)}
                                    className={`p-1 rounded-lg transition-colors cursor-pointer ${r.locked ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                    title={r.locked ? 'Unlock Record' : 'Lock Record'}
                                  >
                                    <span className="material-symbols-outlined text-base">{r.locked ? 'lock' : 'lock_open'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {filteredAdminRecords.length > 0 && (
                    <div className="flex-shrink-0 border-t border-[#E6EDF2] px-5 py-2.5 flex items-center justify-between bg-[#FAFBFC]">
                      <span className="text-[11px] font-semibold text-[#5F6B7A]">
                        Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAdminRecords.length)}–{Math.min(currentPage * pageSize, filteredAdminRecords.length)} of {filteredAdminRecords.length} records
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E6EDF2] text-[#5F6B7A] disabled:opacity-40 hover:bg-[#F2FBFA] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        {[...Array(Math.max(1, Math.ceil(filteredAdminRecords.length / pageSize)))].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer ${currentPage === i + 1
                                ? 'bg-[#003A40] text-white'
                                : 'border border-[#E6EDF2] text-[#5F6B7A] hover:bg-[#F2FBFA]'
                              }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredAdminRecords.length / pageSize), p + 1))}
                          disabled={currentPage >= Math.ceil(filteredAdminRecords.length / pageSize)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E6EDF2] text-[#5F6B7A] disabled:opacity-40 hover:bg-[#F2FBFA] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Fragment>
            )}

            {adminTab === 'faculty' && (
              <div className="space-y-6">
                {/* Date Picker & Search controls */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="material-symbols-outlined text-slate-500 text-lg">calendar_today</span>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Faculty Attendance Management</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Attendance Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                        value={adminFacultyDate}
                        onChange={(e) => setAdminFacultyDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                        value={adminFacultyDept}
                        onChange={(e) => setAdminFacultyDept(e.target.value)}
                      >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                          <option key={d.code} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Search Faculty</label>
                      <input
                        type="text"
                        placeholder="Search by name or ID..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                        value={adminFacultySearch}
                        onChange={(e) => setAdminFacultySearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Faculty Markings Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Faculty List & Marking</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!adminFacultyMarking) return
                          const updated = adminFacultyMarking.entries.map(e => ({ ...e, status: 'Present' }))
                          setAdminFacultyMarking({ ...adminFacultyMarking, entries: updated })
                        }}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all border border-emerald-200"
                      >
                        Mark All Present
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!adminFacultyMarking) return
                          const updated = adminFacultyMarking.entries.map(e => ({ ...e, status: 'Absent' }))
                          setAdminFacultyMarking({ ...adminFacultyMarking, entries: updated })
                        }}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all border border-rose-200"
                      >
                        Mark All Absent
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                          <th className="px-6 py-4">Faculty Member</th>
                          <th className="px-6 py-4">Department & Designation</th>
                          <th className="px-6 py-4 text-center">Attendance Status</th>
                          <th className="px-6 py-4 text-right">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!adminFacultyMarking || !adminFacultyMarking.entries || adminFacultyMarking.entries.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">No faculty members found.</td>
                          </tr>
                        ) : (
                          adminFacultyMarking.entries
                            .filter(e => {
                              const deptMatch = !adminFacultyDept || e.department === adminFacultyDept
                              const searchLower = adminFacultySearch.toLowerCase()
                              const nameMatch = !adminFacultySearch ||
                                e.name.toLowerCase().includes(searchLower) ||
                                e.facultyId.toLowerCase().includes(searchLower)
                              return deptMatch && nameMatch
                            })
                            .map(e => (
                              <tr key={e.facultyId} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="text-sm font-semibold text-slate-900">{e.name}</div>
                                  <div className="text-xs font-mono text-slate-500">{e.facultyId}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-slate-800">{e.department}</div>
                                  <div className="text-xs text-slate-500">{e.designation}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {['Present', 'Absent', 'On Leave'].map(status => {
                                      const isSelected = e.status === status
                                      return (
                                        <button
                                          key={status}
                                          type="button"
                                          onClick={() => updateFacultyStatus(e.facultyId, status)}
                                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${isSelected ? (
                                              status === 'Present' ? 'bg-emerald-500 text-white border-emerald-500' :
                                                status === 'Absent' ? 'bg-rose-500 text-white border-rose-500' :
                                                  'bg-amber-500 text-white border-amber-500'
                                            ) : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                          {status}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <input
                                    type="text"
                                    placeholder="Add remarks..."
                                    className="px-3 py-1 border border-slate-200 rounded-lg outline-none text-xs w-48 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/10 text-slate-700"
                                    value={e.remarks || ''}
                                    onChange={(eVal) => updateFacultyRemarks(e.facultyId, eVal.target.value)}
                                  />
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {adminFacultyMarking && adminFacultyMarking.entries && adminFacultyMarking.entries.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleSaveFacultyAttendance}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-600/10"
                      >
                        <span className="material-symbols-outlined text-base">save</span>
                        Submit Faculty Attendance
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Record Modal (Admin View) */}
            {adminSelectedRecord && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-zoom-in">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Attendance Details</h3>
                      <p className="text-sm text-slate-500">{adminSelectedRecord.subjectName || 'N/A'} ({adminSelectedRecord.subjectCode ? adminSelectedRecord.subjectCode.toUpperCase() : 'N/A'})</p>
                    </div>
                    <button
                      onClick={() => setAdminSelectedRecord(null)}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-slate-300 border-0 outline-none cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs text-slate-500 uppercase font-semibold">Date & Hour</span>
                        <div className="text-sm font-semibold text-slate-800">{adminSelectedRecord.date} • {adminSelectedRecord.hour}</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase font-semibold">Marked By</span>
                        <div className="text-sm font-semibold text-slate-800">{adminSelectedRecord.faculty}</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase font-semibold">Class info</span>
                        <div className="text-sm font-semibold text-slate-800">{adminSelectedRecord.semester} • {adminSelectedRecord.section}</div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase font-semibold">Lock State</span>
                        <div className="text-sm font-semibold">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold ${adminSelectedRecord.locked ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                            <span className="material-symbols-outlined text-xs">
                              {adminSelectedRecord.locked ? 'lock' : 'lock_open'}
                            </span>
                            {adminSelectedRecord.locked ? 'Locked' : 'Unlocked'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tabs / Logs Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Enrolled Student List statuses */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-sm">
                          Student Attendance Logs
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[300px]">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                                <th className="px-4 py-2">Roll No</th>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {adminSelectedRecord.entries.map(e => (
                                <tr key={e.studentId} className="hover:bg-slate-50">
                                  <td className="px-4 py-2 font-mono text-slate-600 text-xs">{e.studentId}</td>
                                  <td className="px-4 py-2 text-slate-800 font-medium">{e.name}</td>
                                  <td className="px-4 py-2 text-right">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${e.status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                                        e.status === 'On Duty' ? 'bg-sky-50 text-sky-700' :
                                          e.status === 'Leave' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                      }`}>
                                      {e.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Modification History Logs */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-sm">
                          Modification History Log
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[300px] p-4 space-y-4">
                          {adminRecordHistory.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-10">No modification logs recorded.</p>
                          ) : (
                            adminRecordHistory.map((h, i) => (
                              <div key={h.id} className="border-l-2 border-emerald-500 pl-3 space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-slate-800">By: {h.updatedBy}</span>
                                  <span className="text-slate-400">{new Date(h.updatedAt).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-600">
                                  Attendance list committed/updated. ({h.newEntries.length} entries marked)
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= FACULTY ATTENDANCE LAYOUT ======================== */}
      {/* ========================================================================= */}
      {isFaculty && (
        <div className="space-y-6">
          {/* Faculty Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              type="button"
              onClick={() => setFacultyTab('mark')}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer flex-shrink-0 ${facultyTab === 'mark' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              Mark Attendance
            </button>
            <button
              type="button"
              onClick={() => setFacultyTab('history')}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer flex-shrink-0 ${facultyTab === 'history' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              Attendance History
            </button>
            <button
              type="button"
              onClick={() => setFacultyTab('leaves')}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer flex-shrink-0 ${facultyTab === 'leaves' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              My Leaves & Applications
            </button>
          </div>

          {facultyTab === 'mark' && (
            <div className="space-y-6">
              {/* Faculty filter selections */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Assigned Subject</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                      value={selectedSubject ? `${selectedSubject.classId}::${selectedSubject.code}` : ''}
                      onChange={(e) => {
                        const [classId, code] = e.target.value.split('::')
                        const sub = facultySubjects.find(s => s.classId === classId && s.code === code)
                        setSelectedSubject(sub)
                      }}
                    >
                      {facultySubjects.length === 0 ? (
                        <option value="">No assigned subjects found</option>
                      ) : (
                        facultySubjects.map(s => (
                          <option key={`${s.classId}::${s.code}`} value={`${s.classId}::${s.code}`}>
                            {s.name} ({s.code.toUpperCase()}) • {s.classId}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                      value={facultyDate}
                      onChange={(e) => setFacultyDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Period / Hour</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                      value={facultyHour}
                      onChange={(e) => setFacultyHour(e.target.value)}
                    >
                      {HOURS_LIST.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedSubject && (
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Department</span>
                      <span className="font-bold text-slate-800">{selectedSubject.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Semester</span>
                      <span className="font-bold text-slate-800">{selectedSubject.semester}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Section</span>
                      <span className="font-bold text-slate-800">{selectedSubject.section}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mark Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Students Roll Call</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const updated = {}
                        studentList.forEach(s => { updated[s.id] = 'Present' })
                        setAttendanceStatuses(updated)
                      }}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all border border-emerald-200"
                    >
                      Mark All Present
                    </button>
                    <button
                      onClick={() => {
                        const updated = {}
                        studentList.forEach(s => { updated[s.id] = 'Absent' })
                        setAttendanceStatuses(updated)
                      }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all border border-rose-200"
                    >
                      Mark All Absent
                    </button>
                    <button
                      onClick={() => {
                        const updated = {}
                        studentList.forEach(s => { updated[s.id] = 'Present' })
                        setAttendanceStatuses(updated)
                        setAttendanceRemarks({})
                      }}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-200"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="px-6 py-4">Register Number</th>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">No students enrolled in this subject class.</td>
                        </tr>
                      ) : (
                        studentList.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono text-slate-600">{s.rollNumber}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{s.name}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {['Present', 'Absent', 'Leave', 'On Duty'].map(status => {
                                  const isSelected = attendanceStatuses[s.id] === status
                                  return (
                                    <button
                                      key={status}
                                      onClick={() => setAttendanceStatuses(prev => ({ ...prev, [s.id]: status }))}
                                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${isSelected ? (
                                          status === 'Present' ? 'bg-emerald-500 text-white border-emerald-500' :
                                            status === 'Absent' ? 'bg-rose-500 text-white border-rose-500' :
                                              status === 'Leave' ? 'bg-amber-500 text-white border-amber-500' : 'bg-sky-500 text-white border-sky-500'
                                        ) : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                      {status === 'On Duty' ? 'OD' : status}
                                    </button>
                                  )
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <input
                                type="text"
                                placeholder="Add remarks..."
                                className="px-3 py-1 border border-slate-200 rounded-lg outline-none text-xs w-44 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/10 text-slate-700"
                                value={attendanceRemarks[s.id] || ''}
                                onChange={(e) => setAttendanceRemarks(prev => ({ ...prev, [s.id]: e.target.value }))}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {studentList.length > 0 && (
                  <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
                    <button
                      onClick={handleSaveAttendance}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-600/10"
                    >
                      <span className="material-symbols-outlined text-base">save</span>
                      Submit Attendance
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {facultyTab === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Marked Sessions History</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Period</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Class Room</th>
                      <th className="px-6 py-4 text-center">Present</th>
                      <th className="px-6 py-4 text-center">Absent</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facultyMarkingsHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-sm">No attendance records matching your account.</td>
                      </tr>
                    ) : (
                      facultyMarkingsHistory.map(m => {
                        const pCount = m.entries?.filter(e => e.status === 'Present' || e.status === 'On Duty').length || 0
                        const aCount = m.entries?.filter(e => e.status === 'Absent').length || 0
                        return (
                          <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-slate-800">{m.date}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{m.hour}</td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-slate-900">{m.subjectName}</div>
                              <div className="text-xs text-slate-400">{m.subjectCode ? m.subjectCode.toUpperCase() : ''}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{m.classLabel || m.classId}</td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-emerald-600">{pCount}</td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-rose-500">{aCount}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => {
                                  // Switch to mark view and load subject
                                  const sub = facultySubjects.find(s => s.classId === m.classId && s.code === m.subjectCode)
                                  if (sub) {
                                    setSelectedSubject(sub)
                                  }
                                  setFacultyDate(m.date)
                                  setFacultyHour(m.hour)
                                  setFacultyTab('mark')
                                }}
                                disabled={m.locked}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all border border-slate-200 cursor-pointer"
                              >
                                {m.locked ? 'Locked' : 'Edit'}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {facultyTab === 'leaves' && (
            <div className="space-y-6">
              {/* Leave Balance Grid */}
              {leaveBalance && (
                <KpiGrid className="lg:grid-cols-4">
                  <KpiCard
                    icon="date_range"
                    label="Casual Leave"
                    value={`${(leaveBalance.casual_leave || 15) - (leaveBalance.used_casual || leaveBalance.casual_used || 0)} Remaining`}
                    colorScheme="emerald"
                    subtitle={`Total Days: ${leaveBalance.casual_leave || 15}`}
                  />
                  <KpiCard
                    icon="medical_services"
                    label="Sick Leave"
                    value={`${(leaveBalance.sick_leave || 10) - (leaveBalance.used_sick || leaveBalance.sick_used || 0)} Remaining`}
                    colorScheme="rose"
                    subtitle={`Total Days: ${leaveBalance.sick_leave || 10}`}
                  />
                  <KpiCard
                    icon="school"
                    label="Academic Leave"
                    value={`${(leaveBalance.academic_leave || 5) - (leaveBalance.used_academic || leaveBalance.academic_used || 0)} Remaining`}
                    colorScheme="blue"
                    subtitle={`Total Days: ${leaveBalance.academic_leave || 5}`}
                  />
                  <KpiCard
                    icon="work_off"
                    label="Maternity Leave"
                    value={`${(leaveBalance.maternity_leave || 90) - (leaveBalance.used_maternity || leaveBalance.maternity_used || 0)} Remaining`}
                    colorScheme="indigo"
                    subtitle={`Total Days: ${leaveBalance.maternity_leave || 90}`}
                  />
                </KpiGrid>
              )}

              {/* Leave Apply Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <span className="material-symbols-outlined text-slate-500 text-lg font-bold">add_circle</span>
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Apply for Leave</h3>
                </div>

                <form onSubmit={handleSubmitLeave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Leave Type</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                        value={leaveForm.leave_type}
                        onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                        required
                      >
                        <option value="Casual">Casual Leave</option>
                        <option value="Sick">Sick Leave</option>
                        <option value="Academic">Academic Leave</option>
                        <option value="Maternity">Maternity Leave</option>
                        <option value="Sabbatical">Sabbatical</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                          value={leaveForm.start_date}
                          onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                          value={leaveForm.end_date}
                          onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between space-y-4">
                    <div className="flex-1 flex flex-col">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Reason</label>
                      <textarea
                        placeholder="Please describe the reason for your leave request..."
                        rows="3"
                        className="flex-1 w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 resize-none text-slate-700"
                        value={leaveForm.reason}
                        onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer"
                      >
                        Submit Leave Request
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Leave History Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Leave Applications History</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="px-6 py-4">Applied On</th>
                        <th className="px-6 py-4">Leave Type</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4 text-center">Days</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {leaveHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">No leave requests found.</td>
                        </tr>
                      ) : (
                        leaveHistory.map((l) => (
                          <tr key={l.id || l._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {l.appliedOn ? new Date(l.appliedOn).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{l.leaveType || l.leave_type}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">
                              {l.startDate || l.start_date} to {l.endDate || l.end_date}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-slate-800">{l.noOfDays || l.no_of_days}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={l.reason}>
                              {l.reason}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  l.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                    'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {facultyTab === 'leaves' && (
              <div className="space-y-6">
                {/* Leave Balance Grid */}
                {leaveBalance && (
                  <StatsSection stats={[
                    { value: `${(leaveBalance.casual_leave || 15) - (leaveBalance.used_casual || leaveBalance.casual_used || 0)} Remaining`, label: 'Casual Leave', icon: 'date_range' },
                    { value: `${(leaveBalance.sick_leave || 10) - (leaveBalance.used_sick || leaveBalance.sick_used || 0)} Remaining`, label: 'Sick Leave', icon: 'medical_services' },
                    { value: `${(leaveBalance.academic_leave || 5) - (leaveBalance.used_academic || leaveBalance.academic_used || 0)} Remaining`, label: 'Academic Leave', icon: 'school' },
                    { value: `${(leaveBalance.maternity_leave || 90) - (leaveBalance.used_maternity || leaveBalance.maternity_used || 0)} Remaining`, label: 'Maternity Leave', icon: 'work_off' },
                  ]} />
                )}

                {/* Leave Apply Form */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <span className="material-symbols-outlined text-slate-500 text-lg font-bold">add_circle</span>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Apply for Leave</h3>
                  </div>

                  <form onSubmit={handleSubmitLeave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Leave Type</label>
                        <select
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                          value={leaveForm.leave_type}
                          onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                          required
                        >
                          <option value="Casual">Casual Leave</option>
                          <option value="Sick">Sick Leave</option>
                          <option value="Academic">Academic Leave</option>
                          <option value="Maternity">Maternity Leave</option>
                          <option value="Sabbatical">Sabbatical</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                            value={leaveForm.start_date}
                            onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
                            value={leaveForm.end_date}
                            onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between space-y-4">
                      <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Reason</label>
                        <textarea
                          placeholder="Please describe the reason for your leave request..."
                          rows="3"
                          className="flex-1 w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 resize-none text-slate-700"
                          value={leaveForm.reason}
                          onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer"
                        >
                          Submit Leave Request
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Leave History Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Leave Applications History</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                          <th className="px-6 py-4">Applied On</th>
                          <th className="px-6 py-4">Leave Type</th>
                          <th className="px-6 py-4">Duration</th>
                          <th className="px-6 py-4 text-center">Days</th>
                          <th className="px-6 py-4">Reason</th>
                          <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {leaveHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">No leave requests found.</td>
                          </tr>
                        ) : (
                          leaveHistory.map((l) => (
                            <tr key={l.id || l._id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {l.appliedOn ? new Date(l.appliedOn).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-slate-900">{l.leaveType || l.leave_type}</td>
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {l.startDate || l.start_date} to {l.endDate || l.end_date}
                              </td>
                              <td className="px-6 py-4 text-center text-sm font-bold text-slate-800">{l.noOfDays || l.no_of_days}</td>
                              <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={l.reason}>
                                {l.reason}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                  l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  l.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                  {l.status}
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
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ======================= STUDENT ATTENDANCE LAYOUT ======================= */}
        {/* ========================================================================= */}
        {isStudent && (
          <div className="space-y-6">
            {/* Alerts Block */}
            {studentSummary.overallAttendancePct < 75.0 && (
              <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm animate-pulse ${
                studentSummary.overallAttendancePct < 60.0 
                  ? 'bg-rose-50 border-rose-200 text-rose-800' 
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <span className="material-symbols-outlined text-xl">
                  {studentSummary.overallAttendancePct < 60.0 ? 'dangerous' : 'warning'}
                </span>
                <div>
                  <h4 className="font-bold text-sm">
                    {studentSummary.overallAttendancePct < 60.0 ? 'Critical Attendance Warning!' : 'Low Attendance Alert'}
                  </h4>
                  <p className="text-xs mt-1">
                    Your attendance is currently <b>{studentSummary.overallAttendancePct}%</b>. 
                    {studentSummary.overallAttendancePct < 60.0 
                      ? ' You are in danger of being barred from examinations. Please meet with your coordinator immediately.'
                      : ` Attendance below 75% requires an official explanation. Attend the next few classes to reach safety.`}
                  </p>
                </div>
              </div>
            )}

            {/* Attendance Summary KPIs */}
            <StatsSection stats={[
                { value: `${studentSummary.overallAttendancePct}%`, label: 'Overall Attendance %', icon: 'analytics' },
                { value: studentSummary.totalClassesAttended, label: 'Total Classes Attended', icon: 'check_circle' },
                { value: studentSummary.totalClassesMissed, label: 'Total Classes Missed', icon: 'cancel' }
            ]} />

            {/* Subject wise table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Subject-wise Percentage Breakdown</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4 text-center">Present</th>
                      <th className="px-6 py-4 text-center">Absent</th>
                      <th className="px-6 py-4 text-center">Leave</th>
                      <th className="px-6 py-4 text-center">OD</th>
                      <th className="px-6 py-4 text-center">Total Classes</th>
                      <th className="px-6 py-4 text-center">Attendance %</th>
                      <th className="px-6 py-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentSummary.subjectWise.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-10 text-center text-slate-400 text-sm">No subject-wise attendance logs recorded yet.</td>
                      </tr>
                    ) : (
                      studentSummary.subjectWise.map(s => (
                        <tr key={s.code} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-900">{s.subject}</div>
                            <div className="text-xs text-slate-500 uppercase">{s.code}</div>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-emerald-600">{s.present}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-rose-500">{s.absent}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-amber-500">{s.leave}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-sky-500">{s.od}</td>
                          <td className="px-6 py-4 text-center text-sm text-slate-600">{s.total}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              s.attendancePct >= 75.0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {s.attendancePct}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setStudentSelectedSubjectCode(s.code)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
                            >
                              Logs
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= STUDENT ATTENDANCE LAYOUT ======================= */}
      {/* ========================================================================= */}
      {isStudent && (
        <div className="space-y-6">
          <EnterprisePageTemplate
            kpiCards={[
              {
                title: 'Overall Attendance',
                value: `${studentSummary.overallAttendancePct}%`,
                sub: studentSummary.overallAttendancePct >= 75 ? 'Good standing' : 'Action required',
                trend: studentSummary.overallAttendancePct >= 75 ? 'Safe' : 'Critical',
                trendUp: studentSummary.overallAttendancePct >= 75,
                icon: <span className="material-symbols-outlined">analytics</span>,
                gradient: studentSummary.overallAttendancePct >= 75 ? 'emerald' : 'rose'
              },
              {
                title: 'Total Classes Attended',
                value: studentSummary.totalClassesAttended.toString(),
                sub: 'Classes Present',
                trend: 'Active participation',
                trendUp: true,
                icon: <span className="material-symbols-outlined">check_circle</span>,
                gradient: 'blue'
              },
              {
                title: 'Total Classes Missed',
                value: studentSummary.totalClassesMissed.toString(),
                sub: 'Classes Absent',
                trend: studentSummary.totalClassesMissed > 5 ? 'High absence' : 'Normal',
                trendUp: studentSummary.totalClassesMissed <= 5,
                icon: <span className="material-symbols-outlined">cancel</span>,
                gradient: 'amber'
              }
            ]}
            columns={[
              {
                key: 'subject',
                label: 'Subject Details',
                render: (_, s) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F4F7FF] border border-[#E6EDF2] text-[#003A40] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      <span className="material-symbols-outlined text-sm text-[#0A686A]">book</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#003A40] truncate leading-tight">{s.subject || 'Subject'}</p>
                      <p className="text-[10px] text-[#8C98A5] font-medium truncate uppercase">{s.code}</p>
                    </div>
                  </div>
                )
              },
              {
                key: 'classes',
                label: 'Classes (P/A/L/OD)',
                render: (_, s) => (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600" title="Present">{s.present}</span> /
                    <span className="text-xs font-semibold text-rose-500" title="Absent">{s.absent}</span> /
                    <span className="text-xs font-semibold text-amber-500" title="Leave">{s.leave}</span> /
                    <span className="text-xs font-semibold text-sky-500" title="On Duty">{s.od}</span>
                  </div>
                )
              },
              {
                key: 'total',
                label: 'Total Classes',
                render: (_, s) => <span className="text-xs font-semibold text-[#5F6B7A]">{s.total}</span>
              },
              {
                key: 'attendancePct',
                label: 'Attendance %',
                render: (_, s) => (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.attendancePct >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                    {s.attendancePct}%
                  </span>
                )
              }
            ]}
            rows={studentSummary.subjectWise}
            rowKey="code"
            searchQuery=""
            onSearchChange={() => { }}
            searchPlaceholder="Search subject..."
            filterOptions={[]}
            activeFilters={{}}
            onFilterChange={() => { }}
            loading={loading}
            emptyMessage="No subject-wise attendance logs recorded yet."
            actions={[
              {
                icon: <span className="material-symbols-outlined text-[14px]">info</span>,
                label: 'View Logs',
                color: 'indigo',
                onClick: (s) => setStudentSelectedSubjectCode(s.code),
                showIf: () => true
              }
            ]}
          />

          {/* Subject Log Drilldown Modal */}
          {studentSelectedSubjectCode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-zoom-in">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Detailed Subject Logs</h3>
                    <p className="text-xs text-slate-500">Subject Code: {studentSelectedSubjectCode ? studentSelectedSubjectCode.toUpperCase() : ''}</p>
                  </div>
                  <button
                    onClick={() => setStudentSelectedSubjectCode('')}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-slate-300 border-0 outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Hour</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentSummary.detailedLog
                        .filter(l => l.subjectCode === studentSelectedSubjectCode)
                        .map((l, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-800 font-medium">{l.date}</td>
                            <td className="px-4 py-3 text-slate-500">{l.period}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${l.status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                                  l.status === 'On Duty' ? 'bg-sky-50 text-sky-700' :
                                    l.status === 'Leave' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-slate-500 italic">{l.remarks || '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= FINANCE ATTENDANCE LAYOUT ======================== */}
        {/* ========================================================================= */}
        {isFinance && (() => {
            const kpiCards = [
                {
                    title: 'Total Students',
                    value: filteredFinanceEligibility.length,
                    icon: <Users className="w-5 h-5" />,
                    gradient: 'indigo',
                },
                {
                    title: 'Eligible',
                    value: filteredFinanceEligibility.filter(e => e.eligibilityStatus === 'Eligible').length,
                    icon: <CheckCircle2 className="w-5 h-5" />,
                    gradient: 'emerald',
                },
                {
                    title: 'Warning',
                    value: filteredFinanceEligibility.filter(e => e.eligibilityStatus === 'Warning').length,
                    icon: <AlertTriangle className="w-5 h-5" />,
                    gradient: 'amber',
                },
                {
                    title: 'Not Eligible',
                    value: filteredFinanceEligibility.filter(e => e.eligibilityStatus === 'Not Eligible' || e.eligibilityStatus === 'Critical').length,
                    icon: <XCircle className="w-5 h-5" />,
                    gradient: 'rose',
                }
            ];

            const columns = [
                {
                    key: 'student',
                    label: 'Student Details',
                    render: (_, r) => (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#003A40] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {r.studentName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-[#003A40] truncate leading-tight">{r.studentName}</p>
                                <p className="text-[10px] text-[#8C98A5] font-medium truncate">{r.rollNumber}</p>
                            </div>
                        </div>
                    )
                },
                {
                    key: 'department',
                    label: 'Department & Class',
                    render: (_, r) => (
                        <span className="text-xs font-bold text-[#003A40] block truncate">{r.department} — {r.semester}</span>
                    )
                },
                {
                    key: 'attendancePct',
                    label: 'Attendance %',
                    render: (_, r) => (
                        <span className="text-xs font-extrabold text-[#0A686A] font-['Outfit']">
                            {r.attendancePct}%
                        </span>
                    )
                },
                {
                    key: 'eligibilityStatus',
                    label: 'Eligibility Status',
                    render: (_, r) => {
                        const st = r.eligibilityStatus;
                        const cls = st === 'Eligible' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : st === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200';
                        return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
                                {st}
                            </span>
                        );
                    }
                }
            ];

            const filterOptions = [
                {
                    key: 'department',
                    label: 'Department',
                    options: departments.map(d => ({ value: d.name, label: d.name }))
                },
                {
                    key: 'semester',
                    label: 'Semester',
                    options: [1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: String(s), label: `Semester ${s}` }))
                },
                {
                    key: 'section',
                    label: 'Section',
                    options: [
                        { value: 'A', label: 'Section A' },
                        { value: 'B', label: 'Section B' },
                        { value: 'C', label: 'Section C' }
                    ]
                }
            ];

            return (
                <div style={{ height: 'calc(100vh - 80px)' }}>
                    {loading ? (
                        <TableSkeleton />
                    ) : (
                        <EnterprisePageTemplate
                            kpiCards={kpiCards}
                            columns={columns}
                            rows={filteredFinanceEligibility}
                            actions={[]}
                            rowKey="rollNumber"
                            searchQuery={financeSearch}
                            onSearchChange={setFinanceSearch}
                            searchPlaceholder="Search student..."
                            filterOptions={filterOptions}
                            activeFilters={financeFilters}
                            onFilterChange={(key, val) => setFinanceFilters(prev => ({ ...prev, [key]: val }))}
                            onExportCSV={() => handleExportCSV(financeEligibility, ['rollNumber', 'studentName', 'department', 'semester', 'attendancePct', 'eligibilityStatus'], 'Attendance-Eligibility-Report.csv')}
                            loading={false}
                            emptyMessage="No student records found."
                        />
                    )}
                </div>
            );
        })()}
      </div>
  )

  return noLayout ? inner : <Layout title="Attendance Dashboard" noPadding>{inner}</Layout>
}
