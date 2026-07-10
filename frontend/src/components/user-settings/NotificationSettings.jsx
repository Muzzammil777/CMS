import { useEffect, useMemo, useState } from 'react';
import { userSettingsApi } from '../../api/userSettingsApi';
import { useSettingsContext } from '../../context/SettingsContext';
import { SettingsCard, SettingsActions, SettingsError, SettingsLoader, SettingsToast, isDirty } from '../settings/SettingsPanelCommon';

// ─── Only include notifications that are actually wired up in the backend ──────
const KEY_META = {
  // Student
  odStatusUpdate:  {
    label: 'OD Request Updates',
    desc:  'Get notified when your On-Duty request is approved or rejected by faculty.',
    group: 'Academic',
    icon:  'event_available',
  },
  feeReminder: {
    label: 'Fee Alerts',
    desc:  'Get notified when fees are assigned to you or a payment is confirmed.',
    group: 'Financial',
    icon:  'payments',
  },
  internalMarks: {
    label: 'Internal Marks Published',
    desc:  'Get notified when your internal assessment marks are published by faculty.',
    group: 'Academic',
    icon:  'grade',
  },

  // Faculty
  salaryCredit: {
    label: 'Salary Credit',
    desc:  'Get notified when your monthly salary has been processed and credited.',
    group: 'Financial',
    icon:  'account_balance_wallet',
  },
  odRequests: {
    label: 'OD Request Submissions',
    desc:  'Get notified when a student submits an On-Duty request for your approval.',
    group: 'Academic',
    icon:  'pending_actions',
  },
  placementAlerts: {
    label: 'Placement Updates',
    desc:  'Get notified when a student adds a new placement or job offer.',
    group: 'Academic',
    icon:  'work',
  },

  // Finance
  feePayments: {
    label: 'Fee Payments Received',
    desc:  'Get notified when a student successfully completes a fee payment.',
    group: 'Financial',
    icon:  'receipt_long',
  },

  // Admin
  // feePayments is shared with finance (same key)
  // placementAlerts is shared with faculty (same key)
};

const ROLE_KEYS = {
  student: ['odStatusUpdate', 'feeReminder', 'internalMarks'],
  faculty: ['salaryCredit', 'odRequests', 'placementAlerts'],
  finance: ['feePayments'],
  admin: ['feePayments', 'placementAlerts'],
};

const GROUP_ORDER = ['Academic', 'Financial'];

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        background: checked ? '#4c1d95' : '#d1d5db',
        transition: 'background 0.2s',
        outline: 'none',
        boxShadow: checked ? '0 0 0 3px rgba(76, 29, 149,0.18)' : 'none',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: checked ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

// ─── Single Toggle Row ─────────────────────────────────────────────────────────
function ToggleRow({ notifKey, checked, onChange }) {
  const meta = KEY_META[notifKey] || {};
  const label = meta.label || notifKey.replace(/([A-Z])/g, ' $1').replace(/^./, v => v.toUpperCase()).trim();
  const desc = meta.desc || '';
  const icon = meta.icon || 'notifications';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        borderBottom: '1px solid #f3f4f6',
        transition: 'background 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Icon */}
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 22, color: checked ? '#4c1d95' : '#9ca3af', transition: 'color 0.2s', flexShrink: 0 }}
      >
        {icon}
      </span>

      {/* Labels */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{label}</div>
        {desc && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
        )}
      </div>

      {/* Toggle */}
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

// ─── Group Section ─────────────────────────────────────────────────────────────
function GroupSection({ title, keys, form, updateField }) {
  if (!keys || keys.length === 0) return null;
  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 20px',
        background: 'linear-gradient(90deg, #f8faff 0%, #f1f5ff 100%)',
        borderBottom: '1px solid #e9ecf3',
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: 1 }}>
          {title}
        </span>
      </div>
      {keys.map(key => (
        <ToggleRow
          key={key}
          notifKey={key}
          checked={Boolean(form[key])}
          onChange={v => updateField(key, v)}
        />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function NotificationSettings({ role, userId }) {
  const { setSectionData, markSectionDirty } = useSettingsContext();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    userSettingsApi.getNotifications(role, userId)
      .then(data => {
        if (!mounted) return;
        const roleKeys = ROLE_KEYS[role] || [];
        const fullData = {};
        roleKeys.forEach(k => {
          fullData[k] = (data && data[k] !== undefined) ? data[k] : true;
        });
        setForm(fullData);
        setBaseline(fullData);
        setSectionData('notifications', fullData);
      })
      .catch(e => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => {
      mounted = false;
      markSectionDirty('notifications', false);
    };
  }, [markSectionDirty, role, setSectionData, userId]);

  const dirty = useMemo(() => isDirty(form, baseline), [form, baseline]);
  useEffect(() => { markSectionDirty('notifications', dirty); }, [dirty, markSectionDirty]);

  function updateField(field, value) {
    setForm(cur => ({ ...cur, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const response = await userSettingsApi.updateNotifications(role, userId, form);
      const updated = response.data;
      setForm(updated);
      setBaseline(updated);
      setSectionData('notifications', updated);
      setToast('Notification preferences saved.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(baseline);
    setToast('Notification preferences reset.');
  }

  if (loading) return <SettingsLoader label="Loading notification preferences…" />;
  if (!form)   return (
    <div style={{ padding: 24, color: '#ef4444', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #fee2e2' }}>
      {error || 'Unable to load notification preferences.'}
    </div>
  );

  // Group the form keys by their category in KEY_META
  const groups = {};
  for (const key of Object.keys(form)) {
    // Skip any old keys that are not in KEY_META (email, sms, etc.)
    if (!KEY_META[key]) continue;
    const g = KEY_META[key].group || 'Other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(key);
  }

  const visibleKeys = Object.keys(form).filter(k => Boolean(KEY_META[k]));
  const enabledCount = visibleKeys.filter(k => Boolean(form[k])).length;
  const totalCount   = visibleKeys.length;

  if (totalCount === 0) {
    return (
      <div style={{
        padding: 32, textAlign: 'center', background: '#fff',
        borderRadius: 14, border: '1px solid #e5e7eb', color: '#6b7280', fontSize: 14,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#d1d5db', display: 'block', marginBottom: 8 }}>
          notifications_off
        </span>
        No notification preferences available for this role.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SettingsError message={error} />

      {/* Summary bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: '1px solid #bbf7d0',
        borderRadius: 14,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#16a34a' }}>
          notifications_active
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d' }}>In-App Notification Alerts</div>
          <div style={{ fontSize: 12, color: '#4ade80', marginTop: 1 }}>
            {enabledCount} of {totalCount} alerts enabled
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setForm(Object.fromEntries(Object.keys(form).map(k => [k, true])))}
            style={{
              padding: '5px 12px', borderRadius: 8, border: '1px solid #16a34a',
              background: '#fff', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            All On
          </button>
          <button
            type="button"
            onClick={() => setForm(Object.fromEntries(Object.keys(form).map(k => [k, false])))}
            style={{
              padding: '5px 12px', borderRadius: 8, border: '1px solid #d1d5db',
              background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            All Off
          </button>
        </div>
      </div>

      {/* Grouped toggles */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {GROUP_ORDER.filter(g => groups[g]?.length > 0).map(g => (
          <GroupSection key={g} title={g} keys={groups[g]} form={form} updateField={updateField} />
        ))}
        {/* Any ungrouped real keys */}
        {Object.keys(groups)
          .filter(g => !GROUP_ORDER.includes(g))
          .map(g => (
            <GroupSection key={g} title={g} keys={groups[g]} form={form} updateField={updateField} />
          ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleReset}
          disabled={!dirty}
          style={{
            padding: '9px 18px', borderRadius: 10, border: '1px solid #e5e7eb',
            background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600,
            cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.5,
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            padding: '9px 22px', borderRadius: 10, border: 'none',
            background: dirty ? '#4c1d95' : '#d1d5db',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: dirty && !saving ? 'pointer' : 'not-allowed',
            boxShadow: dirty ? '0 2px 8px rgba(76, 29, 149,0.3)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>

      <SettingsToast message={toast} onClear={() => setToast('')} />
    </div>
  );
}
