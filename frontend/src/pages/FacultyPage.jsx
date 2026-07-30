import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import EnterprisePageTemplate from '../components/EnterprisePageTemplate'
import DashboardSkeleton from '../components/DashboardSkeleton'
import { buildApiUrl } from '../api/apiBase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Eye, Pencil, Trash2, Users, UserCheck, Building2, CalendarOff } from 'lucide-react'

export default function FacultyPage() {
  const navigate = useNavigate()
  const [facultyList, setFacultyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState({ department: '', designation: '', status: '' })

  // ── Fetch Faculty ───────────────────────────────────────────────────────
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

  useEffect(() => {
    fetchFaculty()
  }, [])

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

  // ── Export Functions ────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const rows = filteredFaculty.map(f => ({
      Name: f.name || f.fullName || '',
      'Employee ID': f.employeeId || f.id || '',
      Email: f.email || '',
      Department: f.department || f.departmentId || '',
      Designation: f.designation || '',
      Status: f.employment_status || f.status || 'Active'
    }))
    if (!rows.length) return alert('No data to export')
    const header = Object.keys(rows[0]).join(',')
    const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `faculty_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    const rows = filteredFaculty.map(f => [
      f.name || f.fullName || '',
      f.employeeId || f.id || '',
      f.department || f.departmentId || '',
      f.designation || '',
      f.employment_status || f.status || 'Active'
    ])
    if (!rows.length) return alert('No data to export')
    const doc = new jsPDF()
    doc.setFontSize(14); doc.text('Faculty Directory', 14, 20)
    if (typeof autoTable === 'function') {
      autoTable(doc, { head: [['Name', 'ID', 'Department', 'Designation', 'Status']], body: rows, startY: 28, styles: { fontSize: 8 } })
    } else {
      doc.autoTable?.({ head: [['Name', 'ID', 'Department', 'Designation', 'Status']], body: rows, startY: 28 })
    }
    doc.save(`faculty_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredFaculty = useMemo(() => {
    return facultyList.filter(f => {
      const q = searchQuery.toLowerCase()
      const matchSearch = !q || (
        (f.name || f.fullName || '').toLowerCase().includes(q) ||
        (f.employeeId || f.id || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
      )
      const dept = (f.department || f.departmentId || '').toLowerCase()
      const matchDept = !activeFilters.department || dept === activeFilters.department.toLowerCase()
      
      const desig = (f.designation || '').toLowerCase()
      const matchDesig = !activeFilters.designation || desig.includes(activeFilters.designation.toLowerCase())

      const st = (f.employment_status || f.status || 'Active').toLowerCase()
      const matchStatus = !activeFilters.status || st === activeFilters.status.toLowerCase()

      return matchSearch && matchDept && matchDesig && matchStatus
    })
  }, [facultyList, searchQuery, activeFilters])

  // ── KPI Cards ────────────────────────────────────────────────────────────
  const activeCount = facultyList.filter(f => (f.employment_status || f.status || 'active').toLowerCase() === 'active').length
  const leaveCount = facultyList.filter(f => (f.employment_status || f.status || '').toLowerCase().includes('leave')).length
  const deptsCount = new Set(facultyList.map(f => f.department || f.departmentId).filter(Boolean)).size

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
              src={f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || 'F')}&background=003A40&color=fff&size=80`}
              alt={f.name}
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
          {f.department || f.departmentId || 'Computer Science'}
        </span>
      )
    },
    {
      key: 'designation', label: 'Designation',
      render: (_, f) => <span className="text-xs font-bold text-[#003A40]">{f.designation || 'Professor'}</span>
    },
    {
      key: 'experience_years', label: 'Experience',
      render: (_, f) => (
        <span className="text-xs text-[#5F6B7A] font-medium">
          {f.experience_years || f.yearsOfExperience || 5} Yrs
        </span>
      )
    },
    {
      key: 'status', label: 'Status',
      render: (_, f) => {
        const st = (f.employment_status || f.status || 'Active').toUpperCase()
        const cls = statusStyles[st] || 'bg-emerald-50 text-emerald-700 border-emerald-200'
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
            {f.employment_status || f.status || 'Active'}
          </span>
        )
      }
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

  // ── Filter Options ───────────────────────────────────────────────────────
  const deptOptions = useMemo(() => {
    const depts = [...new Set(facultyList.map(f => f.department || f.departmentId).filter(Boolean))]
    const defaultDepts = ['Computer Science', 'Electronics', 'Mechanical', 'Mathematics']
    const merged = [...new Set([...depts, ...defaultDepts])]
    return merged.map(d => ({ value: d, label: d }))
  }, [facultyList])

  const filterOptions = [
    { key: 'department', label: 'Department', options: deptOptions },
    { key: 'designation', label: 'Designation', options: [
      { value: 'Professor', label: 'Professor' },
      { value: 'Associate Professor', label: 'Associate Professor' },
      { value: 'Assistant Professor', label: 'Assistant Professor' },
    ]},
    { key: 'status', label: 'Status', options: [
      { value: 'Active', label: 'Active' },
      { value: 'On Leave', label: 'On Leave' },
      { value: 'Inactive', label: 'Inactive' },
    ]},
  ]

  return (
    <Layout title="Faculty">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <EnterprisePageTemplate
          kpiCards={kpiCards}
          columns={columns}
          rows={filteredFaculty}
          actions={tableActions}
          rowKey="employeeId"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search faculty by name, ID, email..."
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters(prev => ({ ...prev, [key]: val }))}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onAdd={() => navigate('/add-faculty')}
          addLabel="Add Faculty"
          onBulkUpload={() => navigate('/bulk-upload-faculty')}
          loading={false}
          emptyMessage="No faculty members match your search or filter."
        />
      )}
    </Layout>
  )
}
