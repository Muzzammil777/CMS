import { useEffect, useState } from 'react';
import { settingsApi } from '../../api/settingsApi';
import { SettingsActions, SettingsCard, SettingsError, SettingsLoader, SettingsToast, inputCls, labelCls } from './SettingsPanelCommon';

const EMPTY_USER = { id: null, name: '', email: '', role: 'student', active: true };
const ROLES = ['student', 'faculty', 'finance', 'admin'];

const roleBadge = {
  admin:   'bg-purple-100 text-purple-700',
  finance: 'bg-blue-100 text-blue-700',
  faculty: 'bg-amber-100 text-amber-700',
  student: 'bg-slate-100 text-slate-600',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [activeUser, setActiveUser] = useState(EMPTY_USER);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    settingsApi.getUsers().then(setUsers).catch(() => setError('Failed to load user directory.'));
  }, []);

  function openCreate() { setActiveUser(EMPTY_USER); setModalOpen(true); }
  function openEdit(u)  { setActiveUser(u); setModalOpen(true); }
  function closeModal() { setActiveUser(EMPTY_USER); setModalOpen(false); }

  function saveUser() {
    if (!activeUser.name.trim() || !activeUser.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setUsers((cur) => {
      if (activeUser.id) return cur.map((u) => (u.id === activeUser.id ? activeUser : u));
      return [...cur, { ...activeUser, id: Date.now() }];
    });
    closeModal();
    setToast(activeUser.id ? 'User updated.' : 'User created.');
  }

  function deleteUser(id) {
    if (!window.confirm('Delete this user?')) return;
    setUsers((cur) => cur.filter((u) => u.id !== id));
    setToast('User deleted.');
  }

  function toggleActive(id, active) {
    setUsers((cur) => cur.map((u) => (u.id === id ? { ...u, active } : u)));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await settingsApi.replaceUsers(users);
      setToast('User directory saved.');
    } catch {
      setError('Failed to save user directory.');
    } finally {
      setSaving(false);
    }
  }

  const visible = users.filter(
    (u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      <SettingsError message={error} />

      <SettingsCard title="User Directory" description="Create, edit, and manage portal accounts.">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[180px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00236f]/30 focus:border-[#00236f] transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No users found</td></tr>
              )}
              {visible.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleBadge[u.role] || 'bg-slate-100 text-slate-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <label className="relative inline-flex items-center cursor-pointer gap-2">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={u.active}
                        onChange={(e) => toggleActive(u.id, e.target.checked)}
                      />
                      <div className="w-8 h-4 bg-slate-200 peer-checked:bg-[#00236f] rounded-full transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                      <span className={`text-xs font-medium ${u.active ? 'text-[#00236f]' : 'text-slate-400'}`}>{u.active ? 'Active' : 'Disabled'}</span>
                    </label>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(u)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                        <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-100 text-rose-600 hover:bg-rose-50 transition-all">
                        <span className="material-symbols-outlined text-[14px]">delete</span> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SettingsActions onSave={handleSave} onReset={() => {}} saving={saving} />
      </SettingsCard>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00236f]/10 rounded-lg">
                  <span className="material-symbols-outlined text-[#00236f]">{activeUser.id ? 'edit' : 'person_add'}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{activeUser.id ? 'Edit User' : 'Create User'}</h3>
              </div>
              <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input type="text" value={activeUser.name} onChange={(e) => setActiveUser((cur) => ({ ...cur, name: e.target.value }))} className={inputCls} placeholder="e.g. Arjun Kumar" />
              </div>
              <div>
                <label className={labelCls}>Email Address *</label>
                <input type="email" value={activeUser.email} onChange={(e) => setActiveUser((cur) => ({ ...cur, email: e.target.value }))} className={inputCls} placeholder="e.g. arjun@mit.edu" />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select value={activeUser.role} onChange={(e) => setActiveUser((cur) => ({ ...cur, role: e.target.value }))} className={inputCls}>
                  {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={activeUser.active} onChange={(e) => setActiveUser((cur) => ({ ...cur, active: e.target.checked }))} className="w-4 h-4 accent-[#00236f]" />
                <span className="text-sm font-medium text-slate-700">Account Active</span>
              </label>
            </div>
            <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3">
              <button onClick={closeModal} className="px-5 py-2 text-sm font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={saveUser} className="px-6 py-2 bg-[#00236f] hover:bg-[#001a54] text-white text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-95">
                {activeUser.id ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsToast message={toast} onClear={() => setToast('')} />
    </div>
  );
}
