import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import EnterprisePageTemplate from '../components/EnterprisePageTemplate'
import DashboardSkeleton from '../components/DashboardSkeleton'
import { buildApiUrl } from '../api/apiBase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Eye, Pencil, Trash2, Users, UserCheck, Building2, CalendarOff } from 'lucide-react'
import { getLocalDrafts, deleteLocalDraft } from '../utils/draftManager'

export default function FacultyPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialView = searchParams.get('view') === 'drafts' ? 'drafts' : 'all'
  const [viewMode, setViewMode] = useState(initialView)

  const [facultyList, setFacultyList] = useState([])
  const [draftList, setDraftList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState({ department: '', designation: '', status: '' })

  // ── Sync URL view ────────────────────────────────────────────────────────
  useEffect(() => {
    const currentUrlView = searchParams.get('view') === 'drafts' ? 'drafts' : 'all'
    if (currentUrlView !== viewMode) {
      setViewMode(currentUrlView)
    }
  }, [searchParams])

  // ── Fetch Faculty & Drafts ───────────────────────────────────────────────
  const fetchFaculty = async () => {
    setLoading(true)
    try {
      const response = await fetch(buildApiUrl('/faculty'))
      if (!response.ok) throw new Error('Failed to fetch faculty list')
      const data = await response.json()
      setFacultyList(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      console.error('Error fetching faculty:', err)
      setError('Could not fetch faculty records.')
      setFacultyList([])
    } finally {
      setLoading(false)
    }
  }

  const loadDrafts = () => {
    const drafts = getLocalDrafts('faculty')
    setDraftList(drafts)
  }

  useEffect(() => {
    fetchFaculty()
    loadDrafts()
  }, [])

  useEffect(() => {
    if (viewMode === 'drafts') {
      loadDrafts()
    }
  }, [viewMode])

  // ── Delete Faculty ──────────────────────────────────────────────────────
  const handleDelete = async (faculty) => {
    const fid = faculty.employeeId || faculty.id || faculty._id
    if (!window.confirm(`Delete ${faculty.name || 'this faculty member'}?`)) return
    try {
      const res = await fetch(buildApiUrl(`/faculty/${encodeURIComponent(fid)}`), { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      fetchFaculty()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleDeleteDraft = (draft) => {
    if (window.confirm(`Discard draft for "${draft.name || draft.title || 'this record'}"?`)) {
      deleteLocalDraft('faculty', draft.id)
      loadDrafts()
    }
  }

  // ── Export Functions ────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const targetRows = viewMode === 'drafts' ? filteredDrafts : filteredFaculty
    const rows = targetRows.map(f => ({
      Name: f.name || f.fullName || f.title || '',
      ID: f.employeeId || f.id || '',
      Email: f.email || '',
      Department: f.department || '',
      Type: f.type || f.designation || 'Faculty',
      Status: viewMode === 'drafts' ? 'Draft' : (f.employment_status || f.status || 'Active')
    }))
    if (!rows.length) return alert('No data to export')
    const header = Object.keys(rows[0]).join(',')
    const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `faculty_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    const targetRows = viewMode === 'drafts' ? filteredDrafts : filteredFaculty
    const rows = targetRows.map(f => [
      f.name || f.fullName || f.title || '',
      f.employeeId || f.id || '',
      f.department || '',
      f.designation || f.type || 'Faculty',
      viewMode === 'drafts' ? 'Draft' : (f.employment_status || f.status || 'Active')
    ])
    if (!rows.length) return alert('No data to export')
    const doc = new jsPDF()
    doc.setFontSize(14); doc.text(`Faculty Directory (${viewMode.toUpperCase()})`, 14, 20)
    if (typeof autoTable === 'function') {
      autoTable(doc, { head: [['Name', 'ID', 'Department', 'Designation/Type', 'Status']], body: rows, startY: 28, styles: { fontSize: 8 } })
    } else {
      doc.autoTable?.({ head: [['Name', 'ID', 'Department', 'Designation/Type', 'Status']], body: rows, startY: 28 })
    }
    doc.save(`faculty_${viewMode}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // ── Helper functions for safe string extraction ────────────────────────────
  const getFacultyDept = (f) => {
    const d = f.department || f.departmentId || f.department_id
    if (typeof d === 'string') return d
    if (typeof d === 'object' && d !== null) return d.name || d.label || d.title || d.code || ''
    return ''
  }

  const getFacultyDesig = (f) => {
    return f.designation || f.role || f.title || f.position || ''
  }

  const getFacultyStatus = (f) => {
    return f.employment_status || f.status || f.employmentType || 'Active'
  }

  // ── Filtering Main Faculty ─────────────────────────────────────────────────
  const filteredFaculty = useMemo(() => {
    return facultyList.filter(f => {
      const q = searchQuery.trim().toLowerCase()
      const nameStr = (f.name || f.fullName || '').toLowerCase()
      const idStr = (f.employeeId || f.id || f._id || '').toLowerCase()
      const emailStr = (f.email || '').toLowerCase()
      const phoneStr = (f.phone || '').toLowerCase()
      const deptStr = getFacultyDept(f).toLowerCase()
      const desigStr = getFacultyDesig(f).toLowerCase()

      const matchSearch = !q || (
        nameStr.includes(q) ||
        idStr.includes(q) ||
        emailStr.includes(q) ||
        phoneStr.includes(q) ||
        deptStr.includes(q) ||
        desigStr.includes(q)
      )

      const filterDept = (activeFilters.department || '').trim().toLowerCase()
      const matchDept = !filterDept || (
        deptStr.includes(filterDept) || filterDept.includes(deptStr)
      )

      const filterDesig = (activeFilters.designation || '').trim().toLowerCase()
      const matchDesig = !filterDesig || (
        desigStr.includes(filterDesig) || filterDesig.includes(desigStr)
      )

      const filterStatus = (activeFilters.status || '').trim().toLowerCase()
      const statusStr = getFacultyStatus(f).toLowerCase()
      const matchStatus = !filterStatus || (
        statusStr.includes(filterStatus) || filterStatus.includes(statusStr)
      )

      return matchSearch && matchDept && matchDesig && matchStatus
    })
  }, [facultyList, searchQuery, activeFilters])

  // ── Filtering Drafts ───────────────────────────────────────────────────────
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
  const activeCount = facultyList.filter(f => getFacultyStatus(f).toLowerCase() === 'active').length
  const leaveCount = facultyList.filter(f => getFacultyStatus(f).toLowerCase().includes('leave')).length
  const deptsCount = new Set(facultyList.map(getFacultyDept).filter(Boolean)).size

  const kpiCards = [
    {
      title: 'Total Faculty', value: loading ? '—' : facultyList.length.toLocaleString(),
      sub: 'All academic staff', trend: '↑ 4.2% from last term', trendUp: true,
      icon: <Users className="w-5 h-5" />, gradient: 'indigo'
    },
    {
      title: 'Active Members', value: loading ? '—' : activeCount.toLocaleString(),
      sub: 'On campus & teaching', trend: `${((activeCount / (facultyList.length || 1)) * 100).toFixed(1)}% active`, trendUp: true,
      icon: <UserCheck className="w-5 h-5" />, gradient: 'emerald'
    },
    {
      title: 'Departments', value: loading ? '—' : (deptsCount || 4).toLocaleString(),
      sub: 'Academic divisions', trend: 'Across institution', trendUp: true,
      icon: <Building2 className="w-5 h-5" />, gradient: 'sky'
    },
    {
      title: 'On Leave', value: loading ? '—' : leaveCount.toLocaleString(),
      sub: 'Approved leave status', trend: leaveCount > 0 ? 'Requires coverage' : 'Full attendance', trendUp: leaveCount === 0,
      icon: <CalendarOff className="w-5 h-5" />, gradient: 'rose'
    },
  ]

  // ── Draft KPI Cards ────────────────────────────────────────────────────────
  const avgDraftProgress = draftList.length
    ? Math.round(draftList.reduce((acc, d) => acc + (d.completionPercentage || 0), 0) / draftList.length)
    : 0

  const draftKpiCards = [
    {
      title: 'Saved Drafts', value: draftList.length.toString(),
      sub: 'Incomplete registrations', trend: 'Saved locally', trendUp: true,
      icon: <span className="material-symbols-outlined text-lg">drafts</span>, gradient: 'amber'
    },
    {
      title: 'Action Required', value: draftList.length > 0 ? `${draftList.length} Pending` : 'None',
      sub: draftList.length > 0 ? 'Resume submission' : 'All registrations active', trend: 'Needs completion', trendUp: true,
      icon: <span className="material-symbols-outlined text-lg">pending_actions</span>, gradient: 'indigo'
    },
    {
      title: 'Avg Progress', value: `${avgDraftProgress}%`,
      sub: 'Form completion rate', trend: 'Partial info saved', trendUp: true,
      icon: <span className="material-symbols-outlined text-lg">donut_large</span>, gradient: 'emerald'
    },
    {
      title: 'Latest Draft', value: draftList[0] ? (draftList[0].name?.split(' ')[0] || 'Draft') : 'None',
      sub: draftList[0] ? `Step ${draftList[0].currentStep || 1} of ${draftList[0].totalSteps || 5}` : 'No active draft', trend: 'Ready to continue', trendUp: true,
      icon: <span className="material-symbols-outlined text-lg">history</span>, gradient: 'purple'
    },
  ]

  // ── Status Badges ────────────────────────────────────────────────────────
  const statusStyles = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-rose-50 text-rose-700 border-rose-200',
    ON_LEAVE: 'bg-amber-50 text-amber-700 border-amber-200',
    'ON LEAVE': 'bg-amber-50 text-amber-700 border-amber-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name', label: 'Faculty Member',
      render: (_, f) => {
        const fid = f.employeeId || f.id || f._id
        return (
          <div
            onClick={() => fid && navigate(`/faculty/${encodeURIComponent(fid)}`)}
            className="flex items-center gap-3 group cursor-pointer"
            title="Click to view faculty profile"
          >
            <img
              src={f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || f.fullName || 'F')}&background=003A40&color=fff&size=80`}
              alt={f.name || f.fullName}
              className="w-9 h-9 rounded-lg object-cover border border-[#E6EDF2] flex-shrink-0 group-hover:border-[#0A686A] group-hover:scale-105 transition-all"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#003A40] group-hover:text-[#0A686A] group-hover:underline truncate leading-tight transition-colors">
                {f.name || f.fullName}
              </p>
              <p className="text-[10px] text-[#8C98A5] font-medium truncate">{f.employeeId || f.id || 'FAC'}</p>
            </div>
          </div>
        )
      }
    },
    {
      key: 'email', label: 'Email',
      render: (_, f) => <span className="text-xs text-[#5F6B7A] font-medium">{f.email || '—'}</span>
    },
    {
      key: 'department', label: 'Department',
      render: (_, f) => (
        <span className="inline-block px-2.5 py-1 bg-[#F4F7FF] border border-[#E6EDF2] rounded-lg text-xs font-bold text-[#003A40]">
          {getFacultyDept(f) || 'Information Technology'}
        </span>
      )
    },
    {
      key: 'designation', label: 'Designation',
      render: (_, f) => <span className="text-xs font-bold text-[#003A40]">{getFacultyDesig(f) || 'Assistant Professor'}</span>
    },
    {
      key: 'experience_years', label: 'Experience',
      render: (_, f) => (
        <span className="text-xs text-[#5F6B7A] font-medium">
          {f.experience_years || f.yearsOfExperience || 0} Yrs
        </span>
      )
    },
    {
      key: 'status', label: 'Status',
      render: (_, f) => {
        const stLabel = getFacultyStatus(f)
        const stKey = stLabel.toUpperCase()
        const cls = statusStyles[stKey] || 'bg-emerald-50 text-emerald-700 border-emerald-200'
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
            {stLabel}
          </span>
        )
      }
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
        <span className="text-xs font-bold text-[#5F6B7A]">{d.type || 'Faculty Registration'}</span>
      )
    },
    {
      key: 'progress', label: 'Form Progress',
      render: (_, d) => (
        <div className="w-36 space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-[#003A40]">
            <span>Step {d.currentStep || 1} of {d.totalSteps || 5}</span>
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

  // ── Row Actions ──────────────────────────────────────────────────────────
  const tableActions = [
    {
      icon: <Eye className="w-3.5 h-3.5" />, label: 'View Profile', color: 'teal',
      onClick: (f) => {
        const fid = f.employeeId || f.id || f._id
        if (fid) navigate(`/faculty/${encodeURIComponent(fid)}`)
      }
    },
    {
      icon: <Pencil className="w-3.5 h-3.5" />, label: 'Edit Faculty', color: 'blue',
      onClick: (f) => {
        const fid = f.employeeId || f.id || f._id
        navigate(`/edit-faculty/${encodeURIComponent(fid)}`)
      }
    },
    {
      icon: <Trash2 className="w-3.5 h-3.5" />, label: 'Delete Faculty', color: 'red',
      onClick: handleDelete
    },
  ]

  const draftTableActions = [
    {
      icon: <span className="material-symbols-outlined text-sm">play_arrow</span>, label: 'Resume Registration', color: 'teal',
      onClick: (d) => {
        navigate(`/add-faculty?draftId=${encodeURIComponent(d.id)}`)
      }
    },
    {
      icon: <Trash2 className="w-3.5 h-3.5" />, label: 'Discard Draft', color: 'red',
      onClick: handleDeleteDraft
    },
  ]

  // ── Filter Options ───────────────────────────────────────────────────────
  const deptOptions = useMemo(() => {
    const rawDepts = facultyList.map(getFacultyDept).filter(Boolean)
    const defaults = ['Medical Laboratory Technology', 'Operation Theatre & Anaesthesia Technology', 'Radiography & Imaging Technology']
    const all = [...new Set([...rawDepts, ...defaults])]
    return all.map(d => ({ value: d, label: d }))
  }, [facultyList])

  const desigOptions = useMemo(() => {
    const rawDesigs = facultyList.map(getFacultyDesig).filter(Boolean)
    const defaults = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Head of Department']
    const all = [...new Set([...rawDesigs, ...defaults])]
    return all.map(d => ({ value: d, label: d }))
  }, [facultyList])

  const statusOptions = useMemo(() => {
    const rawStatuses = facultyList.map(getFacultyStatus).filter(Boolean)
    const defaults = ['Active', 'On Leave', 'Inactive']
    const all = [...new Set([...rawStatuses, ...defaults])]
    return all.map(s => ({ value: s, label: s }))
  }, [facultyList])

  const filterOptions = [
    { key: 'department', label: 'Department', options: deptOptions },
    { key: 'designation', label: 'Designation', options: desigOptions },
    { key: 'status', label: 'Status', options: statusOptions },
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
        All Faculty ({facultyList.length})
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
    <Layout title="Faculty" headerExtra={headerExtraToggle}>
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <EnterprisePageTemplate
          kpiCards={viewMode === 'drafts' ? draftKpiCards : kpiCards}
          columns={viewMode === 'drafts' ? draftColumns : columns}
          rows={viewMode === 'drafts' ? filteredDrafts : filteredFaculty}
          actions={viewMode === 'drafts' ? draftTableActions : tableActions}
          rowKey={viewMode === 'drafts' ? 'id' : 'employeeId'}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={viewMode === 'drafts' ? "Search drafts by subject or ID..." : "Search faculty by name, ID, email..."}
          filterOptions={viewMode === 'drafts' ? [] : filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters(prev => ({ ...prev, [key]: val }))}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onAdd={() => navigate('/add-faculty')}
          addLabel="Add Faculty"
          onBulkUpload={() => navigate('/bulk-upload-faculty')}
          loading={false}
          emptyMessage={viewMode === 'drafts' ? "No saved drafts found. Click 'Save Draft' during registration to create one." : "No faculty members match your search or filter."}
        />
      )}
    </Layout>
  )
}
