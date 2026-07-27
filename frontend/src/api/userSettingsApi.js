import { API_BASE } from './apiBase';

const REQUEST_TIMEOUT_MS = 8000;

function resolveRoleAndUserId(roleOrUserId, maybeUserId) {
  const normalizedRole =
    typeof roleOrUserId === 'string'
      ? roleOrUserId.toLowerCase()
      : '';

  const validRoles = ['student', 'faculty', 'admin', 'finance'];
  if (validRoles.includes(normalizedRole) && typeof maybeUserId === 'string') {
    return {
      role: roleOrUserId,
      userId: maybeUserId,
    };
  }

  return {
    role: null,
    userId: roleOrUserId,
  };
}

function buildSettingsPath(role, userId, section) {
  if (role) {
    return `${API_BASE}/settings/${role}/${userId}/${section}`;
  }

  return `${API_BASE}/settings/${userId}/${section}`;
}

async function request(path, options = {}) {
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    // If path already starts with API_BASE, use it directly; otherwise prepend nothing
    const url = path.startsWith('http') ? path : path;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers || {}),
      },
      ...fetchOptions,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to communicate with settings service.');
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Settings service request timed out. Ensure backend is running on http://localhost:5000.');
    }

    if (error instanceof TypeError) {
      throw new Error('Settings service is unavailable. Start backend server on http://localhost:5000 and retry.');
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export const userSettingsApi = {
  getProfile(role, userId) {
    return request(`${API_BASE}/settings/${role}/${userId}/profile`);
  },

  updateProfile(role, userId, data) {
    return request(`${API_BASE}/settings/${role}/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword(userId, oldPassword, newPassword) {
    return request(`${API_BASE}/settings/change-password`, {
      method: 'POST',
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    });
  },

  updateEmail(role, userId, email) {
    return request(`${API_BASE}/settings/email`, {
      method: 'PUT',
      body: JSON.stringify({ role, userId, email }),
    });
  },

  getNotifications(role, userId) {
    return request(`${API_BASE}/settings/${role}/${userId}/notifications`);
  },

  updateNotifications(role, userId, data) {
    return request(`${API_BASE}/settings/${role}/${userId}/notifications`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getSessions(roleOrUserId, maybeUserId) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    return request(buildSettingsPath(role, userId, 'sessions'));
  },

  logoutAllDevices(roleOrUserId, maybeUserId) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    return request(`${API_BASE}/settings/logout-all`, {
      method: 'POST',
      body: JSON.stringify(role ? { role, userId } : { userId }),
    });
  },

  getLoginHistory(roleOrUserId, maybeUserId) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    return request(buildSettingsPath(role, userId, 'login-history'));
  },

  getAppearance(roleOrUserId, maybeUserId) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    return request(buildSettingsPath(role, userId, 'appearance'));
  },

  updateAppearance(roleOrUserId, maybeUserId, data) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    const payload = typeof data === 'undefined' ? maybeUserId : data;

    return request(buildSettingsPath(role, userId, 'appearance'), {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getLanguage(roleOrUserId, maybeUserId) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    return request(buildSettingsPath(role, userId, 'language'));
  },

  updateLanguage(roleOrUserId, maybeUserId, data) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    const payload = typeof data === 'undefined' ? maybeUserId : data;

    return request(buildSettingsPath(role, userId, 'language'), {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getPrivacy(roleOrUserId, maybeUserId) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    return request(buildSettingsPath(role, userId, 'privacy'));
  },

  updatePrivacy(roleOrUserId, maybeUserId, data) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    const payload = typeof data === 'undefined' ? maybeUserId : data;

    return request(buildSettingsPath(role, userId, 'privacy'), {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getAccessibility(roleOrUserId, maybeUserId) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    return request(buildSettingsPath(role, userId, 'accessibility'));
  },

  updateAccessibility(roleOrUserId, maybeUserId, data) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    const payload = typeof data === 'undefined' ? maybeUserId : data;

    return request(buildSettingsPath(role, userId, 'accessibility'), {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getTeachingPreferences(userId) {
    return request(`${API_BASE}/settings/faculty/${userId}/teaching`);
  },

  updateTeachingPreferences(userId, data) {
    return request(`${API_BASE}/settings/faculty/${userId}/teaching`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  exportUserData(roleOrUserId, maybeUserId) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    return request(buildSettingsPath(role, userId, 'export-data'));
  },

  requestAccountDeletion(roleOrUserId, maybeUserId, reason) {
    const { role, userId } = resolveRoleAndUserId(roleOrUserId, maybeUserId);
    const message = typeof reason === 'undefined' ? maybeUserId : reason;

    return request(buildSettingsPath(role, userId, 'delete-request'), {
      method: 'POST',
      body: JSON.stringify({ reason: message }),
    });
  },
};
