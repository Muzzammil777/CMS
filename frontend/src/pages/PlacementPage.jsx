import { useState, useRef, useEffect } from 'react'
import { Pagination, TableSkeleton } from '../components/common'
import Layout from '../components/Layout'
import KpiCard from '../components/KpiCard'
import KpiGrid from '../components/KpiGrid'
import Modal from '../components/Modal'
import { getUserSession } from '../auth/sessionController'
import { fetchPlacements, createPlacement, deletePlacement } from '../api/placementApi'
import { fetchStudentById } from '../api/studentsApi'

const emptyForm = { name: '', company: '', role: '', package: '', status: 'Selected', date: '' }
const packageRangeOptions = [
  { id: 'below-5-lpa', label: 'Below 5 LPA', min: 0, max: 4.99 },
  { id: '5-10-lpa', label: '5 - 10 LPA', min: 5, max: 10 },
  { id: '10-20-lpa', label: '10 - 20 LPA', min: 10.01, max: 20 },
  { id: '20-plus-lpa', label: '20+ LPA', min: 20.01, max: null },
]
const statusOptions = ['Selected', 'Process', 'Rejected']
const filterTabBaseClass = 'px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors'
const filterOptionBaseClass = 'w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between'

export default function PlacementPage({ noLayout = false }) {
  const session = getUserSession()
  const role = session?.role || 'student'
  const userId = session?.userId || null
  const isAdmin = role === 'admin'
  const isFaculty = role === 'faculty'
  const isStudent = role === 'student'

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [studentName, setStudentName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeFilterTab, setActiveFilterTab] = useState('Company')
  const [companyFilters, setCompanyFilters] = useState([])
  const [packageFilters, setPackageFilters] = useState([])
  const [statusFilters, setStatusFilters] = useState([])
  const [apiNotice, setApiNotice] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const filterRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(3)

  async function loadPlacements({ silent = false } = {}) {
    if (!silent) setLoading(true)
    setApiNotice('')
    try {
      const data = await fetchPlacements({
        search: searchQuery,
        personId: isStudent ? userId : undefined,
      })
      setEntries(data)
    } catch (error) {
      console.error('Failed to fetch placements:', error)
      setEntries([])
      setApiNotice('Failed to load placement records from backend API.')
    } finally {
      if (!silent) setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch placements on mount and when filters change
  useEffect(() => {
    loadPlacements()
  }, [searchQuery, isStudent, userId])

  // Handle click outside filter dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isStudent || !userId) return
    let isActive = true

    async function loadStudent() {
      try {
        const student = await fetchStudentById(userId)
        if (isActive) setStudentName(student?.name || '')
      } catch (error) {
        if (isActive) setStudentName('')
        console.error('Failed to load student profile:', error)
      }
    }

    loadStudent()
    return () => {
      isActive = false
    }
  }, [isStudent, userId])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (isFaculty) return
    setApiNotice('')
    try {
      const submitData = { ...form };
      if (!isAdmin && userId) {
        submitData.ownerId = userId;
        submitData.name = studentName || form.name;
      }
      const newEntry = await createPlacement(submitData)
      setEntries(prev => [newEntry, ...prev])
      setForm(emptyForm)
      setShowModal(false)
      setApiNotice('Placement record saved to backend successfully.')
    } catch (error) {
      console.error('Failed to create placement:', error)
      setApiNotice('Failed to save placement to backend API.')
    }
  }

  async function handleDelete(placementId) {
    if (!window.confirm('Delete this placement record?')) return
    try {
      await deletePlacement(placementId)
      setEntries(prev => prev.filter(p => (p.id || p._id) !== placementId))
      setApiNotice('Placement record deleted successfully.')
    } catch (error) {
      console.error('Failed to delete placement:', error)
      setApiNotice('Failed to delete placement record.')
    }
  }

  const inputClasses = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#00236f]/10 focus:border-[#00236f] outline-none transition-all text-sm text-slate-700 bg-white";
  const labelClasses = "block text-sm font-semibold text-slate-700 mb-1.5 ml-0.5";

  function parsePackageLpa(value) {
    if (!value) return null
    const raw = String(value).trim().toLowerCase()
    const numeric = raw.replace(/[^0-9.]/g, '')
    const amount = Number.parseFloat(numeric)
    if (!Number.isFinite(amount)) return null

    // Accept direct LPA inputs like "12" or "12 LPA".
    if (raw.includes('lpa') || amount <= 100) return amount
    // For annual rupee amounts like 1000000, convert to LPA.
    return amount / 100000
  }

  function isLpaInRange(lpa, range) {
    if (!Number.isFinite(lpa)) return false
    if (range.max === null) return lpa >= range.min
    return lpa >= range.min && lpa <= range.max
  }

  function toggleFilterValue(value, setValues) {
    setValues((prev) => (
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    ))
  }

  function clearAllFilters() {
    setCompanyFilters([])
    setPackageFilters([])
    setStatusFilters([])
  }

  function formatPackageValue(lpa) {
    if (!Number.isFinite(lpa)) return '—'
    return `₹${lpa.toFixed(1)} LPA`
  }

  function getStatusLabel(status) {
    return status === 'Process' ? 'In Process' : status
  }

  function getStatusDotClass(status) {
    if (status === 'Selected') return 'bg-emerald-500'
    if (status === 'Process') return 'bg-orange-500'
    if (status === 'Rejected') return 'bg-rose-500'
    return 'bg-slate-400'
  }

  const addButton = (
    <button
      onClick={() => setShowModal(true)}
      className="flex items-center gap-2 px-4 py-2 bg-[#00236f] text-white rounded-lg text-sm font-semibold hover:bg-[#00236f]/90 transition-all shadow-sm active:scale-95 w-fit"
    >
      <span className="material-symbols-outlined text-lg">add</span>Add Placement
    </button>
  );

  const visibleEntries = isFaculty
    ? entries.filter((entry) => Boolean(entry?.ownerId))
    : entries
  const companyOptions = [...new Set(visibleEntries.map((entry) => entry.company).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
  const filteredEntries = visibleEntries.filter((entry) => {
    const matchesCompany = companyFilters.length === 0 || companyFilters.includes(entry.company)
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(entry.status)
    const lpa = parsePackageLpa(entry.package)
    const matchesPackage = packageFilters.length === 0 || packageFilters.some((rangeId) => {
      const range = packageRangeOptions.find((option) => option.id === rangeId)
      return range ? isLpaInRange(lpa, range) : false
    })
    return matchesCompany && matchesStatus && matchesPackage
  })
  const appliedFilterCount = companyFilters.length + packageFilters.length + statusFilters.length
  const showStudentColumn = isAdmin || isFaculty
  const canAddPlacement = !isFaculty

  const avgPackage = (() => {
    const values = filteredEntries
      .map((entry) => parsePackageLpa(entry.package))
      .filter((value) => value !== null)
    if (values.length === 0) return '—'
    const total = values.reduce((sum, value) => sum + value, 0)
    return formatPackageValue(total / values.length)
  })()

  const inner = (
    <>
      {/* Stats Cards */}
      <KpiGrid className="lg:grid-cols-3">
        {(isAdmin
          ? [
              { icon: 'emoji_events', label: 'Students Placed',   value: filteredEntries.filter(e => e.status === 'Selected').length, colorScheme: 'blue' },
              { icon: 'business',    label: 'Companies Visited',  value: new Set(filteredEntries.map(e => e.company)).size, colorScheme: 'purple' },
              { icon: 'attach_money',label: 'Avg. Package',       value: avgPackage, colorScheme: 'emerald' },
            ]
          : [
              { icon: 'emoji_events', label: 'Placements',        value: filteredEntries.length, colorScheme: 'blue' },
              { icon: 'assignment_turned_in', label: 'Selected',   value: filteredEntries.filter(e => e.status === 'Selected').length, colorScheme: 'emerald' },
              { icon: 'schedule',     label: 'In Process',        value: filteredEntries.filter(e => e.status === 'Process').length, colorScheme: 'orange' },
            ])
        .map((s, idx) => (
          <KpiCard key={`${s.label}-${idx}`} icon={s.icon} label={s.label} value={s.value} colorScheme={s.colorScheme} />
        ))}
      </KpiGrid>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
        {!loading && filteredEntries.length > 0 && canAddPlacement && (
          <div className="mr-auto">{addButton}</div>
        )}
        <button
          onClick={() => {
            setRefreshing(true)
            loadPlacements({ silent: true })
          }}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-sm disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder={isAdmin ? "Search student or company..." : "Search company..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00236f]/30 focus:border-[#00236f] transition-all duration-200"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
              appliedFilterCount > 0
                ? 'bg-[#00236f] text-white border-[#00236f] shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <span className="material-symbols-outlined text-lg">filter_list</span>
            {appliedFilterCount > 0 && <span>{appliedFilterCount}</span>}
          </button>
          {filterOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 animate-dropIn origin-top-right overflow-hidden">
              <div className="grid grid-cols-3 border-b border-slate-100">
                {['Company', 'Package', 'Status'].map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveFilterTab(section)}
                    className={`${filterTabBaseClass} ${
                      activeFilterTab === section
                        ? 'text-[#00236f] border-b-2 border-[#00236f] bg-[#00236f]/5'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {section === 'Package' ? 'Package Range' : section}
                  </button>
                ))}
              </div>
              <div className="p-3 max-h-56 overflow-y-auto space-y-2">
                {activeFilterTab === 'Company' && (
                  <>
                    {companyOptions.length === 0 && (
                      <p className="px-2 py-2 text-sm text-slate-400">No company options</p>
                    )}
                    {companyOptions.map((company) => {
                      const active = companyFilters.includes(company)
                      return (
                        <button
                          key={company}
                          onClick={() => toggleFilterValue(company, setCompanyFilters)}
                          className={`${filterOptionBaseClass} ${
                            active ? 'bg-[#00236f]/10 text-[#00236f] font-semibold' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{company}</span>
                          {active && <span className="material-symbols-outlined text-base">check</span>}
                        </button>
                      )
                    })}
                  </>
                )}
                {activeFilterTab === 'Package' && (
                  <>
                    {packageRangeOptions.map((option) => {
                      const active = packageFilters.includes(option.id)
                      return (
                        <button
                          key={option.id}
                          onClick={() => toggleFilterValue(option.id, setPackageFilters)}
                          className={`${filterOptionBaseClass} ${
                            active ? 'bg-[#00236f]/10 text-[#00236f] font-semibold' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{option.label}</span>
                          {active && <span className="material-symbols-outlined text-base">check</span>}
                        </button>
                      )
                    })}
                  </>
                )}
                {activeFilterTab === 'Status' && (
                  <>
                    {statusOptions.map((status) => {
                      const active = statusFilters.includes(status)
                      return (
                        <button
                          key={status}
                          onClick={() => toggleFilterValue(status, setStatusFilters)}
                          className={`${filterOptionBaseClass} ${
                            active ? 'bg-[#00236f]/10 text-[#00236f] font-semibold' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${getStatusDotClass(status)}`} />
                            {getStatusLabel(status)}
                          </span>
                          {active && <span className="material-symbols-outlined text-base">check</span>}
                        </button>
                      )
                    })}
                  </>
                )}
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500">{appliedFilterCount} filter(s) applied</span>
                <button
                  onClick={clearAllFilters}
                  disabled={appliedFilterCount === 0}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 font-semibold disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">restart_alt</span>
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {apiNotice && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-xs font-semibold border ${
          apiNotice.toLowerCase().includes('failed')
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {apiNotice}
        </div>
      )}

      {/* Placement Table */}
      {loading ? (
        <TableSkeleton cols={showStudentColumn ? (isAdmin ? 7 : 6) : (isAdmin ? 6 : 5)} rows={8} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                {showStudentColumn && <th className="px-6 py-4">Student</th>}
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                {isAdmin && <th className="px-6 py-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={showStudentColumn ? (isAdmin ? 7 : 6) : (isAdmin ? 6 : 5)}>
                    <div className="px-6 py-10 flex flex-col items-center justify-center text-center">
                      {isStudent && (
                        <>
                          <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">work_outline</span>
                          <p className="text-slate-500 font-medium mb-4">No placements yet</p>
                          {addButton}
                        </>
                      )}
                      {(isAdmin || isFaculty) && (
                        <>
                          <p className="text-slate-400 text-sm mb-4">No records found</p>
                          {canAddPlacement && addButton}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {filteredEntries.slice((currentPage-1)*pageSize, currentPage*pageSize).map((p, i) => (
              <tr key={p.id || p._id || i} className="hover:bg-slate-50 transition-colors">
                {showStudentColumn && <td className="px-6 py-4 text-sm font-semibold text-slate-900">{p.name || p.ownerId || '-'}</td>}
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{p.company}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{p.role}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatPackageValue(parsePackageLpa(p.package))}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{p.date}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    p.status === 'Selected' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                  }`}>{p.status}</span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(p.id || p._id)}
                      title="Delete record"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(filteredEntries.length / pageSize))}
          onPageChange={setCurrentPage}
          totalItems={filteredEntries.length}
          pageSize={pageSize}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
        />
      </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isAdmin ? "Add Placement Entry" : "Add Your Placement"}
        icon="work"
        maxWidth="max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-2 text-sm font-semibold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-[#00236f] text-white rounded-lg text-sm font-semibold hover:bg-[#00236f]/90 transition-all shadow-sm active:scale-95"
            >
              Add Entry
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isAdmin && (
            <div className="space-y-1.5">
              <label className={labelClasses}>Student Name *</label>
              <input
                type="text" name="name" value={form.name} onChange={handleChange} required
                placeholder="e.g., John Doe" className={inputClasses}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className={labelClasses}>Company *</label>
            <input
              type="text" name="company" value={form.company} onChange={handleChange} required
              placeholder="e.g., Google" className={inputClasses}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClasses}>Role *</label>
            <input
              type="text" name="role" value={form.role} onChange={handleChange} required
              placeholder="e.g., SWE Intern" className={inputClasses}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClasses}>Package *</label>
            <input
              type="text" name="package" value={form.package} onChange={handleChange} required
              placeholder="e.g., 12 LPA" className={inputClasses}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClasses}>Date *</label>
            <input
              type="date" name="date" value={form.date} onChange={handleChange} required
              className={inputClasses}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClasses}>Status *</label>
            <select
              name="status" value={form.status} onChange={handleChange} required
              className={inputClasses}
            >
              <option value="Selected">Selected</option>
              <option value="Process">In Process</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Modal>
    </>
  )
  return noLayout ? inner : <Layout title="Placement">{inner}</Layout>
}
