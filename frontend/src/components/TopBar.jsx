import { getUserSession, getUserData, updateUserData } from '../auth/sessionController'
import { cmsRoles } from '../data/roleConfig'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileDropdown from './ProfileDropdown'
import NotificationBell from './NotificationBell'
import NotificationDropdown from './NotificationDropdown'
import { buildApiUrl } from '../api/apiBase'

export default function TopBar({ 
  title, 
  isSidebarVisible = true,
  isMobile = false,
  onToggleSidebar,
  userId = 'N/A',
  onProfilePrimaryAction,
  onProfileSecondaryAction 
}) {
  const [globalSearch, setGlobalSearch] = useState('')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const navigate = useNavigate()
  const session = getUserSession()
  const [userData, setUserData] = useState(getUserData())
  const dynamicUser = userData
  const role = session?.role || 'student'
  const [systemSettings, setSystemSettings] = useState(null)

  useEffect(() => {
    function loadSettings() {
      fetch(buildApiUrl('/settings/general'))
        .then(res => res.json())
        .then(data => {
          if (data && !data.detail) {
            setSystemSettings(data)
          }
        })
        .catch(err => console.error("Error loading system settings in TopBar:", err))
    }
    loadSettings()
    window.addEventListener('cms-settings-update', loadSettings)
    return () => window.removeEventListener('cms-settings-update', loadSettings)
  }, [])

  useEffect(() => {
    const loadUserData = () => {
      const uData = getUserData()
      setUserData(uData)

      if (session?.userId && role) {
        fetch(buildApiUrl(`/settings/${role}/${encodeURIComponent(session.userId)}/profile`))
          .then(res => res.json())
          .then(profile => {
            if (profile && profile.name) {
              setUserData(prev => ({ ...prev, ...profile }))
              const current = getUserData() || {}
              if (current.name !== profile.name || current.email !== profile.email) {
                updateUserData(profile)
              }
            }
          })
          .catch(err => console.error("Error fetching profile details in TopBar:", err))
      }

      if (uData && uData.avatar) {
        setAvatarUrl(uData.avatar)
      } else if (session?.userId && role === 'student') {
        fetch(buildApiUrl(`/students/${encodeURIComponent(session.userId)}`))
          .then(res => res.json())
          .then(data => {
            if (data && data.avatar) {
              setAvatarUrl(data.avatar)
              updateUserData({ avatar: data.avatar })
            }
          })
          .catch(err => console.error("Error fetching user avatar:", err))
      } else {
        setAvatarUrl(null)
      }
    }

    loadUserData()
    window.addEventListener('cms-auth-change', loadUserData)
    return () => {
      window.removeEventListener('cms-auth-change', loadUserData)
    }
  }, [session?.userId, role])
  
  // Use dynamic data if available, otherwise fall back to role config
  const user = dynamicUser ? {
    ...(cmsRoles[role] || cmsRoles.student),
    ...dynamicUser,
    name: dynamicUser.name || dynamicUser.fullName || dynamicUser.staffName || cmsRoles[role]?.name || 'User',
    label: dynamicUser.designation || dynamicUser.role || cmsRoles[role]?.label || role.toUpperCase(),
    team: dynamicUser.department || dynamicUser.departmentId || cmsRoles[role]?.team || 'Department',
  } : (cmsRoles[role] || cmsRoles.student)

  const roleQuery = `?role=${encodeURIComponent(role)}`

  const handlePrimaryClick = () => {
    if (onProfilePrimaryAction) {
      onProfilePrimaryAction()
      return
    }
    if (role === 'faculty') {
      navigate(`/attendance${roleQuery}`)
    } else if (role === 'finance') {
      navigate(`/admin-fees${roleQuery}`)
    } else if (role === 'student') {
      navigate(`/timetable${roleQuery}`)
    }
  }

  const handleSecondaryClick = () => {
    if (onProfileSecondaryAction) {
      onProfileSecondaryAction()
      return
    }
    if (role === 'faculty') {
      navigate(`/exams${roleQuery}`)
    } else if (role === 'finance') {
      navigate(`/payroll${roleQuery}`)
    } else if (role === 'student') {
      navigate(`/attendance${roleQuery}`)
    }
  }

  return (
    <header className={`h-12 md:h-14 bg-white md:bg-white/80 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 md:backdrop-blur-md transition-all duration-300 px-4 md:px-6`}>
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {(!isSidebarVisible || isMobile) && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#334155',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="hover:bg-slate-100 active:scale-95 transition-all"
            aria-label="Toggle Menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        )}
        <div className="min-w-0">
          {(!isSidebarVisible || isMobile) && (
            <p className="text-[10px] md:text-xs font-semibold text-[#276221] tracking-wider uppercase leading-none mb-1">
              {systemSettings?.portalName || 'MIT Connect'}
            </p>
          )}
          <h2 className="text-sm md:text-base font-bold text-slate-800 tracking-tight truncate leading-tight">
            {title || 'Dashboard'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <div className="flex items-center gap-1 md:gap-2 relative">
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
          <button
            className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
            onClick={() => navigate('/settings')}
            aria-label="Open settings"
            title="Settings"
          >
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">settings</span>
          </button>
        </div>
        <div className="flex items-center gap-2 md:gap-4 border-l border-slate-100 pl-2 md:pl-6 cursor-pointer group relative">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-[#1e293b] truncate max-w-[120px] md:max-w-none">{user.name}</p>
            <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider truncate max-w-[120px] md:max-w-none">{user.label}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm transition-transform group-hover:scale-105 cursor-pointer flex-shrink-0"
            aria-label="Open profile dropdown"
            title="Open profile"
          >
            <img 
              src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=276221&color=fff&size=128`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </button>
          <ProfileDropdown
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            user={{ ...user, avatar: avatarUrl }}
            userId={session?.userId || userId}
            role={role}
            onPrimaryAction={handlePrimaryClick}
            onSecondaryAction={handleSecondaryClick}
          />
        </div>
      </div>
    </header>
  )
}
