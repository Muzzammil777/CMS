import { useEffect, useMemo, useState } from 'react';
import { userSettingsApi } from '../../api/userSettingsApi';
import { useSettingsContext } from '../../context/SettingsContext';
import { SettingsCard, SettingsActions, SettingsError, SettingsLoader, SettingsToast, ToggleRow, inputCls, labelCls, isDirty } from '../settings/SettingsPanelCommon';

export default function TeachingPreferences({ role, userId }) {
  const { setSectionData, markSectionDirty } = useSettingsContext();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (role !== 'faculty') { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    userSettingsApi.getTeachingPreferences(userId).then((data) => {
      if (!mounted) return;
      setForm(data);
      setBaseline(data);
      setSectionData('teachingPreferences', data);
    }).catch((e) => { if (mounted) setError(e.message); })
    .finally(() => { if (mounted) setLoading(false); });

    return () => {
      mounted = false;
      markSectionDirty('teaching-preferences', false);
    };
  }, [markSectionDirty, role, setSectionData, userId]);

  const dirty = useMemo(() => isDirty(form, baseline), [form, baseline]);

  useEffect(() => {
    markSectionDirty('teaching-preferences', dirty);
  }, [dirty, markSectionDirty]);

  if (role !== 'faculty') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-sm text-slate-500 text-center">
        Teaching preferences are available only for faculty accounts.
      </div>
    );
  }

  if (loading) return <SettingsLoader label="Loading teaching preferences…" />;
  if (!form) return <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-sm text-red-500">{error || 'Unable to load teaching preferences.'}</div>;

  function updateField(field, value) {
    setForm((cur) => ({ ...cur, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const response = await userSettingsApi.updateTeachingPreferences(userId, form);
      const updated = response.data;
      setForm(updated);
      setBaseline(updated);
      setSectionData('teachingPreferences', updated);
      setToast('Teaching preferences saved.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(baseline);
    setToast('Teaching preferences reset.');
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsError message={error} />

      <SettingsCard title="Teaching Preferences" description="Configure your instructional preferences and grading automation.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <div>
            <label className={labelCls}>Preferred Teaching Mode</label>
            <select value={form.preferredMode || 'Hybrid'} onChange={(e) => updateField('preferredMode', e.target.value)} className={inputCls}>
              <option value="Offline">Offline</option>
              <option value="Online">Online</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Office Hours</label>
            <input type="text" value={form.officeHours || ''} onChange={(e) => updateField('officeHours', e.target.value)} placeholder="e.g. 2PM – 4PM" className={inputCls} />
          </div>
        </div>

        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <ToggleRow
            label="Auto Publish Grades"
            description="Automatically publish grades to students once you approve them."
            checked={Boolean(form.autoPublishGrades)}
            onChange={(v) => updateField('autoPublishGrades', v)}
          />
        </div>

        <SettingsActions onSave={handleSave} onReset={handleReset} saving={saving} disableSave={!dirty} />
      </SettingsCard>

      <SettingsToast message={toast} onClear={() => setToast('')} />
    </div>
  );
}
