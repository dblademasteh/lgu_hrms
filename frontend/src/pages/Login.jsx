import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Server, FileCheck, Sun, Moon, UserCheck, GraduationCap, Target, Award, Hash, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';
import { useToast } from '../components/Toast.jsx';
import { useTheme, toggleTheme } from '../theme.js';
import { api } from '../api/client.js';

const PRIME_PILLARS = [
  { tag: 'RSP', title: 'Recruitment, Selection & Placement', desc: 'Plantilla, vacancy, eligibility & appointments', Icon: UserCheck },
  { tag: 'L&D', title: 'Learning & Development', desc: 'Trainings, competencies & IDPs', Icon: GraduationCap },
  { tag: 'PM', title: 'Performance Management', desc: 'IPCR / OPCR, reviews & ratings', Icon: Target },
  { tag: 'R&R', title: 'Rewards & Recognition', desc: 'Payroll, bonuses, loans & incentives', Icon: Award },
];

const MATURITY_LEVELS = ['Transactional', 'Process-Defined', 'Integrated', 'Strategic'];

export default function Login() {
  const [mode, setMode] = useState('password');
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoBusy, setSsoBusy] = useState(false);
  const [ssoError, setSsoError] = useState('');

  useEffect(() => {
    api.get('/tenants').then(res => setTenants(res.data)).catch(() => {});
    api.get('/auth/oidc/status').then(res => setSsoEnabled(!!res.data?.enabled)).catch(() => {});
  }, []);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loginPin = useAuthStore((s) => s.loginPin);
  const passwordExpired = useAuthStore((s) => s.passwordExpired);
  const loading = useAuthStore((s) => s.loading);
  const toast = useToast();
  const theme = useTheme();

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = 'Username is required';
    if (mode === 'pin') {
      if (!pin) e.pin = 'PIN is required';
      else if (!/^\d{4,6}$/.test(pin)) e.pin = 'PIN must be 4–6 digits';
    } else {
      if (!password) e.password = 'Password is required';
      else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    }
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setAuthError('');
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    const tenantId = tenant ? tenant.toUpperCase() : undefined;
    const ok = mode === 'pin'
      ? await loginPin(username.trim(), pin, tenantId)
      : await login(username.trim(), password, tenantId);
    if (ok) {
      const expired = useAuthStore.getState().passwordExpired;
      toast(expired ? 'Password expired — please change it in Account → Security' : 'Signed in successfully', expired ? 'error' : 'success');
      navigate(expired ? '/settings' : '/dashboard');
    } else {
      const { error: msg, errorStatus } = useAuthStore.getState();
      if (errorStatus === 429 || msg?.includes('Too many')) setAuthError(msg);
      else setAuthError(mode === 'pin' ? 'Invalid username or PIN — PIN sign-in must be enabled in Account → Security.' : 'Invalid credentials — check your username and password, or ask HR for access.');
    }
  };

  const fillDemo = () => {
    setTenant('DEFAULT');
    setUsername('admin-default');
    if (mode === 'password') setPassword('admin123');
    setErrors({});
    setAuthError('');
  };

  const handleSso = async () => {
    setSsoBusy(true);
    setSsoError('');
    try {
      const tenantId = tenant ? tenant.toUpperCase() : undefined;
      const { url } = await import('../api/auth.js').then(m => m.oidcLoginUrl(tenantId));
      window.location.assign(url);
    } catch (e) {
      setSsoError(e.response?.data?.error?.message || 'SSO is unavailable right now.');
      setSsoBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Left · PRIME-HRM promo ─────────────────────────────── */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-surface border-r border-line p-10 xl:p-14" aria-label="About PRIME-HRM">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-ink text-bg grid place-items-center" aria-hidden="true">
              <Landmark size={22} strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-display font-bold text-ink leading-tight">LGU HRMS</p>
              <p className="mono-label text-[10px]">CSC PRIME-HRM &middot; 4 pillars</p>
            </div>
          </div>
          <span className="mono-label px-3 py-1.5 rounded-full border border-line bg-bg/60">Meritocracy &middot; Excellence</span>
        </div>

        <div className="max-w-xl">
          <p className="mono-label mb-4">Program to Institutionalize Meritocracy and Excellence in Human Resource Management</p>
          <h1 className="font-display text-5xl xl:text-6xl font-bold text-ink leading-[1.04] tracking-tight">
            PRIME-HRM<br />ready<span className="text-accent">.</span>
          </h1>
          <p className="text-muted mt-5 text-base leading-relaxed max-w-md">
            The CSC framework for merit-based HR — four core systems, one
            maturity journey from transactional to strategic.
          </p>

          <ul className="mt-8 space-y-3">
            {PRIME_PILLARS.map(({ tag, title, desc, Icon }) => (
              <li key={tag} className="flex items-center gap-4 rounded-xl border border-line bg-bg/60 px-4 py-3">
                <span className="w-10 h-10 rounded-lg bg-accent/10 text-accent grid place-items-center shrink-0" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink text-sm leading-tight">
                    <span className="font-mono text-xs text-accent mr-2">{tag}</span>{title}
                  </p>
                  <p className="text-xs text-muted mt-0.5 truncate">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6" aria-hidden="true">
            <div className="flex items-center gap-1.5">
              {MATURITY_LEVELS.map((level, i) => (
                <React.Fragment key={level}>
                  <span className={`h-1.5 flex-1 rounded-full ${i < 2 ? 'bg-accent' : 'bg-line'}`} />
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {MATURITY_LEVELS.map((level, i) => (
                <span key={level} className={`mono-label text-[9px] ${i < 2 ? 'text-accent' : ''}`}>{level}</span>
              ))}
            </div>
            <p className="mono-label text-[10px] mt-2">Current maturity &middot; Process-Defined emerging</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge"><ShieldCheck size={12} className="mr-1" aria-hidden="true" />RA 10173</span>
          <span className="badge"><Server size={12} className="mr-1" aria-hidden="true" />On-prem</span>
          <span className="badge"><FileCheck size={12} className="mr-1" aria-hidden="true" />COA audit trail</span>
          <span className="mono-label ml-auto">v0.1</span>
        </div>
      </section>

      {/* ── Right · the sign-in stub ───────────────────────────── */}
      <section className="relative flex items-center justify-center p-6 sm:p-10 lg:border-l-2 lg:border-dashed lg:border-line" aria-label="Sign in">
        <span className="hidden lg:block absolute -left-3.25 -top-px w-6 h-6 rounded-full bg-bg border border-line" aria-hidden="true" />
        <span className="hidden lg:block absolute -left-3.25 -bottom-px w-6 h-6 rounded-full bg-bg border border-line" aria-hidden="true" />

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={theme === 'dark'}
          className="btn btn-ghost absolute top-5 right-5 px-3!"
        >
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>

        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-[10px] bg-accent text-accent-ink flex items-center justify-center font-display font-bold" aria-hidden="true">L</div>
            <div>
              <p className="font-display text-xl font-bold text-ink">LGU HRMS</p>
              <p className="text-sm text-muted">Human Resource Management System</p>
            </div>
          </div>

          <p className="mono-label mb-3">Secure sign-in</p>
          <h2 className="font-display text-3xl font-bold text-ink tracking-tight">Welcome back.</h2>
          <p className="text-sm text-muted mt-2 mb-5">Sign the stub to enter the record room.</p>

          <div className="grid grid-cols-2 gap-2 mb-5" role="tablist" aria-label="Sign-in method">
            {[
              { id: 'password', label: 'Password', icon: Lock },
              { id: 'pin', label: 'PIN', icon: Hash },
            ].map(t => {
              const Icon = t.icon;
              const selected = mode === t.id;
              return (
                <button key={t.id} type="button" role="tab" aria-selected={selected}
                  onClick={() => { setMode(t.id); setErrors({}); setAuthError(''); }}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition ${selected ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-line text-muted hover:text-ink'}`}>
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <button type="button" onClick={()=>setShowAdvanced(v=>!v)} className="text-xs mono-label text-muted hover:text-ink">Advanced options {showAdvanced ? '▲' : '▼'}</button>
            {showAdvanced && (
              <div>
                <label htmlFor="tenant" className="block text-sm font-medium text-ink mb-1">Institution</label>
                <div className="relative">
                  <select
                    id="tenant"
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value)}
                    className="input h-12 pr-10 appearance-none w-full"
                  >
                    <option value="">Auto-detect</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.code}>{t.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"/>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink mb-1">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyUp={(e) => setCapsLock(!!e.getModifierState?.('CapsLock'))}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                  className="input pl-9! h-12"
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {errors.username && <p id="username-error" role="alert" className="text-sm text-error mt-1">{errors.username}</p>}
            </div>

            {mode === 'pin' ? (
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-ink mb-1">Sign-in PIN</label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    aria-invalid={!!errors.pin}
                    aria-describedby={errors.pin ? 'pin-error' : undefined}
                    className="input pl-9! h-12 font-mono tracking-[0.4em]"
                    placeholder="••••"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>
                {errors.pin && <p id="pin-error" role="alert" className="text-sm text-error mt-1">{errors.pin}</p>}
                {!errors.pin && (
                  <p className="text-[11px] text-muted mt-1.5">4–6 digit PIN · enable it first in Account → Security. Locked after 8 failed attempts.</p>
                )}
              </div>
            ) : (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(!!e.getModifierState?.('CapsLock'))}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className="input pl-9! pr-11! h-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p id="password-error" role="alert" className="text-sm text-error mt-1">{errors.password}</p>}
              {capsLock && !errors.password && (
                <p className="mono-label mt-1.5" role="status">Caps lock is on</p>
              )}
            </div>
            )}

            {authError && (
              <p role="alert" className="text-sm text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2.5">
                {authError}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full h-12 text-base disabled:opacity-70">
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-accent-ink/40 border-t-accent-ink animate-spin" aria-hidden="true" />
                  Verifying…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={fillDemo}
            className="mt-4 w-full text-left font-mono text-xs text-muted border border-dashed border-line rounded-lg px-3 py-2.5 hover:text-ink hover:border-accent/50 transition-colors"
          >
            Demo access — <span className="text-ink">admin / admin123</span>
            <span className="float-right underline underline-offset-2">Autofill</span>
          </button>

          <>
            <div className="flex items-center gap-3 my-4" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              <span className="mono-label">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <button
              type="button"
              onClick={handleSso}
              disabled={ssoBusy || !ssoEnabled}
              title={ssoEnabled ? 'Sign in with your organization account' : 'SSO is not configured — ask your administrator to set OIDC_ISSUER / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET'}
              className="btn btn-outline w-full h-12 text-base disabled:opacity-70"
            >
              {ssoBusy ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-accent/40 border-t-accent animate-spin" aria-hidden="true" />
                  Redirecting…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} aria-hidden="true" />
                  Sign in with SSO
                </>
              )}
            </button>
            {!ssoEnabled && (
              <p className="mono-label text-center mt-2">SSO not configured</p>
            )}
            {ssoError && (
              <p role="alert" className="text-sm text-error mt-2">{ssoError}</p>
            )}
          </>

          <p className="mono-label text-center mt-8">On-prem &middot; CSC compliant &middot; RBAC protected</p>
        </div>
      </section>
    </div>
  );
}
