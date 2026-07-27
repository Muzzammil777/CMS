/**
 * Admin Settings API client.
 * Routes all calls to FastAPI backend at /api/settings/*.
 * Replaces the old in-memory mock backend.
 */

import { API_BASE } from './apiBase';

const REQUEST_TIMEOUT_MS = 8000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/settings${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || payload?.detail || `Request failed: ${response.status}`);
    }
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Settings request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Section-based API helpers ────────────────────────────────────────────────

export async function apiGet(section) {
  return request(`/${section}`);
}

export async function apiPost(section, body) {
  return request(`/${section}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiPut(section, body) {
  return request(`/${section}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiDelete(section) {
  return request(`/${section}`, { method: 'DELETE' });
}

// ── Exported named getters/setters for admin settings page ───────────────────

export async function getGeneralSettings() {
  return request('/general');
}

export async function updateGeneralSettings(data) {
  return request('/general', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getAcademicConfig() {
  return request('/academic');
}

export async function updateAcademicConfig(data) {
  return request('/academic', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getFinanceSettings() {
  return request('/finance');
}

export async function updateFinanceSettings(data) {
  return request('/finance', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getNotificationSettings() {
  return request('/notifications');
}

export async function updateNotificationSettings(data) {
  return request('/notifications', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getSecuritySettings() {
  return request('/security');
}

export async function updateSecuritySettings(data) {
  return request('/security', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getIntegrationSettings() {
  return request('/integrations');
}

export async function updateIntegrationSettings(data) {
  return request('/integrations', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getDataManagementSettings() {
  return request('/data-management');
}

export async function updateDataManagementSettings(data) {
  return request('/data-management', { method: 'PUT', body: JSON.stringify(data) });
}

// ── Users & Departments ──────────────────────────────────────────────────────

export async function getUsers() {
  return request('/users');
}

export async function addUser(user) {
  return request('/users', { method: 'POST', body: JSON.stringify(user) });
}

export async function getDepartments() {
  return request('/departments');
}

export async function addDepartment(dept) {
  return request('/departments', { method: 'POST', body: JSON.stringify(dept) });
}

// ── System operations ────────────────────────────────────────────────────────

export async function getMonitoring() {
  return request('/system/monitoring');
}

export async function triggerBackup() {
  return request('/system/backup', { method: 'POST' });
}

export async function triggerRestore(backupId) {
  return request('/system/restore', { method: 'POST', body: JSON.stringify({ backupId }) });
}

export async function triggerExport() {
  return request('/system/export');
}

// ── Legacy compatibility exports ─────────────────────────────────────────────
// Some components may import these directly; keeping them as async fetchers.

export const generalSettings = null;
export const users = null;
export const departments = null;
export const academicConfig = null;
export const financeSettings = null;
export const notificationSettings = null;
export const securitySettings = null;
export const integrationSettings = null;
export const dataManagementSettings = null;
export const monitoring = null;
