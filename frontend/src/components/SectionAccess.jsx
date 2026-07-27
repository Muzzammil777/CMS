import { useNavigate } from 'react-router-dom';
import './SectionAccess.css';

export default function SectionAccess({ role = 'student' }) {
  const navigate = useNavigate();
  const roleQuery = `?role=${encodeURIComponent(role)}`;

  const sections = {
    student: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
          { label: 'Department', icon: 'apartment', path: '/department' }
        ]
      },
      {
        title: 'Academics',
        items: [
          { label: 'Exams', icon: 'assignment', path: '/exams' },
          { label: 'Timetable', icon: 'schedule', path: '/timetable' },
          { label: 'Attendance', icon: 'check_circle', path: '/attendance' },
          { label: 'Placement', icon: 'business_center', path: '/placement' }
        ]
      },
      {
        title: 'Administration',
        items: [
          { label: 'Fees', icon: 'receipt', path: '/fees' },
          { label: 'Invoices', icon: 'receipt_long', path: '/invoices' }
        ]
      },
      {
        title: 'Intelligence',
        items: [
          { label: 'Notifications', icon: 'notifications', path: '/notifications' },
          { label: 'Settings', icon: 'settings', path: '/settings' }
        ]
      }
    ],
    faculty: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
          { label: 'Department', icon: 'apartment', path: '/department' }
        ]
      },
      {
        title: 'Academics',
        items: [
          { label: 'Exams', icon: 'assignment', path: '/exams' },
          { label: 'Timetable', icon: 'schedule', path: '/timetable' },
          { label: 'Attendance', icon: 'check_circle', path: '/attendance' },
          { label: 'Placement', icon: 'business_center', path: '/placement' }
        ]
      },
      {
        title: 'Administration',
        items: [
          { label: 'Fees', icon: 'receipt', path: '/admin-fees' },
          { label: 'Invoices', icon: 'receipt_long', path: '/invoices' }
        ]
      },
      {
        title: 'Intelligence',
        items: [
          { label: 'Notifications', icon: 'notifications', path: '/notifications' },
          { label: 'Settings', icon: 'settings', path: '/settings' }
        ]
      }
    ],
    admin: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
          { label: 'Administration', icon: 'admin_panel_settings', path: '/administration' }
        ]
      },
      {
        title: 'Academics',
        items: [
          { label: 'Exams', icon: 'assignment', path: '/exams' },
          { label: 'Timetable', icon: 'schedule', path: '/timetable' },
          { label: 'Attendance', icon: 'check_circle', path: '/attendance' },
          { label: 'Placement', icon: 'business_center', path: '/placement' }
        ]
      },
      {
        title: 'Administration',
        items: [
          { label: 'Fees', icon: 'receipt', path: '/admin-fees' },
          { label: 'Invoices', icon: 'receipt_long', path: '/invoices' }
        ]
      },
      {
        title: 'Intelligence',
        items: [
          { label: 'Notifications', icon: 'notifications', path: '/notifications' },
          { label: 'Settings', icon: 'settings', path: '/settings' }
        ]
      }
    ],
    finance: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
          { label: 'Payroll', icon: 'attach_money', path: '/payroll' }
        ]
      },
      {
        title: 'Finances',
        items: [
          { label: 'Fees', icon: 'receipt', path: '/admin-fees' },
          { label: 'Invoices', icon: 'receipt_long', path: '/invoices' },
          { label: 'Payroll', icon: 'attach_money', path: '/payroll' }
        ]
      },
      {
        title: 'Administration',
        items: [
          { label: 'Staff', icon: 'group', path: '/staff' },
          { label: 'Reports', icon: 'assessment', path: '/reports' }
        ]
      },
      {
        title: 'Intelligence',
        items: [
          { label: 'Notifications', icon: 'notifications', path: '/notifications' },
          { label: 'Settings', icon: 'settings', path: '/settings' }
        ]
      }
    ]
  };

  const roleSections = sections[role] || sections.student;

  const handleNavigation = (path) => {
    navigate(`${path}${roleQuery}`);
  };

  return (
    <div className="section-access">
      <h2 className="section-access-title">Section Access</h2>
      
      <div className="section-access-grid">
        {roleSections.map((section) => (
          <div key={section.title} className="section-access-card">
            <h3 className="section-access-card-title">{section.title}</h3>
            <div className="section-access-items">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className="section-access-item"
                  onClick={() => handleNavigation(item.path)}
                  title={item.label}
                >
                  <span className="material-symbols-outlined section-access-icon">
                    {item.icon}
                  </span>
                  <span className="section-access-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
