import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getUserSession } from '../auth/sessionController';
import RoleGuard from '../components/RoleGuard';
import Layout from '../components/Layout';
import SettingsShell from '../components/settings/SettingsShell';
import { SettingsProvider } from '../context/SettingsContext';
import { getSettingsSectionsByRole, getDefaultSettingsItemId } from '../data/settingsConfig';
import { getSettingsMenu } from '../components/user-settings/settingsMenu';
import { cmsRoles } from '../data/roleConfig';

// Admin/Finance panels
import GeneralSettings from '../components/settings/GeneralSettings';
import UserManagement from '../components/settings/UserManagement';
import AcademicSettings from '../components/settings/AcademicSettings';
import FinanceSettings from '../components/settings/FinanceSettings';
import SecuritySettings from '../components/settings/SecuritySettings';

// Student/Faculty panels
import ProfileSettings from '../components/user-settings/ProfileSettings';
import NotificationSettings from '../components/user-settings/NotificationSettings';
import UserSecuritySettings from '../components/user-settings/SecuritySettings';
import TeachingPreferences from '../components/user-settings/TeachingPreferences';

/** Render admin panel based on active section id */
function AdminPanel({ sectionId, role, userId }) {
  switch (sectionId) {
    case 'general':  return <RoleGuard roles={['admin']}><GeneralSettings /></RoleGuard>;
    case 'users':    return <RoleGuard roles={['admin']}><UserManagement /></RoleGuard>;
    case 'academic': return <RoleGuard roles={['admin']}><AcademicSettings /></RoleGuard>;
    case 'finance':  return <RoleGuard roles={['admin', 'finance']}><FinanceSettings /></RoleGuard>;
    case 'security': return <RoleGuard roles={['admin']}><SecuritySettings /></RoleGuard>;
    case 'notifications': return <NotificationSettings role={role} userId={userId} />;
    case 'profile':  return <ProfileSettings role={role} userId={userId} />;
    default:         return <GeneralSettings />;
  }
}

/** Render student/faculty/finance panel based on active tab id */
function UserPanel({ tabId, role, userId }) {
  switch (tabId) {
    case 'profile':               return <ProfileSettings role={role} userId={userId} />;
    case 'notifications':         return <NotificationSettings role={role} userId={userId} />;
    case 'security':              return <UserSecuritySettings role={role} userId={userId} />;
    case 'teaching-preferences':  return <TeachingPreferences role={role} userId={userId} />;
    default:                      return <ProfileSettings role={role} userId={userId} />;
  }
}

/**
 * Admin Settings View
 * Uses <Layout> + <SettingsShell> (two-column)
 */
function AdminSettingsView({ role, userId }) {
  const sections = getSettingsSectionsByRole(role);
  const tabs = sections.map((s) => ({ id: s.id, label: s.label, icon: s.icon }));
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  useEffect(() => {
    const roleLabel = cmsRoles[role]?.label || 'System';
    document.title = `MIT Connect - ${roleLabel} Settings`;
  }, [role]);

  return (
    <SettingsProvider>
      <Layout title="System Settings" noPadding>
        <SettingsShell role={role} tabs={tabs} activeTab={activeTab} onSelect={setActiveTab}>
          {/* Pass role/userId so notifications panel works */}
          <AdminPanel sectionId={activeTab} role={role} userId={userId} />
        </SettingsShell>
      </Layout>
    </SettingsProvider>
  );
}

/**
 * Student/Faculty Settings View
 * Uses <Layout> + <SettingsShell> (two-column)
 * Wrapped in SettingsProvider for dirty-state tracking across panels
 */
function UserSettingsView({ role, userId }) {
  const tabs = getSettingsMenu(role);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'profile');

  useEffect(() => {
    document.title = `MIT Connect - Account Settings`;
  }, []);

  return (
    <SettingsProvider>
      <Layout title="Account Settings" noPadding>
        <SettingsShell role={role} tabs={tabs} activeTab={activeTab} onSelect={setActiveTab}>
          <UserPanel tabId={activeTab} role={role} userId={userId} />
        </SettingsShell>
      </Layout>
    </SettingsProvider>
  );
}

/**
 * Main SettingsPage — routes to correct view based on role
 */
export default function SettingsPage() {
  const session = getUserSession();

  if (!session) return <Navigate to="/" replace />;

  const { role, userId } = session;

  // Admin uses admin settings view (system config + notifications)
  if (role === 'admin') {
    return <AdminSettingsView role={role} userId={userId} />;
  }

  // Student, faculty, finance all use the user settings view (profile + notifications)
  if (role === 'student' || role === 'faculty' || role === 'finance') {
    return <UserSettingsView role={role} userId={userId} />;
  }

  return <Navigate to="/" replace />;
}
