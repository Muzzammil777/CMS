import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import EnterprisePageTemplate from '../components/EnterprisePageTemplate'
import DashboardSkeleton from '../components/DashboardSkeleton'
import { buildApiUrl } from '../api/apiBase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getUserSession } from '../auth/sessionController'
import { Eye, Pencil, Trash2, Users, UserCheck, UserPlus, Filter } from 'lucide-react'
import { getLocalDrafts, deleteLocalDraft } from '../utils/draftManager'

export default function StudentsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialView = searchParams.get('view') === 'drafts' ? 'drafts' : 'all'
  const [viewMode, setViewMode] = useState(initialView)

  const [studentsList, setStudentsList] = useState([])
  const [draftList, setDraftList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState({ department: '', status: '', feeStatus: '' })
  const [newAdmissionsCount, setNewAdmissionsCount] = useState(0)

  const session = getUserSession()
  const role = session?.role || 'admin'

  // ── Sync URL view ────────────────────────────────────────────────────────
  useEffect(() => {
    const currentUrlView = searchParams.get('view') === 'drafts' ? 'drafts' : 'all'
    if (currentUrlView !== viewMode) {
      setViewMode(currentUrlView)
    }
  }, [searchParams])

  // ── Data Fetch ──────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    try {
      setLoading(true)
      const studentsRes = await fetch(buildApiUrl('/students'))
      if (!studentsRes.ok) throw new Error('Failed to fetch students')
      const data = await studentsRes.json()
      setStudentsList(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      console.error('Error fetching students:', err)
      setError('Could not connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  const loadDrafts = () => {
    const drafts = getLocalDrafts('student')
    setDraftList(drafts)
  }

  const fetchAdmissionsCount = async () => {
    if (role === 'faculty') return
    try {
      const res = await fetch(buildApiUrl('/admissions/students'))
      if (res.ok) {
        const admData = await res.json()
        setNewAdmissionsCount(admData.filter(a => (a.status || '').toLowerCase() === 'pending').length)
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchAdmissionsCount()
    loadDrafts()
    window.addEventListener('studentApproved', fetchStudents)
    return () => window.removeEventListener('studentApproved', fetchStudents)
  }, [])

  useEffect(() => {
    if (viewMode === 'drafts') {
      loadDrafts()
    }
  }, [viewMode])

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name}? This cannot be undone.`)) return
    try {
      const res = await fetch(buildApiUrl(`/students/${encodeURIComponent(student.rollNumber || student.id)}`), { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      fetchStudents()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleDeleteDraft = (draft) => {
    if (window.confirm(`Discard draft for "${draft.name || draft.title || 'this record'}"?`)) {
      deleteLocalDraft('student', draft.id)
      loadDrafts()
    }
  }

  const handleExportCSV = () => {
    const targetRows = viewMode === 'drafts' ? filteredDrafts : filtered
    const rows = targetRows.map(s => ({
      Name: s.name || s.title || '',
      Roll: s.rollNumber || s.id || '',
      Email: s.email || '',
      Department: s.department || s.departmentId || '',
      Semester: s.semester || '',
      Status: viewMode === 'drafts' ? 'Draft' : (s.status || ''),
      'Fee Status': s.feeStatus || ''
    }))
    if (!rows.length) return alert('No data to export')
    const header = Object.keys(rows[0]).join(',')
    const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `students_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    const targetRows = viewMode === 'drafts' ? filteredDrafts : filtered
    const rows = targetRows.map(s => [
      s.name || s.title || '',
      s.rollNumber || s.id || '',
      s.department || s.departmentId || '',
      viewMode === 'drafts' ? `Step ${s.currentStep || 1} of 8` : `Sem ${s.semester || 1}`,
      viewMode === 'drafts' ? 'Draft' : (s.status || ''),
      s.feeStatus || '—'
    ])
    if (!rows.length) return alert('No data to export')
    const doc = new jsPDF()
    doc.setFontSize(14); doc.text(`Students Directory (${viewMode.toUpperCase()})`, 14, 20)
    if (typeof autoTable === 'function') {
      autoTable(doc, { head: [['Name', 'ID/Roll', 'Department', 'Semester/Step', 'Status', 'Fee Status']], body: rows, startY: 28, styles: { fontSize: 8 } })
    } else {
      doc.autoTable?.({ head: [['Name', 'ID/Roll', 'Department', 'Semester/Step', 'Status', 'Fee Status']], body: rows, startY: 28 })
    }
    doc.save(`students_${viewMode}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // ── Filter Logic ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return studentsList.filter(s => {
      const q = searchQuery.toLowerCase()
      const matchSearch = !q || (
        (s.name || '').toLowerCase().includes(q) ||
        (s.rollNumber || s.id || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      )
      const matchDept = !activeFilters.department ||
        (s.department || s.departmentId || '').toLowerCase() === activeFilters.department.toLowerCase()
      const matchStatus = !activeFilters.status ||
        (s.status || '').toLowerCase() === activeFilters.status.toLowerCase()
      const matchFee = !activeFilters.feeStatus ||
        (s.feeStatus || '').toLowerCase() === activeFilters.feeStatus.toLowerCase()
      return matchSearch && matchDept && matchStatus && matchFee
    })
  }, [studentsList, searchQuery, activeFilters])

  const filteredDrafts = useMemo(() => {
    return draftList.filter(d => {
      const q = searchQuery.trim().toLowerCase()
      const titleStr = (d.name || d.title || '').toLowerCase()
      const idStr = (d.id || '').toLowerCase()
      const deptStr = (d.department || '').toLowerCase()
      return !q || titleStr.includes(q) || idStr.includes(q) || deptStr.includes(q)
    })
  }, [draftList, searchQuery])

  // ── Main KPI Cards ────────────────────────────────────────────────────────
  const activeCount = studentsList.filter(s => (s.status || '').toLowerCase() === 'active').length
  const paidCount = studentsList.filter(s => (s.feeStatus || '').toLowerCase() === 'paid').length

  const kpiCards = [
    {
      title: 'Total Students', value: loading ? '—' : studentsList.length.toLocaleString(),
      sub: 'All registered students', trend: '↑ 8.3% from last month', trendUp: true,
      icon: <Users className="w-5 h-5" />, gradient: 'indigo'
    },
    {
      title: 'Active Students', value: loading ? '—' : activeCount.toLocaleString(),
      sub: 'Currently enrolled', trend: `${((activeCount / (studentsList.length || 1)) * 100).toFixed(1)}% of total`, trendUp: true,
      icon: <UserCheck className="w-5 h-5" />, gradient: 'emerald'
    },
    {
      title: 'New Admissions', value: loading ? '—' : newAdmissionsCount.toLocaleString(),
      sub: 'Pending approval', trend: '↑ 4.7% this week', trendUp: true,
      icon: <UserPlus className="w-5 h-5" />, gradient: 'amber'
    },
    {
      title: 'Fees Paid', value: loading ? '—' : paidCount.toLocaleString(),
      sub: 'Cleared fee accounts',
      trend: `${((paidCount / (studentsList.length || 1)) * 100).toFixed(1)}% paid`, trendUp: paidCount > studentsList.length / 2,
      icon: <Filter className="w-5 h-5" />, gradient: 'teal'
    },
  ]

  // ── Draft KPI Cards ────────────────────────────────────────────────────────
  const avgDraftProgress = draftList.length
    ? Math.round(draftList.reduce((acc, d) => acc + (d.completionPercentage || 0), 0) / draftList.length)
    : 0

  const draftKpiCards = [
    {
      title: 'Saved Drafts', value: draftList.length.toString(),
      sub: 'Incomplete enrollments', trend: 'Saved locally', trendUp: true,
      icon: <span className="material-symbols-outlined text-lg">drafts</span>, gradient: 'amber'
    },
    {
      title: 'Action Required', value: draftList.length > 0 ? `${draftList.length} Pending` : 'None',
      sub: draftList.length > 0 ? 'Resume enrollment' : 'All students registered', trend: 'Needs completion', trendUp: true,
      icon: <span className="material-symbols-outlined text-lg">pending_actions</span>, gradient: 'indigo'
    },
    {
      title: 'Avg Progress', value: `${avgDraftProgress}%`,
      sub: 'Form completion rate', trend: 'Partial info saved', trendUp: true,
      icon: <span className="material-symbols-outlined text-lg">donut_large</span>, gradient: 'emerald'
    },
    {
      title: 'Latest Draft', value: draftList[0] ? (draftList[0].name?.split(' ')[0] || 'Draft') : 'None',
      sub: draftList[0] ? `Step ${draftList[0].currentStep || 1} of 8` : 'No active draft', trend: 'Ready to continue', trendUp: true,
      icon: <span className="material-symbols-outlined text-lg">history</span>, gradient: 'purple'
    },
  ]

  // ── Status Badges ────────────────────────────────────────────────────────
  const StatusBadge = ({ value, styles }) => {
    const s = (value || '').toUpperCase()
    const cls = styles[s] || 'bg-slate-100 text-slate-600 border-slate-200'
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
        {value || '—'}
      </span>
    )
  }

  const statusStyles = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-rose-50 text-rose-700 border-rose-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    GRADUATED: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  const feeStyles = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  // ── Columns ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name', label: 'Student',
      render: (_, s) => {
        const id = s.student_id || s.id || s.rollNumber
        return (
          <div
            onClick={() => id && navigate(`/students/${encodeURIComponent(id)}`)}
            className="flex items-center gap-3 group cursor-pointer"
            title="Click to view student profile"
          >
            <img
              src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'S')}&background=003A40&color=fff&size=80`}
              alt={s.name}
              className="w-9 h-9 rounded-lg object-cover border border-[#E6EDF2] flex-shrink-0 group-hover:border-[#0A686A] group-hover:scale-105 transition-all"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#003A40] group-hover:text-[#0A686A] group-hover:underline truncate leading-tight transition-colors">
                {s.name}
              </p>
              <p className="text-[10px] text-[#8C98A5] font-medium truncate">{s.student_id || s.rollNumber || s.id}</p>
            </div>
          </div>
        )
      }
    },
    {
      key: 'email', label: 'Email',
      render: (_, s) => <span className="text-xs text-[#5F6B7A] font-medium">{s.email || '—'}</span>
    },
    {
      key: 'department', label: 'Department',
      render: (_, s) => (
        <span className="inline-block px-2.5 py-1 bg-[#F4F7FF] border border-[#E6EDF2] rounded-lg text-xs font-bold text-[#003A40]">
          {s.department || s.departmentId || '—'}
        </span>
      )
    },
    {
      key: 'semester', label: 'Sem / Year',
      render: (_, s) => {
        const rawYr = String(s.year || 1);
        const yrText = rawYr.toLowerCase().includes('yr') || rawYr.toLowerCase().includes('year') ? rawYr : `${rawYr}${rawYr === '1' ? 'st' : rawYr === '2' ? 'nd' : rawYr === '3' ? 'rd' : 'th'} Year`;
        return (
          <div className="text-xs font-medium text-[#003A40]">
            <span className="font-bold">Sem {s.semester || 1}</span>
            <span className="text-[11px] text-[#8C98A5] ml-1.5">· {yrText}</span>
          </div>
        )
      }
    },
    {
      key: 'status', label: 'Status',
      render: (_, s) => <StatusBadge value={s.status} styles={statusStyles} />
    },
    {
      key: 'feeStatus', label: 'Fee Status',
      render: (_, s) => <StatusBadge value={s.feeStatus || 'Pending'} styles={feeStyles} />
    },
  ]

  // ── Draft Columns ────────────────────────────────────────────────────────
  const draftColumns = [
    {
      key: 'title', label: 'Draft Subject',
      render: (_, d) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0 font-bold text-xs shadow-2xs">
            <span className="material-symbols-outlined text-base">edit_note</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#003A40] truncate leading-tight">
              {d.name || d.title || 'Untitled Draft'}
            </p>
            <p className="text-[10px] text-[#8C98A5] font-medium truncate">{d.id}</p>
          </div>
        </div>
      )
    },
    {
      key: 'type', label: 'Type',
      render: (_, d) => (
        <span className="text-xs font-bold text-[#5F6B7A]">{d.type || 'Student Admission'}</span>
      )
    },
    {
      key: 'progress', label: 'Form Progress',
      render: (_, d) => (
        <div className="w-36 space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-[#003A40]">
            <span>Step {d.currentStep || 1} of {d.totalSteps || 8}</span>
            <span>{d.completionPercentage || 0}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${d.completionPercentage || 20}%` }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'department', label: 'Department',
      render: (_, d) => (
        <span className="inline-block px-2.5 py-1 bg-[#F4F7FF] border border-[#E6EDF2] rounded-lg text-xs font-bold text-[#003A40]">
          {d.department || 'Unassigned'}
        </span>
      )
    },
    {
      key: 'lastSaved', label: 'Last Saved',
      render: (_, d) => (
        <span className="text-xs text-[#5F6B7A] font-medium">
          {d.updatedAt ? new Date(d.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
        </span>
      )
    },
    {
      key: 'status', label: 'Status',
      render: () => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-50 text-amber-700 border-amber-200 uppercase tracking-wider">
          DRAFT
        </span>
      )
    },
  ]

  // ── Actions ─────────────────────────────────────────────────────────────
  const tableActions = role === 'faculty' ? [] : [
    {
      icon: <Eye className="w-3.5 h-3.5" />, label: 'View Profile', color: 'teal',
      onClick: (s) => {
        const id = s.student_id || s.id || s.rollNumber
        if (id) navigate(`/students/${encodeURIComponent(id)}`)
      }
    },
    {
      icon: <Pencil className="w-3.5 h-3.5" />, label: 'Edit Student', color: 'blue',
      onClick: (s) => {
        const id = s._id || s.id || s.rollNumber
        navigate(`/edit-student/${encodeURIComponent(id)}`)
      }
    },
    {
      icon: <Trash2 className="w-3.5 h-3.5" />, label: 'Delete Student', color: 'red',
      onClick: handleDelete
    },
  ]

  const draftTableActions = [
    {
      icon: <span className="material-symbols-outlined text-sm">play_arrow</span>, label: 'Resume Admission', color: 'teal',
      onClick: (d) => {
        navigate(`/add-student?draftId=${encodeURIComponent(d.id)}`)
      }
    },
    {
      icon: <Trash2 className="w-3.5 h-3.5" />, label: 'Discard Draft', color: 'red',
      onClick: handleDeleteDraft
    },
  ]

  // ── Filter options ───────────────────────────────────────────────────────
  const deptOptions = useMemo(() => {
    const depts = [...new Set(studentsList.map(s => s.department || s.departmentId).filter(Boolean))]
    return depts.map(d => ({ value: d, label: d }))
  }, [studentsList])

  const filterOptions = [
    { key: 'department', label: 'Department', options: deptOptions },
    { key: 'status', label: 'Status', options: [
      { value: 'Active', label: 'Active' },
      { value: 'Inactive', label: 'Inactive' },
      { value: 'Graduated', label: 'Graduated' },
    ]},
    { key: 'feeStatus', label: 'Fee Status', options: [
      { value: 'Paid', label: 'Paid' },
      { value: 'Pending', label: 'Pending' },
      { value: 'Overdue', label: 'Overdue' },
    ]},
  ]

  // ── Header Toggle Switch ─────────────────────────────────────────────────
  const headerExtraToggle = (
    <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] shadow-2xs">
      <button
        onClick={() => { setViewMode('all'); setSearchParams({}); }}
        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
          viewMode === 'all'
            ? 'bg-white text-[#003A40] shadow-xs'
            : 'text-[#64748B] hover:text-[#003A40]'
        }`}
      >
        All Students ({studentsList.length})
      </button>
      <button
        onClick={() => { setViewMode('drafts'); setSearchParams({ view: 'drafts' }); }}
        className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
          viewMode === 'drafts'
            ? 'bg-[#003A40] text-white shadow-xs'
            : 'text-[#64748B] hover:text-[#003A40]'
        }`}
      >
        <span>Drafts</span>
        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
          viewMode === 'drafts' ? 'bg-amber-400 text-slate-900 font-extrabold' : 'bg-amber-100 text-amber-800 font-bold'
        }`}>
          {draftList.length}
        </span>
      </button>
    </div>
  )

  return (
    <Layout title="Students" headerExtra={headerExtraToggle}>
      {error ? (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-10 text-center">
          <p className="text-rose-700 font-semibold">{error}</p>
          <button onClick={fetchStudents} className="mt-4 px-5 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors cursor-pointer">
            Retry
          </button>
        </div>
      ) : loading ? (
        <DashboardSkeleton />
      ) : (
        <EnterprisePageTemplate
          kpiCards={viewMode === 'drafts' ? draftKpiCards : kpiCards}
          columns={viewMode === 'drafts' ? draftColumns : columns}
          rows={viewMode === 'drafts' ? filteredDrafts : filtered}
          actions={viewMode === 'drafts' ? draftTableActions : tableActions}
          rowKey={viewMode === 'drafts' ? 'id' : 'rollNumber'}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={viewMode === 'drafts' ? "Search drafts by subject or ID..." : "Search by name, roll number, email..."}
          filterOptions={viewMode === 'drafts' ? [] : filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters(prev => ({ ...prev, [key]: val }))}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onAdd={role === 'faculty' ? null : () => navigate('/add-student')}
          addLabel="Add Student"
          onBulkUpload={role === 'faculty' ? null : () => navigate('/bulk-upload-students')}
          loading={false}
          emptyMessage={viewMode === 'drafts' ? "No saved drafts found. Click 'Save Draft' during admission to create one." : "No students match your search or filter."}
        />
      )}
    </Layout>
  )
}
