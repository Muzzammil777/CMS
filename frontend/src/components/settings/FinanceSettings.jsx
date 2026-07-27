import { useEffect, useState } from 'react';
import { settingsApi } from '../../api/settingsApi';
import { SettingsActions, SettingsCard, SettingsError, SettingsLoader, SettingsToast, inputCls, labelCls, isDirty } from './SettingsPanelCommon';

export default function FinanceSettings() {
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    settingsApi.getFinanceSettings().then((data) => {
      setForm(data);
      setBaseline(data);
    }).catch(() => setError('Failed to load finance settings.'));
  }, []);

  function updateField(field, value) {
    setForm((cur) => ({ ...cur, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await settingsApi.updateFinanceSettings(form);
      setBaseline(updated);
      setForm(updated);
      setToast('Finance settings saved successfully.');
    } catch {
      setError('Failed to save finance settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(baseline);
    setToast('Finance settings reset.');
  }

  if (!form) return <SettingsLoader label="Loading finance settings…" />;

  const dirty = isDirty(form, baseline);

  return (
    <div className="flex flex-col gap-5">
      <SettingsError message={error} />

      {/* Fee Structure & Policies */}
      <SettingsCard title="Fee Structure & Policies" description="Configure tuition fees, late charges, and payment schedules.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Tuition Fee (₹ / semester)</label>
            <input
              type="number"
              min="0"
              value={form.tuitionFee || 0}
              onChange={(e) => updateField('tuitionFee', Number(e.target.value) || 0)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Late Fee (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.lateFeePercent || 0}
              onChange={(e) => updateField('lateFeePercent', Number(e.target.value) || 0)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Default Payment Plan</label>
            <select value={form.paymentPlan || 'Semester Split'} onChange={(e) => updateField('paymentPlan', e.target.value)} className={inputCls}>
              <option>Semester Split</option>
              <option>Monthly Installments</option>
              <option>Quarterly Plan</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Payroll Cycle</label>
            <select value={form.payrollCycle || 'Monthly'} onChange={(e) => updateField('payrollCycle', e.target.value)} className={inputCls}>
              <option>Monthly</option>
              <option>Bi-Weekly</option>
              <option>Weekly</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Invoice Template</label>
            <select value={form.invoiceTemplate || ''} onChange={(e) => updateField('invoiceTemplate', e.target.value)} className={inputCls}>
              <option>MIT Standard Invoice v2</option>
              <option>Compact Invoice</option>
              <option>Detailed GST Invoice</option>
            </select>
          </div>
        </div>
        <SettingsActions onSave={handleSave} onReset={handleReset} saving={saving} disableSave={!dirty} />
      </SettingsCard>

      {/* Payment Gateway */}
      <SettingsCard title="Payment Gateway" description="Select the active payment provider for online fee collection.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Payment Gateway</label>
            <select value={form.paymentGateway || 'Razorpay'} onChange={(e) => updateField('paymentGateway', e.target.value)} className={inputCls}>
              <option>Razorpay</option>
              <option>PayU</option>
              <option>Stripe</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Scholarship Handling</label>
            <select
              value={form.scholarshipEnabled ? 'Enabled' : 'Disabled'}
              onChange={(e) => updateField('scholarshipEnabled', e.target.value === 'Enabled')}
              className={inputCls}
            >
              <option>Enabled</option>
              <option>Disabled</option>
            </select>
          </div>
        </div>
        <SettingsActions onSave={handleSave} onReset={handleReset} saving={saving} disableSave={!dirty} />
      </SettingsCard>

      <SettingsToast message={toast} onClear={() => setToast('')} />
    </div>
  );
}
