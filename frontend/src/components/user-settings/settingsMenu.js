// Simplified menu for Student, Faculty, and Finance roles.
// Only actionable, role-relevant settings are exposed.

export function getSettingsMenu(role) {
  if (role === 'student') {
    return [
      { id: 'profile',        label: 'My Profile',         icon: 'person' },
      { id: 'notifications',  label: 'Notification Alerts', icon: 'notifications' },
      { id: 'security',       label: 'Password & Security', icon: 'lock' },
    ];
  }

  if (role === 'faculty') {
    return [
      { id: 'profile',              label: 'My Profile',          icon: 'person' },
      { id: 'teaching-preferences', label: 'Teaching Preferences', icon: 'school' },
      { id: 'notifications',        label: 'Notification Alerts',  icon: 'notifications' },
      { id: 'security',             label: 'Password & Security',  icon: 'lock' },
    ];
  }

  if (role === 'finance') {
    return [
      { id: 'profile',       label: 'My Profile',         icon: 'person' },
      { id: 'notifications', label: 'Notification Alerts', icon: 'notifications' },
      { id: 'security',      label: 'Password & Security', icon: 'lock' },
    ];
  }

  return [];
}
