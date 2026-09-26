import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Moon, Sun, LayoutGrid, Bell, User, ShieldCheck, Info, Settings as SettingsIcon, Database, Table, X, Save, Check, Plus, Download, Key, LogOut, UserX, Pencil, Trash2, Type, Palette, RefreshCw, Server, Activity, Clock, HardDrive, Hash, AlertTriangle, Link2, ChevronLeft, ChevronRight, Zap, Upload } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { useTheme, toggleTheme } from '../theme.js';
import { useSidebarStyle, setSidebarStyle, SIDEBAR_STYLES, SIDEBAR_STYLE_META } from '../sidebarStyle.js';
import { useToastStyle, setToastStyle, TOAST_STYLES, TOAST_STYLE_META } from '../toastStyle.js';
import { useToast } from '../components/Toast.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { ROLE_RANK } from '../config/permissions.js';
import { accountApi } from '../api/account.js';
import { setupPin, removePin } from '../api/auth.js';
import { databaseApi } from '../api/database.js';
import { auditApi } from '../api/audit.js';
import { rulesApi } from '../api/rules.js';
import { usersApi } from '../api/users.js';
import Integrations from '../components/Integrations.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const tabs = [
  { id: 'appearance', label: 'Appearance', icon: LayoutGrid },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: User },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'system', label: 'System', icon: Info },
];

export default function Settings() {
  const theme = useTheme();
  const sidebarStyle = useSidebarStyle();
  const toastStyle = useToastStyle();
  const currentRole = useAuthStore(s => s.user?.role);
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
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [confirmRunMigrations, setConfirmRunMigrations] = useState(false);

  const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
  const isAdmin = ADMIN_ROLES.includes(currentRole);
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';

  const visibleTabs = useMemo(() => tabs.filter(tab => {
    if (tab.id === 'integrations') {
      return isSuperAdmin;
    }
    if (['database', 'compliance', 'system'].includes(tab.id)) {
      return isAdmin;
    }
    return true;
  }), [isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (!visibleTabs.some(t => t.id === active)) {
      setActive(visibleTabs[0]?.id || 'appearance');
    }
  }, [active, visibleTabs]);

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
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdConfirmTouched, setPwdConfirmTouched] = useState(false);
  const [dbTables, setDbTables] = useState([]);
  const [dbTotalTables, setDbTotalTables] = useState(0);
  const [dbTotalRecords, setDbTotalRecords] = useState(0);
  const [dbSearch, setDbSearch] = useState('');
  const [dbOps, setDbOps] = useState(null);
  const [dbOpsLoading, setDbOpsLoading] = useState(false);
  const [dbSlow, setDbSlow] = useState(null);
  const [dbRetention, setDbRetention] = useState(null);
  const [dbRetentionDays, setDbRetentionDays] = useState(90);
  const [dbSql, setDbSql] = useState('SELECT id, username, role FROM "User" LIMIT 10');
  const [dbSqlResult, setDbSqlResult] = useState(null);
  const [dbSqlBusy, setDbSqlBusy] = useState(false);
  const [dbImportText, setDbImportText] = useState('');
  const [dbImportFileName, setDbImportFileName] = useState(null);
  const [dbImportResult, setDbImportResult] = useState(null);
  const [dbImportBusy, setDbImportBusy] = useState(false);
  const [dbDeps, setDbDeps] = useState(null);
  const [dbPurgeTarget, setDbPurgeTarget] = useState(null);
  const [sysInfo, setSysInfo] = useState(null);
  const [sysLoading, setSysLoading] = useState(false);
  const sessionUser = useAuthStore(s => s.user);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [dbSelectedTable, setDbSelectedTable] = useState(null);
  const [dbTableSchema, setDbTableSchema] = useState(null);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [cmpAudit, setCmpAudit] = useState(null);
  const [cmpRules, setCmpRules] = useState(null);
  const [cmpUsers, setCmpUsers] = useState(null);
  const [cmpSessions, setCmpSessions] = useState(null);
  const [dbRecords, setDbRecords] = useState([]);
  const [dbRecordCount, setDbRecordCount] = useState(0);
  const [dbBrowseSkip, setDbBrowseSkip] = useState(0);
  const [dbBrowseTake] = useState(20);
  const [showDbCreateModal, setShowDbCreateModal] = useState(false);
  const [showDbEditModal, setShowDbEditModal] = useState(false);
  const [dbEditingRecord, setDbEditingRecord] = useState(null);
  const [dbCreateForm, setDbCreateForm] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [dbMaintenanceLoading, setDbMaintenanceLoading] = useState({ vacuumRun: false, vacuumAnalyze: false, analyze: false, reindex: false });
  const [dbMaintenanceResult, setDbMaintenanceResult] = useState(null);
  const [dbShowAllRows, setDbShowAllRows] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (active === 'compliance') {
      setCmpLoading(true);
      const get = async (fn) => { try { const r = await fn(); return r?.data ?? r; } catch { return null; } };
      Promise.all([
        get(() => auditApi.list({ limit: 1 })),
        get(() => rulesApi.listContributions()),
        get(() => rulesApi.listTaxBrackets()),
        get(() => rulesApi.listLeaveRules()),
        get(() => usersApi.list()),
        get(() => accountApi.getSessions()),
      ]).then(([audit, contrib, tax, leave, users, sessions]) => {
        setCmpAudit(audit);
        setCmpRules({ contributions: contrib, tax, leave });
        setCmpUsers(users);
        setCmpSessions(sessions);
        setCmpLoading(false);
      });
    }
  }, [active]);

  const loadSysInfo = () => {
    setSysLoading(true);
    const t0 = performance.now();
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api/v1';
    const get = async (fn) => { try { return await fn(); } catch { return null; } };
    Promise.all([
      get(() => fetch(`${apiBase}/health`).then(r => r.json()).then(d => ({ ...d, ms: Math.round(performance.now() - t0) }))),
      get(() => databaseApi.health()),
      get(() => databaseApi.migrations()),
      get(() => databaseApi.summary()),
    ]).then(([backend, db, migrations, summary]) => {
      setSysInfo({ backend, db, migrations, summary, apiBase });
      setSysLoading(false);
    });
  };

  useEffect(() => {
    if (active === 'system') loadSysInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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
      setDbOpsLoading(true);
      databaseApi.summary()
        .then(res => { setDbTables(res.tables); setDbTotalTables(res.totalTables ?? res.tables.length); setDbTotalRecords(res.totalRecords ?? 0); setDbLoading(false); })
        .catch(() => { setDbError('Could not load database info'); setDbLoading(false); });
      const get = async (fn) => { try { const r = await fn(); return r; } catch { return null; } };
      Promise.all([
        get(() => databaseApi.health()),
        get(() => databaseApi.migrations()),
        isSuperAdmin ? get(() => databaseApi.slowQueries()) : Promise.resolve(null),
        isSuperAdmin ? get(() => databaseApi.retention(90)) : Promise.resolve(null),
        isSuperAdmin ? get(() => databaseApi.connections()) : Promise.resolve(null),
        isSuperAdmin ? get(() => databaseApi.databaseSize()) : Promise.resolve(null),
      ])
        .then(([health, migrations, slow, retention, connections, dbSize]) => {
          setDbOps({ health, migrations, connections, dbSize });
          setDbSlow(slow);
          setDbRetention(retention);
          setDbOpsLoading(false);
        });
    }
  }, [active]);

  useEffect(() => {
    if (active === 'database' && dbSelectedTable) {
      databaseApi.tableSchema(dbSelectedTable.name)
        .then(res => setDbTableSchema(res))
        .catch(() => setDbTableSchema(null));
    }
  }, [active, dbSelectedTable]);

  useEffect(() => {
    if (active === 'database' && dbSelectedTable) {
      databaseApi.browse(dbSelectedTable.name, { skip: dbBrowseSkip, take: dbBrowseTake })
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

  // UI density: notify only on the final committed value (slider release / blur /
  // keyboard end), never on every live drag step.
  const uiScaleToastRef = useRef(uiScale);
  const commitUiScale = () => {
    if (uiScale !== uiScaleToastRef.current) {
      uiScaleToastRef.current = uiScale;
      save(`UI density ${uiScale}%`);
    }
  };

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

  const handleDbCreate = async (data) => {
    try {
      await databaseApi.create(dbSelectedTable.name, data);
      toast('Record created', 'success');
      setShowDbCreateModal(false);
      const res = await databaseApi.browse(dbSelectedTable.name, { skip: dbBrowseSkip, take: dbBrowseTake });
      setDbRecords(res.data);
      setDbRecordCount(res.count);
    } catch (e) {
      toast('Could not create record', 'error');
    }
  };

  const handleDbUpdate = async (id, changes) => {
    try {
      await databaseApi.update(dbSelectedTable.name, id, changes);
      toast('Record updated', 'success');
      setShowDbEditModal(false);
      const res = await databaseApi.browse(dbSelectedTable.name, { skip: dbBrowseSkip, take: dbBrowseTake });
      setDbRecords(res.data);
      setDbRecordCount(res.count);
    } catch (e) {
      toast('Could not update record', 'error');
    }
  };

  const handleDbExport = (format) => {
    if (!dbSelectedTable) return;
    databaseApi.exportData(dbSelectedTable.name, format);
  };

  const handleDbImportFile = (file) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      toast('Please select a .csv file', 'error');
      return;
    }
    if (file.size > 500 * 1024) {
      toast('CSV too large — keep it under ~500KB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '');
      if (!text.trim()) { toast('The file is empty', 'error'); return; }
      setDbImportText(text);
      setDbImportFileName(file.name);
      setDbImportResult(null);
    };
    reader.onerror = () => toast('Could not read the file', 'error');
    reader.readAsText(file);
  };

  const handleDbRefresh = () => {
    setDbBrowseSkip(0);
    databaseApi.summary()
      .then(res => { setDbTables(res.tables); setDbTotalTables(res.totalTables ?? res.tables.length); setDbTotalRecords(res.totalRecords ?? 0); })
      .catch(() => { setDbError('Could not load database info'); });
    if (dbSelectedTable) {
      databaseApi.tableSchema(dbSelectedTable.name)
        .then(res => setDbTableSchema(res))
        .catch(() => setDbTableSchema(null));
      databaseApi.browse(dbSelectedTable.name, { skip: 0, take: dbBrowseTake })
        .then(res => { setDbRecords(res.data); setDbRecordCount(res.count); })
        .catch(() => { setDbRecords([]); setDbRecordCount(0); });
    }
  };

  const handleRunMigrations = async () => {
    setMigrationRunning(true);
    setConfirmRunMigrations(false);
    try {
      const res = await databaseApi.runMigrations();
      toast(res.message || 'Migrations applied', res.inSync === false ? 'error' : 'success');
      // The deploy response returns the authoritative post-run state, so use it
      // directly instead of issuing a second round-trip.
      if (res.state) setDbOps(prev => ({ ...prev, migrations: res.state }));
      else databaseApi.migrations().then(mig => setDbOps(prev => ({ ...prev, migrations: mig }))).catch(() => {});
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Migration failed', 'error');
    } finally {
      setMigrationRunning(false);
    }
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

  const handleMaintenance = async (action, payload = {}) => {
    const loadingKey = action === 'vacuum' ? (payload.analyze ? 'vacuumAnalyze' : 'vacuumRun') : action;
    setDbMaintenanceLoading(prev => ({ ...prev, [loadingKey]: true }));
    setDbMaintenanceResult(null);
    try {
      let result;
      switch (action) {
        case 'vacuum':
          result = await databaseApi.vacuum(payload.table, payload.analyze, payload.verbose);
          break;
        case 'analyze':
          result = await databaseApi.analyze(payload.table);
          break;
        case 'reindex':
          result = await databaseApi.reindex(payload.table, payload.concurrently);
          break;
        default:
          break;
      }
      toast(`${action} completed successfully`, 'success');
      setDbMaintenanceResult({ action, success: true, result });
      handleDbRefresh();
    } catch (e) {
      toast(`${action} failed: ${e?.response?.data?.error?.message || e.message}`, 'error');
      setDbMaintenanceResult({ action, success: false, error: e?.response?.data?.error?.message || e.message });
    } finally {
      setDbMaintenanceLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  return (
    <Layout maxWidth="max-w-7xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <SettingsIcon size={24} className="text-accent" /> Settings
          </h1>
          <p className="text-sm text-muted mt-1">Configure application preferences, account, and developer tools</p>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-line bg-bg/50">
            <div className="flex gap-1 px-2 py-2 overflow-x-auto">
              {visibleTabs.map(t => {
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
                    <p className="text-sm font-medium text-ink flex items-center gap-2"><LayoutGrid size={16}/> Sidebar style</p>
                    <p className="text-xs text-muted">Pick the navigation layout — switches instantly</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SIDEBAR_STYLES.map(id => {
                        const meta = SIDEBAR_STYLE_META[id];
                        const isCurrent = sidebarStyle === id;
                        return (
                          <button
                            key={id}
                            onClick={() => { if (!isCurrent) { setSidebarStyle(id); save(`Sidebar style: ${meta.label}`); } }}
                            className={`text-left rounded-lg border px-3 py-2.5 transition ${isCurrent ? 'border-accent bg-accent/10' : 'border-line hover:bg-bg/60'}`}
                            aria-pressed={isCurrent}
                          >
                            <div className={`text-sm font-medium ${isCurrent ? 'text-accent' : 'text-ink'}`}>{meta.label}</div>
                            <div className="text-[11px] text-muted">{meta.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-ink flex items-center gap-2"><LayoutGrid size={16}/> UI density</p>
                      <span className="mono-label text-xs">{uiScale}%</span>
                    </div>
                    <p className="text-xs text-muted">Scale spacing & components</p>
                    <input type="range" min="80" max="120" value={uiScale} onChange={e => setUiScale(Number(e.target.value))} onPointerUp={commitUiScale} onKeyUp={commitUiScale} onBlur={commitUiScale} className="w-full accent-accent" />
                    <div className="flex justify-between text-[10px] mono-label text-muted"><span>Comfortable</span><span>Compact</span></div>
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
                            {active ? 'âœ“' : ''}
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
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                      <Database size={20} className="text-accent" />
                      Database
                    </h2>
                    <p className="text-sm text-muted mt-0.5">Inspect, back up, and maintain the database</p>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm gap-2" onClick={handleDbRefresh}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="text-accent" size={16} />
                      <span className="mono-label text-[10px] uppercase text-muted">Latency</span>
                    </div>
                    <p className="font-display text-lg font-bold text-ink">
                      {dbOpsLoading ? '…' : dbOps?.health ? `${dbOps.health.latencyMs}ms` : '—'}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {dbOps?.health?.uptime ? `Uptime ${dbOps.health.uptime}` : 'Postgres latency'}
                    </p>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="text-accent" size={16} />
                      <span className="mono-label text-[10px] uppercase text-muted">Size</span>
                    </div>
                    <p className="font-display text-lg font-bold text-ink">
                      {dbOpsLoading ? '…' : dbOps?.health?.sizeBytes != null ? `${(dbOps.health.sizeBytes / 1048576).toFixed(1)} MB` : '—'}
                    </p>
                    <p className="text-xs text-muted mt-1 truncate" title={dbOps?.health?.version ?? ''}>
                      {dbOps?.health?.version ? dbOps.health.version.split(' ').slice(0, 2).join(' ') : 'PostgreSQL'}
                    </p>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Table className="text-accent" size={16} />
                      <span className="mono-label text-[10px] uppercase text-muted">Tables</span>
                    </div>
                    <p className="font-display text-lg font-bold text-ink">{dbTotalTables}</p>
                    <p className="text-xs text-muted mt-1">{Number(dbTotalRecords).toLocaleString()} records</p>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="text-accent" size={16} />
                      <span className="mono-label text-[10px] uppercase text-muted">Migrations</span>
                    </div>
                    <p className={`font-display text-lg font-bold ${dbOps?.migrations ? (dbOps.migrations.inSync ? 'text-success' : 'text-error') : 'text-ink'}`}>
                      {dbOpsLoading ? '…' : dbOps?.migrations ? (dbOps.migrations.inSync ? 'In sync' : `${dbOps.migrations.pendingCount} pending`) : '—'}
                    </p>
                    <p className="text-xs text-muted mt-1">{dbOps?.migrations ? `${dbOps.migrations.appliedCount} applied` : 'Prisma migrations'}</p>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="text-accent" size={16} />
                      <span className="mono-label text-[10px] uppercase text-muted">Connections</span>
                    </div>
                    <p className="font-display text-lg font-bold text-ink">
                      {dbOpsLoading ? '…' : dbOps?.connections ? dbOps.connections.total : '—'}
                    </p>
                    <p className="text-xs text-muted mt-1 truncate">
                      {dbOps?.connections?.oldestConnection ? `Oldest ${new Date(dbOps.connections.oldestConnection).toLocaleTimeString()}` : 'pg_stat_activity'}
                    </p>
                  </div>
                </div>

                {dbOps?.migrations && dbOps.migrations.pending.length > 0 && (
                  <div className="card p-4 border-error/30 bg-error/5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-error" />
                      <p className="font-display font-semibold text-ink">Pending migrations</p>
                    </div>
                    <p className="text-sm text-muted mb-3">
                      {dbOps.migrations.pending.length} migration{dbOps.migrations.pending.length !== 1 ? 's are' : ' is'} ready to apply.
                    </p>
                    <div className="space-y-1 mb-4">
                      {dbOps.migrations.pending.map(name => (
                        <div key={name} className="font-mono text-xs text-ink bg-bg px-2 py-1 rounded border border-line">
                          {name}
                        </div>
                      ))}
                    </div>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        className="btn btn-warning btn-sm gap-2"
                        disabled={migrationRunning}
                        onClick={() => setConfirmRunMigrations(true)}
                      >
                        {migrationRunning ? 'Applying…' : 'Apply Migrations'}
                      </button>
                    )}
                  </div>
                )}

                <div className="card p-6">
                  <h3 className="font-display font-semibold text-ink mb-4">Quick Actions</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {isSuperAdmin && (
                      <>
                        <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={async () => { try { await databaseApi.backup(); toast('JSON backup downloaded', 'success'); } catch (e) { toast(e?.response?.data?.error?.message || 'Backup failed', 'error'); } }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-success/10 text-success grid place-items-center">
                              <Download size={18} />
                            </div>
                            <div>
                              <p className="font-display font-semibold text-ink text-sm">JSON Backup</p>
                              <p className="text-[11px] text-muted">Platform snapshot</p>
                            </div>
                          </div>
                        </button>
                        <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={async () => { try { await databaseApi.dump(false); toast('SQL dump started', 'success'); } catch (e) { toast(e?.response?.data?.error?.message || 'Dump unavailable', 'error'); } }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent grid place-items-center">
                              <Download size={18} />
                            </div>
                            <div>
                              <p className="font-display font-semibold text-ink text-sm">SQL Dump</p>
                              <p className="text-[11px] text-muted">Full schema + data</p>
                            </div>
                          </div>
                        </button>
                      </>
                    )}
                    {isAdmin && !isSuperAdmin && (
                      <>
                        <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={async () => { try { await databaseApi.tenantBackup(); toast('Tenant JSON backup downloaded', 'success'); } catch (e) { toast(e?.response?.data?.error?.message || 'Backup failed', 'error'); } }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-success/10 text-success grid place-items-center">
                              <Download size={18} />
                            </div>
                            <div>
                              <p className="font-display font-semibold text-ink text-sm">JSON Backup</p>
                              <p className="text-[11px] text-muted">This tenant's snapshot</p>
                            </div>
                          </div>
                        </button>
                        <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={async () => { try { await databaseApi.tenantDump(); toast('Tenant SQL dump downloaded', 'success'); } catch (e) { toast(e?.response?.data?.error?.message || 'Tenant dump failed', 'error'); } }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent grid place-items-center">
                              <Download size={18} />
                            </div>
                            <div>
                              <p className="font-display font-semibold text-ink text-sm">SQL Dump</p>
                              <p className="text-[11px] text-muted">This tenant's data</p>
                            </div>
                          </div>
                        </button>
                      </>
                    )}
                    <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={handleDbRefresh}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent grid place-items-center">
                          <RefreshCw size={18} />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-ink text-sm">Refresh</p>
                          <p className="text-[11px] text-muted">Reload all data</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="card p-6">
                    <h3 className="font-display font-semibold text-ink mb-4">Maintenance</h3>
                    <p className="text-xs text-muted mb-4">Run database maintenance operations. These are safe for production when using CONCURRENTLY.</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="p-4 border border-line rounded-xl bg-bg/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent grid place-items-center">
                            <RefreshCw size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">VACUUM</p>
                            <p className="text-[11px] text-muted">Reclaim storage</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="btn btn-outline btn-sm flex-1" disabled={dbMaintenanceLoading.vacuumRun} onClick={() => handleMaintenance('vacuum', { table: '', analyze: false, verbose: false })}>
                            {dbMaintenanceLoading.vacuumRun ? 'Running…' : 'Run'}
                          </button>
                          <button type="button" className="btn btn-outline btn-sm flex-1" disabled={dbMaintenanceLoading.vacuumAnalyze} onClick={() => handleMaintenance('vacuum', { table: '', analyze: true, verbose: false })}>
                            {dbMaintenanceLoading.vacuumAnalyze ? 'Running…' : 'Analyze'}
                          </button>
                        </div>
                      </div>
                      <div className="p-4 border border-line rounded-xl bg-bg/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-success/10 text-success grid place-items-center">
                            <Activity size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">ANALYZE</p>
                            <p className="text-[11px] text-muted">Update statistics</p>
                          </div>
                        </div>
                        <button type="button" className="btn btn-outline btn-sm w-full" disabled={dbMaintenanceLoading.analyze} onClick={() => handleMaintenance('analyze', { table: '' })}>
                          {dbMaintenanceLoading.analyze ? 'Running…' : 'Run'}
                        </button>
                      </div>
                      <div className="p-4 border border-line rounded-xl bg-bg/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-warning/10 text-warning grid place-items-center">
                            <Zap size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">REINDEX</p>
                            <p className="text-[11px] text-muted">Rebuild indexes</p>
                          </div>
                        </div>
                        <button type="button" className="btn btn-outline btn-sm w-full" disabled={dbMaintenanceLoading.reindex} onClick={() => handleMaintenance('reindex', { table: '', concurrently: true })}>
                          {dbMaintenanceLoading.reindex ? 'Running…' : 'Run Concurrently'}
                        </button>
                      </div>
                    </div>
                    {dbMaintenanceResult && (
                      <div className={`mt-4 p-3 rounded-lg border ${dbMaintenanceResult.success ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5'}`}>
                        <p className="text-sm text-ink">
                          {dbMaintenanceResult.success ? 'Maintenance completed' : 'Maintenance failed'}
                          {dbMaintenanceResult.result?.sql && <span className="font-mono text-xs text-muted ml-2">{dbMaintenanceResult.result.sql}</span>}
                        </p>
                        {dbMaintenanceResult.error && <p className="text-xs text-error mt-1">{dbMaintenanceResult.error}</p>}
                      </div>
                    )}
                  </div>
                )}
                {!isSuperAdmin && (
                  <div className="card p-6">
                    <h3 className="font-display font-semibold text-ink mb-2">Maintenance</h3>
                    <p className="text-xs text-muted">Database maintenance operations are restricted to SUPER_ADMIN users.</p>
                  </div>
                )}

                {isSuperAdmin && (
                  <div className="card p-6">
                    <h3 className="font-display font-semibold text-ink mb-4">Backup & Restore</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={async () => { try { await databaseApi.backup(); toast('JSON backup downloaded', 'success'); } catch (e) { toast(e?.response?.data?.error?.message || 'Backup failed', 'error'); } }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-success/10 text-success grid place-items-center">
                            <Download size={18} />
                          </div>
                          <div>
                            <p className="font-display font-semibold text-ink text-sm">JSON Backup</p>
                            <p className="text-[11px] text-muted">Platform snapshot</p>
                          </div>
                        </div>
                      </button>
                      <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={async () => { try { await databaseApi.dump(false); toast('SQL dump started', 'success'); } catch (e) { toast(e?.response?.data?.error?.message || 'Dump unavailable', 'error'); } }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent grid place-items-center">
                            <Download size={18} />
                          </div>
                          <div>
                            <p className="font-display font-semibold text-ink text-sm">SQL Dump</p>
                            <p className="text-[11px] text-muted">Full schema + data</p>
                          </div>
                        </div>
                      </button>
                      <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={async () => { try { await databaseApi.dump(true); toast('Data-only dump started', 'success'); } catch (e) { toast(e?.response?.data?.error?.message || 'Dump unavailable', 'error'); } }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-warning/10 text-warning grid place-items-center">
                            <Upload size={18} />
                          </div>
                          <div>
                            <p className="font-display font-semibold text-ink text-sm">Data Only</p>
                            <p className="text-[11px] text-muted">Exclude schema</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <p className="text-xs text-muted mt-3">SQL dumps are restorable via pg_dump. JSON backups are portable and have sensitive fields stripped.</p>
                  </div>
                )}
                {isAdmin && !isSuperAdmin && (
                  <div className="card p-6">
                    <h3 className="font-display font-semibold text-ink mb-4">Backup & Restore</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={async () => { try { await databaseApi.tenantBackup(); toast('Tenant JSON backup downloaded', 'success'); } catch (e) { toast(e?.response?.data?.error?.message || 'Backup failed', 'error'); } }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-success/10 text-success grid place-items-center">
                            <Download size={18} />
                          </div>
                          <div>
                            <p className="font-display font-semibold text-ink text-sm">JSON Backup</p>
                            <p className="text-[11px] text-muted">Tenant snapshot</p>
                          </div>
                        </div>
                      </button>
                      <button type="button" className="card p-4 hover:border-accent/40 transition-colors text-left" onClick={async () => { try { await databaseApi.tenantDump(); toast('Tenant SQL dump downloaded', 'success'); } catch (e) { toast(e?.response?.data?.error?.message || 'Tenant dump failed', 'error'); } }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent grid place-items-center">
                            <Download size={18} />
                          </div>
                          <div>
                            <p className="font-display font-semibold text-ink text-sm">SQL Dump</p>
                            <p className="text-[11px] text-muted">Tenant data only</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <p className="text-xs text-muted mt-3">JSON backups are portable with sensitive fields stripped. SQL dumps are portable INSERT statements.</p>
                  </div>
                )}

                {isSuperAdmin && (
                <div className="card p-6">
                  <h3 className="font-display font-semibold text-ink mb-4">Query Console</h3>
                  <p className="text-xs text-muted mb-3">Read-only SQL console. Single SELECT/WITH statements only, capped at 200 rows.</p>
                  <div className="space-y-3">
                    <textarea value={dbSql} onChange={e => setDbSql(e.target.value)} rows={3} spellCheck={false} className="input font-mono text-xs w-full" aria-label="SQL query" placeholder="SELECT * FROM &quot;User&quot; LIMIT 10" />
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-primary btn-sm gap-2" disabled={dbSqlBusy} onClick={async () => { setDbSqlBusy(true); try { setDbSqlResult(await databaseApi.query(dbSql, false)); } catch (e) { toast(e?.response?.data?.error?.message || 'Query failed', 'error'); setDbSqlResult(null); } setDbSqlBusy(false); }}>
                        {dbSqlBusy ? 'Running…' : 'Run'}
                      </button>
                      <button type="button" className="btn btn-outline btn-sm gap-2" disabled={dbSqlBusy} onClick={async () => { setDbSqlBusy(true); try { setDbSqlResult(await databaseApi.query(dbSql, true)); } catch (e) { toast(e?.response?.data?.error?.message || 'Explain failed', 'error'); } setDbSqlBusy(false); }}>
                        Explain
                      </button>
                    </div>
                    {dbSqlResult?.explain && (
                      <pre className="text-[11px] font-mono overflow-auto max-h-48 bg-bg/60 border border-line rounded-lg p-3">
                        {JSON.stringify(dbSqlResult.explain, null, 2)}
                      </pre>
                    )}
                    {dbSqlResult?.rows && (
                      <div className="overflow-auto max-h-80 border border-line rounded-lg">
                        <table className="data-table">
                          <thead>
                            <tr>{Object.keys(dbSqlResult.rows[0] || {}).map(c => <th key={c}>{c}</th>)}</tr>
                          </thead>
                          <tbody>
                            {dbSqlResult.rows.map((r, i) => (
                              <tr key={i}>
                                {Object.values(r).map((v, j) => (
                                  <td key={j} className="font-mono text-xs">{v == null ? '—' : String(v).slice(0, 120)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="mono-label p-2 text-xs border-t border-line">
                          {dbSqlResult.count} rows · {dbSqlResult.ms}ms · capped
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                )}

                {isSuperAdmin && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="p-4 border border-line rounded-xl bg-bg/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-ink">Retention</p>
                      <label className="flex items-center gap-2 text-xs text-muted">Older than <input type="number" min={1} max={3650} value={dbRetentionDays} onChange={e => setDbRetentionDays(Number(e.target.value))} className="input w-20" /> days
                        <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { try { setDbRetention(await databaseApi.retention(dbRetentionDays)); } catch { toast('Retention check failed', 'error'); } }}>Preview</button>
                      </label>
                    </div>
                    {dbRetention ? (
                      <ul className="text-xs space-y-1.5">
                        <li className="flex items-center justify-between gap-2"><span className="text-muted">Login events · {dbRetention.candidates.loginEvents}</span><button type="button" className="btn btn-ghost btn-sm text-xs" disabled={!dbRetention.candidates.loginEvents} onClick={() => setDbPurgeTarget('loginEvents')}>Purge</button></li>
                        <li className="flex items-center justify-between gap-2"><span className="text-muted">Revoked sessions · {dbRetention.candidates.revokedSessions}</span><button type="button" className="btn btn-ghost btn-sm text-xs" disabled={!dbRetention.candidates.revokedSessions} onClick={() => setDbPurgeTarget('revokedSessions')}>Purge</button></li>
                        <li className="flex items-center justify-between gap-2"><span className="text-muted">Audit logs · {dbRetention.candidates.auditLogs === -1 ? 'n/a' : dbRetention.candidates.auditLogs} <span className="mono-label">(preview only)</span></span></li>
                        <li className="flex items-center justify-between gap-2"><span className="text-muted">Soft-deleted employees · {dbRetention.candidates.softDeletedEmployees} <span className="mono-label">(restore via Employees)</span></span></li>
                      </ul>
                    ) : <p className="text-xs text-muted">{dbOpsLoading ? 'Checking…' : 'No preview yet.'}</p>}
                  </div>

                  <div className="p-4 border border-line rounded-xl bg-bg/50 space-y-2">
                    <p className="text-sm font-medium text-ink">CSV import {dbSelectedTable && <span className="text-muted font-normal">→ {dbSelectedTable.label}</span>}</p>
                    {!dbSelectedTable
                      ? <p className="text-xs text-muted">Select a table below first.</p>
                      : dbSelectedTable.readOnly
                        ? <p className="text-xs text-muted">Table is read-only.</p>
                        : <>
                            <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center space-y-1.5 transition-colors"
                                 onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-ink/40'); }}
                                 onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('border-ink/40'); }}
                                 onDrop={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-ink/40'); handleDbImportFile(e.dataTransfer.files?.[0]); }}>
                              <p className="text-xs text-muted">Drop a <span className="font-mono">.csv</span> file here</p>
                              <label className="btn btn-ghost btn-sm cursor-pointer inline-flex">
                                choose file
                                <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { handleDbImportFile(e.target.files?.[0]); e.target.value = ''; }} />
                              </label>
                              {dbImportFileName && (
                                <p className="mono-label text-xs text-ink truncate max-w-full px-2">{dbImportFileName}</p>
                              )}
                            </div>
                            <textarea value={dbImportText} onChange={e => { setDbImportText(e.target.value); setDbImportResult(null); }} rows={3} spellCheck={false} placeholder="…or paste CSV here (header1,header2 &#10;val1,val2)" className="input font-mono text-xs w-full" aria-label="CSV text" />
                            <div className="flex gap-2">
                              <button type="button" className="btn btn-ghost btn-sm" disabled={dbImportBusy || !dbImportText.trim()} onClick={async () => { setDbImportBusy(true); try { setDbImportResult(await databaseApi.importCsv(dbSelectedTable.name, dbImportText, true)); } catch (e) { toast(e?.response?.data?.error?.message || 'Validation failed', 'error'); } setDbImportBusy(false); }}>Dry-run</button>
                              <button type="button" className="btn btn-primary btn-sm" disabled={dbImportBusy || !dbImportResult?.dryRun} onClick={async () => { setDbImportBusy(true); try { const r = await databaseApi.importCsv(dbSelectedTable.name, dbImportText, false); setDbImportResult(r); toast(`Inserted ${r.inserted}`, 'success'); handleDbRefresh(); } catch (e) { toast(e?.response?.data?.error?.message || 'Import failed', 'error'); } setDbImportBusy(false); }}>Commit</button>
                            </div>
                            {dbImportResult && (
                              <div className="text-xs">
                                {dbImportResult.dryRun
                                  ? <p className="text-muted">{dbImportResult.rowCount} rows · columns: <span className="font-mono">{dbImportResult.columns.join(', ')}</span> · preview {dbImportResult.preview.length} shown</p>
                                  : <p className="text-muted">Inserted {dbImportResult.inserted} · failed {dbImportResult.failed}{dbImportResult.skipped > 0 && ` · skipped ${dbImportResult.skipped}`}{dbImportResult.errors?.length > 0 && ` · row ${dbImportResult.errors[0].row}: ${dbImportResult.errors[0].message}`}</p>}
                              </div>
                            )}
                          </>}
                  </div>
                </div>
                )}
                {isSuperAdmin && (
                <div className="p-4 border border-line rounded-xl bg-bg/50">
                  <p className="text-sm font-medium text-ink mb-2">Slow queries {dbSlow && !dbSlow.available && <span className="mono-label font-normal">· {dbSlow.hint}</span>}</p>
                  {dbSlow?.available ? (
                    <div className="overflow-auto max-h-56">
                      <table className="data-table">
                        <thead><tr><th>Query</th><th className="text-right">Calls</th><th className="text-right">Total ms</th><th className="text-right">Mean ms</th><th className="text-right">%</th></tr></thead>
                        <tbody>{dbSlow.queries.map((q, i) => <tr key={i}><td className="font-mono text-xs max-w-md truncate" title={q.query}>{q.query}</td><td className="font-mono text-xs text-right">{q.calls}</td><td className="font-mono text-xs text-right">{q.totalMs}</td><td className="font-mono text-xs text-right">{q.meanMs}</td><td className="font-mono text-xs text-right">{q.pct}</td></tr>)}</tbody>
                      </table>
                    </div>
                  ) : <p className="text-xs text-muted">{dbOpsLoading ? 'Checking…' : 'pg_stat_statements not enabled — run CREATE EXTENSION pg_stat_statements; in Postgres.'}</p>}
                </div>
                )}

                {isSuperAdmin && dbOps?.migrations?.history?.length > 0 && (
                  <details className="p-4 border border-line rounded-xl bg-bg/50">
                    <summary className="text-sm font-medium text-ink cursor-pointer">
                      Migration history · {dbOps.migrations.appliedCount} applied
                      {dbOps.migrations.lastApplied && <span className="text-muted font-normal"> · last {new Date(dbOps.migrations.lastApplied).toLocaleString()}</span>}
                    </summary>
                    <ul className="mt-2 space-y-1 max-h-48 overflow-auto">
                      {[...dbOps.migrations.history].reverse().map(h => (
                        <li key={h.name} className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono text-muted truncate">{h.name}</span>
                          <span className="font-mono text-muted shrink-0">{h.finishedAt ? new Date(h.finishedAt).toLocaleDateString() : 'pending'}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="card p-6">
                  <h3 className="font-display font-semibold text-ink mb-4">Browse Tables</h3>
                  <div className="mb-4">
                    <input
                      value={dbSearch}
                      onChange={e => setDbSearch(e.target.value)}
                      placeholder="Search tables…"
                      aria-label="Filter tables"
                      className="input w-full max-w-xs"
                    />
                  </div>
                  {dbError && <p className="text-error text-sm mb-3">{dbError}</p>}
                  {dbLoading ? (
                    <p className="text-sm text-muted">Loading tables…</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {dbTables
                        .filter(t => !dbSearch.trim() || t.label.toLowerCase().includes(dbSearch.trim().toLowerCase()) || t.name.toLowerCase().includes(dbSearch.trim().toLowerCase()))
                        .map(t => (
                          <button
                            key={t.name}
                            onClick={() => handleDbTableSelect(t)}
                            className={`card p-4 text-left border cursor-pointer transition ${dbSelectedTable?.name === t.name ? 'border-accent bg-accent/5' : 'border-line hover:bg-bg/60'}`}
                          >
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <p className="font-medium text-ink truncate">{t.label}</p>
                              <span className="flex items-center gap-1.5 shrink-0">
                                {t.readOnly && <span className="badge mono-label">read-only</span>}
                                <span className="badge mono-label">{t.count !== undefined ? (t.count === -1 ? '—' : t.count) : (t.rowCount === -1 ? '—' : t.rowCount)}</span>
                              </span>
                            </div>
                            <p className="text-xs text-muted">{t.description}</p>
                            <p className="mono-label text-[10px] mt-1">{t.name}</p>
                          </button>
                        ))}
                      {dbTables.length === 0 && (
                        <p className="text-sm text-muted col-span-full">No tables found.</p>
                      )}
                    </div>
                  )}
                </div>

                {dbSelectedTable && dbTableSchema && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-semibold text-ink flex items-center gap-2">
                        <Table size={16} /> {dbSelectedTable.label}
                      </h3>
                       <div className="flex items-center gap-3">
                         <span className="text-xs text-muted">{dbRecordCount} total records</span>
                         {isSuperAdmin && dbSelectedTable && !dbSelectedTable.readOnly && (
                           <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={() => setShowDbCreateModal(true)} disabled={!dbTableSchema}><Plus size={14}/> Add Record</button>
                         )}
                         {dbSelectedTable && !dbSelectedTable.readOnly && (
                           <>
                             <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={() => handleDbExport("csv")}><Download size={14}/> CSV</button>
                             <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={() => handleDbExport("json")}><Download size={14}/> JSON</button>
                           </>
                         )}
                         {dbRecords.length > 3 && (
                           <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDbShowAllRows(!dbShowAllRows)}>
                             {dbShowAllRows ? 'Collapse' : `Show all (${dbRecordCount})`}
                           </button>
                         )}
                         <button type="button" className="btn btn-ghost btn-sm" onClick={handleDbPrev} disabled={dbBrowseSkip === 0}>
                           <ChevronLeft size={16} />
                         </button>
                         <button type="button" className="btn btn-ghost btn-sm" onClick={handleDbNext} disabled={dbBrowseSkip + dbBrowseTake >= dbRecordCount}>
                           <ChevronRight size={16} />
                         </button>
                       </div>
                    </div>

                    <div className="overflow-x-auto border border-line rounded-lg">
                      <table className="data-table w-full">
                        <thead>
                          <tr>
                            {dbTableSchema.map(col => <th key={col.column_name}>{col.column_name}</th>)}
                            <th className="text-center">{dbSelectedTable.readOnly ? 'View' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dbShowAllRows ? dbRecords : dbRecords.slice(0, 3)).map(rec => (
                            <tr key={rec.id}>
                              {dbTableSchema.map(col => (
                                <td key={col.column_name} className="font-mono text-xs">
                                  {rec[col.column_name] !== null && rec[col.column_name] !== undefined
                                    ? String(rec[col.column_name])
                                    : '—'}
                                </td>
                              ))}
                              <td className="text-center">
                                {dbSelectedTable.readOnly ? (
                                  <span className="mono-label text-[10px]">locked</span>
                                ) : isSuperAdmin ? (
                                  <span className="inline-flex gap-1">
                                    <button type="button" className="btn btn-ghost btn-sm text-xs" onClick={() => { setDbEditingRecord(rec); setDbCreateForm({ ...rec }); setShowDbEditModal(true); }}>
                                      <Pencil size={14} /> Edit
                                    </button>
                                    <button type="button" className="btn btn-ghost btn-sm text-xs text-error" onClick={async () => {
                                      try {
                                        const deps = await databaseApi.dependents(dbSelectedTable.name, rec.id);
                                        setDbDeps({ table: dbSelectedTable, record: rec, ...deps });
                                      } catch { setShowDeleteConfirm({ table: dbSelectedTable, record: rec }); }
                                      setDbImportResult(null);
                                    }}>
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  </span>
                                ) : (
                                  <span className="mono-label text-[10px]">read-only</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {dbRecords.length === 0 && (
                            <tr>
                              <td colSpan={dbTableSchema.length + 1} className="text-muted text-sm py-8 text-center">No records found in this table.</td>
                            </tr>
                          )}
                          {!dbShowAllRows && dbRecords.length > 3 && (
                            <tr>
                              <td colSpan={dbTableSchema.length + 1} className="text-center py-2">
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDbShowAllRows(true)}>
                                  Show all {dbRecordCount} rows
                                </button>
                              </td>
                            </tr>
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
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { key: 'inapp', label: 'In-app', desc: 'Toast notifications in browser', value: notificationsEnabled, setter: setNotificationsEnabled },
                    { key: 'email', label: 'Email', desc: 'Send email alerts for approvals', value: emailNotifications, setter: setEmailNotifications },
                    { key: 'push', label: 'Push', desc: 'Browser push notifications', value: pushNotifications, setter: setPushNotifications },
                    { key: 'sms', label: 'SMS', desc: 'SMS alerts for critical payroll events', value: smsNotifications, setter: setSmsNotifications },
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between p-4 border border-line rounded-xl bg-bg/50 cursor-pointer hover:bg-bg/70 transition">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{item.label}</p>
                        <p className="text-xs text-muted truncate">{item.desc}</p>
                      </div>
                      <input type="checkbox" checked={item.value} onChange={e => { item.setter(e.target.checked); save('Notification preference saved'); }} className="w-4 h-4 accent-accent shrink-0" />
                    </label>
                  ))}
                </div>
                <div className="p-4 border border-line rounded-xl bg-bg/50 space-y-3">
                  <p className="text-sm font-medium text-ink flex items-center gap-2"><Bell size={16}/> Toast style</p>
                  <p className="text-xs text-muted">How in-app toast notifications look — switches instantly</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TOAST_STYLES.map(id => {
                      const meta = TOAST_STYLE_META[id];
                      const isCurrent = toastStyle === id;
                      return (
                        <button
                          key={id}
                          onClick={() => { if (!isCurrent) { setToastStyle(id); save(`Toast style: ${meta.label}`); } }}
                          className={`text-left rounded-lg border px-3 py-2.5 transition ${isCurrent ? 'border-accent bg-accent/10' : 'border-line hover:bg-bg/60'}`}
                          aria-pressed={isCurrent}
                        >
                          <div className={`text-sm font-medium ${isCurrent ? 'text-accent' : 'text-ink'}`}>{meta.label}</div>
                          <div className="text-[11px] text-muted">{meta.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                 <div className="p-4 border border-line rounded-xl bg-bg/50 space-y-2">
                   <p className="text-sm font-medium text-ink">Quiet hours</p>
                   <p className="text-xs text-muted">Do not send non-critical notifications during this window</p>
                   <input type="text" value={quietHours} onChange={e => { setQuietHours(e.target.value); save('Quiet hours updated'); }} className="input w-full max-w-xs mt-2 h-10" placeholder="22:00-07:00" />
                 </div>
                <div className="p-4 border border-line rounded-xl bg-bg/30 text-xs text-muted">
                  Note: Email/SMS require backend integration. Settings are persisted locally until wired to the API and audit log.
                </div>
              </section>
            )}

            {active === 'integrations' && (
              <Integrations />
            )}


            {active === 'account' && (
              <section className="card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-ink flex items-center gap-2"><User size={18} className="text-accent"/> Account</h2>
                  <button className="btn btn-ghost text-sm gap-2" onClick={() => { setEditDisplayName(profile?.user?.displayName || ''); setEditEmail(profile?.user?.email || ''); setEditContact(profile?.user?.contactNumber || ''); setEditEmergency(profile?.user?.emergencyContact || ''); setShowProfileEdit(true); }}><Pencil size={14} /> Edit profile</button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 p-5 border border-line rounded-xl bg-bg/50 space-y-4">
                    {(() => {
                      const u = profile?.user;
                      const initials = (u?.username || 'AB').slice(0,2).toUpperCase();
                      const displayName = u?.username || '—';
                      const email = u?.username?.includes('@') ? u.username : `${u?.username || 'admin'}@lgu.gov.ph`;
                      const role = u?.role || 'ADMIN';
                      const dept = u?.department?.name || 'HR Admin';
                       const completeness = profile?.completeness ?? 0;
                      return (
                        <>
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-accent/20 to-accent/5 text-accent grid place-items-center font-display font-bold ring-1 ring-accent/10">{initials}</div>
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-ink truncate">{displayName}</p>
                              <p className="text-xs text-muted truncate">{email}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="badge badge-accent">{role}</span>
                                <span className="mono-label text-[10px]">Dept: {dept}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs"><span className="text-muted">Profile completeness</span><span className="mono-label font-medium">{completeness}%</span></div>
                            <div className="h-2 rounded-full bg-line overflow-hidden">
                              <div className="h-full bg-accent transition-all" style={{width:`${completeness}%`}}></div>
                            </div>
                             <p className="text-[11px] text-muted">Complete your display name, email, contact number, emergency contact, and avatar to reach 100%</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <p className="text-sm font-medium text-ink flex items-center gap-2"><ShieldCheck size={16} className="text-accent"/> Role & Scope</p>
                    <p className="text-xs text-muted">Effective permissions derived from JWT</p>
                    <ul className="text-xs text-muted space-y-1.5">
                      <li className="flex justify-between"><span>Role</span><span className="mono-label text-ink">{profile?.user?.role || '—'}</span></li>
                      <li className="flex justify-between"><span>Department</span><span className="mono-label text-ink truncate ml-2">{profile?.user?.department?.name || '—'}</span></li>
                      <li className="flex justify-between"><span>2FA</span><span className={`mono-label ${profile?.user?.twoFactorEnabled ? 'text-success' : 'text-muted'}`}>{profile?.user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span></li>
                    </ul>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-4">
                    <p className="text-sm font-medium text-ink flex items-center gap-2"><ShieldCheck size={16} className="text-accent"/> Security</p>
                    {(() => {
                      const changed = profile?.user?.passwordChangedAt ? new Date(profile.user.passwordChangedAt) : null;
                      const ageDays = changed ? Math.floor((Date.now() - changed.getTime()) / 86400000) : null;
                      const left = ageDays == null ? null : 30 - ageDays;
                      const expired = left != null && left < 0;
                      const urgent = left != null && left >= 0 && left <= 5;
                      return (
                        <div className={`flex items-start justify-between gap-3 p-3 rounded-lg border text-sm ${expired ? 'border-error/40 bg-error/5' : urgent ? 'border-accent/40 bg-accent/5' : 'border-line bg-bg/60'}`}>
                          <div className="flex items-start gap-2 min-w-0">
                            {expired ? <AlertTriangle size={15} className="text-error shrink-0 mt-0.5"/> : <Clock size={15} className="text-muted shrink-0 mt-0.5"/>}
                            <div className="min-w-0">
                              <p className="text-ink font-medium truncate">{expired ? 'Password expired — change required' : left == null ? 'Password age unknown' : left === 0 ? 'Password expires today' : `${left} day${left === 1 ? '' : 's'} left`}</p>
                              <p className="text-xs text-muted">Policy: rotate every 30 days · last changed {changed ? changed.toLocaleDateString() : 'never'}</p>
                            </div>
                          </div>
                          <button className="btn btn-ghost text-sm gap-2 shrink-0" onClick={() => setShowPasswordModal(true)}><Key size={14} /> Change</button>
                        </div>
                      );
                    })()}
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-bg/40">
                        <div className="min-w-0">
                          <p className="text-ink font-medium flex items-center gap-1.5"><Hash size={14} className="text-muted"/> Sign-in PIN</p>
                          <p className="text-xs text-muted truncate">{profile?.user?.pinEnabled ? '4–6 digit PIN enabled for quick sign-in' : 'Faster sign-in on trusted workstations'}</p>
                        </div>
                        {profile?.user?.pinEnabled
                          ? <button className="btn btn-ghost text-xs gap-1.5 text-error" onClick={async () => { try { await removePin(); toast('PIN removed', 'success'); accountApi.getProfile().then(r => setProfile(r.data)).catch(()=>{}); } catch { toast('Could not remove PIN', 'error'); } }}>Remove</button>
                          : <button className="btn btn-ghost text-xs gap-1.5" onClick={() => { setPinNew(''); setPinConfirm(''); setShowPinModal(true); }}>Set PIN</button>}
                      </div>
                      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-bg/40">
                        <div className="min-w-0">
                          <p className="text-ink font-medium flex items-center gap-1.5"><Key size={14} className="text-muted"/> Password</p>
                          <p className="text-xs text-muted">Last changed {profile?.user?.passwordChangedAt ? new Date(profile.user.passwordChangedAt).toLocaleDateString() : 'Never'}</p>
                        </div>
                        <button className="btn btn-ghost text-xs gap-1.5" onClick={() => setShowPasswordModal(true)}>Change</button>
                      </div>
                      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-bg/40">
                        <div className="min-w-0">
                          <p className="text-ink font-medium flex items-center gap-1.5"><ShieldCheck size={14} className="text-muted"/> Two-factor authentication</p>
                          <p className="text-xs text-muted">{profile?.user?.twoFactorEnabled ? 'Enabled' : 'TOTP for privileged roles'}</p>
                        </div>
                        <button className="btn btn-ghost text-xs gap-1.5" onClick={async()=>{ const r = await accountApi.setup2FA(); setTwoFASecret(r.data); setShow2FAModal(true); }}>
                          {profile?.user?.twoFactorEnabled ? 'Manage' : 'Setup'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-ink">Sessions</p>
                      <button className="btn btn-ghost text-xs gap-2 text-error" onClick={()=>setShowRevokeAllConfirm(true)}><LogOut size={14} /> Revoke All</button>
                    </div>
                    <p className="text-xs text-muted">Active sessions</p>
                    <div className="space-y-2 text-xs">
                      {sessions.map((s,i)=>(
                        <div key={s.id || i} className="flex items-center justify-between p-2 rounded-lg bg-bg/60 border border-line">
                          <div>
                            <p className="text-ink">{s.userAgent || s.device || 'Unknown device'}</p>
                            <p className="mono-label">{s.ip || 'â€”'} Â· {s.lastActive ? new Date(s.lastActive).toLocaleString() : 'Now'}</p>
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
                          <p className="text-ink mono-label">{new Date(e.createdAt).toLocaleString()} Â· {e.ipAddress || e.ip || 'â€”'} Â· {e.success ? 'Success' : 'Failed'} Â· {e.userAgent || e.device || ''}</p>
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
                            <p className="text-ink mono-label">{d.delegator?.displayName || d.delegator?.username} â†’ {d.delegatee?.displayName || d.delegatee?.username}</p>
                            <p className="text-muted">{new Date(d.startsAt).toLocaleDateString()} to {new Date(d.endsAt).toLocaleDateString()} Â· {d.scope || 'All'}</p>
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
              <section className="card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-ink flex items-center gap-2"><ShieldCheck size={18} className="text-accent"/> Compliance</h2>
                  <button className="btn btn-ghost text-sm gap-2" onClick={() => setActive('compliance')} disabled={cmpLoading}><RefreshCw size={14} className={cmpLoading ? 'animate-spin' : ''} /> {cmpLoading ? 'Checking…' : 'Re-check'}</button>
                </div>
                {(() => {
                  const auditLogs = cmpAudit?.data ?? (Array.isArray(cmpAudit) ? cmpAudit : []);
                  const auditTotal = cmpAudit?.total ?? auditLogs.length;
                  const lastAudit = auditLogs[0]?.timestamp;
                  const contrib = Array.isArray(cmpRules?.contributions) ? cmpRules.contributions : (cmpRules?.contributions?.data ?? []);
                  const tax = Array.isArray(cmpRules?.tax) ? cmpRules.tax : (cmpRules?.tax?.data ?? []);
                  const leave = Array.isArray(cmpRules?.leave) ? cmpRules.leave : (cmpRules?.leave?.data ?? []);
                  const users = Array.isArray(cmpUsers) ? cmpUsers : (cmpUsers?.data ?? []);
                  const inactive = users.filter(u => u.status === 'INACTIVE').length;
                  const roles = [...new Set(users.map(u => u.role).filter(Boolean))];
                  const sessions = Array.isArray(cmpSessions) ? cmpSessions : (cmpSessions?.data ?? []);
                  const ok = (v) => v ? 'text-success' : 'text-muted';
                  const cards = [
                    { title: 'COA audit trail', value: auditTotal ? `${Number(auditTotal).toLocaleString()} events` : (cmpAudit ? '0 events' : '—'), sub: lastAudit ? `Last write ${new Date(lastAudit).toLocaleString()}` : 'Append-only log', live: !!cmpAudit },
                    { title: 'Payroll rules', value: `${contrib.length + tax.length + leave.length} rules`, sub: `${contrib.length} contributions · ${tax.length} tax · ${leave.length} leave`, live: !!cmpRules },
                    { title: 'Access control', value: users.length ? `${users.length} users` : '—', sub: roles.length ? `${roles.length} roles · ${inactive} inactive` : 'RBAC enforced', live: users.length > 0 },
                    { title: 'Sessions', value: sessions.length ? `${sessions.length} active` : (cmpSessions ? 'None active' : '—'), sub: 'Current account sessions', live: !!cmpSessions },
                  ];
                  return (
                    <>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {cards.map(c => (
                          <div key={c.title} className="p-4 border border-line rounded-xl bg-bg/50">
                            <p className="mono-label">{c.title}</p>
                            <p className={`font-display font-bold text-ink mt-1 ${ok(c.live)}`}>{cmpLoading && !c.live ? '…' : c.value}</p>
                            <p className="text-[11px] text-muted mt-0.5">{c.sub}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border border-line rounded-xl bg-bg/50 space-y-2">
                        <p className="text-sm font-medium text-ink">Frameworks</p>
                        {[
                          ['RA 10173 Data Privacy Act', 'Consent + access logging via audit trail'],
                          ['COA audit requirements', 'Append-only AuditLog on all mutations'],
                          ['CSC Omnibus Rules', 'Leave accrual + DIBAR checks configured'],
                        ].map(([t, d]) => (
                          <div key={t} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-ink">{t} <span className="text-muted text-xs">· {d}</span></span>
                            <span className="badge badge-success shrink-0">Active</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-ghost text-sm gap-2" onClick={async () => { try { const r = await accountApi.exportData(); toast(`Export queued: ${r?.data?.url ?? r?.url ?? 'ready'}`, 'success'); } catch { toast('Export failed', 'error'); } }}><Download size={14} /> Request my data export</button>
                        <button className="btn btn-ghost text-sm gap-2" onClick={() => { setShowPasswordModal(true); }}><Key size={14} /> Rotate password</button>
                      </div>
                      <div className="p-4 border border-line rounded-xl bg-bg/30 text-xs text-muted">
                        Export covers the RA 10173 right to data portability. Password rotation and session revocation (Account tab) support access-control hygiene. Full trail lives under Audit Trail.
                      </div>
                    </>
                  );
                })()}
              </section>
            )}

            {active === 'system' && (
              <section className="card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-ink flex items-center gap-2"><Info size={18} className="text-accent"/> System</h2>
                  <button className="btn btn-ghost text-sm gap-2" onClick={loadSysInfo} disabled={sysLoading}><RefreshCw size={14} className={sysLoading ? 'animate-spin' : ''}/> {sysLoading ? 'Checking…' : 'Re-check'}</button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border border-line rounded-xl bg-bg/50">
                    <p className="mono-label flex items-center gap-1.5"><Server size={12}/> Backend API</p>
                    <p className={`font-display font-bold text-ink mt-1 ${sysInfo?.backend ? 'text-success' : ''}`}>{sysLoading && !sysInfo?.backend ? '…' : sysInfo?.backend ? `Online · ${sysInfo.backend.ms}ms` : 'Unreachable'}</p>
                    <p className="text-[11px] text-muted mt-0.5 truncate" title={sysInfo?.apiBase ?? ''}>{sysInfo?.backend?.service ?? 'lgu-hrms-backend'} · {sysInfo?.apiBase ?? '…'}</p>
                  </div>
                  <div className="p-4 border border-line rounded-xl bg-bg/50">
                    <p className="mono-label flex items-center gap-1.5"><HardDrive size={12}/> Database</p>
                    <p className={`font-display font-bold text-ink mt-1 ${sysInfo?.db ? 'text-success' : ''}`}>{sysLoading && !sysInfo?.db ? '…' : sysInfo?.db ? `${(sysInfo.db.sizeBytes / 1048576).toFixed(1)} MB · ${sysInfo.db.latencyMs}ms` : '—'}</p>
                    <p className="text-[11px] text-muted mt-0.5 truncate" title={sysInfo?.db?.version ?? ''}>{sysInfo?.db?.version ? sysInfo.db.version.split(' ').slice(0, 2).join(' ') : 'PostgreSQL'} {sysInfo?.db?.uptime ? `· up ${sysInfo.db.uptime}` : ''}</p>
                  </div>
                  <div className="p-4 border border-line rounded-xl bg-bg/50">
                    <p className="mono-label flex items-center gap-1.5"><Activity size={12}/> Data</p>
                    <p className="font-display font-bold text-ink mt-1">{sysLoading && !sysInfo?.summary ? '…' : sysInfo?.summary ? `${Number(sysInfo.summary.totalRecords).toLocaleString()} records` : '—'}</p>
                    <p className="text-[11px] text-muted mt-0.5">{sysInfo?.summary ? `${sysInfo.summary.totalTables} tables` : '—'}{sysInfo?.migrations ? ` · ${sysInfo.migrations.inSync ? 'migrations in sync' : `${sysInfo.migrations.pendingCount} pending`}` : ''}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-2">
                    <p className="text-sm font-medium text-ink">Environment</p>
                    <ul className="text-xs space-y-1.5">
                      <li className="flex items-center justify-between gap-2"><span className="text-muted">App version</span><span className="font-mono text-ink">v0.1</span></li>
                      <li className="flex items-center justify-between gap-2"><span className="text-muted">Deployment</span><span className="font-mono text-ink">On-prem · docker-compose</span></li>
                      <li className="flex items-center justify-between gap-2"><span className="text-muted">Web origin</span><span className="font-mono text-ink truncate max-w-[60%]" title={typeof window !== 'undefined' ? window.location.origin : ''}>{typeof window !== 'undefined' ? window.location.origin : '—'}</span></li>
                      <li className="flex items-center justify-between gap-2"><span className="text-muted">API endpoint</span><span className="font-mono text-ink truncate max-w-[60%]" title={sysInfo?.apiBase ?? ''}>{sysInfo?.apiBase ?? '—'}</span></li>
                      <li className="flex items-center justify-between gap-2"><span className="text-muted flex items-center gap-1"><Clock size={12}/> Server time</span><span className="font-mono text-ink">{sysInfo?.db?.checkedAt ? new Date(sysInfo.db.checkedAt).toLocaleString() : '—'}</span></li>
                    </ul>
                  </div>
                  <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-2">
                    <p className="text-sm font-medium text-ink">Session</p>
                    <ul className="text-xs space-y-1.5">
                      <li className="flex items-center justify-between gap-2"><span className="text-muted">Signed in as</span><span className="font-mono text-ink">{sessionUser?.username ?? '—'}</span></li>
                      <li className="flex items-center justify-between gap-2"><span className="text-muted">Role</span><span className="badge badge-accent">{sessionUser?.role ?? '—'}</span></li>
                      <li className="flex items-center justify-between gap-2"><span className="text-muted">Auth</span><span className="font-mono text-ink">JWT 15m + refresh rotation</span></li>
                      <li className="flex items-center justify-between gap-2"><span className="text-muted">Audit</span><span className="font-mono text-ink">Append-only · every mutation</span></li>
                    </ul>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button className="btn btn-ghost text-xs gap-2" onClick={() => setActive('database')}><Database size={14}/> Database tools</button>
                      <button className="btn btn-ghost text-xs gap-2" onClick={() => setActive('compliance')}><ShieldCheck size={14}/> Compliance</button>
                      <button className="btn btn-ghost text-xs gap-2" onClick={() => setActive('account')}><User size={14}/> Account</button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-line rounded-xl bg-bg/30 text-xs text-muted">
                  Backend <span className="font-mono">/api/v1/health</span> is public; database vitals reuse the ADMIN-only ops endpoints. If the backend shows unreachable, check <span className="font-mono">node --watch src/server.js</span> and <span className="font-mono">docker ps</span> for the db container.
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
            <p className="text-[11px] text-muted">Resets the 30-day rotation timer.</p>
          </div>
        </Modal>
        <Modal open={showPinModal} onClose={() => setShowPinModal(false)} title="Set sign-in PIN" size="sm" footer={
          <>
            <button className="btn btn-ghost gap-2" onClick={() => setShowPinModal(false)}>
              <X size={16} />
              Cancel
            </button>
            <button className="btn btn-primary gap-2" disabled={!/^\d{4,6}$/.test(pinNew) || pinNew !== pinConfirm} onClick={async () => {
              try {
                await setupPin(pinNew);
                toast('PIN saved — you can now sign in with it', 'success');
                setShowPinModal(false); setPinNew(''); setPinConfirm('');
                accountApi.getProfile().then(r => setProfile(r.data)).catch(()=>{});
              } catch { toast('Could not save PIN', 'error'); }
            }}>
              <Save size={16} />
              Save PIN
            </button>
          </>
        }>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">New PIN (4–6 digits)</label>
              <input inputMode="numeric" pattern="[0-9]*" maxLength={6} className="input font-mono tracking-[0.5em] text-center" value={pinNew} onChange={e=>setPinNew(e.target.value.replace(/\D/g, '').slice(0, 6))} aria-invalid={pinNew !== '' && !/^\d{4,6}$/.test(pinNew)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Confirm PIN</label>
              <input inputMode="numeric" pattern="[0-9]*" maxLength={6} className="input font-mono tracking-[0.5em] text-center" value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              {pinConfirm !== '' && pinNew !== pinConfirm && <p className="text-[11px] text-error mt-1">PINs do not match</p>}
            </div>
            <p className="text-[11px] text-muted">Stored bcrypt-hashed, never plain. Locked after 8 failed attempts in 15 minutes. Use only on trusted workstations.</p>
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
              Save changes
            </button>
          </>
        }>
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-lg bg-bg/60 border border-line">
              <p className="mono-label text-[10px] uppercase tracking-wide text-muted mb-1">Display</p>
              <input className="input h-11" placeholder="Full name" value={editDisplayName} onChange={e=>setEditDisplayName(e.target.value)} aria-invalid={!editDisplayName.trim()} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Email</label>
                <input className="input h-11" type="email" placeholder="name@lgu.gov.ph" value={editEmail} onChange={e=>setEditEmail(e.target.value)} aria-invalid={editEmail && !isValidEmail(editEmail)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Contact</label>
                <input className="input h-11" placeholder="0917-000-0000" value={editContact} onChange={e=>setEditContact(e.target.value)} aria-invalid={editContact && !isValidPhone(editContact)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Emergency contact</label>
              <input className="input h-11" placeholder="Name / number" value={editEmergency} onChange={e=>setEditEmergency(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted">Changes update your profile completeness and are audit-logged.</p>
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
            <div><label className="block text-sm font-medium text-ink mb-1">Scope</label><input className="input" value={delegationForm.scope} onChange={e=>setDelegationForm({...delegationForm, scope:e.target.value})} placeholder="e.g. leave:approve" /></div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">IMS access (optional)</label>
              <select
                className="input"
                value={delegationForm.scope?.startsWith('ims:') ? delegationForm.scope : ''}
                onChange={e=>setDelegationForm({...delegationForm, scope:e.target.value})}
              >
                <option value="">No IMS access</option>
                <option value="ims:WAREHOUSE_STAFF">IMS · Warehouse Staff</option>
                <option value="ims:PROPERTY_CUSTODIAN">IMS · Property Custodian</option>
                <option value="ims:DEPARTMENT_HEAD">IMS · Department Head</option>
                <option value="ims:AUDITOR">IMS · Auditor</option>
                <option value="ims:ADMIN">IMS · Admin</option>
              </select>
              <p className="text-[11px] text-muted mt-1">Grants this person that IMS role while the delegation is active. Expiry/revocation removes it on their next IMS sign-in.</p>
            </div>
            <div><label className="block text-sm font-medium text-ink mb-1">Reason</label><input className="input" value={delegationForm.reason} onChange={e=>setDelegationForm({...delegationForm, reason:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-sm font-medium text-ink mb-1">Starts</label><input type="date" className="input" value={delegationForm.startsAt} onChange={e=>setDelegationForm({...delegationForm, startsAt:e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-ink mb-1">Ends</label><input type="date" className="input" value={delegationForm.endsAt} onChange={e=>setDelegationForm({...delegationForm, endsAt:e.target.value})} /></div>
            </div>
          </form>
        </Modal>
        <ConfirmDialog open={showDeactivateConfirm} onClose={()=>setShowDeactivateConfirm(false)} title="Deactivate account" message="This will soft-delete your account. Continue?" confirmLabel="Deactivate" danger onConfirm={async()=>{ await accountApi.deactivateAccount(); toast('Account deactivated', 'success'); setShowDeactivateConfirm(false); }} />
        <ConfirmDialog open={showRevokeAllConfirm} onClose={()=>setShowRevokeAllConfirm(false)} title="Revoke all sessions" message="This will sign you out everywhere except this device. Continue?" confirmLabel="Revoke all" danger onConfirm={async()=>{ try { await accountApi.revokeAllSessions(); toast('All sessions revoked', 'success'); setSessions([]); setShowRevokeAllConfirm(false); } catch { toast('Could not revoke sessions', 'error'); } }} />
        <ConfirmDialog open={!!showDeleteConfirm} onClose={()=>setShowDeleteConfirm(null)} title="Delete record" message={`Delete ${showDeleteConfirm?.table?.label} record #${showDeleteConfirm?.record?.id}? This cannot be undone.`} confirmLabel="Delete" danger onConfirm={async()=>{ if (showDeleteConfirm) { await handleDeleteRecord(showDeleteConfirm.table.name, showDeleteConfirm.record.id); setShowDeleteConfirm(null); } }} />
        <Modal open={!!dbDeps} onClose={() => setDbDeps(null)} title={`Delete ${dbDeps?.table?.label} #${dbDeps?.record?.id}`} size="sm" footer={
          <>
            <button className="btn btn-ghost gap-2" onClick={() => setDbDeps(null)}><X size={16}/> Cancel</button>
            <button className="btn btn-danger gap-2" disabled={dbDeps?.blocked} onClick={async () => { if (dbDeps) { await handleDeleteRecord(dbDeps.table.name, dbDeps.record.id); setDbDeps(null); } }}>
              <Trash2 size={14}/> {dbDeps?.blocked ? 'Blocked' : 'Delete anyway'}
            </button>
          </>
        }>
          {dbDeps && (dbDeps.total === 0
            ? <p className="text-sm text-muted">No dependent rows found — safe to delete.</p>
            : <div className="space-y-2 text-sm">
                <p className="text-error font-medium">Blocked by {dbDeps.total} dependent row{dbDeps.total === 1 ? '' : 's'}:</p>
                {dbDeps.dependents.filter(d => d.count > 0).map(d => (
                  <p key={`${d.table}.${d.column}`} className="font-mono text-xs text-muted">{d.count}× {d.table}.{d.column}</p>
                ))}
                <p className="text-xs text-muted">Delete or reassign dependents first.</p>
              </div>)}
        </Modal>
        <ConfirmDialog open={!!dbPurgeTarget} onClose={()=>setDbPurgeTarget(null)} title="Purge old rows" message={`Delete ${dbRetention?.candidates?.[dbPurgeTarget === 'loginEvents' ? 'loginEvents' : 'revokedSessions'] ?? '?'} rows older than ${dbRetentionDays} days from ${dbPurgeTarget}? Export first if you need them.`} confirmLabel="Purge" danger onConfirm={async()=>{ try { const r = await databaseApi.retentionRun(dbPurgeTarget, dbRetentionDays); toast(`Purged ${r.deleted}`, 'success'); setDbRetention(await databaseApi.retention(dbRetentionDays)); } catch { toast('Purge failed', 'error'); } setDbPurgeTarget(null); }} />
        <Modal open={showDbCreateModal} onClose={() => setShowDbCreateModal(false)} title={`Add record to ${dbSelectedTable?.label}`} size="md" footer={
          <> 
            <button className="btn btn-ghost gap-2" onClick={() => { setShowDbCreateModal(false); setDbCreateForm({}); }}><X size={16}/> Cancel</button>
            <button className="btn btn-primary gap-2" onClick={async () => {
              if (!dbTableSchema) return;
              const payload = {};
              for (const col of dbTableSchema) {
                const val = dbCreateForm[col.column_name];
                if (val === "" || val === undefined) continue;
                // Convert numeric strings to numbers for integer/numeric types
                if (col.data_type?.includes("integer") || col.data_type?.includes("numeric") || col.data_type?.includes("decimal")) {
                  const num = Number(val);
                  if (!isNaN(num)) payload[col.column_name] = num; else payload[col.column_name] = val;
                } else if (col.data_type?.includes("boolean")) {
                  payload[col.column_name] = val === "true" || val === true;
                } else {
                  payload[col.column_name] = val;
                }
              }
              await handleDbCreate(payload);
              setDbCreateForm({});
            }}><Save size={16}/> Save</button>
          </>
        }>
          <div className="space-y-3 text-sm">
            {dbTableSchema && dbTableSchema.map(col => (
              <div key={col.column_name}>
                <label className="block text-sm font-medium text-ink mb-1">{col.column_name}</label>
                <input className="input w-full" value={dbCreateForm[col.column_name] || ""} onChange={e => setDbCreateForm({...dbCreateForm, [col.column_name]: e.target.value})} placeholder={col.is_nullable === "YES" ? "nullable" : "required"} />
              </div>
            ))}
          </div>
        </Modal>
        <Modal open={showDbEditModal} onClose={() => setShowDbEditModal(false)} title={`Edit ${dbSelectedTable?.label} record #${dbEditingRecord?.id}`} size="md" footer={
          <>
            <button className="btn btn-ghost gap-2" onClick={() => setShowDbEditModal(false)}><X size={16}/> Cancel</button>
            <button className="btn btn-primary gap-2" onClick={async () => {
              if (!dbTableSchema || !dbEditingRecord) return;
              const changes = {};
              for (const col of dbTableSchema) {
                const key = col.column_name;
                if (!(key in dbCreateForm)) continue;
                const val = dbCreateForm[key];
                if (val === "" || val === undefined) continue;
                if (col.data_type?.includes("integer") || col.data_type?.includes("numeric") || col.data_type?.includes("decimal")) {
                  const num = Number(val);
                  if (!isNaN(num)) changes[key] = num; else changes[key] = val;
                } else if (col.data_type?.includes("boolean")) {
                  changes[key] = val === "true" || val === true;
                } else {
                  changes[key] = val;
                }
              }
              await handleDbUpdate(dbEditingRecord.id, changes);
            }}><Save size={16}/> Save</button>
          </>
        }>
          <div className="space-y-3 text-sm">
            {dbTableSchema && dbSelectedTable && (() => {
              const form = dbCreateForm;
              return dbTableSchema.map(col => (
                <div key={col.column_name}>
                  <label className="block text-sm font-medium text-ink mb-1">{col.column_name}</label>
                  <input className="input w-full" value={String(form[col.column_name] || "")} onChange={e => setDbCreateForm({...dbCreateForm, [col.column_name]: e.target.value})} />
                </div>
              ));
            })()}
          </div>
        </Modal>


      <ConfirmDialog
        open={confirmRunMigrations}
        onClose={() => setConfirmRunMigrations(false)}
        onConfirm={handleRunMigrations}
        title="Apply pending migrations?"
        message="This will run `prisma migrate deploy` on the database. This operation is irreversible — ensure you have a recent backup. Continue?"
        confirmLabel="Apply"
        danger
      />

    </Layout>
  );
}
