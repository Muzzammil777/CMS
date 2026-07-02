import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getUserSession, destroyUserSession, getUserData } from '../auth/sessionController';
import { cmsRoles, roleMenuGroups } from '../data/roleConfig';
import { buildUploadUrl, API_BASE } from '../api/apiBase';

const iconMap = {
  Dashboard: 'dashboard',
  Students: 'group',
  Faculty: 'person',
  Department: 'domain',
  Exams: 'school',
  Timetable: 'calendar_today',
  Attendance: 'rule',
  Placement: 'work',
  Facility: 'apartment',
  Fees: 'payments',
  Reports: 'assessment',
  Admission: 'person_add',
  Payroll: 'receipt_long',
  Invoices: 'description',
  Analytics: 'query_stats',
  Notifications: 'notifications',
  Settings: 'settings',
};

const routeMap = {
  Dashboard: '/dashboard',
  Students: '/students',
  Faculty: '/faculty',
  Department: '/department',
  Exams: '/exams',
  Timetable: '/timetable',
  Attendance: '/attendance',
  Placement: '/placement',
  Facility: '/facility',
  Fees: '/fees',
  Reports: '/reports',
  Admission: '/admission',
  Payroll: '/payroll',
  Invoices: '/invoices',
  Analytics: '/analytics',
  Notifications: '/notifications',
  Settings: '/settings',
};

export default function AcademicSidebar({ 
  isSidebarVisible = true, 
  onToggleSidebar,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);
  const session = getUserSession();
  const dynamicUser = getUserData();
  const role = session?.role || 'student';
  
  // Track collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [systemSettings, setSystemSettings] = useState(null);

  useEffect(() => {
    function loadSettings() {
      fetch(`${API_BASE}/settings/general`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.detail) {
            setSystemSettings(data);
          }
        })
        .catch(err => console.error("Error loading system settings in sidebar:", err));
    }
    loadSettings();
    window.addEventListener('cms-settings-update', loadSettings);
    return () => window.removeEventListener('cms-settings-update', loadSettings);
  }, []);

  const roleMeta = dynamicUser ? {
    label: dynamicUser.designation || dynamicUser.role || role.toUpperCase(),
    ...dynamicUser
  } : (cmsRoles[role] || cmsRoles.student);

  const menuGroups = [...(roleMenuGroups[role] || [])];
  
  if (roleMeta.label === 'HOD' || (roleMeta.designation && roleMeta.designation.includes('HOD'))) {
    const overviewGroup = menuGroups.find(g => g.title === 'Overview');
    if (overviewGroup && !overviewGroup.items.includes('Reports')) {
      overviewGroup.items.push('Reports');
    }
  }

  function getRoute(item) {
    if (item === 'Fees') {
      return (role === 'admin' || role === 'finance') ? '/admin-fees' : '/fees';
    }
    if (item === 'Invoices') {
      if (role === 'admin') return '/admin-invoices';
      if (role === 'finance') return '/finance-invoices';
      return '/invoices';
    }
    return routeMap[item] || '/dashboard';
  }

  function withRoleQuery(pathname) {
    return `${pathname}?role=${encodeURIComponent(role)}`;
  }

  function handleLogout() {
    destroyUserSession();
    navigate('/', { replace: true });
  }

  const toggleGroup = (title) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('cmsSidebarScroll');
    if (navRef.current && saved) {
      const value = Number.parseInt(saved, 10);
      if (Number.isFinite(value)) {
        navRef.current.scrollTop = value;
      }
    }
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    const handleScroll = () => {
      sessionStorage.setItem('cmsSidebarScroll', String(navRef.current.scrollTop));
    };
    navRef.current.addEventListener('scroll', handleScroll);
    return () => navRef.current?.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    const saved = sessionStorage.getItem('cmsSidebarScroll');
    if (saved) {
      const value = Number.parseInt(saved, 10);
      if (Number.isFinite(value)) {
        navRef.current.scrollTop = value;
      }
    }
  }, [location.pathname]);

  return (
    <aside 
      style={{ background: '#00236f' }} 
      className={`border-r border-slate-700 flex flex-col fixed h-full overflow-y-auto z-50 transition-all duration-300 ${
        isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
      } ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Brand Header — two layouts for expanded vs collapsed */}
      {isCollapsed ? (
        <div className="flex flex-col items-center py-3 gap-2 border-b border-slate-600/40 mb-2 flex-shrink-0">
          {/* Logo icon — always visible */}
          <div className="bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm overflow-hidden flex-shrink-0">
            {systemSettings?.logoFileName ? (
              <img
                src={buildUploadUrl(systemSettings.logoFileName)}
                alt="Logo"
                className="w-full h-full object-contain p-1"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ display: systemSettings?.logoFileName ? 'none' : 'flex' }}
            >school</span>
          </div>
          {/* Chevron to expand */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{ color: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(255,255,255,0.07)' }}
              className="p-1 rounded-lg hover:bg-white/15 transition-all flex items-center justify-center"
              title="Expand Sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 flex items-center justify-between border-b border-slate-600/40 mb-2 h-16 flex-shrink-0">
          {/* Logo + Name */}
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0 overflow-hidden">
              {systemSettings?.logoFileName ? (
                <img
                  src={buildUploadUrl(systemSettings.logoFileName)}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ display: systemSettings?.logoFileName ? 'none' : 'flex' }}
              >school</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-sm leading-none truncate">{systemSettings?.portalName || "MIT Connect"}</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)' }} className="text-[10px] mt-1 truncate">{roleMeta.label} Portal</p>
            </div>
          </div>
          {/* Close button on mobile */}
          {isMobile && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              style={{ color: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(255,255,255,0.07)' }}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-all flex items-center justify-center flex-shrink-0 ml-2 cursor-pointer"
              title="Close Sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
          {/* Chevron to collapse */}
          {onToggleCollapse && !isMobile && (
            <button
              onClick={onToggleCollapse}
              style={{ color: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(255,255,255,0.07)' }}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-all flex items-center justify-center flex-shrink-0 ml-2"
              title="Collapse Sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
          )}
        </div>
      )}

      {/* Navigation Groups */}
      <nav ref={navRef} className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {menuGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.title];
          return (
            <div key={group.title} className="space-y-1">
              {/* Group Title Header */}
              {!isCollapsed ? (
                <button 
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-wider mb-2 text-white/50 hover:text-white transition-colors"
                >
                  <span>{group.title}</span>
                  <span className="material-symbols-outlined text-xs">
                    {isGroupCollapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
                  </span>
                </button>
              ) : (
                <div className="h-px bg-slate-600/30 my-3" />
              )}
              
              {/* Group Items */}
              {(!isGroupCollapsed || isCollapsed) && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const route = getRoute(item);
                    const to = withRoleQuery(route);
                    const iconName = iconMap[item] || 'label';
                    
                    return (
                      <NavLink
                        key={item}
                        to={to}
                        title={isCollapsed ? item : undefined}
                        style={({ isActive }) => isActive ? {
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        } : {
                          color: 'rgba(255, 255, 255, 0.75)'
                        }}
                        className={({ isActive }) => `flex items-center rounded-xl py-2.5 transition-all duration-200 hover:bg-white/8 ${
                          isCollapsed ? 'justify-center px-0 w-12 mx-auto' : 'px-4 w-full'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{iconName}</span>
                        {!isCollapsed && <span className="ml-3 text-sm font-medium tracking-wide">{item}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Area: Logout only */}
      <div className="p-3 border-t border-slate-600/40 mt-auto flex-shrink-0">

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{ color: '#ef4444' }}
          className={`w-full flex items-center hover:bg-red-500/10 rounded-xl py-2.5 transition-all duration-200 ${
            isCollapsed ? 'justify-center px-0 w-12 mx-auto' : 'px-4'
          }`}
          title="Logout"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!isCollapsed && <span className="ml-3 text-sm font-medium">Logout</span>}
        </button>

      </div>
    </aside>
  );
}
