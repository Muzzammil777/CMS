import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userSettingsApi } from '../../api/userSettingsApi';
import { useSettingsContext } from '../../context/SettingsContext';
import { destroyUserSession } from '../../auth/sessionController';
import { SettingsCard, SettingsError, SettingsLoader, SettingsToast } from '../settings/SettingsPanelCommon';

// Reusable eye-toggle password field
function PasswordField({ label, id, value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border ${
            error ? 'border-red-400 bg-red-50' : 'border-slate-200'
          } focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/25 transition-colors`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
          title={show ? 'Hide password' : 'Show password'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {show ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

export default function SecuritySettings({ role, userId }) {
  const navigate = useNavigate();
  const { markSectionDirty } = useSettingsContext();

  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Change-password state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sessionData, historyData] = await Promise.all([
        userSettingsApi.getSessions(role, userId),
        userSettingsApi.getLoginHistory(role, userId),
      ]);
      setSessions(sessionData);
      setLoginHistory(historyData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    markSectionDirty('security', false);
    load();
  }, [markSectionDirty, role, userId]); // eslint-disable-line

  async function handleLogoutAll() {
    setRunning(true);
    setError('');
    try {
      const response = await userSettingsApi.logoutAllDevices(role, userId);
      setSessions(response.data || []);
      setToast('All active sessions logged out. Redirecting…');
      setTimeout(() => { destroyUserSession(); navigate('/', { replace: true }); }, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  function validatePw() {
    const errs = {};
    if (!pwForm.current) errs.current = 'Current password is required.';
    if (!pwForm.next) {
      errs.next = 'New password is required.';
    } else if (pwForm.next.length < 8) {
      errs.next = 'New password must be at least 8 characters.';
    } else if (pwForm.next === pwForm.current) {
      errs.next = 'New password must differ from the current password.';
    }
    if (!pwForm.confirm) {
      errs.confirm = 'Please confirm your new password.';
    } else if (pwForm.confirm !== pwForm.next) {
      errs.confirm = 'Passwords do not match.';
    }
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!validatePw()) return;
    setPwSaving(true);
    setPwSuccess('');
    try {
      await userSettingsApi.changePassword(userId, pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      setPwErrors({});
      setPwSuccess('Password changed successfully!');
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (err) {
      setPwErrors({ current: err.message || 'Incorrect current password.' });
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) return <SettingsLoader label="Loading security data…" />;

  const strengthChecks = [
    { label: '8+ chars', met: pwForm.next.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(pwForm.next) },
    { label: 'Symbol',    met: /[^A-Za-z0-9]/.test(pwForm.next) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <SettingsError message={error} />

      {/* ── Change Password ── */}
      <SettingsCard title="Change Password" description="Update your account password. Use a strong, unique password.">
        <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
          <PasswordField
            id="pw-current"
            label="Current Password"
            value={pwForm.current}
            onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
            placeholder="Enter your current password"
            error={pwErrors.current}
          />
          <PasswordField
            id="pw-new"
            label="New Password"
            value={pwForm.next}
            onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
            placeholder="At least 8 characters"
            error={pwErrors.next}
          />
          <PasswordField
            id="pw-confirm"
            label="Confirm New Password"
            value={pwForm.confirm}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            placeholder="Re-enter new password"
            error={pwErrors.confirm}
          />

          {/* Password strength indicators */}
          {pwForm.next && (
            <div className="flex gap-1.5 items-center flex-wrap">
              {strengthChecks.map(({ label, met }, i) => (
                <span
                  key={i}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                    met ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {met ? '✓' : '○'} {label}
                </span>
              ))}
            </div>
          )}

          {/* Success message */}
          {pwSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-medium">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {pwSuccess}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pwSaving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#6d28d9] hover:bg-[#1e4d18] text-white text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-60"
            >
              {pwSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                  Update Password
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setPwForm({ current: '', next: '', confirm: '' }); setPwErrors({}); setPwSuccess(''); }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              Clear
            </button>
          </div>
        </form>
      </SettingsCard>

      {/* ── Active Sessions ── */}
      <SettingsCard title="Active Sessions" description="Devices currently logged in to your account.">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500">{sessions.length} session{sessions.length !== 1 ? 's' : ''} active</span>
          <button onClick={load} className="text-xs font-semibold text-[#6d28d9] hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
          </button>
        </div>
        <div className="space-y-2">
          {sessions.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">No active sessions found.</p>
          )}
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
              <div>
                <p className="text-sm font-semibold text-slate-800">{s.device}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.location} &middot; Last seen: {new Date(s.lastSeen).toLocaleString()}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {s.active ? 'Active' : 'Logged Out'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogoutAll}
            disabled={running}
            className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {running ? 'Logging out…' : 'Logout All Devices'}
          </button>
        </div>
      </SettingsCard>

      {/* ── Login History ── */}
      <SettingsCard title="Login History" description="Recent sign-in events for your account.">
        <div className="space-y-2">
          {loginHistory.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">No login history found.</p>
          )}
          {loginHistory.map((entry, i) => (
            <div key={`${entry.timestamp}-${i}`} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50">
              <div>
                <p className="text-sm font-semibold text-slate-800">{new Date(entry.timestamp).toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-0.5">IP: {entry.ip}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${entry.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                {entry.status}
              </span>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsToast message={toast} onClear={() => setToast('')} />
    </div>
  );
}
