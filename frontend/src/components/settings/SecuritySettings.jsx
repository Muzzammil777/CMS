import { useEffect, useState } from 'react';
import { settingsApi } from '../../api/settingsApi';
import { SettingsActions, SettingsCard, SettingsError, SettingsLoader, SettingsToast, ToggleRow, inputCls, labelCls, isDirty } from './SettingsPanelCommon';

export default function SecuritySettings() {
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    settingsApi.getSecuritySettings().then((data) => {
      setForm(data);
      setBaseline(data);
    }).catch(() => setError('Failed to load security settings.'));
  }, []);

  function updateField(field, value) {
    setForm((cur) => ({ ...cur, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await settingsApi.updateSecuritySettings(form);
      setBaseline(updated);
      setForm(updated);
      setToast('Security settings saved.');
    } catch {
      setError('Failed to save security settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(baseline);
    setToast('Settings reset.');
  }

  if (!form) return <SettingsLoader label="Loading security settings…" />;

  const dirty = isDirty(form, baseline);

  return (
    <div className="flex flex-col gap-5">
      <SettingsError message={error} />

      {/* Password Policy */}
      <SettingsCard title="Password Policy" description="Control how passwords are enforced across all accounts.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <div>
            <label className={labelCls}>Minimum Password Length</label>
            <input
              type="number"
              min="6"
              max="32"
              value={form.minPasswordLength || 8}
              onChange={(e) => updateField('minPasswordLength', Number(e.target.value) || 8)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max Failed Login Attempts</label>
            <input
              type="number"
              min="3"
              max="20"
              value={form.maxLoginAttempts || 5}
              onChange={(e) => updateField('maxLoginAttempts', Number(e.target.value) || 5)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <ToggleRow
            label="Require Uppercase Letters"
            description="All passwords must contain at least one uppercase letter."
            checked={Boolean(form.requireUppercase)}
            onChange={(v) => updateField('requireUppercase', v)}
          />
        </div>
        <SettingsActions onSave={handleSave} onReset={handleReset} saving={saving} disableSave={!dirty} />
      </SettingsCard>

      {/* Session & Access */}
      <SettingsCard title="Session & Access Limits" description="Define timeout rules and IP restrictions.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Session Timeout (minutes)</label>
            <input
              type="number"
              min="5"
              max="1440"
              value={form.sessionTimeout || 30}
              onChange={(e) => updateField('sessionTimeout', Number(e.target.value) || 30)}
              className={inputCls}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>IP Restrictions <span className="text-slate-400 font-normal text-xs">(one per line, leave empty to allow all)</span></label>
            <textarea
              rows={3}
              value={form.ipRestrictions || ''}
              onChange={(e) => updateField('ipRestrictions', e.target.value)}
              placeholder="e.g.&#10;192.168.1.0/24&#10;10.0.0.1"
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
        <SettingsActions onSave={handleSave} onReset={handleReset} saving={saving} disableSave={!dirty} />
      </SettingsCard>

      <SettingsToast message={toast} onClear={() => setToast('')} />
    </div>
  );
}
