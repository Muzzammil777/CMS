import { apiDelete, apiGet, apiPost, apiPut } from './mockBackend';

// A small API layer that mirrors future REST usage (Node/Express-ready).
export const settingsApi = {
  getGeneralSettings: () => apiGet('general'),
  updateGeneralSettings: (payload) => apiPut('general', payload),

  getUsers: () => apiGet('users'),
  createUser: (payload) => apiPost('users', payload),
  updateUser: (id, payload) => apiPut(`users/${id}`, payload),
  deleteUser: (id) => apiDelete(`users/${id}`),
  replaceUsers: (payload) => apiPut('users', payload),

  getDepartments: () => apiGet('departments'),
  createDepartment: (payload) => apiPost('departments', payload),
  updateDepartment: (id, payload) => apiPut(`departments/${id}`, payload),
  deleteDepartment: (id) => apiDelete(`departments/${id}`),
  replaceDepartments: (payload) => apiPut('departments', payload),

  getAcademicSettings: () => apiGet('academic'),
  updateAcademicSettings: (payload) => apiPut('academic', payload),

  getFinanceSettings: () => apiGet('finance'),
  updateFinanceSettings: (payload) => apiPut('finance', payload),

  getNotificationSettings: () => apiGet('notifications'),
  updateNotificationSettings: (payload) => apiPut('notifications', payload),

  getSecuritySettings: () => apiGet('security'),
  updateSecuritySettings: (payload) => apiPut('security', payload),

  getIntegrationSettings: () => apiGet('integrations'),
  updateIntegrationSettings: (payload) => apiPut('integrations', payload),

  getDataManagementSettings: () => apiGet('data-management'),
  updateDataManagementSettings: (payload) => apiPut('data-management', payload),

  triggerBackup: () => apiPost('system/backup'),
  triggerRestore: (backupId) => apiPost('system/restore', { backupId }),
  exportData: () => apiGet('system/export'),

  getMonitoringSnapshot: () => apiGet('system/monitoring'),
};

