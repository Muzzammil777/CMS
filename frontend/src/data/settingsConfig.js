// Simplified settings for Admin and Finance roles only.
// Each section has at most 4 tabs — actionable, not placeholders.

const SETTINGS_SECTIONS = [
  {
    id: 'general',
    label: 'Portal Settings',
    icon: 'tune',
    roles: ['admin'],
    children: [
      { id: 'portal-preferences', label: 'Portal Preferences' },
      { id: 'branding-assets', label: 'Branding Assets' },
    ],
  },
  {
    id: 'users',
    label: 'User Management',
    icon: 'manage_accounts',
    roles: ['admin'],
    children: [
      { id: 'user-directory', label: 'User Directory' },
    ],
  },
  {
    id: 'academic',
    label: 'Academic Config',
    icon: 'school',
    roles: ['admin'],
    children: [
      { id: 'academic-year', label: 'Academic Year & Semesters' },
      { id: 'grading-rules', label: 'Grading & Attendance Rules' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'payments',
    roles: ['admin', 'finance'],
    children: [
      { id: 'fee-structure', label: 'Fee Structure & Policies' },
      { id: 'payment-gateway-settings', label: 'Payment Gateway' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'security',
    roles: ['admin'],
    children: [
      { id: 'password-policy', label: 'Password & MFA Policy' },
      { id: 'session-limits', label: 'Session & Access Limits' },
    ],
  },
  {
    id: 'notifications',
    label: 'Notification Alerts',
    icon: 'notifications',
    roles: ['admin', 'finance'],
    children: [
      { id: 'notification-preferences', label: 'Notification Preferences' },
    ],
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: 'person',
    roles: ['admin'],
    children: [
      { id: 'profile-info', label: 'Personal Information' },
    ],
  },
];

function normalizeSection(section) {
  return {
    ...section,
    children: section.children.map((child) => ({ ...child })),
  };
}

export function getSettingsSectionsByRole(role) {
  return SETTINGS_SECTIONS.filter((section) => section.roles.includes(role)).map(normalizeSection);
}

export function getDefaultSettingsItemId(sections) {
  return sections[0]?.children[0]?.id || '';
}

export function findSettingsSelection(sections, itemId) {
  for (const section of sections) {
    for (const child of section.children) {
      if (child.id === itemId) {
        return { section, child };
      }
    }
  }
  return null;
}
