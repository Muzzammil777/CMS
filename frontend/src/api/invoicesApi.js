import { API_BASE } from './apiBase';

async function parseResponse(res, fallbackMessage) {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.detail || json?.message || fallbackMessage;
    throw new Error(message);
  }
  return json;
}

function normalizeInvoice(item) {
  if (!item) return item;
  return {
    id: item.id || item._id || item.invoice_id,
    invoiceId: item.invoice_id || item.invoiceId || item.id || item._id,
    studentId: item.student_id || item.studentId,
    studentName: item.student_name || item.studentName,
    course: item.course,
    semester: item.semester,
    items: item.items || [],
    total: item.total ?? 0,
    generatedDate: item.generated_date || item.generatedDate || '',
    paymentStatus: item.payment_status || item.paymentStatus || 'Pending',
    status: item.status || item.payment_status || item.paymentStatus || 'Pending',
    generatedFrom: item.generated_from || item.generatedFrom || '',
    paidDate: item.paid_date || item.paidDate || '',
    paymentMethod: item.payment_method || item.paymentMethod || '',
    transactionId: item.transaction_id || item.transactionId || '',
    applicationId: item.application_id || item.applicationId || '',
  };
}

export async function listInvoices() {
  const res = await fetch(`${API_BASE}/invoices`);
  const json = await parseResponse(res, 'Failed to fetch invoices');
  const rows = Array.isArray(json) ? json : [];
  return rows.map(normalizeInvoice);
}

export async function createInvoice(payload) {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await parseResponse(res, 'Failed to create invoice');
  return normalizeInvoice(json);
}

export async function updateInvoiceStatus(invoiceId, payload) {
  const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await parseResponse(res, 'Failed to update invoice status');
  return normalizeInvoice(json);
}

export async function deleteInvoice(invoiceId) {
  const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'DELETE',
  });
  return parseResponse(res, 'Failed to delete invoice');
}
