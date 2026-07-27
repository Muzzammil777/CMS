import { demoUsers, getValidRole } from '../data/roleConfig';

const AUTH_KEYS = ['cmsRole', 'cmsUserId', 'cmsAuthenticated', 'cmsUser'];

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cms-auth-change'));
  }
}

function clearCmsStorage(storage) {
  const keysToRemove = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && key.startsWith('cms')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function createUserSession(role, userId, userData = null) {
  const validRole = getValidRole(role);
  const normalizedUserId = userId.trim();

  sessionStorage.setItem('cmsRole', validRole);
  sessionStorage.setItem('cmsUserId', normalizedUserId);
  sessionStorage.setItem('cmsAuthenticated', 'true');
  
  if (userData) {
    sessionStorage.setItem('cmsUser', JSON.stringify(userData));
  }

  notifyAuthChange();
}

export function destroyUserSession() {
  AUTH_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
  });

  // Clear any additional CMS auth/session attributes created in future modules.
  clearCmsStorage(sessionStorage);

  notifyAuthChange();
}

export function getUserSession() {
  const role = sessionStorage.getItem('cmsRole');
  const userId = sessionStorage.getItem('cmsUserId');
  const isAuthenticated = sessionStorage.getItem('cmsAuthenticated') === 'true';

  if (!role || !userId || !isAuthenticated) {
    return null;
  }

  return {
    role,
    userId,
  };
}

export function getUserData() {
  const userData = sessionStorage.getItem('cmsUser');
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch (e) {
    return null;
  }
}

export function hasActiveSession() {
  return Boolean(getUserSession());
}

export function updateUserData(newData) {
  const current = getUserData();
  // Always persist — even if no prior user data exists in session storage.
  const updated = { ...(current || {}), ...newData };
  sessionStorage.setItem('cmsUser', JSON.stringify(updated));
  notifyAuthChange();
}
