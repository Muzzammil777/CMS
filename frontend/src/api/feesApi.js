import { API_BASE } from './apiBase';

async function parseResponse(res, fallbackMessage) {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.detail || json?.message || fallbackMessage;
    throw new Error(message);
  }
  return json;
}

function toDateString(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().split('T')[0];
}

function normalizeFeeAssignment(item) {
  if (!item) return item;
  const breakdown = item.fee_breakdown || item.feeBreakdown || {};
  const totalFee =
    item.total_fee ??
    item.totalFee ??
    breakdown.total ??
    breakdown.total_fee ??
    0;

  return {
    id: item.id || item._id,
    studentId: item.student_id || item.studentId,
    studentName: item.student_name || item.studentName,
    course: item.course,
    semester: item.semester,
    semesterFee: breakdown.semester_fee ?? item.semesterFee,
    bookFee: breakdown.book_fee ?? item.bookFee,
    examFee: breakdown.exam_fee ?? item.examFee,
    hostelFee: breakdown.hostel_fee ?? item.hostelFee,
    miscFee: breakdown.misc_fee ?? item.miscFee,
    totalFee,
    paymentStatus: item.payment_status || item.paymentStatus || 'Pending',
    assignedDate: toDateString(item.assigned_date || item.assignedDate),
    paidDate: toDateString(item.paid_date || item.paidDate),
    paymentMethod: item.payment_method || item.paymentMethod,
    transactionId: item.transaction_id || item.transactionId,
    firstGraduate: item.first_graduate ?? item.firstGraduate,
    hostelRequired: item.hostel_required ?? item.hostelRequired,
  };
}

export async function listFees() {
  const res = await fetch(`${API_BASE}/fees`);
  const json = await parseResponse(res, 'Failed to fetch fees');
  const rows = Array.isArray(json) ? json : [];
  return rows.map(normalizeFeeAssignment);
}

export async function listFeesByStudent(studentId) {
  const res = await fetch(`${API_BASE}/fees/student/${encodeURIComponent(studentId)}`);
  const json = await parseResponse(res, 'Failed to fetch student fees');
  const rows = Array.isArray(json?.fees) ? json.fees : [];
  return rows.map(normalizeFeeAssignment);
}

export async function assignFee(payload) {
  const res = await fetch(`${API_BASE}/fees/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse(res, 'Failed to assign fee');
}

export async function updateFeePayment(feeId, payload) {
  const res = await fetch(`${API_BASE}/fees/${encodeURIComponent(feeId)}/payment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await parseResponse(res, 'Failed to update fee payment');
  return normalizeFeeAssignment(json);
}

export async function deleteFeeAssignment(feeId) {
  const res = await fetch(`${API_BASE}/fees/${encodeURIComponent(feeId)}`, {
    method: 'DELETE',
  });
  return parseResponse(res, 'Failed to delete fee assignment');
}
