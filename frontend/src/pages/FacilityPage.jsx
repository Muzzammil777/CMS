import { useState, useRef, useEffect } from 'react'
import Layout from '../components/Layout'
import KpiCard from '../components/KpiCard'
import KpiGrid from '../components/KpiGrid'
import { getUserSession } from '../auth/sessionController'
import {
  fetchFacilities,
  fetchFacilityBookings,
  createFacilityBooking,
  createFacilityRecord,
  updateFacilityRecord,
  deleteFacilityRecord,
} from '../api/facilityApi'

const statusStyle = {
  Available:   'bg-green-100 text-green-800',
  'In Use':    'bg-green-100 text-green-800',
  Maintenance: 'bg-red-100 text-red-800',
}

export default function FacilityPage({ noLayout = false }) {
  const session = getUserSession()
  const role = session?.role || 'student'
  const canAddFacility = role === 'admin'
  const canBookFacility = role === 'admin' || role === 'faculty'

  const [facilities, setFacilities] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [apiNotice, setApiNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingForm, setBookingForm] = useState({ room: '', date: '', timeFrom: '', timeTo: '', purpose: '' })
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [addFacilityOpen, setAddFacilityOpen] = useState(false)
  const [addFacilityForm, setAddFacilityForm] = useState({ name: '', type: '', capacity: 30, status: 'Available', amenities: '' })
  const [addFacilitySuccess, setAddFacilitySuccess] = useState(false)
  const [editingFacility, setEditingFacility] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [newCapacity, setNewCapacity] = useState(0)
  const filterRef = useRef(null)

  async function loadFacilitiesData({ silent = false } = {}) {
    if (!silent) setLoading(true)
    setApiNotice('')
    try {
      const [facilityRows, bookingRows] = await Promise.all([
        fetchFacilities({ status: statusFilter, search: searchQuery }),
        fetchFacilityBookings(),
      ])
      setFacilities(facilityRows)
      setBookings(bookingRows)
    } catch (err) {
      console.error('Failed to fetch facilities/bookings:', err)
      setFacilities([])
      setBookings([])
      setApiNotice('Failed to load facility data from backend API.')
    } finally {
      if (!silent) setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadFacilitiesData()
  }, [statusFilter, searchQuery])

  const visibleFacilities = canBookFacility || canAddFacility
    ? facilities
    : facilities.filter((facility) => facility.status === 'Available')

  const availableRooms = visibleFacilities.filter((f) => f.status !== 'Maintenance')

  const now = new Date()
  const bookingsByRoom = bookings.reduce((acc, booking) => {
    const room = String(booking?.room || '')
    if (!room) return acc

    // Check if the booking time is already over
    try {
      const datePart = (booking.date || '').split('T')[0]
      const [year, month, day] = datePart.split('-').map(Number)
      const [hours, minutes] = (booking.timeTo || '23:59').split(':').map(Number)
      if (year && month && day) {
        const bookingEndDate = new Date(year, month - 1, day, hours, minutes)
        if (bookingEndDate < now) {
          // Booking time is over, don't display/count it
          return acc
        }
      }
    } catch (err) {
      console.error('Error parsing booking date:', err)
    }

    if (!acc[room]) acc[room] = []
    acc[room].push(booking)
    return acc
  }, {})

  Object.values(bookingsByRoom).forEach((roomBookings) => {
    roomBookings.sort((a, b) => {
      const aKey = `${a?.date || ''} ${a?.timeFrom || ''}`
      const bKey = `${b?.date || ''} ${b?.timeFrom || ''}`
      return bKey.localeCompare(aKey)
    })
  })

  const todayIso = new Date().toISOString().slice(0, 10)
  const displayStatusByRoom = visibleFacilities.reduce((acc, facility) => {
    const roomName = String(facility?.name || '')
    const baseStatus = facility?.status || 'Available'

    if (baseStatus === 'Maintenance') {
      acc[roomName] = 'Maintenance'
      return acc
    }

    const roomBookings = bookingsByRoom[roomName] || []
    const hasBookingToday = roomBookings.some((booking) => String(booking?.date || '').slice(0, 10) === todayIso)
    acc[roomName] = hasBookingToday ? 'In Use' : 'Available'
    return acc
  }, {})

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = visibleFacilities

  async function handleBookRoom(e) {
    e.preventDefault()
    setApiNotice('')
    try {
      const created = await createFacilityBooking({ ...bookingForm, requestedBy: session?.userId || '' })
      setBookings((prev) => [created, ...prev])
      setBookingSuccess(true)
      setApiNotice('Room booking saved to backend successfully.')
      setTimeout(() => {
        setBookingOpen(false)
        setBookingSuccess(false)
        setBookingForm({ room: '', date: '', timeFrom: '', timeTo: '', purpose: '' })
      }, 1500)
    } catch (err) {
      console.error('Failed to book room:', err)
      setApiNotice(err?.message || 'Booking failed. Please check backend connection and try again.')
    }
  }

  async function handleAddFacility(e) {
    e.preventDefault()
    setApiNotice('')
    try {
      const amenitiesArray = addFacilityForm.amenities
        .split(',')
        .map(a => a.trim())
        .filter(a => a)

      const payload = {
        name: addFacilityForm.name,
        type: addFacilityForm.type,
        capacity: parseInt(addFacilityForm.capacity),
        status: addFacilityForm.status,
        amenities: amenitiesArray,
      }

      const created = await createFacilityRecord(payload)
      setFacilities(prev => [...prev, created])
      setAddFacilitySuccess(true)
      setApiNotice('Facility record saved to backend successfully.')
      setTimeout(() => {
        setAddFacilityOpen(false)
        setAddFacilitySuccess(false)
        setAddFacilityForm({ name: '', type: '', capacity: 30, status: 'Available', amenities: '' })
      }, 1500)
    } catch (err) {
      console.error('Failed to add facility:', err)
      setApiNotice(err?.message || 'Failed to add facility. Please check backend connection and try again.')
    }
  }

  async function handleUpdateStatus(e) {
    if (e) e.preventDefault()
    if (!editingFacility) return
    setApiNotice('')
    try {
      const facilityId = editingFacility.id || editingFacility._id
      const payload = {
        name: editingFacility.name,
        type: editingFacility.type,
        capacity: parseInt(newCapacity),
        status: newStatus,
        amenities: editingFacility.amenities || []
      }

      const updated = await updateFacilityRecord(facilityId, payload)
      setFacilities(prev => prev.map(f => (f.id || f._id) === facilityId ? updated : f))
      setApiNotice('Facility status and capacity updated successfully.')
      setEditingFacility(null)
    } catch (err) {
      console.error('Failed to update facility:', err)
      setApiNotice(err?.message || 'Failed to update facility status and capacity.')
    }
  }

  async function handleDeleteFacility() {
    if (!editingFacility) return
    const name = editingFacility.name
    if (!window.confirm(`Are you sure you want to delete the facility "${name}"?`)) return
    
    setApiNotice('')
    try {
      const facilityId = editingFacility.id || editingFacility._id
      await deleteFacilityRecord(facilityId)
      setFacilities(prev => prev.filter(f => (f.id || f._id) !== facilityId))
      setApiNotice('Facility deleted successfully.')
      setEditingFacility(null)
    } catch (err) {
      console.error('Failed to delete facility:', err)
      setApiNotice(err?.message || 'Failed to delete facility.')
    }
  }

  const inner = (
    <div className="flex flex-col h-full min-h-0 gap-0 overflow-hidden bg-[#F8FAFC]">
      
      {/* ── TOP CONTROL BAR ─────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-[#E6EDF2] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Action buttons */}
          {(canAddFacility || canBookFacility) && (
            <div className="flex items-center gap-2">
              {canAddFacility && (
                <button
                  onClick={() => setAddFacilityOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0A686A] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Add Facility
                </button>
              )}
              {canBookFacility && (
                <button
                  onClick={() => setBookingOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#003A40] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-sm">event_seat</span>
                  Book Room
                </button>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-[#E6EDF2] hidden sm:block" />

          {/* Search Bar */}
          <div className="relative flex-shrink-0">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#9AAAB4] pointer-events-none">search</span>
            <input
              type="text"
              placeholder="Search by facility name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-medium border border-[#E6EDF2] rounded-xl bg-[#F8FAFC] text-[#003A40] placeholder-[#9AAAB4] outline-none focus:border-[#0A686A] focus:ring-2 focus:ring-[#0A686A]/10 w-56 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AAAB4] hover:text-[#003A40] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter !== 'All'
                  ? 'bg-[#F2FBFA] text-[#0A686A] border border-[#0A686A]/30'
                  : 'bg-[#F4F7FF] text-[#5F6B7A] border border-[#E6EDF2] hover:text-[#003A40]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">filter_alt</span>
              {statusFilter === 'All' ? 'All Status' : statusFilter}
            </button>

            {filterOpen && (
              <div className="absolute left-0 mt-1.5 w-44 bg-white border border-[#E6EDF2] rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {['All', 'Available', 'In Use', 'Maintenance'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setStatusFilter(opt); setFilterOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      statusFilter === opt
                        ? 'bg-[#F2FBFA] text-[#0A686A]'
                        : 'text-[#5F6B7A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {opt !== 'All' && (
                      <span className={`w-2 h-2 rounded-full ${
                        opt === 'Available' ? 'bg-emerald-500' : opt === 'In Use' ? 'bg-blue-500' : 'bg-rose-500'
                      }`} />
                    )}
                    {opt}
                    {statusFilter === opt && (
                      <span className="material-symbols-outlined text-sm ml-auto text-[#0A686A]">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => {
            setRefreshing(true)
            loadFacilitiesData({ silent: true })
          }}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[#E6EDF2] bg-[#FAFBFC] text-[#5F6B7A] hover:text-[#003A40] hover:bg-[#F2FBFA] transition-all cursor-pointer disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-sm ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col p-5 gap-4 custom-scrollbar">

        {apiNotice && (
          <div className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${
            apiNotice.toLowerCase().includes('failed')
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {apiNotice}
          </div>
        )}

        {/* KPI Cards */}
        <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-emerald-600">meeting_room</span>
            </div>
            <div>
              <p className="text-2xl font-black text-[#003A40] leading-none">
                {visibleFacilities.filter((f) => displayStatusByRoom[f.name] === 'Available').length}
              </p>
              <p className="text-[10px] font-extrabold text-[#5F6B7A] mt-0.5 uppercase tracking-wider">Available Today</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-600">groups</span>
            </div>
            <div>
              <p className="text-2xl font-black text-[#003A40] leading-none">
                {visibleFacilities.filter((f) => displayStatusByRoom[f.name] === 'In Use').length}
              </p>
              <p className="text-[10px] font-extrabold text-[#5F6B7A] mt-0.5 uppercase tracking-wider">Booked Today</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-rose-600">build</span>
            </div>
            <div>
              <p className="text-2xl font-black text-[#003A40] leading-none">
                {visibleFacilities.filter((f) => displayStatusByRoom[f.name] === 'Maintenance').length}
              </p>
              <p className="text-[10px] font-extrabold text-[#5F6B7A] mt-0.5 uppercase tracking-wider">Maintenance</p>
            </div>
          </div>
        </div>

        {/* Facility Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading && (
            <div className="col-span-full text-center text-[#5F6B7A] text-xs font-semibold py-12">
              Loading facilities data...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full text-center text-[#5F6B7A] text-xs font-semibold py-12">
              No facilities found matching filter parameters.
            </div>
          )}
          {!loading && filtered.map((f, i) => (
            <div 
              key={f.name} 
              onClick={() => {
                if (role === 'admin' || role === 'faculty') {
                  setEditingFacility(f)
                  setNewStatus(f.status || 'Available')
                  setNewCapacity(f.capacity || 0)
                }
              }}
              className={`bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs flex flex-col gap-3 group relative transition-all duration-200 ${
                (role === 'admin' || role === 'faculty') 
                  ? 'cursor-pointer hover:border-[#0A686A] hover:shadow-md' 
                  : ''
              }`}
            >
              {(() => {
                const displayStatus = displayStatusByRoom[f.name] || f.status || 'Available'
                return (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-[#003A40]">{f.name}</p>
                        {(role === 'admin' || role === 'faculty') && (
                          <span className="material-symbols-outlined text-sm text-[#9AAAB4] group-hover:text-[#0A686A] transition-colors">
                            edit
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-[#5F6B7A] mt-0.5">{f.type}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                      displayStatus === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      displayStatus === 'In Use' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {displayStatus}
                    </span>
                  </div>
                )
              })()}

              <div className="flex items-center gap-1.5 text-xs text-[#5F6B7A] font-semibold">
                <span className="material-symbols-outlined text-sm text-[#9AAAB4]">people</span>
                Capacity: <span className="font-bold text-[#003A40]">{f.capacity}</span>
              </div>

              {f.amenities && f.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {f.amenities.map((a) => (
                    <span key={a} className="px-2 py-0.5 bg-[#F2FBFA] text-[#0A686A] border border-[#0A686A]/20 rounded-md text-[10px] font-extrabold">
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {(() => {
                const roomBookings = bookingsByRoom[f.name] || []
                if (roomBookings.length === 0) return null

                return (
                  <div className="pt-2 border-t border-[#E6EDF2] mt-auto">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5F6B7A] mb-1.5">Booked Slots</p>
                    <div className="space-y-1.5">
                      {roomBookings.slice(0, 3).map((booking) => (
                        <div key={booking.id || `${booking.date}-${booking.timeFrom}-${booking.timeTo}`} className="text-[11px] font-medium text-[#003A40] bg-[#F8FAFC] border border-[#E6EDF2] rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                          <span className="font-bold text-[#0A686A]">{booking.date}</span>
                          <span className="font-semibold text-[#5F6B7A]">{`${booking.timeFrom} - ${booking.timeTo}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      </div>


      {/* Book Room Modal */}
      {canBookFacility && bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setBookingOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {bookingSuccess ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Room Booked!</h3>
                <p className="text-sm text-slate-500 mt-1">Your booking has been confirmed.</p>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#4c1d95]/10 rounded-lg">
                      <span className="material-symbols-outlined text-[#4c1d95]">meeting_room</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Book a Room</h3>
                  </div>
                  <button onClick={() => setBookingOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-slate-400">close</span>
                  </button>
                </div>
                <form onSubmit={handleBookRoom} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Room <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={bookingForm.room}
                        onChange={e => setBookingForm({ ...bookingForm, room: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4c1d95]/20 focus:border-[#4c1d95] outline-none transition-colors"
                      >
                        <option value="">Select a room</option>
                        {availableRooms.map(r => (
                          <option key={r.name} value={r.name}>{r.name} — {r.type} (Cap: {r.capacity})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        required
                        value={bookingForm.date}
                        onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4c1d95]/20 focus:border-[#4c1d95] outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Purpose <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Guest Lecture, Lab Session"
                        value={bookingForm.purpose}
                        onChange={e => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4c1d95]/20 focus:border-[#4c1d95] outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">From <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        required
                        value={bookingForm.timeFrom}
                        onChange={e => setBookingForm({ ...bookingForm, timeFrom: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4c1d95]/20 focus:border-[#4c1d95] outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">To <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        required
                        value={bookingForm.timeTo}
                        onChange={e => setBookingForm({ ...bookingForm, timeTo: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4c1d95]/20 focus:border-[#4c1d95] outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setBookingOpen(false)}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-[#4c1d95] text-white rounded-lg text-sm font-semibold hover:bg-[#3b0764] transition-colors"
                    >
                      Confirm Booking
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Facility Modal */}
      {canAddFacility && addFacilityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setAddFacilityOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl md:min-h-[31rem] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {addFacilitySuccess ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Facility Added!</h3>
                <p className="text-sm text-slate-500 mt-1">Your new facility has been created successfully.</p>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600/10 rounded-lg">
                      <span className="material-symbols-outlined text-green-600">add_circle</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Add New Facility</h3>
                  </div>
                  <button onClick={() => setAddFacilityOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-slate-400">close</span>
                  </button>
                </div>
                <form onSubmit={handleAddFacility} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Facility Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Computer Lab 1, Hall B"
                        value={addFacilityForm.name}
                        onChange={e => setAddFacilityForm({ ...addFacilityForm, name: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Type <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={addFacilityForm.type}
                        onChange={e => setAddFacilityForm({ ...addFacilityForm, type: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none transition-colors"
                      >
                        <option value="">Select Type</option>
                        <option value="Classroom">Classroom</option>
                        <option value="Lecture Hall">Lecture Hall</option>
                        <option value="Laboratory">Laboratory</option>
                        <option value="Seminar">Seminar</option>
                        <option value="Conference Room">Conference Room</option>
                        <option value="Auditorium">Auditorium</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Capacity <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={addFacilityForm.capacity}
                        onChange={e => setAddFacilityForm({ ...addFacilityForm, capacity: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Status</label>
                      <select
                        value={addFacilityForm.status}
                        onChange={e => setAddFacilityForm({ ...addFacilityForm, status: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none transition-colors"
                      >
                        <option value="Available">Available</option>
                        <option value="In Use">In Use</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700">Amenities <span className="text-slate-500 text-xs font-normal">(comma-separated)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. AC, Projector, Wi-Fi, CCTV"
                        value={addFacilityForm.amenities}
                        onChange={e => setAddFacilityForm({ ...addFacilityForm, amenities: e.target.value })}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAddFacilityOpen(false)}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                    >
                      Add Facility
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Facility Status Modal */}
      {(role === 'admin' || role === 'faculty') && editingFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditingFacility(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/10 rounded-lg">
                  <span className="material-symbols-outlined text-green-600">edit</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Edit Facility</h3>
              </div>
              <button onClick={() => setEditingFacility(null)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="p-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Facility Name</p>
                <p className="text-lg font-bold text-slate-900 leading-none">{editingFacility.name}</p>
                <p className="text-xs text-slate-500 mt-1">{editingFacility.type}</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Capacity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newCapacity}
                  onChange={e => setNewCapacity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-600/20 focus:border-green-600 outline-none transition-colors text-sm text-slate-700 bg-white font-medium"
                />
              </div>
              <div className="flex flex-col gap-2.5">
                <label className="text-sm font-semibold text-slate-700">Availability Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Available', 'In Use', 'Maintenance'].map((status) => {
                    const isSelected = newStatus === status;
                    let activeClass = '';
                    if (status === 'Available') activeClass = isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold' : 'hover:bg-slate-50';
                    if (status === 'In Use') activeClass = isSelected ? 'bg-green-50 border-green-600 text-green-800 font-semibold' : 'hover:bg-slate-50';
                    if (status === 'Maintenance') activeClass = isSelected ? 'bg-rose-50 border-rose-500 text-rose-700 font-semibold' : 'hover:bg-slate-50';
                    
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setNewStatus(status)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-xs transition-all duration-200 cursor-pointer ${
                          isSelected ? 'shadow-sm scale-[1.02]' : 'border-slate-200 text-slate-600'
                        } ${activeClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full mb-1.5 ${
                          status === 'Available' ? 'bg-green-500' : status === 'In Use' ? 'bg-green-700' : 'bg-red-500'
                        }`} />
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingFacility(null)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
                {role === 'admin' && (
                  <button
                    type="button"
                    onClick={handleDeleteFacility}
                    className="w-full mt-1 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 border border-rose-200"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Delete Facility
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
  return noLayout ? inner : <Layout title="Facility" noPadding>{inner}</Layout>
}
