import { useEffect, useMemo, useState } from 'react';
import { kioskApi } from './api.js';

const KPAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', 'back'];

const clockFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const dateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});
const hhmmFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true,
});

function nameOf(rec) {
  if (!rec?.employee) return null;
  const { firstName, lastName } = rec.employee;
  return [firstName, lastName].filter(Boolean).join(' ');
}

export default function App() {
  const [now, setNow] = useState(() => Date.now());

  // Terminal session state (all in-memory — punch key never persists).
  const [phase, setPhase] = useState('setup'); // 'setup' | 'ready'
  const [tenantCode, setTenantCode] = useState('DEFAULT');
  const [deviceId, setDeviceId] = useState('');
  const [punchKey, setPunchKey] = useState('');

  // Punch flow state.
  const [empNo, setEmpNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tone, message }
  const [lastPunch, setLastPunch] = useState(null); // API response payload

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = useMemo(() => clockFmt.format(new Date(now)), [now]);
  const dateLine = useMemo(() => dateFmt.format(new Date(now)), [now]);

  const startTerminal = () => {
    if (!tenantCode.trim()) {
      setFeedback({ tone: 'error', message: 'Tenant code is required to start the terminal.' });
      return;
    }
    setPhase('ready');
    setFeedback(null);
    setLastPunch(null);
  };

  const endSession = () => {
    setPhase('setup');
    setPunchKey('');
    setEmpNo('');
    setFeedback(null);
    setLastPunch(null);
  };

  const pressKey = (k) => {
    setEmpNo((v) => {
      if (k === 'back') return v.slice(0, -1);
      if (v.length >= 20) return v;
      return v + k;
    });
  };

  const doPunch = async (type) => {
    if (!empNo.trim()) {
      setFeedback({ tone: 'error', message: 'Enter an employee number first.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await kioskApi.punch(
        empNo.trim(),
        type,
        tenantCode.trim(),
        punchKey.trim() || undefined,
        deviceId.trim() || undefined,
      );
      setLastPunch(res.data);
      setFeedback({ tone: 'ok', message: res.data?.message || (type === 'IN' ? 'Punched in' : 'Punched out') });
    } catch (e) {
      const msg = e.message || 'Punch failed.';
      const known = msg === 'Already punched in' || msg === 'Already punched out' || msg === 'Must punch in first';
      setFeedback({ tone: known ? 'info' : 'error', message: msg });
      setLastPunch(null);
    } finally {
      setBusy(false);
    }
  };

  const nextEmployee = () => {
    setEmpNo('');
    setFeedback(null);
    setLastPunch(null);
  };

  return (
    <div className="kiosk">
      <header className="kbar">
        <div className="kbar-brand">LGU HRMS&ensp;·&ensp;Attendance Kiosk</div>
        <div className="kbar-badges">
          {phase === 'ready' && (
            <>
              <span className="pill">Tenant: {tenantCode.trim() || '—'}</span>
              {deviceId.trim() && <span className="pill">Terminal: {deviceId.trim()}</span>}
              {punchKey.trim() && <span className="pill ok">Key armed (memory only)</span>}
            </>
          )}
        </div>
        <div className="kbar-clock">
          <div className="clock">{clock}</div>
          <div className="date">{dateLine}</div>
        </div>
      </header>

      {phase === 'setup' ? (
        <main className="main setup">
          <div className="card setup-card">
            <h1 className="h1">Terminal setup</h1>
            <p className="hint">
              One-time per session. The punch key (if the server requires one) is kept only in this
              terminal&apos;s memory and is cleared when the page reloads.
            </p>
            <label className="field-label">Tenant code</label>
            <input
              className="input"
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value)}
              placeholder="e.g. DEFAULT"
            />
            <label className="field-label">Device ID (optional)</label>
            <input
              className="input"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. lobby-unit-01"
            />
            <label className="field-label">Punch key (optional)</label>
            <input
              className="input"
              type="password"
              value={punchKey}
              onChange={(e) => setPunchKey(e.target.value)}
              placeholder="Shared kiosk secret, if the server requires one"
            />
            {feedback && <p className={`msg ${feedback.tone}`}>{feedback.message}</p>}
            <button className="btn btn-primary big" onClick={startTerminal}>
              Start terminal
            </button>
          </div>
        </main>
      ) : (
        <main className="main">
          <section className="punch-panel card">
            <h2 className="h2">Employee number</h2>
            <div className="display mono">{empNo || '…'}</div>

            <div className="keypad">
              {KPAD.map((k) => (
                <button
                  key={k}
                  className="key"
                  onClick={() => pressKey(k)}
                  disabled={busy}
                  aria-label={k === 'back' ? 'Backspace' : k}
                >
                  {k === 'back' ? '⌫' : k}
                </button>
              ))}
            </div>

            <div className="actions">
              <button className="btn btn-in grow" onClick={() => doPunch('IN')} disabled={busy}>
                {busy ? 'Working…' : 'Punch In'}
              </button>
              <button className="btn btn-out grow" onClick={() => doPunch('OUT')} disabled={busy}>
                {busy ? 'Working…' : 'Punch Out'}
              </button>
            </div>

            <div className="actions thin">
              <button className="link-btn" onClick={nextEmployee} disabled={busy}>Clear / next</button>
              <button className="link-btn" onClick={endSession} disabled={busy}>End session</button>
            </div>
          </section>

          <section className="status-panel">
            <div className="status-clock card">
              <div className="clock big">{clock}</div>
              <div className="date">{dateLine}</div>
            </div>

            <div className="card status-card">
              {busy ? (
                <p className="msg info">Sending punch…</p>
              ) : lastPunch && lastPunch.record ? (
                <div className="receipt">
                  <h2 className={`h2 drop ${feedback?.tone === 'ok' ? 'ok' : 'info'}`}>
                    {feedback?.message}
                  </h2>
                  {lastPunch.record.employee && (
                    <p className="who">{nameOf(lastPunch.record)}</p>
                  )}
                  <p className="mono line-t">{empNo.trim()}</p>
                  <p className="line-t">
                    {lastPunch.record.timeIn && !lastPunch.record.timeOut
                      ? `In at ` + hhmmFmt.format(new Date(lastPunch.record.timeIn))
                      : lastPunch.record.timeOut
                        ? `Out at ` + hhmmFmt.format(new Date(lastPunch.record.timeOut))
                        : '—'}
                  </p>
                  {lastPunch.record.timeOut && (
                    <p className="line-t ok">
                      Today: {Number(lastPunch.record.hours ?? 0).toFixed(1)} hrs
                    </p>
                  )}
                </div>
              ) : feedback ? (
                <p className={`msg ${feedback.tone}`}>{feedback.message}</p>
              ) : (
                <p className="hint center">
                  Enter an employee number, then tap Punch In or Punch Out.
                </p>
              )}
            </div>
          </section>
        </main>
      )}

      <footer className="kfoot">
        <span>{phase === 'ready' && punchKey.trim() ? 'Punch key held in memory — reload ends the session.' : ''}</span>
        <span>{new Date().getFullYear()} LGU HRMS · PH standard time</span>
      </footer>
    </div>
  );
}