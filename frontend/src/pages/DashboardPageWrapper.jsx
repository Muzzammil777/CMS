import { getUserSession } from '../auth/sessionController';
import DashboardPage from './DashboardPage';
import FacultyDashboardPage from './FacultyDashboardPage';
import HodDashboardPage from './HodDashboardPage';
import StudentDashboardPage from './StudentDashboardPage';
import FinanceDashboardPage from './FinanceDashboardPage';

export default function DashboardPageWrapper() {
  const session = getUserSession();
  const role = session?.role || 'student';

  if (role === 'faculty') {
    return <FacultyDashboardPage />;
  }

  if (role === 'hod') {
    return <HodDashboardPage />;
  }

  if (role === 'student') {
    return <StudentDashboardPage />;
  }

  if (role === 'finance') {
    return <FinanceDashboardPage />;
  }

  return <DashboardPage />;
}
