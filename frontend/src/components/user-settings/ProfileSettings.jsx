import { useEffect, useMemo, useState } from 'react';
import { userSettingsApi } from '../../api/userSettingsApi';
import { useSettingsContext } from '../../context/SettingsContext';
import { SettingsCard, SettingsActions, SettingsError, SettingsLoader, SettingsToast, inputCls, labelCls, isDirty } from '../settings/SettingsPanelCommon';
import { updateUserData } from '../../auth/sessionController';

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function ProfileSettings({ role, userId }) {
  const { setSectionData, markSectionDirty } = useSettingsContext();
  const [profile, setProfile] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [validation, setValidation] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    userSettingsApi.getProfile(role, userId).then((data) => {
      if (!mounted) return;
      setProfile(data);
      setBaseline(data);
      setSectionData('profile', data);
    }).catch((e) => { if (mounted) setError(e.message); })
    .finally(() => { if (mounted) setLoading(false); });

    return () => {
      mounted = false;
      markSectionDirty('profile', false);
    };
  }, [markSectionDirty, role, setSectionData, userId]);

  const dirty = useMemo(() => isDirty(profile, baseline), [profile, baseline]);

  useEffect(() => {
    markSectionDirty('profile', dirty);
  }, [dirty, markSectionDirty]);

  if (loading) return <SettingsLoader label="Loading profile…" />;
  if (!profile) return <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-sm text-red-500">{error || 'Failed to load profile.'}</div>;

  function updateField(field, value) {
    setProfile((cur) => ({ ...cur, [field]: value }));
  }

  function validateForm() {
    const errs = {};
    if (!profile.name?.trim()) errs.name = 'Name is required.';
    if (!profile.email?.trim()) errs.email = 'Email is required.';
    else if (!isEmail(profile.email.trim())) errs.email = 'Enter a valid email address.';
    if (profile.phone && !/^\d{10}$/.test(profile.phone)) errs.phone = 'Phone must be 10 digits.';
    setValidation(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    setError('');
    try {
      const response = await userSettingsApi.updateProfile(role, userId, profile);
      const updated = response.data;
      setProfile(updated);
      setBaseline(updated);
      setSectionData('profile', updated);
      updateUserData(updated);
      setToast('Profile updated successfully.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setProfile(baseline);
    setValidation({});
    setToast('Profile reset to last saved values.');
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsError message={error} />

      <SettingsCard title="Personal Information" description="Your name, contact details, and a brief bio.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input type="text" value={profile.name || ''} onChange={(e) => updateField('name', e.target.value)} className={inputCls} placeholder="e.g. Arjun Kumar" />
            {validation.name && <p className="text-xs text-red-500 mt-1">{validation.name}</p>}
          </div>
          <div>
            <label className={labelCls}>Email Address *</label>
            <input type="email" value={profile.email || ''} onChange={(e) => updateField('email', e.target.value)} className={inputCls} />
            {validation.email && <p className="text-xs text-red-500 mt-1">{validation.email}</p>}
          </div>
          <div>
            <label className={labelCls}>Phone Number</label>
            <input type="text" value={profile.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="10 digit number" className={inputCls} />
            {validation.phone && <p className="text-xs text-red-500 mt-1">{validation.phone}</p>}
          </div>
          <div>
            {profile.department !== undefined ? (
              <>
                <label className={labelCls}>Department</label>
                <input type="text" value={profile.department || ''} onChange={(e) => updateField('department', e.target.value)} className={inputCls} />
              </>
            ) : (
              <>
                <label className={labelCls}>Address</label>
                <input type="text" value={profile.address || ''} onChange={(e) => updateField('address', e.target.value)} className={inputCls} />
              </>
            )}
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Bio</label>
            <textarea rows={3} value={profile.bio || ''} onChange={(e) => updateField('bio', e.target.value)} className={`${inputCls} resize-none`} placeholder="A short description about yourself…" />
          </div>
        </div>
        <SettingsActions onSave={handleSave} onReset={handleReset} saving={saving} disableSave={!dirty} />
      </SettingsCard>

      <SettingsToast message={toast} onClear={() => setToast('')} />
    </div>
  );
}
