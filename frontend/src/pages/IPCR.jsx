import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';
import { FileText, User, Star, TrendingUp, Save, Plus, Trash2, Printer, X, Calculator } from 'lucide-react';

const ADJECTIVAL_COLOR = {
  OUTSTANDING: 'text-emerald-600',
  VERY_SATISFACTORY: 'text-teal-600',
  SATISFACTORY: 'text-blue-600',
  UNSATISFACTORY: 'text-amber-600',
  POOR: 'text-red-600',
};

function RatingBadge({ rating }) {
  if (!rating) return <span className="text-muted">—</span>;
  const color = ADJECTIVAL_COLOR[rating.adjectival] || 'text-muted';
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className={`font-mono text-lg font-bold ${color}`}>{String(rating.final ?? '—').padStart(1, '0')}</span>
      <span className={`text-xs uppercase mono-label ${color}`}>{rating.adjectival?.replace('_', ' ')}</span>
    </div>
  );
}

function TargetRow({ t, onChange, onRemove }) {
  const [draft, setDraft] = useState({ ...t });
  const avg = useMemo(() => {
    const q = Number(draft.qualityScore) || 0;
    const e = Number(draft.efficiencyScore) || 0;
    const tm = Number(draft.timelinessScore) || 0;
    const vals = [q, e, tm].filter(v => v > 0);
    if (vals.length === 0) return '';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  }, [draft.qualityScore, draft.efficiencyScore, draft.timelinessScore]);

  useEffect(() => {
    onChange({ ...draft, averageScore: avg });
  }, [avg, draft]);

  return (
    <div className="border border-paper rounded-lg p-3 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="mono-label text-xs">KRA</label>
          <input className="input" value={draft.kra || ''} onChange={e => setDraft({ ...draft, kra: e.target.value })} placeholder="Key Result Area" />
          <label className="mono-label text-xs">Output Group</label>
          <select className="select" value={draft.outputGroup || 'CORE'} onChange={e => setDraft({ ...draft, outputGroup: e.target.value })}>
            <option value="CORE">CORE</option>
            <option value="STRATEGIC">STRATEGIC</option>
            <option value="SUPPORT">SUPPORT</option>
          </select>
          <label className="mono-label text-xs">Success Indicator</label>
          <input className="input col-span-2" value={draft.successIndicator || ''} onChange={e => setDraft({ ...draft, successIndicator: e.target.value })} placeholder="Target + Measures" />
          <label className="mono-label text-xs">Weight %</label>
          <input type="number" className="input" value={draft.weight || ''} onChange={e => setDraft({ ...draft, weight: e.target.value })} />
          <label className="mono-label text-xs">Target Qty</label>
          <input type="number" className="input" value={draft.targetQuantity || ''} onChange={e => setDraft({ ...draft, targetQuantity: e.target.value })} />
          <label className="mono-label text-xs">Unit</label>
          <input className="input" value={draft.targetUnit || ''} onChange={e => setDraft({ ...draft, targetUnit: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="mono-label text-xs">Q1 Actual</label>
          <input className="input" value={draft.q1Actual || ''} onChange={e => setDraft({ ...draft, q1Actual: e.target.value })} />
          <label className="mono-label text-xs">Q2 Actual</label>
          <input className="input" value={draft.q2Actual || ''} onChange={e => setDraft({ ...draft, q2Actual: e.target.value })} />
          <label className="mono-label text-xs">Q3 Actual</label>
          <input className="input" value={draft.q3Actual || ''} onChange={e => setDraft({ ...draft, q3Actual: e.target.value })} />
          <label className="mono-label text-xs">Q4 Actual</label>
          <input className="input" value={draft.q4Actual || ''} onChange={e => setDraft({ ...draft, q4Actual: e.target.value })} />
          <label className="mono-label text-xs">Annual Actual</label>
          <input className="input col-span-2" value={draft.annualActual || ''} onChange={e => setDraft({ ...draft, annualActual: e.target.value })} />
          <label className="mono-label text-xs">Means of Verification</label>
          <input className="input col-span-2" value={draft.meansOfVerification || ''} onChange={e => setDraft({ ...draft, meansOfVerification: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="mono-label text-xs">Quality (1–5)</label>
          <input type="number" min="1" max="5" step="0.1" className="input" value={draft.qualityScore || ''} onChange={e => setDraft({ ...draft, qualityScore: e.target.value })} />
        </div>
        <div>
          <label className="mono-label text-xs">Efficiency (1–5)</label>
          <input type="number" min="1" max="5" step="0.1" className="input" value={draft.efficiencyScore || ''} onChange={e => setDraft({ ...draft, efficiencyScore: e.target.value })} />
        </div>
        <div>
          <label className="mono-label text-xs">Timeliness (1–5)</label>
          <input type="number" min="1" max="5" step="0.1" className="input" value={draft.timelinessScore || ''} onChange={e => setDraft({ ...draft, timelinessScore: e.target.value })} />
        </div>
        <div>
          <label className="mono-label text-xs">Average Score</label>
          <input className="input" readOnly value={avg} />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="mono-label text-xs text-muted">{draft.outputGroup} · Weight {draft.weight || 0}%</span>
        <button className="btn btn-ghost text-error" onClick={onRemove}><Trash2 size={14} /> Remove</button>
      </div>
    </div>
  );
}

function CompetencyRow({ c, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-paper">
      <div className="flex-1">
        <div className="font-medium text-sm">{c.competencyName || '—'}</div>
        <div className="text-xs text-muted">{c.competencyCode}</div>
      </div>
      <input type="number" min="1" max="5" step="0.1" className="input w-24" value={c.score || ''} onChange={e => onChange({ ...c, score: e.target.value })} placeholder="Score" />
      <input type="number" min="0" max="100" className="input w-24" value={c.weight || ''} onChange={e => onChange({ ...c, weight: e.target.value })} placeholder="Weight %" />
      <button className="btn btn-ghost text-error" onClick={onRemove}><Trash2 size={14} /></button>
    </div>
  );
}

export default function IPCR() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [targets, setTargets] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/performance');
      setReviews(r.data.items ?? []);
    } catch {
      setError(true);
      toast('Failed to load appraisals', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) return;
    const loadDetail = async () => {
      try {
        const r = await api.get(`/performance/${selected.id}`);
        setTargets(r.data.targets ?? []);
        setCompetencies((r.data.competencies ?? []).map(c => ({ ...c })));
      } catch {
        toast('Failed to load review details', 'error');
      }
    };
    loadDetail();
  }, [selected]);

  const computed = useMemo(() => {
    if (!selected) return null;
    return selected.computed || null;
  }, [selected]);

  const saveTargets = async () => {
    if (!selected) return;
    try {
      for (const t of targets) {
        if (t.id) await api.patch(`/performance/${selected.id}/targets/${t.id}`, t);
        else await api.post(`/performance/${selected.id}/targets`, t);
      }
      toast('Targets saved', 'success');
      load();
    } catch {
      toast('Failed to save targets', 'error');
    }
  };

  const computeReview = async () => {
    if (!selected) return;
    try {
      const r = await api.post(`/performance/${selected.id}/compute`);
      setSelected(r.data);
      toast('Review computed', 'success');
    } catch {
      toast('Failed to compute review', 'error');
    }
  };

  const statusOptions = ['PLANNING', 'MONITORING', 'REVIEW', 'APPROVED'];

  return (
    <Layout title="IPCR/OPCR Appraisal">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <FileText size={20} className="text-accent" />
            IPCR/OPCR Appraisal
          </h1>
          <p className="text-sm text-muted mt-0.5">SPMS performance commitments, quarterly monitoring, and ratings</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 card p-4 h-fit">
          <div className="flex items-center justify-between mb-3">
            <span className="mono-label uppercase text-xs text-muted">Reviews</span>
            <span className="mono-label text-xs">{reviews.length}</span>
          </div>
          {loading ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {reviews.map(r => (
                <button
                  key={r.id}
                  className={`w-full text-left p-3 rounded-lg border transition ${selected?.id === r.id ? 'border-accent bg-paper' : 'border-paper hover:border-ink/10'}`}
                  onClick={() => setSelected(r)}
                >
                  <div className="font-medium text-sm">
                    {r.employee ? `${r.employee.lastName}, ${r.employee.firstName}` : '—'}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="badge badge-info text-xs">{r.reviewType}</span>
                    <span className={`badge ${badgeTone(r.status)} text-xs`}>{r.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-bold">
                      {selected.employee ? `${selected.employee.lastName}, ${selected.employee.firstName}` : '—'} · {selected.reviewType} {selected.reviewYear}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`badge ${badgeTone(selected.status)}`}>{selected.status}</span>
                      {computed && <RatingBadge rating={{ final: computed.rating, adjectival: computed.adjectival }} />}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost gap-2" onClick={() => setPrintOpen(true)}><Printer size={16} /> Print</button>
                    <button className="btn btn-primary gap-2" onClick={computeReview}><Calculator size={16} /> Compute</button>
                  </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-4 gap-3">
                  {['coreWeight', 'strategicWeight', 'supportWeight', 'competencyWeight'].map(k => (
                    <div key={k} className="p-3 rounded-lg border border-paper">
                      <div className="mono-label text-xs uppercase text-muted">{k.replace('Weight', '')}</div>
                      <div className="font-mono text-lg">{selected[k] || 0}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold flex items-center gap-2"><Star size={18} className="text-accent" /> Part I — Performance Targets</h3>
                  <button className="btn btn-ghost text-xs" onClick={() => setTargets(t => [...t, { kra: '', successIndicator: '', outputGroup: 'CORE', weight: 0, targetQuantity: 0, targetUnit: '', q1Actual: '', q2Actual: '', q3Actual: '', q4Actual: '', annualActual: '', qualityScore: '', efficiencyScore: '', timelinessScore: '', meansOfVerification: '' }])}>
                    <Plus size={14} /> Add Target
                  </button>
                </div>
                <div className="space-y-3">
                  {targets.length === 0 && <p className="text-muted text-sm">No targets added yet.</p>}
                  {targets.map((t, idx) => (
                    <TargetRow
                      key={t.id || idx}
                      t={t}
                      onChange={(upd) => setTargets(list => list.map((x, i) => i === idx ? upd : x))}
                      onRemove={() => setTargets(list => list.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="btn btn-primary" onClick={saveTargets}><Save size={16} /> Save Targets</button>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><User size={18} className="text-accent" /> Part II — Competency Assessment</h3>
                <div className="space-y-2">
                  {competencies.map((c, idx) => (
                    <CompetencyRow
                      key={c.id}
                      c={c}
                      onChange={(upd) => setCompetencies(list => list.map((x, i) => i === idx ? upd : x))}
                      onRemove={() => setCompetencies(list => list.filter((_, i) => i !== idx))}
                    />
                  ))}
                  {competencies.length === 0 && <p className="text-muted text-sm">No competencies added.</p>}
                </div>
              </div>

              {computed && (
                <div className="card p-5">
                  <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-accent" /> Part III — Summary of Ratings</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-paper">
                      <div className="mono-label text-xs uppercase text-muted">Part I (Performance)</div>
                      <div className="font-mono text-2xl">{computed.partI ?? '—'}</div>
                    </div>
                    <div className="p-4 rounded-lg border border-paper">
                      <div className="mono-label text-xs uppercase text-muted">Part II (Competency)</div>
                      <div className="font-mono text-2xl">{computed.partII ?? '—'}</div>
                    </div>
                    <div className="p-4 rounded-lg border border-paper">
                      <div className="mono-label text-xs uppercase text-muted">Final Rating</div>
                      <RatingBadge rating={{ final: computed.rating, adjectival: computed.adjectival }} />
                    </div>
                  </div>
                  <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
                    {Object.entries(computed.groupAverages || {}).map(([k, v]) => (
                      <div key={k} className="p-3 rounded border border-paper">
                        <div className="mono-label text-xs uppercase text-muted">{k}</div>
                        <div className="font-mono">{v ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-10 text-center text-muted">
              Select a review to edit its IPCRF.
            </div>
          )}
        </div>
      </div>

      <Modal open={printOpen} onClose={() => setPrintOpen(false)} title="IPCR Print Preview" size="lg">
        <div className="text-sm text-muted">Printable IPCRF view would render here with Part I/II/III summary formatting.</div>
      </Modal>
    </Layout>
  );
}
