import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { getUserSession } from '../auth/sessionController'
import { buildApiUrl } from '../api/apiBase'
import { settingsApi } from '../api/settingsApi'

// ── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const TIME_SLOTS = [
  '08:00–09:00',
  '09:00–10:00',
  '10:00–11:00',
  '11:15–12:15',
  '12:15–13:15',
  '14:00–15:00',
  '15:00–16:00',
]

const THEME_OPTIONS = ['blue', 'emerald', 'orange', 'purple', 'indigo', 'amber', 'rose']

const THEMES = {
  blue:    { color: 'border-green-700 bg-green-50',       textColor: 'text-green-700' },
  emerald: { color: 'border-emerald-500 bg-emerald-50', textColor: 'text-emerald-700' },
  orange:  { color: 'border-orange-500 bg-orange-50',   textColor: 'text-orange-700' },
  purple:  { color: 'border-purple-500 bg-purple-50',   textColor: 'text-purple-700' },
  indigo:  { color: 'border-indigo-500 bg-indigo-50',   textColor: 'text-indigo-700' },
  amber:   { color: 'border-amber-500 bg-amber-50',     textColor: 'text-amber-700' },
  rose:    { color: 'border-rose-500 bg-rose-50',       textColor: 'text-rose-700' },
}

const LEGEND = [
  { color: 'bg-green-700',    label: 'Core CS' },
  { color: 'bg-emerald-500', label: 'Mathematics' },
  { color: 'bg-orange-500',  label: 'Database' },
  { color: 'bg-purple-500',  label: 'Humanities' },
  { color: 'bg-indigo-500',  label: 'Systems' },
  { color: 'bg-amber-500',   label: 'Practical/Lab' },
]

const EMPTY_ENTRY = { code: '', name: '', room: '', instructor: '', credits: 1, type: 'Lecture', theme: 'blue' }
const DEFAULT_BREAK_ITEMS = [
  { id: 'break-1', label: 'Break 11:00–11:15', afterPeriod: 3, tone: 'slate' },
  { id: 'break-2', label: 'Lunch 13:15–14:00', afterPeriod: 5, tone: 'amber' },
]

function withTheme(entry) {
  if (!entry || !entry.code) {
    return entry
  }

  const theme = entry.theme || 'blue'
  return {
    ...entry,
    ...(THEMES[theme] || THEMES.blue),
  }
}

function normalizeSlots(slots = [], periodCount = TIME_SLOTS.length) {
  return Array.from({ length: periodCount }, (_, slotIndex) => (
    Array.from({ length: 5 }, (_, dayIndex) => {
      const entry = slots?.[slotIndex]?.[dayIndex] ?? null
      return entry ? withTheme(entry) : null
    })
  ))
}

function normalizePeriodSlots(periodSlots = []) {
  if (!Array.isArray(periodSlots) || periodSlots.length === 0) {
    return [...TIME_SLOTS]
  }
  return periodSlots.map((slot, idx) => String(slot || TIME_SLOTS[idx] || `Period ${idx + 1}`))
}

function normalizeBreakItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_BREAK_ITEMS.map((item) => ({ ...item }))
  }

  return items
    .map((item, index) => ({
      id: String(item?.id || `break-${index + 1}`),
      label: String(item?.label || `Break ${index + 1}`),
      afterPeriod: Number(item?.afterPeriod || 1),
      tone: ['slate', 'amber', 'emerald', 'sky'].includes(item?.tone) ? item.tone : 'slate',
    }))
    .filter((item) => Number.isFinite(item.afterPeriod) && item.afterPeriod >= 1 && item.afterPeriod < TIME_SLOTS.length)
}

function normalizeTimetableRecord(record) {
  const normalizedPeriodSlots = normalizePeriodSlots(record.periodSlots)
  return {
    label: record.label,
    dept: record.dept,
    semester: record.semester,
    section: record.section,
    slots: normalizeSlots(record.slots, normalizedPeriodSlots.length),
    periodSlots: normalizedPeriodSlots,
    breakItems: normalizeBreakItems(record.breakItems),
  }
}

// ── ClassCell ────────────────────────────────────────────────────────────────
function ClassCell({ cls, canEdit, onEdit, onClear }) {
  if (!cls || !cls.code) {
    return (
      <div className="relative group h-full bg-slate-50 flex items-center justify-center rounded-lg border border-dashed border-slate-200">
        <span className="text-xs text-slate-400 font-medium">{cls?.label || 'No Class'}</span>
        {canEdit && !cls?.label && (
          <button
            onClick={onEdit}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-100/80 rounded-lg transition-opacity"
          >
            <span className="material-symbols-outlined text-slate-500 text-lg">add</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative group h-full overflow-visible">
      <div className={`h-full border-l-4 px-2 py-1.5 rounded-r-lg ${cls.color} cursor-default`}>
        <p className={`text-[10px] font-bold uppercase tracking-wide ${cls.textColor}`}>{cls.code}</p>
        <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2 mt-0.5">{cls.name}</p>
      </div>

      {/* Hover tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-52
                      invisible opacity-0 group-hover:visible group-hover:opacity-100
                      transition-all duration-150 pointer-events-none">
        <div className="w-3 h-3 bg-slate-900 rotate-45 mx-auto -mb-1.5 rounded-sm" />
        <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-3 text-xs">
          <p className={`font-bold text-sm mb-1 ${cls.textColor?.replace('700','400')}`}>{cls.code}</p>
          <p className="font-semibold text-white mb-2 leading-snug">{cls.name}</p>
          <div className="space-y-1 text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px]">location_on</span>
              <span>{cls.room}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px]">person</span>
              <span>{cls.instructor}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px]">school</span>
              <span>{cls.type} · {cls.credits} credit{cls.credits !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit / clear overlay — only in edit mode */}
      {canEdit && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 bg-white/80 rounded-r-lg transition-opacity z-10">
          <button
            onClick={onEdit}
            className="p-1 rounded-md bg-[#6d28d9] text-white hover:bg-[#6d28d9]/90"
            title="Edit"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
          <button
            onClick={onClear}
            className="p-1 rounded-md bg-red-500 text-white hover:bg-red-600"
            title="Remove"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Entry editor modal ────────────────────────────────────────────────────────
function EntryModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial?.code ? { ...initial } : { ...EMPTY_ENTRY }
  )

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  function handleSave() {
    if (!form.code.trim() || !form.name.trim()) return
    onSave({ ...form, ...(THEMES[form.theme] || THEMES.blue) })
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20 focus:border-[#6d28d9] transition-all'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#6d28d9]">schedule</span>
            <h2 className="text-base font-bold text-slate-800">
              {form.code ? 'Edit Class Entry' : 'Add Class Entry'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Course Code *</label>
            <input className={inputCls} value={form.code} onChange={e => set('code', e.target.value)} placeholder="e.g. CS401" />
          </div>
          <div>
            <label className={labelCls}>Credits</label>
            <input type="number" min={1} max={6} className={inputCls} value={form.credits} onChange={e => set('credits', Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Course Name *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Data Structures" />
          </div>
          <div>
            <label className={labelCls}>Room / Venue</label>
            <input className={inputCls} value={form.room} onChange={e => set('room', e.target.value)} placeholder="e.g. Room 302" />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>
              <option>Lecture</option>
              <option>Lab</option>
              <option>Tutorial</option>
              <option>Seminar</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Instructor</label>
            <input className={inputCls} value={form.instructor} onChange={e => set('instructor', e.target.value)} placeholder="e.g. Dr. Patricia Moore" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Color Theme</label>
            <div className="flex gap-2 mt-1">
              {THEME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => set('theme', t)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.theme === t ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: { blue:'#3b82f6', emerald:'#10b981', orange:'#f97316', purple:'#a855f7', indigo:'#6366f1', amber:'#f59e0b', rose:'#f43f5e' }[t] }}
                  title={t}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#6d28d9] text-white rounded-lg text-sm font-semibold hover:bg-[#6d28d9]/90 active:scale-95 shadow-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New class/timetable creation modal ────────────────────────────────────────
function NewClassModal({ onSave, onClose }) {
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({ dept: '', semester: 'Semester 4', section: 'Section A' })

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await settingsApi.getDepartments()
        setDepartments(data || [])
        if (data && data.length > 0) {
          setForm(prev => ({ ...prev, dept: data[0].name }))
        }
      } catch (err) {
        console.error('Failed to load departments:', err)
      }
    }
    fetchDepts()
  }, [])

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  function handleSave() {
    const deptObj = departments.find(d => d.name === form.dept)
    const deptCode = deptObj ? deptObj.code : form.dept.slice(0, 2).toUpperCase()
    const semCode  = form.semester.replace('Semester ', 'S')
    const secCode  = form.section.replace('Section ', '')
    const id       = `${deptCode}-${semCode}${secCode}`
    const label    = `${deptCode} — ${form.semester} (${form.section})`
    onSave({ id, label, ...form })
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20 focus:border-[#6d28d9] transition-all'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#6d28d9]">add_circle</span>
            <h2 className="text-base font-bold text-slate-800">Create New Timetable</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Department</label>
            <select className={inputCls} value={form.dept} onChange={e => set('dept', e.target.value)}>
              {departments.map(d => (
                <option key={d.code} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Semester</label>
            <select className={inputCls} value={form.semester} onChange={e => set('semester', e.target.value)}>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n}>Semester {n}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Section</label>
            <select className={inputCls} value={form.section} onChange={e => set('section', e.target.value)}>
              {['A','B','C','D'].map(s => <option key={s}>Section {s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#6d28d9] text-white rounded-lg text-sm font-semibold hover:bg-[#6d28d9]/90 active:scale-95 shadow-sm"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TimetablePage({ noLayout = false }) {
  const session = getUserSession()
  const role    = session?.role || 'student'
  const canEdit = role === 'admin' || role === 'faculty'

  const [timetables,   setTimetables]   = useState({})
  const [activeClass,  setActiveClass]  = useState('')
  const [editMode,     setEditMode]     = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)   // { slotIdx, dayIdx }
  const [showNewClass, setShowNewClass] = useState(false)
  const [isSyncing,    setIsSyncing]    = useState(false)
  const [studentProfile, setStudentProfile] = useState(null)
  const [periodSlots, setPeriodSlots] = useState(TIME_SLOTS)
  const [breakItems, setBreakItems] = useState(DEFAULT_BREAK_ITEMS)
  const [draggingBreakId, setDraggingBreakId] = useState('')
  const [breakEditorNotice, setBreakEditorNotice] = useState('')
  const [showPeriodEditor, setShowPeriodEditor] = useState(false)

  const toNormalizedText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const toSemesterNumber = (value) => {
    const match = String(value || '').match(/\d+/)
    return match ? Number(match[0]) : null
  }
  const toSectionCode = (value) => {
    const match = String(value || '').toUpperCase().match(/[A-Z]/)
    return match ? match[0] : null
  }

  function findStudentClassId(allTimetables, profile) {
    if (!profile) return null

    const wantedDept = toNormalizedText(profile.department)
    const wantedSemester = toSemesterNumber(profile.semester)
    const wantedSection = toSectionCode(profile.section)
    const entries = Object.entries(allTimetables)

    const exact = entries.find(([, record]) => {
      const dept = toNormalizedText(record.dept)
      const semester = toSemesterNumber(record.semester)
      const section = toSectionCode(record.section)
      return dept === wantedDept && semester === wantedSemester && section === wantedSection
    })
    if (exact) return exact[0]

    const semSection = entries.find(([, record]) => {
      const semester = toSemesterNumber(record.semester)
      const section = toSectionCode(record.section)
      return semester === wantedSemester && section === wantedSection
    })
    if (semSection) return semSection[0]

    const semOnly = entries.find(([, record]) => toSemesterNumber(record.semester) === wantedSemester)
    return semOnly ? semOnly[0] : null
  }

  const visibleTimetableEntries = role === 'student'
    ? (() => {
        const matchedId = findStudentClassId(timetables, studentProfile)
        if (matchedId && timetables[matchedId]) {
          return [[matchedId, timetables[matchedId]]]
        }
        const first = Object.entries(timetables)[0]
        return first ? [first] : []
      })()
    : Object.entries(timetables)

  const visibleTimetableMap = Object.fromEntries(visibleTimetableEntries)
  const currentClassId = visibleTimetableMap[activeClass] ? activeClass : visibleTimetableEntries[0]?.[0]
  const current = currentClassId ? visibleTimetableMap[currentClassId] : null

  useEffect(() => {
    if (role !== 'student' || !session?.userId) return

    let isMounted = true

    async function loadStudentProfile() {
      try {
        const response = await fetch(buildApiUrl(`/students/${encodeURIComponent(session.userId)}`))
        if (response.ok) {
          const profile = await response.json()
          if (isMounted) {
            setStudentProfile(profile)
            return
          }
        }
      } catch (error) {
        console.error('Failed to fetch student profile for timetable:', error)
      }

      if (isMounted) setStudentProfile(null)
    }

    loadStudentProfile()
    return () => { isMounted = false }
  }, [role, session?.userId])

  useEffect(() => {
    if (!currentClassId || activeClass === currentClassId) return
    setActiveClass(currentClassId)
  }, [activeClass, currentClassId])

  useEffect(() => {
    if (!current) return
    setPeriodSlots(normalizePeriodSlots(current.periodSlots))
    setBreakItems(normalizeBreakItems(current.breakItems))
    setBreakEditorNotice('')
  }, [currentClassId, current])

  useEffect(() => {
    let isMounted = true

    async function fetchTimetables() {
      try {
        const response = await fetch(buildApiUrl('/academics/timetable'))
        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.success || !Array.isArray(payload.data) || payload.data.length === 0) {
          return
        }

        const mapped = payload.data.reduce((accumulator, record) => {
          accumulator[record.classId] = normalizeTimetableRecord(record)
          return accumulator
        }, {})

        if (isMounted && Object.keys(mapped).length > 0) {
          setTimetables(mapped)
          if (!mapped[activeClass]) {
            setActiveClass(Object.keys(mapped)[0])
          }
        }
      } catch (error) {
        console.error('Failed to fetch timetables:', error)
      }
    }

    fetchTimetables()

    return () => {
      isMounted = false
    }
  }, [])

  async function persistTimetable(classId, timetable) {
    try {
      setIsSyncing(true)
      await fetch(buildApiUrl(`/academics/timetable/${encodeURIComponent(classId)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          label: timetable.label,
          dept: timetable.dept,
          semester: timetable.semester,
          section: timetable.section,
          slots: timetable.slots,
          periodSlots: timetable.periodSlots,
          breakItems: timetable.breakItems,
        }),
      })
    } catch (error) {
      console.error('Failed to sync timetable:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  function buildSlotsForPeriodCount(slots, periodCount) {
    const safeCount = Math.max(1, Number(periodCount) || 1)
    return Array.from({ length: safeCount }, (_, slotIdx) => (
      Array.from({ length: 5 }, (_, dayIdx) => {
        const entry = slots?.[slotIdx]?.[dayIdx] ?? null
        return entry ? withTheme(entry) : null
      })
    ))
  }

  function handleEntrySave(entry) {
    const slots = current.slots.map(row => [...row])
    slots[editTarget.slotIdx][editTarget.dayIdx] = withTheme(entry)
    const updated = {
      ...current,
      slots,
      periodSlots: normalizePeriodSlots(current.periodSlots || periodSlots),
      breakItems: normalizeBreakItems(current.breakItems || breakItems),
    }
    setTimetables(prev => ({ ...prev, [activeClass]: updated }))
    void persistTimetable(activeClass, updated)
    setEditTarget(null)
  }

  function handleClearCell(slotIdx, dayIdx) {
    const slots = current.slots.map(row => [...row])
    slots[slotIdx][dayIdx] = null
    const updated = {
      ...current,
      slots,
      periodSlots: normalizePeriodSlots(current.periodSlots || periodSlots),
      breakItems: normalizeBreakItems(current.breakItems || breakItems),
    }
    setTimetables(prev => ({ ...prev, [activeClass]: updated }))
    void persistTimetable(activeClass, updated)
  }

  function handleCreateClass({ id, label, dept, semester, section }) {
    if (!timetables[id]) {
      const created = {
        label,
        dept,
        semester,
        section,
        slots: Array.from({ length: 7 }, () => Array(5).fill(null)),
        periodSlots: [...TIME_SLOTS],
        breakItems: DEFAULT_BREAK_ITEMS.map((item) => ({ ...item })),
      }
      setTimetables(prev => ({
        ...prev,
        [id]: created,
      }))
      void persistTimetable(id, created)
    }
    setActiveClass(id)
    setShowNewClass(false)
  }

  function persistEditorConfig(nextPeriodSlots, nextBreakItems) {
    if (!current) return
    const normalizedPeriods = normalizePeriodSlots(nextPeriodSlots)
    const updated = {
      ...current,
      slots: buildSlotsForPeriodCount(current.slots, normalizedPeriods.length),
      periodSlots: normalizedPeriods,
      breakItems: normalizeBreakItems(nextBreakItems),
    }
    setTimetables((prev) => ({ ...prev, [activeClass]: updated }))
    void persistTimetable(activeClass, updated)
  }

  function addPeriod() {
    if (!current) return
    const nextPeriodNumber = periodSlots.length + 1
    const nextPeriodLabel = `Period ${nextPeriodNumber}`
    const nextPeriods = [...periodSlots, nextPeriodLabel]
    setPeriodSlots(nextPeriods)
    persistEditorConfig(nextPeriods, breakItems)
    setBreakEditorNotice('New period created. Edit the time label as needed.')
  }

  function removePeriod(periodIndex) {
    if (!current) return
    if (periodSlots.length <= 2) {
      setBreakEditorNotice('At least two periods are required to keep timetable spacing and breaks valid.')
      return
    }

    const removedPeriodNumber = periodIndex + 1
    const nextPeriods = periodSlots.filter((_, idx) => idx !== periodIndex)
    const maxBoundary = Math.max(1, nextPeriods.length - 1)

    const nextBreaks = breakItems.map((item) => {
      let nextAfterPeriod = item.afterPeriod

      if (nextAfterPeriod > removedPeriodNumber) {
        nextAfterPeriod -= 1
      } else if (nextAfterPeriod === removedPeriodNumber) {
        nextAfterPeriod = Math.max(1, removedPeriodNumber - 1)
      }

      nextAfterPeriod = Math.max(1, Math.min(nextAfterPeriod, maxBoundary))
      return { ...item, afterPeriod: nextAfterPeriod }
    })

    setPeriodSlots(nextPeriods)
    setBreakItems(nextBreaks)
    persistEditorConfig(nextPeriods, nextBreaks)
    setBreakEditorNotice(`Period ${removedPeriodNumber} removed.`)
  }

  function moveBreakToBoundary(breakId, targetBoundary) {
    if (!breakId) return
    if (targetBoundary < 1 || targetBoundary >= periodSlots.length) return

    setBreakItems((prev) => {
      const dragged = prev.find((item) => item.id === breakId)
      if (!dragged || dragged.afterPeriod === targetBoundary) return prev

      const occupied = prev.find((item) => item.afterPeriod === targetBoundary && item.id !== breakId)
      const next = prev.map((item) => {
        if (item.id === breakId) return { ...item, afterPeriod: targetBoundary }
        if (occupied && item.id === occupied.id) return { ...item, afterPeriod: dragged.afterPeriod }
        return item
      })
      persistEditorConfig(periodSlots, next)
      return next
    })
  }

  function getBreakToneClasses(tone) {
    if (tone === 'amber') return { bgClass: 'bg-amber-50/50', textClass: 'text-amber-700', headerClass: 'bg-amber-50' }
    if (tone === 'emerald') return { bgClass: 'bg-emerald-50/50', textClass: 'text-emerald-700', headerClass: 'bg-emerald-50' }
    if (tone === 'sky') return { bgClass: 'bg-sky-50/50', textClass: 'text-sky-700', headerClass: 'bg-sky-50' }
    return { bgClass: 'bg-slate-100/50', textClass: 'text-slate-600', headerClass: 'bg-slate-100/80' }
  }

  function updateBreakItem(itemId, patch) {
    setBreakItems((prev) => {
      const next = prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
      persistEditorConfig(periodSlots, next)
      return next
    })
  }

  const editableBreakBoundaries = Array.from({ length: periodSlots.length - 1 }, (_, idx) => idx + 1)

  function addBreakItem() {
    const usedBoundaries = new Set(breakItems.map((item) => item.afterPeriod))
    const nextBoundary = editableBreakBoundaries.find((boundary) => !usedBoundaries.has(boundary))
    if (!nextBoundary) {
      setBreakEditorNotice('All between-period slots already have a break. Move or remove one before adding another.')
      return
    }

    const nextLabelNumber = breakItems.length + 1
    const createdBreak = {
      id: `break-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      label: `Break ${nextLabelNumber}`,
      afterPeriod: nextBoundary,
      tone: 'sky',
    }
    const next = [
      ...breakItems,
      createdBreak,
    ]
    setBreakItems(next)
    persistEditorConfig(periodSlots, next)
    setBreakEditorNotice('New break added. Drag it to another boundary if needed.')
  }

  function removeBreakItem(itemId) {
    setBreakItems((prev) => {
      if (prev.length <= 1) {
        setBreakEditorNotice('At least one break is required.')
        return prev
      }
      const next = prev.filter((item) => item.id !== itemId)
      persistEditorConfig(periodSlots, next)
      return next
    })
  }

  const breaksByBoundary = breakItems.reduce((accumulator, item) => {
    const bucket = accumulator[item.afterPeriod] || []
    bucket.push({ ...item, ...getBreakToneClasses(item.tone) })
    accumulator[item.afterPeriod] = bucket
    return accumulator
  }, {})

  const gridColumns = [
    { kind: 'day', id: 'day' },
    ...periodSlots.flatMap((_, periodIdx) => {
      const boundary = periodIdx + 1
      const periodColumn = [{ kind: 'period', periodIdx, id: `period-${periodIdx}` }]
      const boundaryBreaks = breaksByBoundary[boundary] || []
      boundaryBreaks.forEach((breakItem) => {
        periodColumn.push({ kind: 'break', boundary, ...breakItem, id: `break-${breakItem.id}` })
      })
      return periodColumn
    }),
  ]

  const tpl = gridColumns
    .map((column) => {
      if (column.kind === 'day') return '72px'
      if (column.kind === 'break') return '54px'
      return 'minmax(80px, 1fr)'
    })
    .join(' ')
  const headerCell = 'px-2 py-3 text-center text-[10px] font-bold text-slate-500 border-r border-slate-200 leading-tight flex flex-col items-center justify-center gap-0.5 bg-slate-50'

  const inner = (
    <>
      {/* ── Class Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {visibleTimetableEntries.map(([id, tt]) => (
          <button
            key={id}
            onClick={() => { setActiveClass(id); setEditMode(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              activeClass === id
                ? 'bg-[#6d28d9] text-white border-[#6d28d9] shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {tt.label}
          </button>
        ))}
        {canEdit && (
          <button
            onClick={() => setShowNewClass(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-dashed border-slate-300 text-slate-500 hover:border-[#6d28d9] hover:text-[#6d28d9] transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>New Class
          </button>
        )}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <p className="text-slate-500">
          {current ? `${current.dept} — ${current.semester} (${current.section})` : 'No timetable found'}
        </p>
        <div className="flex gap-3 items-center flex-wrap">
          {isSyncing && (
            <span className="text-xs font-medium text-slate-500">Syncing changes...</span>
          )}
          {canEdit && (
            <button
              onClick={() => setShowPeriodEditor(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                showPeriodEditor
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#6d28d9] hover:text-[#6d28d9]'
              }`}
            >
              <span className="material-symbols-outlined text-base">schedule</span>
              {showPeriodEditor ? 'Hide Periods' : 'Edit Periods'}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setEditMode(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                editMode
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#6d28d9] hover:text-[#6d28d9]'
              }`}
            >
              <span className="material-symbols-outlined text-base">{editMode ? 'check_circle' : 'edit'}</span>
              {editMode ? 'Done Editing' : 'Edit Timetable'}
            </button>
          )}
        </div>
      </div>

      {showPeriodEditor && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Period Intervals</p>
              <p className="text-xs text-slate-500 mt-1">Edit period timings, then drag break cards and drop them between periods to reposition or swap.</p>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={addPeriod}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-[#6d28d9] hover:text-[#6d28d9]"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Create Period
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {periodSlots.map((slot, idx) => (
                <div key={idx} className="text-xs font-semibold text-slate-600">
                  <span className="block mb-1">Period {idx + 1}</span>
                  <div className="relative">
                    <input
                      type="text"
                      value={slot}
                      onChange={(e) => {
                        const next = [...periodSlots]
                        next[idx] = e.target.value
                        setPeriodSlots(next)
                        persistEditorConfig(next, breakItems)
                      }}
                      className="w-full px-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20 focus:border-[#6d28d9]"
                    />
                    <button
                      type="button"
                      onClick={() => removePeriod(idx)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-md border border-red-200 text-red-600 hover:bg-red-50 bg-white"
                      title={`Remove Period ${idx + 1}`}
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Break Labels</p>
                <button
                  type="button"
                  onClick={addBreakItem}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Break
                </button>
              </div>

              <div className="space-y-2">
                {breakItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateBreakItem(item.id, { label: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20 focus:border-[#6d28d9]"
                    />
                    <select
                      value={item.tone}
                      onChange={(e) => updateBreakItem(item.id, { tone: e.target.value })}
                      className="px-2 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white"
                    >
                      <option value="slate">Slate</option>
                      <option value="amber">Amber</option>
                      <option value="emerald">Emerald</option>
                      <option value="sky">Sky</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeBreakItem(item.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      title="Remove break"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>

              {breakEditorNotice && (
                <p className="mt-2 text-xs font-medium text-slate-500">{breakEditorNotice}</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
              <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">Drag And Swap Break Times</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {breakItems.map((item) => {
                  const tone = getBreakToneClasses(item.tone)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      draggable
                      onDragStart={() => setDraggingBreakId(item.id)}
                      onDragEnd={() => setDraggingBreakId('')}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold shadow-sm cursor-grab active:cursor-grabbing ${tone.bgClass} ${tone.textClass}`}
                      title="Drag and drop between periods"
                    >
                      <span className="material-symbols-outlined text-sm">drag_indicator</span>
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {editableBreakBoundaries.map((boundary) => {
                  const itemsAtBoundary = breakItems.filter((item) => item.afterPeriod === boundary)
                  const badgeClass = itemsAtBoundary.length > 0
                    ? 'bg-white border-slate-300 text-slate-700'
                    : draggingBreakId
                      ? 'bg-[#6d28d9]/5 border-[#6d28d9]/30 text-[#6d28d9]'
                      : 'bg-white border-slate-200 text-slate-400'

                  return (
                    <div
                      key={boundary}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (!draggingBreakId) return
                        moveBreakToBoundary(draggingBreakId, boundary)
                        setDraggingBreakId('')
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${badgeClass}`}
                    >
                      <p className="text-[11px] text-slate-500 mb-1">After Period {boundary}</p>
                      <p className="truncate">{itemsAtBoundary.length > 0 ? itemsAtBoundary.map((item) => item.label).join(' | ') : 'Drop break here'}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {editMode && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm text-amber-700">
          <span className="material-symbols-outlined text-amber-500">info</span>
          <span>Hover over any cell to <strong>add</strong>, <strong>edit</strong>, or <strong>remove</strong> a class entry.</span>
        </div>
      )}

      {/* ── Timetable Grid ─────────────────────────────────────────────── */}
      {current ? (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div style={{ minWidth: 780 }}>
          {/* Header */}
          <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: tpl }}>
            <div className="bg-slate-50 border-r border-slate-200" />
            {gridColumns.slice(1).map((column, columnIndex, arr) => {
              const isLast = columnIndex === arr.length - 1
              if (column.kind === 'break') {
                return (
                  <div
                    key={column.id}
                    className={`${column.headerClass} ${isLast ? '' : 'border-r border-slate-200'}`}
                  />
                )
              }
              return (
                <div key={column.id} className={`${headerCell} ${isLast ? 'border-r-0' : ''}`}>
                  {String(periodSlots[column.periodIdx] || '').split('–').map((t, i) => <span key={i}>{t}{i===0 && '–'}</span>)}
                </div>
              )
            })}
          </div>

          {/* Days */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 grid z-10" style={{ gridTemplateColumns: tpl }}>
              <div />
              {gridColumns.slice(1).map((column) => {
                if (column.kind === 'break') {
                  return (
                    <div key={`overlay-${column.id}`} className="flex items-center justify-center">
                      <span className={`text-[11px] font-semibold tracking-[0.2em] [writing-mode:vertical-rl] rotate-180 ${column.textClass}`}>
                        {column.label}
                      </span>
                    </div>
                  )
                }
                return <div key={`overlay-${column.id}`} />
              })}
            </div>

            {DAYS.map((day, di) => (
              <div key={di} className="grid border-b border-slate-100 last:border-b-0 min-h-[80px]" style={{ gridTemplateColumns: tpl }}>
                <div className="px-1 py-2 text-sm font-bold text-slate-700 border-r border-slate-200 flex items-center justify-center bg-slate-50">
                  {day}
                </div>
                {gridColumns.slice(1).map((column, columnIndex, arr) => {
                  const isLast = columnIndex === arr.length - 1

                  if (column.kind === 'break') {
                    return (
                      <div
                        key={`${day}-${column.id}`}
                        className={`${column.bgClass} ${isLast ? '' : 'border-r border-slate-100'}`}
                      />
                    )
                  }

                  return (
                    <div key={`${day}-${column.id}`} className={`p-1.5 ${isLast ? '' : 'border-r border-slate-100'}`}>
                      <ClassCell
                        cls={current.slots[column.periodIdx]?.[di]}
                        canEdit={editMode}
                        onEdit={() => setEditTarget({ slotIdx: column.periodIdx, dayIdx: di })}
                        onClear={() => handleClearCell(column.periodIdx, di)}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
          No timetable is available for the current class and semester.
        </div>
      )}

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap gap-6 items-center">
        <p className="text-sm font-bold text-slate-700">Course Codes:</p>
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${l.color}`} />
            <span className="text-xs text-slate-600">{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Entry Modal ────────────────────────────────────────────────── */}
      {editTarget && (
        <EntryModal
          initial={current.slots[editTarget.slotIdx]?.[editTarget.dayIdx]?.code
            ? current.slots[editTarget.slotIdx][editTarget.dayIdx]
            : null}
          onSave={handleEntrySave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── New Class Modal ─────────────────────────────────────────────── */}
      {showNewClass && (
        <NewClassModal onSave={handleCreateClass} onClose={() => setShowNewClass(false)} />
      )}
    </>
  )

  return noLayout ? inner : <Layout title="Timetable">{inner}</Layout>
}
