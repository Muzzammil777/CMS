const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const configuredBaseRaw = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE
);

function normalizeHostBase(value) {
  if (!value) return '';
  return value.endsWith('/api') ? value.slice(0, -4) : value;
}

function resolveHostBase() {
  const configuredBase = normalizeHostBase(configuredBaseRaw);
  if (configuredBase) return configuredBase;

  // In production (monorepo), the backend serves the frontend dist,
  // so the API is on the same origin — use relative /api path (empty base).
  return '';
}

const hostBase = resolveHostBase();

export const API_BASE = hostBase ? `${trimTrailingSlash(hostBase)}/api` : '/api';

export function buildApiUrl(path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export function buildUploadUrl(fileName) {
  if (!fileName) return '';
  if (fileName.startsWith('http') || fileName.startsWith('/uploads')) return fileName;
  const base = hostBase || '';
  return `${trimTrailingSlash(base)}/uploads/${fileName}`;
}

