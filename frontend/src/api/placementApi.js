import { API_BASE } from './apiBase';
const CACHE_KEY = 'cms_placements_cache';

function getCachedPlacements() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function setCachedPlacements(placements) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(placements));
  } catch {
    // localStorage full or unavailable
  }
}

function filterPlacements(items, { status, search, personId } = {}) {
  let filtered = [...items];
  if (status && status !== 'All') {
    filtered = filtered.filter(item => item.status === status);
  }
  if (personId) {
    filtered = filtered.filter(item => item.ownerId === personId);
  }
  if (search) {
    const needle = search.toLowerCase();
    filtered = filtered.filter(item =>
      String(item.name || '').toLowerCase().includes(needle)
      || String(item.company || '').toLowerCase().includes(needle)
    );
  }
  return filtered;
}

export async function fetchPlacements({ status, search, personId, department } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (search) params.append('search', search);
  if (personId) params.append('person_id', personId);
  if (department) params.append('department', department);

  const queryString = params.toString();
  const url = queryString ? `${API_BASE}/academics/placement?${queryString}` : `${API_BASE}/academics/placement`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch placements');
  const result = await res.json();
  const data = result.data || [];
  setCachedPlacements(data);
  return data;
}

export async function createPlacement(placementData) {
  const res = await fetch(`${API_BASE}/academics/placement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(placementData),
  });
  if (!res.ok) throw new Error('Failed to create placement');
  const result = await res.json();
  const created = result.data || result;
  const cached = getCachedPlacements();
  setCachedPlacements([created, ...cached]);
  return created;
}

export async function updatePlacement(placementId, placementData) {
  const res = await fetch(`${API_BASE}/academics/placement/${encodeURIComponent(placementId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(placementData),
  });
  if (!res.ok) throw new Error('Failed to update placement');
  const result = await res.json();
  const updated = result.data || result;
  const cached = getCachedPlacements();
  const next = cached.map(item => (item.id === placementId ? { ...item, ...updated } : item));
  setCachedPlacements(next);
  return updated;
}

export async function deletePlacement(placementId) {
  const res = await fetch(`${API_BASE}/academics/placement/${encodeURIComponent(placementId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete placement');
  const result = await res.json();
  const cached = getCachedPlacements();
  setCachedPlacements(cached.filter(item => item.id !== placementId));
  return result;
}
