import React, { useEffect, useState } from 'react';
import { BadgeCheck, Briefcase, CheckCircle, ChevronRight, Mail, Phone, Save, UserX, XCircle } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog.jsx';
import { listEligibilities } from '../api/recruitment.js';
import { badgeTone } from '../data/mock.js';

const STAGES = [
  { key: 'NEW', label: 'New' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'SCREENED', label: 'Screened' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'INTERVIEWED', label: 'Interviewed' },
  { key: 'OFFERED', label: 'Offered' },
  { key: 'HIRED', label: 'Hired' },
];
const TERMINAL = ['HIRED', 'REJECTED', 'DISQUALIFIED'];

const initialsOf = name => (name ?? '').split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '—';
const d10 = v => (v ? String(v).slice(0, 10) : '—');

function EligibilityCard({ applicant, refreshKey }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (!applicant?.hiredEmployeeId) { setRows([]); return; }
    let cancelled = false;
    setRows(null);
    listEligibilities({ employeeId: applicant.hiredEmployeeId, limit: 50 })
      .then(data => { if (!cancelled) setRows(data.items || []); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [applicant?.hiredEmployeeId, refreshKey]);

  if (!applicant?.hiredEmployeeId) {
    return (
      <div className="text-sm text-muted">
        Eligibility score <span className="font-mono">{applicant?.eligibilityScore ?? '—'}</span> on file. The CSC / PRC credential is
        recorded in the employee's 201 profile after hire.
      </div>
    );
  }
  if (rows === null) return <div className="text-sm text-muted py-2">Checking eligibility…</div>;
  if (rows.length === 0) return <div className="text-sm text-muted">No eligibility on record — add it under the employee's 201 file.</div>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.id ?? i} className="flex justify-between items-center gap-3 rounded-lg border border-line p-2.5 text-sm">
          <div className="min-w-0">
            <div className="font-medium text-ink">{r.eligibilityType}</div>
            <div className="text-xs text-muted">
              {r.examDate ? `${d10(r.examDate)} · ` : ''}{r.rating ? `Rating ${r.rating}` : ''}{r.validUntil ? ` · until ${d10(r.validUntil)}` : ''}
            </div>
          </div>
          <BadgeCheck size={16} className="text-accent shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function ApplicantPane({ applicant, busy, onAdvance, onStatus, onScores, onHire, onReject, refreshKey = 0 }) {
  const [scores, setScores] = useState({});
  const [rejectKind, setRejectKind] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScores({
      eligibilityScore: applicant?.eligibilityScore ?? '',
      screeningScore: applicant?.screeningScore ?? '',
      interviewScore: applicant?.interviewScore ?? '',
    });
  }, [applicant?.id]);

  if (!applicant) {
    return (
      <div className="card flex-1 flex items-center justify-center text-center p-6 min-h-64">
        <div>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-surface grid place-items-center mb-3">
            <UserX size={22} className="text-muted" />
          </div>
          <p className="font-medium text-ink">Select an applicant</p>
          <p className="text-sm text-muted mt-1">Choose a candidate to review their stage, scores and eligibility.</p>
        </div>
      </div>
    );
  }

  const fullName = `${applicant.firstName} ${applicant.lastName}`.trim();
  const appliedFor = applicant.vacancy?.title || applicant.position?.title || 'Unspecified position';
  const stageIndex = STAGES.findIndex(s => s.key === applicant.status);
  const canAdvance = stageIndex >= 0 && stageIndex < STAGES.length - 1 && !TERMINAL.includes(applicant.status);
  const canHire = !TERMINAL.includes(applicant.status);

  const saveScores = async () => {
    const payload = {};
    if (scores.eligibilityScore !== '' && scores.eligibilityScore !== (applicant.eligibilityScore ?? '')) payload.eligibilityScore = Number(scores.eligibilityScore);
    if (scores.screeningScore !== '' && scores.screeningScore !== (applicant.screeningScore ?? '')) payload.screeningScore = Number(scores.screeningScore);
    if (scores.interviewScore !== '' && scores.interviewScore !== (applicant.interviewScore ?? '')) payload.interviewScore = Number(scores.interviewScore);
    if (!Object.keys(payload).length) return;
    setSaving(true);
    try { await onScores(payload); } finally { setSaving(false); }
  };
  const dirty = ['eligibilityScore', 'screeningScore', 'interviewScore'].some(k =>
    scores[k] !== '' && scores[k] !== (applicant[k] ?? ''));

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent font-display font-bold grid place-items-center text-lg shrink-0">
            {initialsOf(fullName)}
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-ink truncate">{fullName}</p>
            <p className="text-sm text-muted truncate flex items-center gap-1">
              <Briefcase size={13} className="shrink-0" /> {appliedFor}
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3 items-center">
            <span className="text-muted">Stage</span>
            <span className={`badge ${applicant.vacancy?.status ? badgeTone(applicant.vacancy.status) : 'badge-neutral'}`}>{applicant.status}</span>
          </div>
          {applicant.email && (
            <div className="flex items-center gap-2 text-muted"><Mail size={14} className="shrink-0" /><span className="font-mono text-xs truncate">{applicant.email}</span></div>
          )}
          {applicant.phone && (
            <div className="flex items-center gap-2 text-muted"><Phone size={14} className="shrink-0" /><span className="font-mono text-xs truncate">{applicant.phone}</span></div>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs mono-label uppercase tracking-wide text-muted">Hiring stage</span>
          <select
            className="select h-7 text-xs"
            value={applicant.status}
            disabled={busy}
            aria-label="Override stage"
            onChange={e => onStatus?.(e.target.value)}
          >
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            <option value="REJECTED">Rejected</option>
            <option value="DISQUALIFIED">Disqualified</option>
          </select>
        </div>

        {TERMINAL.includes(applicant.status) ? (
          <div className="flex items-center gap-2 text-sm">
            {applicant.status === 'HIRED' ? <CheckCircle size={16} className="text-accent" /> : <XCircle size={16} className="text-error" />}
            <span className="font-medium">{applicant.status === 'HIRED' ? 'Converted — applicant is now an employee.' : 'Closed — pipeline ended.'}</span>
          </div>
        ) : (
          <>
            <ol className="space-y-1">
              {STAGES.map((s, i) => {
                const state = i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'todo';
                return (
                  <li key={s.key} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${state === 'current' ? 'bg-accent/10 text-accent font-semibold' : state === 'done' ? 'text-muted' : 'text-muted/70'}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${state === 'done' ? 'bg-accent' : state === 'current' ? 'bg-ink ring-4 ring-accent/20' : 'bg-line'}`} />
                    <span className="flex-1">{s.label}</span>
                    {state === 'current' && <ChevronRight size={14} className="shrink-0" />}
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 flex gap-2">
              <button className="btn btn-primary flex-1 h-8 text-xs" disabled={busy || !canAdvance} onClick={() => onAdvance?.(STAGES[stageIndex + 1].key)}>
                Advance to {STAGES[stageIndex + 1]?.label ?? 'next'}
              </button>
              {canHire && (
                <button className="btn btn-secondary flex-1 h-8 text-xs" disabled={busy} onClick={() => onHire?.(applicant)}>
                  <CheckCircle size={13} /> Hire
                </button>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <button className="btn btn-ghost h-7 px-2 text-xs text-error" disabled={busy} onClick={() => setRejectKind('REJECTED')}>Reject</button>
              <button className="btn btn-ghost h-7 px-2 text-xs" disabled={busy} onClick={() => setRejectKind('DISQUALIFIED')}>Disqualify</button>
            </div>
          </>
        )}
      </div>

      <div className="card p-4">
        <span className="block text-xs mono-label uppercase tracking-wide text-muted mb-3">Evaluation scores</span>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['eligibilityScore', 'Eligibility'],
            ['screeningScore', 'Screening'],
            ['interviewScore', 'Interview'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-muted mb-1">{label}</label>
              <input
                type="number" min={0} max={100}
                className="input text-xs h-8 font-mono"
                value={scores[key]}
                disabled={busy}
                onChange={e => setScores({ ...scores, [key]: e.target.value.replace(/[^\d]/g, '') })}
              />
            </div>
          ))}
        </div>
        <button className="btn btn-secondary w-full mt-3 h-8 text-xs gap-1" disabled={!dirty || saving} onClick={saveScores}>
          <Save size={13} /> {saving ? 'Saving…' : 'Save scores'}
        </button>
      </div>

      <div className="card p-4">
        <span className="block text-xs mono-label uppercase tracking-wide text-muted mb-3">CSC / PRC eligibility</span>
        <EligibilityCard applicant={applicant} refreshKey={refreshKey} />
      </div>

      {applicant.selectionBoardNotes && (
        <div className="card p-4">
          <span className="block text-xs mono-label uppercase tracking-wide text-muted mb-2">Selection board notes</span>
          <p className="text-sm text-muted leading-relaxed">{applicant.selectionBoardNotes}</p>
        </div>
      )}

      <ConfirmDialog
        open={!!rejectKind}
        onClose={() => setRejectKind(null)}
        title={rejectKind === 'REJECTED' ? 'Reject applicant' : 'Disqualify applicant'}
        message={`Mark ${fullName} as ${rejectKind === 'REJECTED' ? 'rejected' : 'disqualified'}? This closes the candidate's pipeline.`}
        confirmLabel={rejectKind === 'REJECTED' ? 'Reject' : 'Disqualify'}
        danger
        onConfirm={() => onReject?.(rejectKind)}
      />
    </div>
  );
}