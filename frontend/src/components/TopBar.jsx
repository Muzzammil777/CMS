import { getUserSession, getUserData, updateUserData } from '../auth/sessionController';
import { cmsRoles } from '../data/roleConfig';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import NotificationBell from './NotificationBell';
import NotificationDropdown from './NotificationDropdown';
import { buildApiUrl } from '../api/apiBase';
import { Menu, Settings, ChevronDown } from 'lucide-react';

export default function TopBar({ 
  title, 
  isSidebarVisible = true,
  isMobile = false,
  onToggleSidebar,
  userId = 'N/A',
  onProfilePrimaryAction,
  onProfileSecondaryAction 
}) {
  const [globalSearch, setGlobalSearch] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const navigate = useNavigate();
  const session = getUserSession();
  const [userData, setUserData] = useState(getUserData());
  const dynamicUser = userData;
  const role = session?.role || 'student';
  const [systemSettings, setSystemSettings] = useState(null);

  useEffect(() => {
    function loadSettings() {
      fetch(buildApiUrl('/settings/general'))
        .then(res => res.json())
        .then(data => {
          if (data && !data.detail) {
            setSystemSettings(data);
          }
        })
        .catch(err => console.error("Error loading system settings in TopBar:", err));
    }
    loadSettings();
    window.addEventListener('cms-settings-update', loadSettings);
    return () => window.removeEventListener('cms-settings-update', loadSettings);
  }, []);

  useEffect(() => {
    const loadUserData = () => {
      const uData = getUserData();
      setUserData(uData);

      if (session?.userId && role) {
        fetch(buildApiUrl(`/settings/${role}/${encodeURIComponent(session.userId)}/profile`))
          .then(res => res.json())
          .then(profile => {
            if (profile && profile.name) {
              setUserData(prev => ({ ...prev, ...profile }));
              const current = getUserData() || {};
              if (current.name !== profile.name || current.email !== profile.email) {
                updateUserData(profile);
              }
            }
          })
          .catch(err => console.error("Error fetching profile details in TopBar:", err));
      }

      if (uData && uData.avatar) {
        setAvatarUrl(uData.avatar);
      } else if (session?.userId && role === 'student') {
        fetch(buildApiUrl(`/students/${encodeURIComponent(session.userId)}`))
          .then(res => res.json())
          .then(data => {
            if (data && data.avatar) {
              setAvatarUrl(data.avatar);
              updateUserData({ avatar: data.avatar });
            }
          })
          .catch(err => console.error("Error fetching user avatar:", err));
      } else {
        setAvatarUrl(null);
      }
    };

    loadUserData();
    window.addEventListener('cms-auth-change', loadUserData);
    return () => {
      window.removeEventListener('cms-auth-change', loadUserData);
    };
  }, [session?.userId, role]);
  
  // Use dynamic data if available, otherwise fall back to role config
  const user = dynamicUser ? {
    ...(cmsRoles[role] || cmsRoles.student),
    ...dynamicUser,
    name: dynamicUser.name || dynamicUser.fullName || dynamicUser.staffName || cmsRoles[role]?.name || 'User',
    label: dynamicUser.designation || dynamicUser.role || cmsRoles[role]?.label || role.toUpperCase(),
    team: dynamicUser.department || dynamicUser.departmentId || cmsRoles[role]?.team || 'Department',
  } : (cmsRoles[role] || cmsRoles.student);

  const roleQuery = `?role=${encodeURIComponent(role)}`;

  const handlePrimaryClick = () => {
    if (onProfilePrimaryAction) {
      onProfilePrimaryAction();
      return;
    }
    if (role === 'faculty') {
      navigate(`/attendance${roleQuery}`);
    } else if (role === 'finance') {
      navigate(`/admin-fees${roleQuery}`);
    } else if (role === 'student') {
      navigate(`/timetable${roleQuery}`);
    }
  };

  const handleSecondaryClick = () => {
    if (onProfileSecondaryAction) {
      onProfileSecondaryAction();
      return;
    }
    if (role === 'faculty') {
      navigate(`/exams${roleQuery}`);
    } else if (role === 'finance') {
      navigate(`/payroll${roleQuery}`);
    } else if (role === 'student') {
      navigate(`/attendance${roleQuery}`);
    }
  };

  return (
    <header className="h-16 bg-white/95 border-b border-[#E6EDF2] flex items-center justify-between sticky top-0 z-30 backdrop-blur-md transition-all duration-200 px-4 md:px-6 shadow-xs">
      {/* Left Section: Menu Toggle, Portal Title, Page Title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {(!isSidebarVisible || isMobile) && (
          <button
            onClick={onToggleSidebar}
            className="w-10 h-10 rounded-xl bg-[#F4F7FF] border border-[#E6EDF2] text-[#003A40] hover:bg-[#EEF4F7] active:scale-95 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer"
            aria-label="Toggle Menu"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5 text-[#003A40]" />
          </button>
        )}
        
        <div className="min-w-0 flex flex-col justify-center">
          {(!isSidebarVisible || isMobile) && (
            <p className="text-[10px] md:text-[11px] font-bold text-[#003A40] tracking-wider uppercase leading-none mb-1">
              {systemSettings?.portalName || 'MIT Connect'}
            </p>
          )}
          <h2 className="text-xl md:text-2xl font-bold text-[#003A40] tracking-wide truncate leading-tight">
            {title || 'Dashboard'}
          </h2>
        </div>
      </div>

      {/* Right Section: Notifications */}
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {/* Notification Bell & Dropdown */}
        <div className="relative flex items-center">
          <NotificationBell 
            role={role}
            onBellClick={() => setIsNotificationOpen(!isNotificationOpen)}
          />
          {isNotificationOpen && (
            <NotificationDropdown 
              role={role}
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
