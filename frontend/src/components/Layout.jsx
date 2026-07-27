import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import AcademicSidebar from './AcademicSidebar'
import TopBar from './TopBar'

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < breakpoint
    }
    return false
  })

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e) => setIsMobile(e.matches)
    // Set initial value
    setIsMobile(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}

export default function Layout({ 
  children, 
  title, 
  userId = 'N/A',
  noPadding = false,
  onProfilePrimaryAction,
  onProfileSecondaryAction 
}) {
  const isMobile = useIsMobile()
  const location = useLocation()
  const [isSidebarVisible, setIsSidebarVisible] = useState(!isMobile)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  })

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setIsSidebarVisible(false)
    }
  }, [location.pathname, isMobile])

  // Auto-close sidebar when switching to mobile, auto-open on desktop
  useEffect(() => {
    setIsSidebarVisible(!isMobile)
  }, [isMobile])

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible((prev) => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setIsSidebarVisible(false)
  }, [])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <AcademicSidebar 
        isSidebarVisible={isSidebarVisible} 
        onToggleSidebar={toggleSidebar} 
        isCollapsed={isMobile ? false : isCollapsed}
        onToggleCollapse={isMobile ? null : toggleCollapse}
        isMobile={isMobile}
      />

      {/* Mobile backdrop overlay */}
      {isSidebarVisible && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}

      <main className={`flex-1 flex flex-col min-w-0 overflow-x-clip transition-all duration-300 ${isSidebarVisible && !isMobile ? (isCollapsed ? 'ml-20' : 'ml-64') : 'ml-0'}`}>
        <TopBar 
          title={title} 
          isSidebarVisible={isSidebarVisible}
          isMobile={isMobile}
          onToggleSidebar={toggleSidebar}
          userId={userId}
          onProfilePrimaryAction={onProfilePrimaryAction}
          onProfileSecondaryAction={onProfileSecondaryAction}
        />
        <div className={noPadding ? 'flex-1 flex flex-col w-full max-w-full overflow-x-clip' : 'flex-1 p-4 md:p-6 w-full max-w-full overflow-x-clip'}>
          {children}
        </div>
      </main>
    </div>
  )
}
