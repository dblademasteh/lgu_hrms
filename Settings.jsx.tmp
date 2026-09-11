import React, { useEffect, useState } from 'react';
import { Moon, Sun, LayoutGrid, Bell, User, ShieldCheck, Info, Settings as SettingsIcon, Database, Table, X, Save, Check, Plus, Download, Key, LogOut, UserX, Pencil, Trash2, Type, Palette } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { useTheme, toggleTheme } from '../theme.js';
import { useToast } from '../components/Toast.jsx';
import { accountApi } from '../api/account.js';
import { databaseApi } from '../api/database.js';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const tabs = [
  { id: 'appearance', label: 'Appearance', icon: LayoutGrid },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: User },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'system', label: 'System', icon: Info },
];

export default function Settings() {
  const theme = useTheme();
  const [active, setActive] = useState('appearance');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('lgu-notif-inapp') !== 'false');
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem('lgu-notif-email') !== 'false');
  const [smsNotifications, setSmsNotifications] = useState(() => localStorage.getItem('lgu-notif-sms') === 'true');
  const [pushNotifications, setPushNotifications] = useState(() => localStorage.getItem('lgu-notif-push') !== 'false');
  const [quietHours, setQuietHours] = useState(() => localStorage.getItem('lgu-notif-quiet') || '22:00-07:00');
  const [accent, setAccent] = useState(() => localStorage.getItem('lgu-accent') || '#1d4ed8');
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('lgu-font-family') || 'Inter');
  const [uiScale, setUiScale] = useState(() => Number(localStorage.getItem('lgu-ui-scale') || 100));
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loginEvents, setLoginEvents] = useState([]);
  const [delegations, setDelegations] = useState([]);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [delegationForm, setDelegationForm] = useState({ delegateeId:'', scope:'', reason:'', startsAt:'', endsAt:'' });
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdConfirmTouched, setPwdConfirmTouched] = useState(false);
  const [dbTables, setDbTables] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [dbSelectedTable, setDbSelectedTable] = useState(null);
  const [dbTableSchema, setDbTableSchema] = useState(null);
  const [dbRecords, setDbRecords] = useState([]);
  const [dbRecordCount, setDbRecordCount] = useState(0);
  const [dbBrowseSkip, setDbBrowseSkip] = useState(0);
  const [dbBrowseTake] = useState(20);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (active === 'account') {
      accountApi.getProfile().then(res => setProfile(res.data)).catch(() => setProfile(null));
      accountApi.getSessions().then(res => setSessions(res.data || [])).catch(() => setSessions([]));
      accountApi.getLoginEvents().then(res => setLoginEvents(res.data || [])).catch(() => setLoginEvents([]));
      accountApi.getDelegations().then(res => setDelegations(res.data || [])).catch(() => setDelegations([]));
    }
  }, [active]);

  useEffect(() => {
    if (active === 'database') {
      setDbLoading(true);
      setDbError(null);
      databaseApi.summary()
        .then(res => { setDbTables(res.tables); setDbLoading(false); })
        .catch(() => { setDbError('Could not load database info'); setDbLoading(false); });
    }
  }, [active]);

  useEffect(() => {
    if (active === 'database' && dbSelectedTable) {
      setDbBrowseSkip(0);
      databaseApi.tableSchema(dbSelectedTable.name)
        .then(res => setDbTableSchema(res))
        .catch(() => setDbTableSchema(null));
      databaseApi.browse(dbSelectedTable.name, { skip: 0, take: dbBrowseTake })
        .then(res => { setDbRecords(res.data); setDbRecordCount(res.count); })
        .catch(() => { setDbRecords([]); setDbRecordCount(0); });
    }
  }, [active, dbSelectedTable, dbBrowseSkip, dbBrowseTake]);

  useEffect(() => { localStorage.setItem('lgu-notif-inapp', String(notificationsEnabled)); }, [notificationsEnabled]);
  useEffect(() => { localStorage.setItem('lgu-notif-email', String(emailNotifications)); }, [emailNotifications]);
  useEffect(() => { localStorage.setItem('lgu-notif-sms', String(smsNotifications)); }, [smsNotifications]);
  useEffect(() => { localStorage.setItem('lgu-notif-push', String(pushNotifications)); }, [pushNotifications]);
  useEffect(() => { localStorage.setItem('lgu-notif-quiet', quietHours); }, [quietHours]);
  useEffect(() => { localStorage.setItem('lgu-accent', accent); document.documentElement.style.setProperty('--accent', accent); }, [accent]);
  useEffect(() => { localStorage.setItem('lgu-font-family', fontFamily); document.documentElement.style.setProperty('--font-sans', `"${fontFamily}", var(--font-sans-fallback)`); document.body.style.fontFamily = `"${fontFamily}", var(--font-sans-fallback)`; }, [fontFamily]);
  useEffect(() => { localStorage.setItem('lgu-ui-scale', String(uiScale)); document.documentElement.style.setProperty('--ui-scale', `${uiScale}%`); }, [uiScale]);

  const save = (msg) => toast(msg, 'success');

  const isValidEmail = (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isValidPhone = (val) => !val || /^[\d\s\+\-\(\)]{7,15}$/.test(val);

  const passwordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const handlePasswordChange = async () => {
    if (!pwdCurrent || !pwdNew || !pwdConfirm) { toast('Fill all fields', 'error'); return; }
    if (pwdNew !== pwdConfirm) { toast('New passwords do not match', 'error'); setPwdConfirmTouched(true); return; }
    if (passwordStrength(pwdNew) < 3) { toast('Use 8+ chars with upper, number, symbol', 'error'); return; }
    try {
      await accountApi.changePassword({ currentPassword: pwdCurrent, newPassword: pwdNew });
      toast('Password changed', 'success');
      setShowPasswordModal(false);
      setPwdCurrent(''); setPwdNew(''); setPwdConfirm(''); setPwdConfirmTouched(false);
      accountApi.getProfile().then(res => setProfile(res.data)).catch(()=>{});
    } catch (e) {
      toast('Current password is incorrect', 'error');
    }
  };

  const handleProfileUpdate = async () => {
    if (!editDisplayName.trim()) { toast('Display name is required', 'error'); return; }
    if (editEmail && !isValidEmail(editEmail)) { toast('Invalid email format', 'error'); return; }
    if (editContact && !isValidPhone(editContact)) { toast('Invalid contact number', 'error'); return; }
    try {
      await accountApi.updateProfile({ displayName: editDisplayName, email: editEmail, contactNumber: editContact, emergencyContact: editEmergency });
      toast('Profile updated', 'success');
      setShowProfileEdit(false);
      accountApi.getProfile().then(res => setProfile(res.data)).catch(()=>{});
    } catch {
      toast('Could not update profile', 'error');
    }
  };

  const handlePrefsSave = async () => {
    try {
      await accountApi.updateProfile({ displayPrefs: profile?.user?.displayPrefs || {} });
      toast('Preferences saved', 'success');
      accountApi.getProfile().then(res => setProfile(res.data)).catch(()=>{});
    } catch {
      toast('Could not save preferences', 'error');
    }
  };

  const handleDbTableSelect = (table) => {
    setDbSelectedTable(table);
    setDbBrowseSkip(0);
  };

  const handleDbPrev = () => setDbBrowseSkip(s => Math.max(0, s - dbBrowseTake));
  const handleDbNext = () => {
    if (dbBrowseSkip + dbBrowseTake < dbRecordCount) setDbBrowseSkip(s => s + dbBrowseTake);
  };

  const handleDeleteRecord = async (tableName, id) => {
    try {
      await databaseApi.remove(tableName, id);
      toast(`${tableName} record deleted`, 'success');
      const res = await databaseApi.browse(tableName, { skip: dbBrowseSkip, take: dbBrowseTake });
      setDbRecords(res.data);
      setDbRecordCount(res.count);
    } catch {
      toast('Could not delete record — foreign key constraint or missing permission', 'error');
    }
  };

  return (
    <Layout>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <SettingsIcon size={24} className="text-accent" /> Settings
          </h1>
          <p className="text-sm text-muted mt-1">Configure application preferences, account, and developer tools</p>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-line bg-bg/50">
            <div className="flex gap-1 px-2 py-2 overflow-x-auto">
              {tabs.map(t => {
                const Icon = t.icon;
                const selected = active === t.id;
                return (
                  <button key={t.id} onClick={() => setActive(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm whitespace-nowrap border-b-2 transition ${selected ? 'border-accent text-accent font-semibold bg-bg' : 'border-transparent text-muted hover:text-ink'}`}>
                    <Icon size={16}/> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {active === 'appearance' && (
              <section className="card p-6 space-y-6">
                <h2 className="font-display font-semibold text-ink flex items-center gap-2"><LayoutGrid size={18} className="text-accent"/> Appearance</h2>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <p className="text-sm font-medium text-ink flex items-center gap-2"><Sun size={16}/> Theme</p>
                    <p className="text-xs text-muted">Light or dark mode</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                      ].map(t => {
                        const Icon = t.icon;
                        const active = (theme === (t.id === 'dark' ? 'dark' : 'light'));
                        return (
                          <button key={t.id} onClick={() => { if (theme !== t.id) { toggleTheme(); save('Theme updated'); } }} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition ${active ? 'border-accent bg-accent/10 text-accent' : 'border-line hover:bg-bg/60'}`}>
                            <Icon size={16} /> {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <p className="text-sm font-medium text-ink flex items-center gap-2"><LayoutGrid size={16}/> UI density</p>
                    <p className="text-xs text-muted">Scale spacing & components 80-120%</p>
                    <input type="range" min="80" max="120" value={uiScale} onChange={e => { setUiScale(Number(e.target.value)); }} className="w-full" />
                    <div className="flex justify-between text-xs mono-label text-muted"><span>80%</span><span>{uiScale}%</span><span>120%</span></div>
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <p className="text-sm font-medium text-ink flex items-center gap-2"><Type size={16}/> Font family</p>
                    <p className="text-xs text-muted">Choose a sans serif font for UI</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-auto pr-1">
                      {['Inter','Sora','JetBrains Mono','DM Sans','Roboto','Open Sans','Lato','Poppins','Nunito','Montserrat','Source Sans 3','Work Sans','Plus Jakarta Sans'].map(f => {
                        const active = fontFamily === f;
                        return (
                          <button key={f} onClick={() => { setFontFamily(f); save('Font family updated'); }} className={`text-left rounded-lg border px-3 py-2.5 hover:bg-bg/60 transition ${active ? 'border-accent bg-accent/10' : 'border-line'}`} style={{fontFamily: f}}>
                            <div className="text-sm font-medium text-ink">{f}</div>
                            <div className="text-[11px] text-muted truncate">Aa sample</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <p className="text-sm font-medium text-ink flex items-center gap-2"><Palette size={16}/> Accent color</p>
                    <p className="text-xs text-muted">Primary brand accent</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {['#1d4ed8','#0f766e','#7c3aed','#dc2626','#059669','#d97706'].map(c => {
                        const active = accent.toLowerCase() === c.toLowerCase();
                        return (
                          <button key={c} onClick={() => { setAccent(c); save('Accent preset applied'); }} className={`aspect-square rounded-lg border-2 flex items-center justify-center text-[10px] mono-label transition ${active ? 'border-accent' : 'border-line hover:border-accent/60'}`} style={{background:`${c}20`, color:c}}>
                            {active ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <input type="color" value={accent} onChange={e => { setAccent(e.target.value); save('Accent updated'); }} className="w-10 h-10 rounded-lg border border-line bg-transparent" />
                      <p className="mono-label text-xs">{accent}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {active === 'database' && (
              <section className="card p-6 space-y-5">
                <h2 className="font-display font-semibold text-ink flex items-center gap-2"><Database size={18} className="text-accent"/> Database Management</h2>
                <p className="text-sm text-muted">Inspect and manage database tables (ADMIN only).</p>

                {dbError && <p className="text-error text-sm">{dbError}</p>}

                {dbLoading ? (
                  <p className="text-sm text-muted">Loading tables…</p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    {dbTables.map(t => (
                      <button key={t.name} onClick={() => handleDbTableSelect(t)} className={`card p-4 text-left border cursor-pointer transition ${dbSelectedTable?.name === t.name ? 'border-accent bg-accent/5' : 'border-line hover:bg-bg/60'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-ink">{t.label}</p>
                          <span className="badge mono-label">{t.count !== undefined ? t.count : (t.rowCount === -1 ? '—' : t.rowCount)}</span>
                        </div>
                        <p className="text-xs text-muted">{t.description}</p>
                      </button>
                    ))}
                  </div>
                )}

                {dbSelectedTable && dbTableSchema && (
                  <div className="mt-6 card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display font-semibold text-ink flex items-center gap-2"><Table size={16}/> {dbSelectedTable.label}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{dbRecordCount} total records</span>
                        <button className="btn btn-ghost btn-sm gap-2" onClick={handleDbPrev} disabled={dbBrowseSkip === 0}><X size={12}/> <span aria-hidden>←</span></button>
                        <button className="btn btn-ghost btn-sm gap-2" onClick={handleDbNext} disabled={dbBrowseSkip + dbBrowseTake >= dbRecordCount}><span aria-hidden>→</span></button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="data-table w-full">
                        <thead>
                          <tr>
                            {dbTableSchema.map(col => <th key={col.column_name}>{col.column_name}</th>)}
                            <th className="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbRecords.map(rec => (
                            <tr key={rec.id}>
                              {dbTableSchema.map(col => (
                                <td key={col.column_name} className="font-mono text-xs">
                                  {rec[col.column_name] !== null && rec[col.column_name] !== undefined
                                    ? String(rec[col.column_name])
                                    : '—'}
                                </td>
                              ))}
                              <td className="text-center">
                                <button className="btn btn-ghost btn-sm text-xs text-error" onClick={() => setShowDeleteConfirm({ table: dbSelectedTable, record: rec })}>
                                  <Trash2 size={14} /> Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                          {dbRecords.length === 0 && (
                            <tr><td colSpan={dbTableSchema.length + 1} className="text-muted text-sm py-6 text-center">No records</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {active === 'notifications' && (
              <section className="card p-6 space-y-6">
                <h2 className="font-display font-semibold text-ink flex items-center gap-2"><Bell size={18} className="text-accent"/> Notifications</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { key: 'inapp', label: 'In-app', desc: 'Toast notifications in browser', value: notificationsEnabled, setter: setNotificationsEnabled },
                    { key: 'email', label: 'Email', desc: 'Send email alerts for approvals', value: emailNotifications, setter: setEmailNotifications },
                    { key: 'push', label: 'Push', desc: 'Browser push notifications', value: pushNotifications, setter: setPushNotifications },
                    { key: 'sms', label: 'SMS', desc: 'SMS alerts for critical payroll events', value: smsNotifications, setter: setSmsNotifications },
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between p-4 border border-line rounded-xl bg-bg/50 cursor-pointer hover:bg-bg/70 transition">
                      <div>
                        <p className="text-sm font-medium text-ink">{item.label}</p>
                        <p className="text-xs text-muted">{item.desc}</p>
                      </div>
                      <input type="checkbox" checked={item.value} onChange={e => { item.setter(e.target.checked); save('Notification preference saved'); }} className="w-4 h-4 accent-accent" />
                    </label>
                  ))}
                </div>
                <div className="p-4 border border-line rounded-xl bg-bg/50 space-y-2">
                  <p className="text-sm font-medium text-ink">Quiet hours</p>
                  <p className="text-xs text-muted">Do not send non-critical notifications during this window</p>
                  <input type="text" value={quietHours} onChange={e => { setQuietHours(e.target.value); save('Quiet hours updated'); }} className="input w-full max-w-xs mt-2" placeholder="22:00-07:00" />
                </div>
                <div className="p-4 border border-line rounded-xl bg-bg/30 text-xs text-muted">
                  Note: Email/SMS require backend integration. Settings are persisted locally until wired to the API and audit log.
                </div>
              </section>
            )}

            {active === 'account' && (
              <section className="card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-ink flex items-center gap-2"><User size={18} className="text-accent"/> Account</h2>
                  <button className="btn btn-ghost text-sm gap-2" onClick={() => { setEditDisplayName(profile?.user?.displayName || ''); setEditEmail(profile?.user?.email || ''); setEditContact(profile?.user?.contactNumber || ''); setEditEmergency(profile?.user?.emergencyContact || ''); setShowProfileEdit(true); }}><Pencil size={14} /> Edit profile</button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    {(() => {
                      const u = profile?.user;
                      const initials = (u?.username || 'AB').slice(0,2).toUpperCase();
                      const displayName = u?.username || '—';
                      const email = u?.username?.includes('@') ? u.username : `${u?.username || 'admin'}@lgu.gov.ph`;
                      const role = u?.role || 'ADMIN';
                      const dept = u?.department?.name || 'HR Admin';
                      const completeness = profile?.completeness ?? 78;
                      return (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center text-accent font-display font-bold">{initials}</div>
                            <div>
                              <p className="text-sm font-medium text-ink">{displayName}</p>
                              <p className="text-xs text-muted">{email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="badge badge-accent">{role}</span>
                            <span className="badge">HRMO</span>
                            <span className="mono-label text-[10px]">Dept: {dept}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs"><span className="text-muted">Profile completeness</span><span className="mono-label">{completeness}%</span></div>
                            <div className="h-2 rounded-full bg-line overflow-hidden">
                              <div className="h-full bg-accent" style={{width:`${completeness}%`}}></div>
                            </div>
                            <p className="text-[11px] text-muted">Complete avatar, contact number, and emergency contact to reach 100%</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-2">
                    <p className="text-sm font-medium text-ink">Role & Scope</p>
                    <p className="text-xs text-muted">Effective permissions derived from JWT</p>
                    <ul className="text-xs text-muted list-disc pl-4 space-y-1">
                      <li>Role: {profile?.user?.role || '—'}</li>
                      <li>Department: {profile?.user?.department?.name || '—'}</li>
                      <li>Two-factor: {profile?.user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</li>
                    </ul>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <p className="text-sm font-medium text-ink flex items-center gap-2"><ShieldCheck size={16} className="text-accent"/> Security</p>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-ink">Password</p>
                          <p className="text-xs text-muted">
                            Last changed {profile?.user?.passwordChangedAt ? new Date(profile.user.passwordChangedAt).toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                        <button className="btn btn-ghost text-sm gap-2" onClick={() => setShowPasswordModal(true)}><Key size={14} /> Change</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-ink">Two-factor authentication</p>
                          <p className="text-xs text-muted">{profile?.user?.twoFactorEnabled ? 'Enabled' : 'TOTP for privileged roles'}</p>
                        </div>
                        <button className="btn btn-ghost text-sm gap-2" onClick={async()=>{ const r = await accountApi.setup2FA(); setTwoFASecret(r.data); setShow2FAModal(true); }}>
                          {profile?.user?.twoFactorEnabled ? <><ShieldCheck size={14} /> Manage</> : <><ShieldCheck size={14} /> Setup</>}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <p className="text-sm font-medium text-ink">Sessions</p>
                    <p className="text-xs text-muted">Active sessions</p>
                    <div className="space-y-2 text-xs">
                      {sessions.map((s,i)=>(
                        <div key={s.id || i} className="flex items-center justify-between p-2 rounded-lg bg-bg/60 border border-line">
                          <div>
                            <p className="text-ink">{s.userAgent || s.device || 'Unknown device'}</p>
                            <p className="mono-label">{s.ip || '—'} · {s.lastActive ? new Date(s.lastActive).toLocaleString() : 'Now'}</p>
                          </div>
                          <button className="btn btn-ghost text-xs gap-2" onClick={async ()=>{
                            try {
                              await accountApi.revokeSession(s.id);
                              toast('Session revoked', 'success');
                              setSessions(prev => prev.filter(x => x.id !== s.id));
                            } catch { toast('Could not revoke session', 'error'); }
                          }}><LogOut size={14} /> Revoke</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                  <p className="text-sm font-medium text-ink">Login history</p>
                  <p className="text-xs text-muted">Recent sign-ins</p>
                  <div className="space-y-2 text-xs">
                    {loginEvents.length === 0 ? (
                      <div className="p-2 rounded-lg bg-bg/60 border border-line">
                        <p className="text-ink mono-label">No login events yet</p>
                      </div>
                    ) : (
                      loginEvents.map((e, i) => (
                        <div key={i} className="p-2 rounded-lg bg-bg/60 border border-line">
                          <p className="text-ink mono-label">{new Date(e.createdAt).toLocaleString()} · {e.ipAddress || e.ip || '—'} · {e.success ? 'Success' : 'Failed'} · {e.userAgent || e.device || ''}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">Delegated access</p>
                    <button className="btn btn-ghost text-xs gap-2" onClick={()=>setShowDelegationModal(true)}><Plus size={14} /> Create</button>
                  </div>
                  <p className="text-xs text-muted">Acting authority during leave</p>
                  <div className="space-y-2 text-xs">
                    {delegations.length === 0 ? (
                      <div className="p-2 rounded-lg bg-bg/60 border border-line">
                        <p className="text-ink mono-label">No delegations active</p>
                      </div>
                    ) : (
                      delegations.map((d, i) => (
                        <div key={i} className="p-2 rounded-lg bg-bg/60 border border-line flex justify-between items-center">
                          <div>
                            <p className="text-ink mono-label">{d.delegator?.displayName || d.delegator?.username} → {d.delegatee?.displayName || d.delegatee?.username}</p>
                            <p className="text-muted">{new Date(d.startsAt).toLocaleDateString()} to {new Date(d.endsAt).toLocaleDateString()} · {d.scope || 'All'}</p>
                          </div>
                          <button className="btn btn-ghost text-xs gap-2" onClick={async()=>{ await accountApi.deleteDelegation(d.id); const r = await accountApi.getDelegations(); setDelegations(r.data||[]); }}><Trash2 size={14} /> Revoke</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <p className="text-sm font-medium text-ink">Preferences</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <label className="text-xs text-muted">Language<div className="mt-1 p-2 border border-line rounded-lg bg-bg/60">English</div></label>
                      <label className="text-xs text-muted">Date format<div className="mt-1 p-2 border border-line rounded-lg bg-bg/60">MM/DD/YYYY</div></label>
                      <label className="text-xs text-muted">Timezone<div className="mt-1 p-2 border border-line rounded-lg bg-bg/60">Asia/Manila</div></label>
                    </div>
                    <button className="btn btn-ghost text-xs gap-2" onClick={handlePrefsSave}><Save size={14} /> Save preferences</button>
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <p className="text-sm font-medium text-ink">Privacy & Data</p>
                    <div className="flex items-center justify-between text-sm">
                      <div><p className="text-ink">Data export</p><p className="text-xs text-muted">RA 10173 portability</p></div>
                      <button className="btn btn-ghost text-sm gap-2" onClick={async()=>{ const r = await accountApi.exportData(); toast(r.data.message, 'info'); }}><Download size={14} /> Download</button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div><p className="text-ink">Deactivation</p><p className="text-xs text-muted">Soft delete account</p></div>
                      <button className="btn btn-danger text-sm gap-2" onClick={()=>setShowDeactivateConfirm(true)}><UserX size={14} /> Deactivate</button>
                    </div>
                    <p className="mono-label text-[10px]">All mutating actions are audited. PII encrypted at rest.</p>
                  </div>
                </div>
              </section>
            )}

            {active === 'compliance' && (
              <section className="card p-6 space-y-4">
                <h2 className="font-display font-semibold text-ink flex items-center gap-2"><ShieldCheck size={18} className="text-accent"/> Compliance</h2>
                <ul className="text-sm text-muted space-y-2 list-disc pl-5">
                  <li>RA 10173 Data Privacy Act – consent logging enabled</li>
                  <li>COA audit trail – append-only logs active</li>
                  <li>CSC Omnibus Rules – leave accrual configured</li>
                </ul>
              </section>
            )}

            {active === 'system' && (
              <section className="card p-6 space-y-4">
                <h2 className="font-display font-semibold text-ink flex items-center gap-2"><Info size={18} className="text-accent"/> System</h2>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 border border-line rounded-xl bg-bg/50"><p className="mono-label">Version</p><p className="text-ink font-medium">v0.1</p></div>
                  <div className="p-3 border border-line rounded-xl bg-bg/50"><p className="mono-label">Mode</p><p className="text-ink font-medium">On-prem</p></div>
                  <div className="p-3 border border-line rounded-xl bg-bg/50"><p className="mono-label">DB</p><p className="text-ink font-medium">PostgreSQL 16</p></div>
                </div>
              </section>
            )}
          </div>
        </div>
        <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password" size="sm" footer={
          <>
            <button className="btn btn-ghost gap-2" onClick={() => setShowPasswordModal(false)}>
              <X size={16} />
              Cancel
            </button>
            <button className="btn btn-primary gap-2" onClick={handlePasswordChange}>
              <Save size={16} />
              Save
            </button>
          </>
        }>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Current password</label>
              <input type="password" className="input" value={pwdCurrent} onChange={e=>setPwdCurrent(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">New password</label>
              <input type="password" className="input" value={pwdNew} onChange={e=>setPwdNew(e.target.value)} />
              <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{width:`${(passwordStrength(pwdNew)/4)*100}%`}}></div>
              </div>
              <p className="text-[11px] text-muted mt-1">Min 8 chars, upper, number, symbol recommended</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Confirm new password</label>
              <input type="password" className="input" value={pwdConfirm} onChange={e=>setPwdConfirm(e.target.value)} onBlur={()=>setPwdConfirmTouched(true)} aria-invalid={pwdConfirmTouched && pwdNew !== pwdConfirm} />
              {pwdConfirmTouched && pwdNew !== pwdConfirm && <p className="text-[11px] text-error mt-1">Passwords do not match</p>}
            </div>
          </div>
        </Modal>
        <Modal open={showProfileEdit} onClose={() => setShowProfileEdit(false)} title="Edit profile" size="sm" footer={
          <>
            <button className="btn btn-ghost gap-2" onClick={() => setShowProfileEdit(false)}>
              <X size={16} />
              Cancel
            </button>
            <button className="btn btn-primary gap-2" onClick={handleProfileUpdate} disabled={!editDisplayName.trim() || (editEmail && !isValidEmail(editEmail)) || (editContact && !isValidPhone(editContact))}>
              <Save size={16} />
              Save
            </button>
          </>
        }>
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Display name</label>
              <input className="input" value={editDisplayName} onChange={e=>setEditDisplayName(e.target.value)} aria-invalid={!editDisplayName.trim()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input className="input" value={editEmail} onChange={e=>setEditEmail(e.target.value)} aria-invalid={editEmail && !isValidEmail(editEmail)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Contact number</label>
              <input className="input" value={editContact} onChange={e=>setEditContact(e.target.value)} aria-invalid={editContact && !isValidPhone(editContact)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Emergency contact</label>
              <input className="input" value={editEmergency} onChange={e=>setEditEmergency(e.target.value)} />
            </div>
          </div>
        </Modal>
        <Modal open={show2FAModal} onClose={()=>{setShow2FAModal(false); setTwoFASecret(null);}} title="Two-factor authentication" size="sm" footer={
          <>
            <button className="btn btn-ghost gap-2" onClick={()=>{setShow2FAModal(false); setTwoFASecret(null);}}>
              <X size={16} />
              Close
            </button>
            <button className="btn btn-primary gap-2" disabled={!twoFACode || twoFACode.length < 6} onClick={async()=>{ await accountApi.verify2FA(twoFACode); toast('2FA enabled', 'success'); setShow2FAModal(false); accountApi.getProfile().then(r=>setProfile(r.data)); }}>
              <Check size={16} />
              Verify
            </button>
          </>
        }>
          <div className="space-y-3 text-sm">
            <p className="text-muted text-xs">Scan the QR code or enter secret manually.</p>
            <div className="p-3 bg-bg/60 border border-line rounded-lg font-mono text-xs wrap-break-word">{twoFASecret?.secret}</div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Code</label>
              <input className="input" value={twoFACode} onChange={e=>setTwoFACode(e.target.value)} placeholder="123456" aria-invalid={twoFACode && twoFACode.length < 6} />
              {twoFACode && twoFACode.length < 6 && <p className="text-[11px] text-error mt-1">Enter the 6-digit code from your authenticator</p>}
            </div>
          </div>
        </Modal>
        <Modal open={showDelegationModal} onClose={()=>setShowDelegationModal(false)} title="Create delegation" size="sm" footer={
          <>
            <button className="btn btn-ghost gap-2" onClick={()=>setShowDelegationModal(false)}>
              <X size={16} />
              Cancel
            </button>
            <button type="submit" form="deleg-form" className="btn btn-primary gap-2" disabled={!delegationForm.delegateeId || !delegationForm.startsAt || !delegationForm.endsAt}>
              <Plus size={16} />
              Create
            </button>
          </>
        }>
          <form id="deleg-form" onSubmit={async(e)=>{e.preventDefault(); await accountApi.createDelegation(delegationForm); setShowDelegationModal(false); const r = await accountApi.getDelegations(); setDelegations(r.data||[]); toast('Delegation created', 'success');}} className="space-y-3 text-sm">
            <div><label className="block text-sm font-medium text-ink mb-1">Delegatee ID</label><input className="input" value={delegationForm.delegateeId} onChange={e=>setDelegationForm({...delegationForm, delegateeId:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-ink mb-1">Scope</label><input className="input" value={delegationForm.scope} onChange={e=>setDelegationForm({...delegationForm, scope:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-ink mb-1">Reason</label><input className="input" value={delegationForm.reason} onChange={e=>setDelegationForm({...delegationForm, reason:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-sm font-medium text-ink mb-1">Starts</label><input type="date" className="input" value={delegationForm.startsAt} onChange={e=>setDelegationForm({...delegationForm, startsAt:e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-ink mb-1">Ends</label><input type="date" className="input" value={delegationForm.endsAt} onChange={e=>setDelegationForm({...delegationForm, endsAt:e.target.value})} /></div>
            </div>
          </form>
        </Modal>
        <ConfirmDialog open={showDeactivateConfirm} onClose={()=>setShowDeactivateConfirm(false)} title="Deactivate account" message="This will soft-delete your account. Continue?" confirmLabel="Deactivate" danger onConfirm={async()=>{ await accountApi.deactivateAccount(); toast('Account deactivated', 'success'); setShowDeactivateConfirm(false); }} />
        <ConfirmDialog open={!!showDeleteConfirm} onClose={()=>setShowDeleteConfirm(null)} title="Delete record" message={`Delete ${showDeleteConfirm?.table?.label} record #${showDeleteConfirm?.record?.id}? This cannot be undone.`} confirmLabel="Delete" danger onConfirm={async()=>{ if (showDeleteConfirm) { await handleDeleteRecord(showDeleteConfirm.table.name, showDeleteConfirm.record.id); setShowDeleteConfirm(null); } }} />
    </Layout>
  );
}
