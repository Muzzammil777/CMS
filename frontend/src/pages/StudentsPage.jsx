import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import EnterprisePageTemplate from '../components/EnterprisePageTemplate'
import DashboardSkeleton from '../components/DashboardSkeleton'
import { buildApiUrl } from '../api/apiBase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getUserSession } from '../auth/sessionController'
import { Eye, Pencil, Trash2, Users, UserCheck, UserPlus, Filter } from 'lucide-react'

export default function StudentsPage() {
  const navigate = useNavigate()
  const [studentsList, setStudentsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState({ department: '', status: '', feeStatus: '' })
  const [newAdmissionsCount, setNewAdmissionsCount] = useState(0)

  const session = getUserSession()
  const role = session?.role || 'admin'
  const userId = session?.userId

  // ── Data Fetch ──────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    try {
      setLoading(true)
      const [studentsRes, admissionsRes] = await Promise.all([
        fetch(buildApiUrl('/students')),
        role !== 'faculty' ? fetch(buildApiUrl('/admissions/students')) : Promise.resolve(null)
      ])
      if (!studentsRes.ok) throw new Error('Failed to fetch students')
      const data = await studentsRes.json()
      setStudentsList(data)

      if (admissionsRes?.ok) {
        const admData = await admissionsRes.json()
        setNewAdmissionsCount(admData.filter(a => (a.status || '').toLowerCase() === 'pending').length)
      }
      setError(null)
    } catch (err) {
      console.error('Error fetching students:', err)
      setError('Could not connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
    window.addEventListener('studentApproved', fetchStudents)
    return () => window.removeEventListener('studentApproved', fetchStudents)
  }, [])

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

  const handleExportCSV = () => {
    const rows = filtered.map(s => ({
      Name: s.name || '', Roll: s.rollNumber || s.id || '',
      Email: s.email || '', Department: s.department || s.departmentId || '',
      Semester: s.semester || '', Status: s.status || '', 'Fee Status': s.feeStatus || ''
    }))
    if (!rows.length) return alert('No data to export')
    const header = Object.keys(rows[0]).join(',')
    const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    const rows = filtered.map(s => [s.name || '', s.rollNumber || s.id || '', s.department || s.departmentId || '', `Sem ${s.semester || 1}`, s.status || '', s.feeStatus || ''])
    if (!rows.length) return alert('No data to export')
    const doc = new jsPDF()
    doc.setFontSize(14); doc.text('Students Directory', 14, 20)
    if (typeof autoTable === 'function') {
      autoTable(doc, { head: [['Name', 'Roll No', 'Department', 'Semester', 'Status', 'Fee Status']], body: rows, startY: 28, styles: { fontSize: 8 } })
    } else {
      doc.autoTable?.({ head: [['Name', 'Roll No', 'Department', 'Semester', 'Status', 'Fee Status']], body: rows, startY: 28 })
    }
    doc.save(`students_${new Date().toISOString().slice(0, 10)}.pdf`)
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

  // ── KPI Cards ────────────────────────────────────────────────────────────
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

  // ── Status Badge Render ──────────────────────────────────────────────────
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

  return (
    <Layout title="Students">
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
          kpiCards={kpiCards}
          columns={columns}
          rows={filtered}
          actions={tableActions}
          rowKey="rollNumber"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name, roll number, email..."
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters(prev => ({ ...prev, [key]: val }))}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onAdd={role === 'faculty' ? null : () => navigate('/add-student')}
          addLabel="Add Student"
          onBulkUpload={role === 'faculty' ? null : () => navigate('/bulk-upload-students')}
          loading={false}
          emptyMessage="No students match your search or filter."
        />
      )}
    </Layout>
  )
}
