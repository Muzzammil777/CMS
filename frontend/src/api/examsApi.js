import { API_BASE } from './apiBase'

async function parseResponse(res, fallbackMessage) {
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    throw new Error(json?.detail || json?.message || fallbackMessage)
  }
  return json
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value))
    }
  })
  const raw = qs.toString()
  return raw ? `?${raw}` : ''
}

export function calculateGrade(marks, maxMarks) {
  const safeMax = Number(maxMarks) || 0
  if (!safeMax) return '-'
  const percentage = (Number(marks) / safeMax) * 100
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B+'
  if (percentage >= 60) return 'B'
  if (percentage >= 50) return 'C'
  if (percentage >= 40) return 'D'
  return 'F'
}

export async function listExams({ role, userId } = {}) {
  const query = buildQuery({ role, userId })
  const res = await fetch(`${API_BASE}/exams${query}`)
  const json = await parseResponse(res, 'Failed to fetch exams')
  return Array.isArray(json.data) ? json.data : []
}

export async function createExam(payload) {
  const res = await fetch(`${API_BASE}/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to create exam')
  return json.data
}

export async function updateExamById(examId, payload) {
  const res = await fetch(`${API_BASE}/exams/${encodeURIComponent(examId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to update exam')
  return json.data
}

export async function deleteExamById(examId) {
  const res = await fetch(`${API_BASE}/exams/${encodeURIComponent(examId)}`, {
    method: 'DELETE',
  })
  await parseResponse(res, 'Failed to delete exam')
}

export async function publishExamResults(examId) {
  const res = await fetch(`${API_BASE}/exams/${encodeURIComponent(examId)}/publish-results`, {
    method: 'PATCH',
  })
  const json = await parseResponse(res, 'Failed to publish results')
  return json.data
}

export async function listRegistrations({ examId, studentId } = {}) {
  const query = buildQuery({ exam_id: examId, student_id: studentId })
  const res = await fetch(`${API_BASE}/exams/registrations${query}`)
  const json = await parseResponse(res, 'Failed to fetch registrations')
  return Array.isArray(json.data) ? json.data : []
}

export async function registerExam(payload) {
  const res = await fetch(`${API_BASE}/exams/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to register exam')
  return json.data
}

export async function listMarks({ examId, studentId } = {}) {
  const query = buildQuery({ exam_id: examId, student_id: studentId })
  const res = await fetch(`${API_BASE}/exams/marks${query}`)
  const json = await parseResponse(res, 'Failed to fetch marks')
  return Array.isArray(json.data) ? json.data : []
}

export async function upsertMark(payload) {
  const res = await fetch(`${API_BASE}/exams/marks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to save marks')
  return json.data
}

export async function listInternalMarks({ examId, studentId, entered_by } = {}) {
  const query = buildQuery({ exam_id: examId, student_id: studentId, entered_by })
  const res = await fetch(`${API_BASE}/exams/internal-marks${query}`)
  const json = await parseResponse(res, 'Failed to fetch internal marks')
  return Array.isArray(json.data) ? json.data : []
}

export async function upsertInternalMark(payload) {
  const res = await fetch(`${API_BASE}/exams/internal-marks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to save internal marks')
  return json.data
}

export async function listExamAttendance({ examId } = {}) {
  const query = buildQuery({ exam_id: examId })
  const res = await fetch(`${API_BASE}/exams/attendance${query}`)
  const json = await parseResponse(res, 'Failed to fetch attendance')
  return Array.isArray(json.data) ? json.data : []
}

export async function upsertExamAttendance(payload) {
  const res = await fetch(`${API_BASE}/exams/attendance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to save attendance')
  return json.data
}

export async function listInvigilators({ examId } = {}) {
  const query = buildQuery({ exam_id: examId })
  const res = await fetch(`${API_BASE}/exams/invigilators${query}`)
  const json = await parseResponse(res, 'Failed to fetch invigilators')
  return Array.isArray(json.data) ? json.data : []
}

export async function assignInvigilator(payload) {
  const res = await fetch(`${API_BASE}/exams/invigilators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to assign invigilator')
  return json.data
}

export async function deleteInvigilator(assignmentId) {
  const res = await fetch(`${API_BASE}/exams/invigilators/${encodeURIComponent(assignmentId)}`, {
    method: 'DELETE',
  })
  await parseResponse(res, 'Failed to remove invigilator')
}

export async function listRevaluations({ examId, studentId } = {}) {
  const query = buildQuery({ exam_id: examId, student_id: studentId })
  const res = await fetch(`${API_BASE}/exams/revaluations${query}`)
  const json = await parseResponse(res, 'Failed to fetch revaluation requests')
  return Array.isArray(json.data) ? json.data : []
}

export async function createRevaluation(payload) {
  const res = await fetch(`${API_BASE}/exams/revaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to submit revaluation request')
  return json.data
}

export async function listExamHalls() {
  const res = await fetch(`${API_BASE}/exams/halls`)
  const json = await parseResponse(res, 'Failed to fetch exam halls')
  return Array.isArray(json.data) ? json.data : []
}

export async function listSeatAssignments({ examId, studentId } = {}) {
  const query = buildQuery({ exam_id: examId, student_id: studentId })
  const res = await fetch(`${API_BASE}/exams/seats${query}`)
  const json = await parseResponse(res, 'Failed to fetch seat assignments')
  return Array.isArray(json.data) ? json.data : []
}

export async function upsertSeatAssignment(payload) {
  const res = await fetch(`${API_BASE}/exams/seats`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to save seat assignment')
  return json.data
}

export async function autoAssignSeats(payload) {
  const res = await fetch(`${API_BASE}/exams/seats/auto-assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to auto-assign seats')
  return json.data
}

export async function listExamSessions() {
  const res = await fetch(`${API_BASE}/exams/sessions`)
  const json = await parseResponse(res, 'Failed to fetch exam sessions')
  return Array.isArray(json.data) ? json.data : []
}

export async function createExamSession(payload) {
  const res = await fetch(`${API_BASE}/exams/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to create exam session')
  return json.data
}

export async function updateExamSession(sessionId, payload) {
  const res = await fetch(`${API_BASE}/exams/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to update exam session')
  return json.data
}

export async function listTimetableDrafts() {
  const res = await fetch(`${API_BASE}/exams/timetable-drafts`)
  const json = await parseResponse(res, 'Failed to fetch timetable drafts')
  return Array.isArray(json.data) ? json.data : []
}

export async function createTimetableDraft(payload) {
  const res = await fetch(`${API_BASE}/exams/timetable-drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to create timetable draft')
  return json.data
}

export async function updateTimetableDraftStatus(draftId, payload) {
  const res = await fetch(`${API_BASE}/exams/timetable-drafts/${encodeURIComponent(draftId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to update timetable draft status')
  return json.data
}

export async function listNotifications({ studentId } = {}) {
  const query = buildQuery({ student_id: studentId })
  const res = await fetch(`${API_BASE}/exams/notifications${query}`)
  const json = await parseResponse(res, 'Failed to fetch notifications')
  return Array.isArray(json.data) ? json.data : []
}

export async function markNotificationRead(notificationId) {
  const res = await fetch(`${API_BASE}/exams/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
  })
  const json = await parseResponse(res, 'Failed to mark notification as read')
  return json.data
}

export async function markAllNotificationsRead(studentId) {
  const res = await fetch(`${API_BASE}/exams/notifications/mark-all-read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  })
  await parseResponse(res, 'Failed to mark all notifications as read')
}

export async function getSchedulePreview(payload) {
  const res = await fetch(`${API_BASE}/exams/schedule-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to get schedule preview')
  return json.data
}

export async function submitBulkSchedule(payload) {
  const res = await fetch(`${API_BASE}/exams/schedule-bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await parseResponse(res, 'Failed to schedule exams')
  return json.data
}

export async function listEnrolledStudents(examId) {
  const res = await fetch(`${API_BASE}/exams/${encodeURIComponent(examId)}/enrolled-students`)
  const json = await parseResponse(res, 'Failed to fetch enrolled students')
  return Array.isArray(json.data) ? json.data : []
}
