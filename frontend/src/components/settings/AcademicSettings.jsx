import { useEffect, useState } from 'react';
import { settingsApi } from '../../api/settingsApi';
import { SettingsActions, SettingsCard, SettingsError, SettingsLoader, SettingsToast, inputCls, labelCls, isDirty } from './SettingsPanelCommon';

export default function AcademicSettings() {
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    settingsApi.getAcademicSettings().then((data) => {
      setForm(data);
      setBaseline(data);
    }).catch(() => setError('Failed to load academic settings.'));
  }, []);

  function updateField(field, value) {
    setForm((cur) => ({ ...cur, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await settingsApi.updateAcademicSettings(form);
      setBaseline(updated);
      setForm(updated);
      setToast('Academic configuration saved.');
    } catch {
      setError('Failed to save academic settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(baseline);
    setToast('Reset to last saved values.');
  }

  if (!form) return <SettingsLoader label="Loading academic configuration…" />;

  const dirty = isDirty(form, baseline);

  return (
    <div className="flex flex-col gap-5">
      <SettingsError message={error} />

      {/* Academic Year & Semesters */}
      <SettingsCard title="Academic Year & Semesters" description="Set the active academic year and semester structure.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Current Academic Year</label>
            <input
              type="text"
              value={form.currentYear || ''}
              onChange={(e) => updateField('currentYear', e.target.value)}
              className={inputCls}
              placeholder="e.g. 2024–2025"
            />
          </div>
          <div>
            <label className={labelCls}>Number of Semesters</label>
            <input
              type="number"
              min="1"
              max="4"
              value={form.semesters || 2}
              onChange={(e) => updateField('semesters', Number(e.target.value) || 1)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Credit System</label>
            <select value={form.creditSystem || 'CBCS'} onChange={(e) => updateField('creditSystem', e.target.value)} className={inputCls}>
              <option>CBCS</option>
              <option>Choice Based Credit</option>
              <option>Fixed Credit</option>
            </select>
          </div>
        </div>
        <SettingsActions onSave={handleSave} onReset={handleReset} saving={saving} disableSave={!dirty} />
      </SettingsCard>

      {/* Grading & Attendance */}
      <SettingsCard title="Grading & Attendance Rules" description="Define grading standards and minimum attendance requirements.">
        <div className="flex flex-col gap-5">
          <div>
            <label className={labelCls}>Attendance Rules</label>
            <textarea
              rows={3}
              value={form.attendanceRule || ''}
              onChange={(e) => updateField('attendanceRule', e.target.value)}
              placeholder="e.g. Minimum 75% attendance required per semester."
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className={labelCls}>Grade Rules</label>
            <textarea
              rows={3}
              value={form.gradeRule || ''}
              onChange={(e) => updateField('gradeRule', e.target.value)}
              placeholder="e.g. O: 91–100, A+: 81–90, A: 71–80 …"
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
