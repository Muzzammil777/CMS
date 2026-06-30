import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import SearchFilter from '../components/SearchFilter'
import StudentTable from '../components/StudentTable'
import { PageContainer, StatsSection, Pagination, TableSkeleton } from '../components/common'
import { buildApiUrl } from '../api/apiBase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getUserSession } from '../auth/sessionController'

export default function StudentsPage() {
  const navigate = useNavigate()
  const [studentsList, setStudentsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [newAdmissionsCount, setNewAdmissionsCount] = useState(0)
  const [assignedSubjects, setAssignedSubjects] = useState([])
  const itemsPerPage = 3

  const session = getUserSession()
  const role = session?.role || 'admin'
  const userId = session?.userId

  const slugify = (text) => {
    return (text || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  const getStudentClassId = (student) => {
    const dept = slugify(student.departmentId || student.department);
    const sem = String(student.semester || '1');
    const sec = (student.section || 'A').toLowerCase();
    return `${dept}-${sem}-${sec}`;
  }

  const fetchStudents = async () =>{
    try {
      setLoading(true)
      const promises = [
        fetch(buildApiUrl('/students'))
      ];
      if (role === 'faculty' && userId) {
        promises.push(fetch(buildApiUrl(`/academics/attendance/faculty/${encodeURIComponent(userId)}/subjects`)));
      } else {
        promises.push(fetch(buildApiUrl('/admissions/students')));
      }

      const [studentsRes, secondRes] = await Promise.all(promises);
      
      if (!studentsRes.ok) throw new Error('Failed to fetch students')
      const studentsData = await studentsRes.json()
      setStudentsList(studentsData)

      if (role === 'faculty') {
        if (secondRes && secondRes.ok) {
          const subjectsData = await secondRes.json()
          setAssignedSubjects(subjectsData.success ? subjectsData.data : [])
        }
      } else {
        if (secondRes && secondRes.ok) {
          const admissionsData = await secondRes.json()
          const pendingCount = admissionsData.filter(a => (a.status || '').toLowerCase() === 'pending').length
          setNewAdmissionsCount(pendingCount)
        }
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching students:', err)
      setError('Could not connect to backend. Please ensure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    fetchStudents()
    
    // Listen for student approval events from AdmissionContext
    const handleStudentApproved = (event) =>{
      console.log(' Student approved event received:', event.detail);
      // Refresh students list after a short delay to ensure DB is updated
      setTimeout(() =>{
        fetchStudents();
      }, 500);
    };
    
    window.addEventListener('studentApproved', handleStudentApproved);
    
    return () =>{
      window.removeEventListener('studentApproved', handleStudentApproved);
    };
  }, [])

  const handleDelete = async (student) =>{
    if (window.confirm(`Are you sure you want to delete ${student.name} (Roll: ${student.rollNumber})? This action cannot be undone.`)) {
      try {
        const res = await fetch(buildApiUrl(`/students/${encodeURIComponent(student.rollNumber)}`), {
          method: 'DELETE'
        })
        if (!res.ok) throw new Error('Failed to delete student')
        alert('Student deleted successfully')
        fetchStudents()
      } catch (err) {
        console.error('Delete error:', err)
        alert(`Error: ${err.message}`)
      }
    }
  }

  const handleEdit = (student) =>{
    const studentId = student._id || student.id || student.rollNumber
    navigate(`/edit-student/${encodeURIComponent(studentId)}`)
  }

  const getStats = () =>({
    total: studentsList.length,
    active: studentsList.filter(s =>s.status === 'active' || s.status === 'Active').length
  })

  const stats = getStats()

  const filtered = studentsList.filter(s =>{
    // Faculty-specific filtering:
    if (role === 'faculty') {
      const studentClassId = getStudentClassId(s);
      const isMyStudent = assignedSubjects.some(sub => {
        const subClassId = slugify(sub.classId || '');
        const isClassMatch = subClassId === studentClassId || subClassId.includes(studentClassId) || studentClassId.includes(subClassId);
        
        const isDeptMatch = slugify(sub.department) === slugify(s.departmentId || s.department);
        const subSemStr = String(sub.semester || '').replace(/[^\d]/g, '');
        const studSemStr = String(s.semester || '').replace(/[^\d]/g, '');
        const isSemMatch = subSemStr === studSemStr;
        
        const isSecMatch = (sub.section || '').toLowerCase().trim() === (s.section || '').toLowerCase().trim();
        
        return isClassMatch || (isDeptMatch && isSemMatch && isSecMatch);
      });
      if (!isMyStudent) return false;
    }

    // Apply department/status filters if set
    if (departmentFilter) {
      const dep = (s.department || '').toLowerCase()
      if (!dep.includes(departmentFilter.toLowerCase())) return false
    }
    if (statusFilter) {
      const st = (s.status || '').toLowerCase()
      if (!st.includes(statusFilter.toLowerCase())) return false
    }
    const name = s.name || ''
    const rollNumber = s.rollNumber || s.id || ''
    const email = s.email || ''
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleFilterClick = () =>{
    const dep = window.prompt('Filter by department (leave empty to clear):', departmentFilter || '')
    if (dep === null) return // cancelled
    setDepartmentFilter(dep || '')
    const st = window.prompt('Filter by status (e.g. Active) (leave empty to clear):', statusFilter || '')
    if (st === null) return
    setStatusFilter(st || '')
    setCurrentPage(1)
  }

  const handleExportClick = async () =>{
    // Ask which format
    const fmt = (window.prompt('Export format: csv or pdf (default csv)', 'csv') || 'csv').toLowerCase()
    const rows = filtered.map(s =>({
      Name: s.name || s.fullName || '',
      Roll: s.rollNumber || s.id || '',
      Email: s.email || '',
      Department: s.department || '',
      Status: s.status || ''
    }))
    if (rows.length === 0) { alert('No data to export'); return }

    if (fmt === 'pdf') {
      try {
        const doc = new jsPDF()
        const header = Object.keys(rows[0])
        const data = rows.map(r =>header.map(h =>r[h]))

        // Support both plugin styles: autoTable(doc, opts) or doc.autoTable(opts)
        if (typeof autoTable === 'function') {
          autoTable(doc, { head: [header], body: data, styles: { fontSize: 8 } })
        } else if (typeof doc.autoTable === 'function') {
          doc.autoTable({ head: [header], body: data, styles: { fontSize: 8 } })
        } else {
          throw new Error('jspdf-autotable plugin not available')
        }

        doc.save(`students_export_${new Date().toISOString().slice(0,10)}.pdf`)
      } catch (e) {
        console.error('PDF export failed', e)
        alert('PDF export failed: ' + (e.message || e))
      }
      return
    }

    // default to CSV
    const header = Object.keys(rows[0]).join(',')
    const csv = [header].concat(rows.map(r =>Object.values(r).map(v =>`"${String(v).replace(/"/g, '""')}"`).join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students_export_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginatedStudents = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSearch = (val) =>{ setSearchQuery(val); setCurrentPage(1) }

  const statsData = role === 'faculty' ? [
    { value: loading ? '...' : filtered.length, label: 'My Students', icon: 'group' },
    { value: loading ? '...' : filtered.filter(s => s.status === 'active' || s.status === 'Active').length, label: 'Active Today', icon: 'bolt' },
    { value: loading ? '...' : new Set(assignedSubjects.map(sub => sub.classId)).size, label: 'Classes Taught', icon: 'menu_book' },
    { value: filtered.length, label: 'Filtered Results', icon: 'search' },
  ] : [
    { value: loading ? '...' : stats.total, label: 'Total Students', icon: 'group' },
    { value: loading ? '...' : stats.active, label: 'Active Today', icon: 'bolt' },
    { value: loading ? '...' : newAdmissionsCount, label: 'New Admissions', icon: 'person_add' },
    { value: filtered.length, label: 'Filtered Results', icon: 'search' },
  ]

  return (
    <Layout title="Students"><PageContainer>{/* Stats Section */}
        <StatsSection stats={statsData} />{/* Search / Filter Toolbar */}
        <div className="mb-6"><SearchFilter
            searchQuery={searchQuery}
            onSearchChange={handleSearch}
            onFilterClick={handleFilterClick}
            onExportClick={handleExportClick}
            onAddClick={role === 'faculty' ? null : () => navigate('/add-student')}
            addButtonLabel="Add Student"
            onBulkClick={role === 'faculty' ? null : () => navigate('/bulk-upload-students')}
          /></div>{/* Student Table / State Displays */}
        {error ? (
          <div className="bg-red-50 border border-red-100 rounded-lg p-8 text-center"><span className="material-symbols-outlined text-red-400 text-5xl mb-4">cloud_off</span><h3 className="text-lg font-bold text-red-900">Connection Error</h3><p className="text-red-700 mt-1 max-w-sm mx-auto">{error}</p><button 
              onClick={fetchStudents}
              className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
            >Retry Connection
            </button></div>) : loading ? (
          <TableSkeleton cols={5} rows={6} />
        ) : (
          <>
            <StudentTable 
              students={paginatedStudents} 
              onEdit={role === 'faculty' ? null : handleEdit}
              onDelete={role === 'faculty' ? null : handleDelete}
              hideActions={role === 'faculty'}
            />
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </>)}
      </PageContainer>
    </Layout>)
}
