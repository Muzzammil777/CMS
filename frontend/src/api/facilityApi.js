import { API_BASE } from './apiBase';

function getErrorMessage(json, fallback) {
  return json?.detail || json?.message || fallback;
}

export async function fetchFacilities({ status, search } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (search) params.append('search', search);

  const query = params.toString();
  const url = query ? `${API_BASE}/academics/facilities?${query}` : `${API_BASE}/academics/facilities`;

  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(getErrorMessage(json, 'Failed to fetch facilities'));
  }
  return Array.isArray(json.data) ? json.data : [];
}

export async function fetchFacilityBookings({ room } = {}) {
  const params = new URLSearchParams();
  if (room) params.append('room', room);

  const query = params.toString();
  const url = query ? `${API_BASE}/academics/facilities/bookings?${query}` : `${API_BASE}/academics/facilities/bookings`;

  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(getErrorMessage(json, 'Failed to fetch facility bookings'));
  }
  return Array.isArray(json.data) ? json.data : [];
}

export async function createFacilityBooking(payload) {
  const res = await fetch(`${API_BASE}/academics/facilities/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(getErrorMessage(json, 'Booking failed'));
  }
  return json.data;
}

export async function createFacilityRecord(payload) {
  const res = await fetch(`${API_BASE}/academics/facilities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(getErrorMessage(json, 'Failed to add facility'));
  }
  return json.data;
}

export async function updateFacilityRecord(facilityId, payload) {
  const res = await fetch(`${API_BASE}/academics/facilities/${facilityId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(getErrorMessage(json, 'Failed to update facility'));
  }
  return json.data;
}

export async function deleteFacilityRecord(facilityId) {
  const res = await fetch(`${API_BASE}/academics/facilities/${facilityId}`, {
    method: 'DELETE',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(getErrorMessage(json, 'Failed to delete facility'));
  }
  return json;
}
