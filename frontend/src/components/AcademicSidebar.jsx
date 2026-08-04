import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getUserSession, destroyUserSession, getUserData } from '../auth/sessionController';
import { cmsRoles, roleMenuGroups } from '../data/roleConfig';
import { buildUploadUrl, API_BASE } from '../api/apiBase';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  BookOpenCheck,
  Calendar,
  ClipboardCheck,
  Briefcase,
  Building,
  CreditCard,
  BarChart3,
  UserPlus,
  Receipt,
  FileText,
  TrendingUp,
  Bell,
  Settings,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  X,
  Menu,
  LogOut
} from 'lucide-react';

const lucideIconMap = {
  Dashboard: LayoutDashboard,
  Students: Users,
  Faculty: UserCheck,
  Department: Building2,
  Exams: BookOpenCheck,
  Timetable: Calendar,
  Attendance: ClipboardCheck,
  Placement: Briefcase,
  Facility: Building,
  Fees: CreditCard,
  Reports: BarChart3,
  Admission: UserPlus,
  Payroll: Receipt,
  Invoices: FileText,
  Analytics: TrendingUp,
  Notifications: Bell,
  Settings: Settings,
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
      return (role === 'admin' || role === 'finance' || role === 'hod') ? '/admin-fees' : '/fees';
    }
    if (item === 'Invoices') {
      if (role === 'admin' || role === 'hod') return '/admin-invoices';
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
      style={{ background: '#03323A' }} 
      className={`border-r border-[#104044] flex flex-col fixed h-full overflow-y-auto z-50 transition-all duration-300 ${
        isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
      } ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Brand Header — Collapsed view shows ONLY the hamburger icon */}
      {isCollapsed ? (
        <div className="flex items-center justify-center border-b border-[#104044] h-14 flex-shrink-0">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{ color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.08)' }}
              className="w-10 h-10 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer shadow-sm"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 flex items-center justify-between border-b border-[#104044] h-16 flex-shrink-0">
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
              <GraduationCap className="w-5.5 h-5.5 text-white" style={{ display: systemSettings?.logoFileName ? 'none' : 'block' }} />
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
              <X className="w-5 h-5" />
            </button>
          )}
          {/* Hamburger icon button to collapse on desktop */}
          {onToggleCollapse && !isMobile && (
            <button
              onClick={onToggleCollapse}
              style={{ color: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.08)' }}
              className="p-2 rounded-xl hover:bg-white/15 transition-all flex items-center justify-center flex-shrink-0 ml-2 cursor-pointer"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Navigation Groups */}
      <nav ref={navRef} className={`flex-1 px-3 ${isCollapsed ? 'py-2 space-y-2' : 'py-4 space-y-4'} overflow-y-auto`}>
        {menuGroups.map((group, groupIndex) => {
          const isGroupCollapsed = collapsedGroups[group.title];
          return (
            <div key={group.title} className="space-y-1">
              {/* Group Title Header */}
              {!isCollapsed ? (
                <button 
                  onClick={() => toggleGroup(group.title)}
                  style={{ color: 'rgba(255, 255, 255, 0.65)' }}
                  className="w-full flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-wider mb-2 hover:text-white transition-colors cursor-pointer"
                >
                  <span>{group.title}</span>
                  {isGroupCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : groupIndex > 0 ? (
                <div className="h-px bg-[#104044] my-2" />
              ) : null}
              
              {/* Group Items */}
              {(!isGroupCollapsed || isCollapsed) && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const route = getRoute(item);
                    const to = withRoleQuery(route);
                    const IconComponent = lucideIconMap[item] || FileText;
                    
                    return (
                      <NavLink
                        key={item}
                        to={to}
                        title={isCollapsed ? item : undefined}
                        style={({ isActive }) => isActive ? {
                          backgroundColor: '#0A686A',
                          color: '#ffffff',
                          boxShadow: '0 4px 12px rgba(0, 58, 64, 0.35)'
                        } : {
                          color: 'rgba(255, 255, 255, 0.75)'
                        }}
                        className={({ isActive }) => `flex items-center rounded-xl py-2.5 transition-all duration-200 hover:bg-[#104044] ${
                          isCollapsed ? 'justify-center px-0 w-12 mx-auto' : 'px-4 w-full'
                        }`}
                      >
                        <IconComponent className="w-5 h-5 flex-shrink-0" />
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

      {/* Footer Area: User Profile Card & Logout in same row */}
      <div className="p-3 border-t border-[#104044] mt-auto flex-shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <img 
                src={dynamicUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dynamicUser?.name || roleMeta.label || 'Admin')}&background=0A686A&color=fff&size=128`} 
                alt="User Avatar"
                className="w-9 h-9 rounded-lg object-cover border border-white/20 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {dynamicUser?.name || dynamicUser?.fullName || dynamicUser?.staffName || 'Nandhini Sakthivel'}
                </p>
                <p className="text-[10px] text-white/60 font-medium truncate mt-0.5 uppercase tracking-wider">
                  {roleMeta.label || 'ADMIN'}
                </p>
              </div>
            </div>

            {/* Logout Button in Same Row */}
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <img 
              src={dynamicUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dynamicUser?.name || roleMeta.label || 'Admin')}&background=0A686A&color=fff&size=128`} 
              alt="User Avatar"
              title={dynamicUser?.name || dynamicUser?.fullName || 'Nandhini Sakthivel'}
              className="w-9 h-9 rounded-lg object-cover border border-white/20"
            />
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 flex items-center justify-center transition-colors cursor-pointer"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
