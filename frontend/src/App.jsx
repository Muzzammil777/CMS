import { useEffect, useState, lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getUserSession, hasActiveSession } from './auth/sessionController';
import { AdmissionProvider } from './context/AdmissionContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { buildUploadUrl, API_BASE } from './api/apiBase';

// Static imports for core entry pages to keep initial render fast
import DashboardPageWrapper from './pages/DashboardPageWrapper';
import LoginPage from './pages/LoginPage';

// Lazy loaded pages for code-splitting
const TimetablePage = lazy(() => import('./pages/TimetablePage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const ExamsPage = lazy(() => import('./pages/ExamsPage'));
const PlacementPage = lazy(() => import('./pages/PlacementPage'));
const FacilityPage = lazy(() => import('./pages/FacilityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StudentPageWrapper = lazy(() => import('./pages/StudentPageWrapper'));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const PayrollPage = lazy(() => import('./pages/PayrollPage'));
const AdmissionPage = lazy(() => import('./pages/AdmissionPage'));
const AdminFeesPage = lazy(() => import('./pages/AdminFeesPage'));
const AdminInvoicePage = lazy(() => import('./pages/AdminInvoicePage'));
const FeesPage = lazy(() => import('./pages/FeesPage'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));
const FinanceInvoicePage = lazy(() => import('./pages/FinanceInvoicePage'));
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'));
const FacultyPage = lazy(() => import('./pages/FacultyPage'));
const FacultyProfilePage = lazy(() => import('./pages/FacultyProfilePage'));
const FacultyDepartmentPage = lazy(() => import('./pages/FacultyDepartmentPage'));
const AddMemberSelectionPage = lazy(() => import('./pages/AddMemberSelectionPage'));
const AddStudentPage = lazy(() => import('./pages/AddStudentPage'));
const AddFacultyPage = lazy(() => import('./pages/AddFacultyPage'));
const EditStudentPage = lazy(() => import('./pages/EditStudentPage'));
const EditFacultyPage = lazy(() => import('./pages/EditFacultyPage'));
const BulkUploadStudentPage = lazy(() => import('./pages/BulkUploadStudentPage'));
const BulkUploadFacultyPage = lazy(() => import('./pages/BulkUploadFacultyPage'));

export default function App() {
  const [, setAuthVersion] = useState(0);
  const session = getUserSession();
  const activeSession = hasActiveSession();

  useEffect(() => {
    const handleAuthChange = () => setAuthVersion((prev) => prev + 1);
    window.addEventListener('cms-auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('cms-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // Global effect: sync page title + favicon from portal settings
  useEffect(() => {
    function applySystemSettings(data) {
      if (!data || data.detail) return;
      if (data.portalName) {
        document.title = data.portalName;
      }
      if (data.faviconFileName) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = buildUploadUrl(data.faviconFileName);
      }
    }

    function loadSettings() {
      fetch(`${API_BASE}/settings/general`)
        .then(res => res.json())
        .then(applySystemSettings)
        .catch(() => {});
    }

    loadSettings();
    window.addEventListener('cms-settings-update', loadSettings);
    return () => window.removeEventListener('cms-settings-update', loadSettings);
  }, []);

  return (
    <ErrorBoundary>
      <AdmissionProvider>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium text-sm">Loading page...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route
              path="/"
              element={
                activeSession && session
                  ? <Navigate to={`/dashboard?role=${encodeURIComponent(session.role)}`} replace />
                  : <LoginPage />
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPageWrapper />
                </ProtectedRoute>
              }
            />
            <Route path="/timetable" element={<ProtectedRoute allowedRoles={['student', 'admin', 'faculty', 'hod']}><TimetablePage /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute allowedRoles={['student', 'admin', 'faculty', 'hod']}><AttendancePage /></ProtectedRoute>} />
            <Route path="/exams" element={<ProtectedRoute allowedRoles={['student', 'admin', 'faculty', 'hod']}><ExamsPage /></ProtectedRoute>} />
            <Route path="/placement" element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'student', 'hod']}><PlacementPage /></ProtectedRoute>} />
            <Route path="/facility" element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'hod']}><FacilityPage /></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin', 'finance']}><PayrollPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin', 'finance', 'hod']}><AnalyticsPage /></ProtectedRoute>} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/students" element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'hod']}><StudentPageWrapper /></ProtectedRoute>} />
            <Route path="/students/:id" element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'student', 'hod']}><StudentProfilePage /></ProtectedRoute>} />
            <Route path="/edit-student/:id" element={<ProtectedRoute allowedRoles={['admin', 'hod']}><EditStudentPage /></ProtectedRoute>} />
            <Route path="/bulk-upload-students" element={<ProtectedRoute allowedRoles={['admin', 'hod']}><BulkUploadStudentPage /></ProtectedRoute>} />
            <Route path="/faculty" element={<ProtectedRoute allowedRoles={['admin', 'hod']}><FacultyPage /></ProtectedRoute>} />
            <Route path="/faculty/:id" element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'hod']}><FacultyProfilePage /></ProtectedRoute>} />
            <Route path="/edit-faculty/:id" element={<ProtectedRoute allowedRoles={['admin']}><EditFacultyPage /></ProtectedRoute>} />
            <Route path="/bulk-upload-faculty" element={<ProtectedRoute allowedRoles={['admin']}><BulkUploadFacultyPage /></ProtectedRoute>} />
            <Route path="/department" element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'hod']}><FacultyDepartmentPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'faculty', 'hod']}><ComingSoonPage /></ProtectedRoute>} />
            <Route path="/admission" element={<ProtectedRoute allowedRoles={['admin', 'hod']}><AdmissionPage /></ProtectedRoute>} />
            <Route path="/add-member" element={<ProtectedRoute allowedRoles={['admin', 'hod']}><AddMemberSelectionPage /></ProtectedRoute>} />
            <Route path="/add-student" element={<ProtectedRoute allowedRoles={['admin', 'hod']}><AddStudentPage /></ProtectedRoute>} />
            <Route path="/add-faculty" element={<ProtectedRoute allowedRoles={['admin']}><AddFacultyPage /></ProtectedRoute>} />
            <Route path="/fees" element={<ProtectedRoute allowedRoles={['student']}><FeesPage /></ProtectedRoute>} />
            <Route path="/admin-fees" element={<ProtectedRoute allowedRoles={['admin', 'finance', 'hod']}><AdminFeesPage /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute allowedRoles={['student']}><InvoicePage /></ProtectedRoute>} />
            <Route path="/admin-invoices" element={<ProtectedRoute allowedRoles={['admin', 'hod']}><AdminInvoicePage /></ProtectedRoute>} />
            <Route path="/finance-invoices" element={<ProtectedRoute allowedRoles={['finance']}><FinanceInvoicePage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AdmissionProvider>
    </ErrorBoundary>
  );
}
