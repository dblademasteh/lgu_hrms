import { useEffect, useMemo, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';
import { useUserCapabilities } from '../config/permissions.js';
import { useAuthStore } from '../stores/authStore.js';
import { openHtmlString } from '../lib/print.js';
import Tabs, { TabList, Tab, TabPanel } from '../components/Tabs.jsx';
import {
  listPerformanceReviews,
  getPerformanceReview,
  createPerformanceReview,
  updatePerformanceReview,
  deletePerformanceReview,
  listCompetencies,
  createCompetency,
  deleteCompetency,
  addTarget,
  updateTarget,
  removeTarget,
  computeReview,
  listReviewCompetencies,
  addReviewCompetency,
  updateReviewCompetency,
  removeReviewCompetency,
} from '../api/performance.js';
import { listEmployees } from '../api/employees.js';
import {
  FileText, User, Star, TrendingUp, Save, Plus, Trash2, Printer,
  X, Calculator, RefreshCw, CheckCircle, RotateCcw, Ban, Send,
  ChevronDown, ChevronUp, Edit, Eye, Target, Award,
} from 'lucide-react';

const ADJECTIVAL_TONE = {
  OUTSTANDING: 'badge-success',
  VERY_SATISFACTORY: 'badge-success',
  SATISFACTORY: 'badge-accent',
  UNSATISFACTORY: 'badge-warning',
  POOR: 'badge-error',
};

const WEIGHT_FIELDS = [
  { key: 'coreWeight', label: 'Core' },
  { key: 'strategicWeight', label: 'Strategic' },
  { key: 'supportWeight', label: 'Support' },
  { key: 'competencyWeight', label: 'Competency' },
];

const WORKFLOW = {
  PLANNING: [
    { label: 'Start Monitoring', to: 'MONITORING', icon: CheckCircle, variant: 'outline' },
    { label: 'Submit for Review', to: 'REVIEW', icon: Send, variant: 'primary' },
    { label: 'Cancel', to: 'CANCELLED', icon: Ban, variant: 'danger' },
  ],
  MONITORING: [
    { label: 'Submit for Review', to: 'REVIEW', icon: Send, variant: 'primary' },
    { label: 'Back to Planning', to: 'PLANNING', icon: RotateCcw, variant: 'outline' },
    { label: 'Cancel', to: 'CANCELLED', icon: Ban, variant: 'danger' },
  ],
  REVIEW: [
    { label: 'Approve', to: 'APPROVED', icon: CheckCircle, variant: 'primary' },
    { label: 'Reject', to: 'REJECTED', icon: X, variant: 'outline' },
    { label: 'Return to Monitoring', to: 'MONITORING', icon: RotateCcw, variant: 'outline' },
  ],
  APPROVED: [],
  REJECTED: [{ label: 'Reopen', to: 'MONITORING', icon: RotateCcw, variant: 'outline' }],
  CANCELLED: [],
};

const EDITABLE_STATUSES = ['PLANNING', 'MONITORING', 'REJECTED'];

const OUTPUT_GROUP_OPTIONS = [
  { value: 'CORE', label: 'Core' },
  { value: 'STRATEGIC', label: 'Strategic' },
  { value: 'SUPPORT', label: 'Support' },
];

const REVIEW_TYPES = [
  { value: 'IPCR', label: 'IPCR — Individual Performance Commitment and Review' },
  { value: 'OPCR', label: 'OPCR — Office Performance Commitment and Review' },
];

const emptyTarget = () => ({
  kra: '',
  successIndicator: '',
  outputGroup: 'CORE',
  weight: 0,
  targetQuantity: '',
  targetUnit: '',
  q1Actual: '',
  q2Actual: '',
  q3Actual: '',
  q4Actual: '',
  annualActual: '',
  qualityScore: '',
  efficiencyScore: '',
  timelinessScore: '',
  meansOfVerification: '',
});

function errMsg(e) {
  return e.response?.data?.error?.message || e.message || 'Operation failed';
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
}

function fmt(v) {
  return v == null || v === '' ? '—' : Number(v).toFixed(2);
}

function RatingBadge({ rating, size = 'md' }) {
  if (!rating || rating.final == null) {
    return <span className="text-sm text-muted">Not yet rated</span>;
  }
  const tone = ADJECTIVAL_TONE[rating.adjectival] || 'badge';
  const sizeClasses = size === 'lg' ? 'text-xl px-3 py-1' : 'text-sm px-2 py-0.5';
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className={`font-mono font-bold ${sizeClasses} ${tone.replace('badge-', 'text-')}`}>
        {Number(rating.final).toFixed(2)}
      </span>
      <span className={`mono-label text-xs uppercase ${tone.replace('badge-', 'text-')}`}>
        {(rating.adjectival || '—').replace(/_/g, ' ')}
      </span>
    </div>
  );
}

function TargetRow({ target, index, onChange, onRemove, onDuplicate }) {
  const avg = useMemo(() => {
    const vals = [target.qualityScore, target.efficiencyScore, target.timelinessScore]
      .map(v => Number(v))
      .filter(v => Number.isFinite(v));
    if (vals.length === 0) return '';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  }, [target.qualityScore, target.efficiencyScore, target.timelinessScore]);

  const set = patch => onChange(index, { ...target, ...patch, averageScore: avg });

  return (
    <div className="rounded-lg border border-line p-4 space-y-4 bg-bg/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="mono-label text-xs">KRA</label>
              <input
                className="input"
                value={target.kra || ''}
                onChange={e => set({ kra: e.target.value })}
                placeholder="Key Result Area"
                aria-label="Key Result Area"
              />
            </div>
            <div>
              <label className="mono-label text-xs">Output Group</label>
              <select
                className="select"
                value={target.outputGroup || 'CORE'}
                onChange={e => set({ outputGroup: e.target.value })}
                aria-label="Output Group"
              >
                {OUTPUT_GROUP_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mono-label text-xs">Success Indicator</label>
              <input
                className="input"
                value={target.successIndicator || ''}
                onChange={e => set({ successIndicator: e.target.value })}
                placeholder="Target + Measures"
                aria-label="Success Indicator"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 md:col-span-3">
              <div>
                <label className="mono-label text-xs">Weight %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input"
                  value={target.weight ?? ''}
                  onChange={e => set({ weight: e.target.value })}
                  aria-label="Weight percentage"
                />
              </div>
              <div>
                <label className="mono-label text-xs">Target Qty</label>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={target.targetQuantity ?? ''}
                  onChange={e => set({ targetQuantity: e.target.value })}
                  aria-label="Target Quantity"
                />
              </div>
              <div>
                <label className="mono-label text-xs">Unit</label>
                <input
                  className="input"
                  value={target.targetUnit || ''}
                  onChange={e => set({ targetUnit: e.target.value })}
                  aria-label="Unit"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button className="btn btn-ghost p-2" onClick={() => onDuplicate(index)} aria-label="Duplicate target"><Target size={14} /></button>
          <button className="btn btn-ghost p-2 text-error" onClick={() => onRemove(index)} aria-label="Remove target"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="mono-label text-xs">Means of Verification</label>
          <input
            className="input"
            value={target.meansOfVerification || ''}
            onChange={e => set({ meansOfVerification: e.target.value })}
            placeholder="Supporting documents / evidence"
            aria-label="Means of Verification"
          />
        </div>
        <div>
          <label className="mono-label text-xs">Annual Actual</label>
          <input
            className="input"
            value={target.annualActual || ''}
            onChange={e => set({ annualActual: e.target.value })}
            aria-label="Annual Actual"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="mono-label text-xs">Quality (1–5)</label>
          <input
            type="number"
            min="1"
            max="5"
            step="0.1"
            className="input"
            value={target.qualityScore ?? ''}
            onChange={e => set({ qualityScore: e.target.value })}
            aria-label="Quality score"
          />
        </div>
        <div>
          <label className="mono-label text-xs">Efficiency (1–5)</label>
          <input
            type="number"
            min="1"
            max="5"
            step="0.1"
            className="input"
            value={target.efficiencyScore ?? ''}
            onChange={e => set({ efficiencyScore: e.target.value })}
            aria-label="Efficiency score"
          />
        </div>
        <div>
          <label className="mono-label text-xs">Timeliness (1–5)</label>
          <input
            type="number"
            min="1"
            max="5"
            step="0.1"
            className="input"
            value={target.timelinessScore ?? ''}
            onChange={e => set({ timelinessScore: e.target.value })}
            aria-label="Timeliness score"
          />
        </div>
        <div>
          <label className="mono-label text-xs">Average Score</label>
          <input className="input" readOnly value={avg} aria-label="Average score" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-line/50">
        <span className="mono-label text-xs text-muted">
          {target.outputGroup} · Weight {target.weight || 0}%
        </span>
        <div className="flex items-center gap-1 text-xs text-muted">
          Q1: {target.q1Actual || '—'} · Q2: {target.q2Actual || '—'} · Q3: {target.q3Actual || '—'} · Q4: {target.q4Actual || '—'}
        </div>
      </div>
    </div>
  );
}

function CompetencyRow({ competency, onSave, onRemove, onEdit, isEditing, saving }) {
  const [draft, setDraft] = useState({
    score: competency.score ?? '',
    maxScore: competency.maxScore ?? 5,
    weight: competency.weight ?? 10,
    comments: competency.comments ?? '',
  });

  useEffect(() => {
    setDraft({
      score: competency.score ?? '',
      maxScore: competency.maxScore ?? 5,
      weight: competency.weight ?? 10,
      comments: competency.comments ?? '',
    });
  }, [competency.id, competency.score, competency.maxScore, competency.weight, competency.comments]);

  const save = () => {
    const payload = {
      score: draft.score === '' ? undefined : Number(draft.score),
      maxScore: draft.maxScore === '' ? undefined : Number(draft.maxScore),
      weight: draft.weight === '' ? undefined : Number(draft.weight),
      comments: draft.comments || undefined,
    };
    onSave(payload);
    onEdit(false);
  };

  return (
    <div className="rounded-lg border border-line p-4 space-y-3 bg-bg/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm text-ink">{competency.competencyName || '—'}</div>
            <span className="mono-label text-xs text-muted">{competency.competencyCode}</span>
          </div>
          <div className="text-xs text-muted mt-0.5">
            {competency.description || 'No description'}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <>
              <button className="btn btn-ghost p-2" onClick={() => onEdit(false)} aria-label="Cancel edit"><X size={14} /></button>
              <button className="btn btn-primary p-2" onClick={save} disabled={saving} aria-label="Save competency"><Save size={14} /></button>
            </>
          ) : (
            <button className="btn btn-ghost p-2 text-accent" onClick={() => onEdit(true)} aria-label="Edit competency"><Edit size={14} /></button>
          )}
          <button className="btn btn-ghost p-2 text-error" onClick={onRemove} aria-label="Remove competency"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mono-label text-xs">Score (1–5)</label>
          <input
            type="number"
            min="1"
            max="5"
            step="0.1"
            className="input"
            value={draft.score}
            onChange={e => setDraft(d => ({ ...d, score: e.target.value }))}
            disabled={!isEditing}
            aria-label="Competency score"
          />
        </div>
        <div>
          <label className="mono-label text-xs">Max Score</label>
          <input
            type="number"
            min="1"
            max="100"
            className="input"
            value={draft.maxScore}
            onChange={e => setDraft(d => ({ ...d, maxScore: e.target.value }))}
            disabled={!isEditing}
            aria-label="Max score"
          />
        </div>
        <div>
          <label className="mono-label text-xs">Weight %</label>
          <input
            type="number"
            min="0"
            max="100"
            className="input"
            value={draft.weight}
            onChange={e => setDraft(d => ({ ...d, weight: e.target.value }))}
            disabled={!isEditing}
            aria-label="Competency weight"
          />
        </div>
      </div>

      {isEditing && draft.comments !== undefined && (
        <div>
          <label className="mono-label text-xs">Comments</label>
          <textarea
            className="input min-h-[60px]"
            value={draft.comments}
            onChange={e => setDraft(d => ({ ...d, comments: e.target.value }))}
            placeholder="Optional remarks"
            aria-label="Competency comments"
          />
        </div>
      )}
    </div>
  );
}

function buildIPCRFHtml(review, targets, competencies, computed) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const emp = review.employee || {};
  const name = esc(`${emp.lastName || '—'}, ${emp.firstName || '—'}`);
  const dept = esc(emp.department?.name || '—');
  const position = esc(emp.position?.title || '—');
  const period = `${formatDate(review.periodStart)} to ${formatDate(review.periodEnd)}`;
  const g = computed?.groupAverages || {};

  const targetRows = (targets || []).map(t => `
    <tr>
      <td>${esc(t.kra)}</td>
      <td>${esc(t.successIndicator)}</td>
      <td class="c">${esc(t.outputGroup || 'CORE')}</td>
      <td class="c">${t.weight ?? 0}</td>
      <td class="c">${t.targetQuantity == null || t.targetQuantity === '' ? '—' : `${t.targetQuantity}${t.targetUnit ? ' ' + esc(t.targetUnit) : ''}`}</td>
      <td class="c">${esc(t.annualActual) || '—'}</td>
      <td class="c">${fmt(t.qualityScore)}</td>
      <td class="c">${fmt(t.efficiencyScore)}</td>
      <td class="c">${fmt(t.timelinessScore)}</td>
      <td class="c">${fmt(t.averageScore)}</td>
    </tr>`).join('') || '<tr><td colspan="10" class="c muted">No targets recorded.</td></tr>';

  const compRows = (competencies || []).map(c => `
    <tr>
      <td>${esc(c.competencyName || c.competencyCode || '—')}</td>
      <td class="c">${esc(c.competencyCode)}</td>
      <td class="c">${fmt(c.score)}</td>
      <td class="c">${fmt(c.maxScore)}</td>
      <td class="c">${fmt(c.weight)}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="c muted">No competencies recorded.</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>IPCRF — ${name}</title>
<style>
  body { font-family: 'Times New Roman', Times, serif; color: black; margin: 40px; font-size: 12px; line-height: 1.4; }
  h1 { font-size: 20px; color: navy; text-align: center; margin: 0 0 2px; }
  h2 { font-size: 14px; color: navy; text-align: center; margin: 0 0 18px; font-weight: normal; }
  h3 { color: maroon; font-size: 13px; border-bottom: 2px solid maroon; padding-bottom: 4px; margin: 22px 0 8px; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.meta td { border: 1px solid gray; padding: 5px 10px; }
  table.meta .label { font-weight: bold; color: navy; width: 150px; }
  table.grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.grid th { border: 1px solid gray; background: white; color: navy; padding: 5px 6px; font-size: 11px; text-align: left; }
  table.grid td { border: 1px solid gray; padding: 5px 6px; vertical-align: top; }
  .c { text-align: center; }
  .muted { color: gray; }
  .rating { font-size: 20px; font-weight: bold; color: navy; }
  .sign { display: flex; justify-content: space-between; margin-top: 70px; }
  .sign .line { border-top: 1px solid black; width: 280px; text-align: center; padding-top: 6px; font-size: 11px; }
</style>
</head>
<body>
  <h1>Republic of the Philippines</h1>
  <h2>Local Government Unit HRMS — ${esc(review.reviewType)} Performance Commitment and Review</h2>

  <table class="meta">
    <tr><td class="label">Employee</td><td>${name}</td><td class="label">Position</td><td>${position}</td></tr>
    <tr><td class="label">Department</td><td>${dept}</td><td class="label">Review Year</td><td>${review.reviewYear ?? '—'}</td></tr>
    <tr><td class="label">Review Type</td><td>${esc(review.reviewType)}</td><td class="label">Period</td><td>${period}</td></tr>
    <tr><td class="label">Status</td><td colspan="3">${esc(review.status)}</td></tr>
  </table>

  <h3>Part I — Performance Targets and Rating</h3>
  <table class="grid">
    <thead>
      <tr>
        <th>KRA</th>
        <th>Success Indicator</th>
        <th class="c">Output Group</th>
        <th class="c">Weight %</th>
        <th class="c">Target</th>
        <th class="c">Actual</th>
        <th class="c">Quality</th>
        <th class="c">Efficiency</th>
        <th class="c">Timeliness</th>
        <th class="c">Average</th>
      </tr>
    </thead>
    <tbody>${targetRows}</tbody>
  </table>
  <table class="grid" style="width:50%">
    <tr><th>Output Group Averages</th><th class="c">Rating</th></tr>
    <tr><td>Core</td><td class="c">${fmt(g.core)}</td></tr>
    <tr><td>Strategic</td><td class="c">${fmt(g.strategic)}</td></tr>
    <tr><td>Support</td><td class="c">${fmt(g.support)}</td></tr>
    <tr><td><strong>Part I Total</strong></td><td class="c"><strong>${fmt(computed?.partI)}</strong></td></tr>
  </table>

  <h3>Part II — Competency Assessment</h3>
  <table class="grid">
    <thead>
      <tr><th>Competency</th><th class="c">Code</th><th class="c">Score</th><th class="c">Max</th><th class="c">Weight %</th></tr>
    </thead>
    <tbody>${compRows}</tbody>
  </table>
  <p class="muted">Part II Rating: <strong>${fmt(computed?.partII)}</strong></p>

  <h3>Part III — Summary of Ratings</h3>
  <table class="grid" style="width:60%">
    <tr><th>Component</th><th class="c">Rating</th></tr>
    <tr><td>Part I — Performance</td><td class="c">${fmt(computed?.partI)}</td></tr>
    <tr><td>Part II — Competency</td><td class="c">${fmt(computed?.partII)}</td></tr>
    <tr><td>Weighted Allocation (Performance / Competency)</td><td class="c">${review.coreWeight ?? 50}% + ${review.supportWeight ?? 20}% + ${review.strategicWeight ?? 30}% / ${review.competencyWeight ?? 30}%</td></tr>
    <tr><td><strong>Final Rating</strong></td><td class="c rating">${fmt(computed?.rating)}</td></tr>
    <tr><td><strong>Adjectival Rating</strong></td><td class="c"><strong>${esc((computed?.adjectival || '—').replace(/_/g, ' '))}</strong></td></tr>
  </table>

  ${review.comments ? `<p><strong>Comments:</strong> ${esc(review.comments)}</p>` : ''}

  <div class="sign">
    <div class="line">Rated by — Date</div>
    <div class="line">Final Rating by — Date</div>
  </div>
</body>
</html>`;
}

export default function IPCR() {
  const toast = useToast();
  const user = useAuthStore(s => s.user);
  const caps = useUserCapabilities(!!user);
  const canEdit = !!caps.performanceCRUD;

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [targets, setTargets] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [weightDraft, setWeightDraft] = useState({ coreWeight: 50, strategicWeight: 30, supportWeight: 20, competencyWeight: 30 });
  const [commentsDraft, setCommentsDraft] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('targets');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({});
  const [employees, setEmployees] = useState([]);
  const [opcrReviews, setOpcrReviews] = useState([]);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogList, setCatalogList] = useState([]);
  const [catalogDraft, setCatalogDraft] = useState({ code: '', name: '', description: '' });

  const [compAddOpen, setCompAddOpen] = useState(false);
  const [compForm, setCompForm] = useState({ competencyId: '', score: '', maxScore: 5, weight: 10 });
  const [editingCompetencyId, setEditingCompetencyId] = useState(null);

  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', danger: false, action: async () => {} });

  const computed = useMemo(() => selected?.computed || null, [selected]);

  const fetchDetail = useCallback(async (id) => {
    const [rev, comps] = await Promise.all([
      getPerformanceReview(id),
      listReviewCompetencies(id),
    ]);
    setSelected(rev);
    setTargets((rev.targets ?? []).map(t => ({ ...t })));
    setCompetencies(comps.competencies ?? []);
  }, []);

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      await fetchDetail(id);
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [fetchDetail, toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPerformanceReviews({ page: 1, limit: 100 });
      setReviews(res.items ?? []);
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setTargets([]);
      setCompetencies([]);
      return;
    }
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!selected) return;
    setWeightDraft({
      coreWeight: selected.coreWeight ?? 50,
      strategicWeight: selected.strategicWeight ?? 30,
      supportWeight: selected.supportWeight ?? 20,
      competencyWeight: selected.competencyWeight ?? 30,
    });
    setCommentsDraft(selected.comments ?? '');
    setActiveTab('targets');
  }, [selected]);

  const handleRefresh = async () => {
    await load();
    if (selectedId) await loadDetail(selectedId);
  };

  const openCreate = async () => {
    setCreateForm({
      employeeId: '',
      reviewType: 'IPCR',
      reviewYear: new Date().getFullYear(),
      periodStart: '',
      periodEnd: '',
      comments: '',
      coreWeight: 50,
      strategicWeight: 30,
      supportWeight: 20,
      competencyWeight: 30,
      parentReviewId: '',
    });
    try {
      const [emp, opcr] = await Promise.all([
        listEmployees({ page: 1, limit: 200 }),
        listPerformanceReviews({ page: 1, limit: 200, reviewType: 'OPCR' }),
      ]);
      setEmployees(emp.items ?? []);
      setOpcrReviews(opcr.items ?? []);
      setCreateOpen(true);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const submitCreate = async () => {
    if (!createForm.employeeId) {
      toast('Select an employee', 'error');
      return;
    }
    try {
      const created = await createPerformanceReview({
        employeeId: createForm.employeeId,
        reviewType: createForm.reviewType,
        reviewYear: Number(createForm.reviewYear),
        periodStart: createForm.periodStart || undefined,
        periodEnd: createForm.periodEnd || undefined,
        coreWeight: Number(createForm.coreWeight) || 50,
        strategicWeight: Number(createForm.strategicWeight) || 30,
        supportWeight: Number(createForm.supportWeight) || 20,
        competencyWeight: Number(createForm.competencyWeight) || 30,
        parentReviewId: createForm.parentReviewId || undefined,
        comments: createForm.comments || undefined,
      });
      toast('Review created', 'success');
      setCreateOpen(false);
      await load();
      setSelectedId(created.id);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const parentOptions = (opcrReviews || [])
    .filter(o => o.reviewYear === Number(createForm.reviewYear))
    .sort((a, b) => (a.employee?.lastName || '').localeCompare(b.employee?.lastName || ''));

  const changeStatus = async (to) => {
    if (!selected || statusSaving) return;
    setStatusSaving(true);
    try {
      await updatePerformanceReview(selected.id, { status: to });
      toast(`Status updated to ${to}`, 'success');
      await load();
      await fetchDetail(selected.id);
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setStatusSaving(false);
    }
  };

  const saveWeights = async () => {
    if (!selected) return;
    try {
      await updatePerformanceReview(selected.id, {
        coreWeight: Number(weightDraft.coreWeight) || 0,
        strategicWeight: Number(weightDraft.strategicWeight) || 0,
        supportWeight: Number(weightDraft.supportWeight) || 0,
        competencyWeight: Number(weightDraft.competencyWeight) || 0,
      });
      toast('Weights saved', 'success');
      await fetchDetail(selected.id);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const saveComments = async () => {
    if (!selected) return;
    try {
      await updatePerformanceReview(selected.id, { comments: commentsDraft });
      toast('Comments saved', 'success');
      await fetchDetail(selected.id);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const handleCompute = async () => {
    if (!selected) return;
    try {
      await computeReview(selected.id);
      toast('Review computed', 'success');
      await fetchDetail(selected.id);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const handlePrint = () => {
    if (!selected) return;
    openHtmlString(buildIPCRFHtml(selected, targets, competencies, computed));
  };

  const confirmDeleteReview = () => {
    if (!selected) return;
    const emp = selected.employee || {};
    setConfirm({
      open: true,
      title: 'Delete review?',
      message: `Delete ${emp.lastName || ''} ${emp.firstName || ''}'s ${selected.reviewType} ${selected.reviewYear}? This cannot be undone.`,
      danger: true,
      action: async () => {
        try {
          await deletePerformanceReview(selected.id);
          toast('Review deleted', 'success');
          setSelectedId(null);
          await load();
        } catch (e) {
          toast(errMsg(e), 'error');
        }
      },
    });
  };

  const addTargetRow = () => setTargets(list => [...list, emptyTarget()]);

  const duplicateTargetRow = (idx) => setTargets(list => [...list.slice(0, idx + 1), { ...list[idx], id: undefined }, ...list.slice(idx + 1)]);

  const updateTargetRow = (idx, upd) => setTargets(list => list.map((x, i) => (i === idx ? upd : x)));

  const handleRemoveTarget = (t, idx) => {
    if (!t.id) {
      setTargets(list => list.filter((_, i) => i !== idx));
      return;
    }
    setConfirm({
      open: true,
      title: 'Remove target?',
      message: `Delete "${t.kra || 'this target'}" from the review?`,
      danger: true,
      action: async () => {
        try {
          await removeTarget(selected.id, t.id);
          toast('Target removed', 'success');
          await loadDetail(selected.id);
        } catch (e) {
          toast(errMsg(e), 'error');
        }
      },
    });
  };

  const saveTargets = async () => {
    if (!selected) return;
    try {
      for (const t of targets) {
        const n = v => (v === '' || v == null ? null : Number(v));
        const payload = {
          kra: t.kra || '',
          successIndicator: t.successIndicator || '',
          outputGroup: t.outputGroup || 'CORE',
          weight: Number(t.weight) || 0,
          targetQuantity: n(t.targetQuantity),
          targetUnit: t.targetUnit || null,
          q1Actual: t.q1Actual || null,
          q2Actual: t.q2Actual || null,
          q3Actual: t.q3Actual || null,
          q4Actual: t.q4Actual || null,
          annualActual: t.annualActual || null,
          qualityScore: n(t.qualityScore),
          efficiencyScore: n(t.efficiencyScore),
          timelinessScore: n(t.timelinessScore),
          meansOfVerification: t.meansOfVerification || null,
        };
        if (t.id) await updateTarget(selected.id, t.id, payload);
        else await addTarget(selected.id, payload);
      }
      toast('Targets saved', 'success');
      await loadDetail(selected.id);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const openCatalog = async () => {
    setCatalogOpen(true);
    try {
      const res = await listCompetencies({ page: 1, limit: 100 });
      setCatalogList(res.items ?? []);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const catalogRefresh = async () => {
    try {
      const res = await listCompetencies({ page: 1, limit: 100 });
      setCatalogList(res.items ?? []);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const catalogAdd = async () => {
    if (!catalogDraft.code.trim() || !catalogDraft.name.trim()) {
      toast('Code and name are required', 'error');
      return;
    }
    try {
      await createCompetency({
        code: catalogDraft.code.trim(),
        name: catalogDraft.name.trim(),
        description: catalogDraft.description?.trim() || undefined,
      });
      toast('Competency created', 'success');
      setCatalogDraft({ code: '', name: '', description: '' });
      await catalogRefresh();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const catalogRemove = (c) => {
    setConfirm({
      open: true,
      title: 'Remove competency?',
      message: `Delete "${c.name}" from the catalog? It cannot be removed while used by a review.`,
      danger: true,
      action: async () => {
        try {
          await deleteCompetency(c.id);
          toast('Competency removed', 'success');
          await catalogRefresh();
          if (selectedId) await loadDetail(selectedId);
        } catch (e) {
          toast(errMsg(e), 'error');
        }
      },
    });
  };

  const openAddCompetency = async () => {
    setCompForm({ competencyId: '', score: '', maxScore: 5, weight: 10 });
    try {
      const res = await listCompetencies({ page: 1, limit: 100 });
      setCatalogList(res.items ?? []);
      setCompAddOpen(true);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const submitAddCompetency = async () => {
    if (!compForm.competencyId) {
      toast('Select a competency from the catalog', 'error');
      return;
    }
    try {
      await addReviewCompetency(selected.id, {
        competencyId: compForm.competencyId,
        score: compForm.score === '' ? undefined : Number(compForm.score),
        maxScore: compForm.maxScore === '' ? undefined : Number(compForm.maxScore),
        weight: compForm.weight === '' ? undefined : Number(compForm.weight),
      });
      toast('Competency added', 'success');
      setCompAddOpen(false);
      await loadDetail(selected.id);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const saveCompetencyItem = async (item, payload) => {
    try {
      await updateReviewCompetency(selected.id, item.id, payload);
      toast('Competency updated', 'success');
      await loadDetail(selected.id);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const removeCompetencyItem = (item) => {
    setConfirm({
      open: true,
      title: 'Remove competency?',
      message: `Remove "${item.competencyName}" from this review?`,
      danger: true,
      action: async () => {
        try {
          await removeReviewCompetency(selected.id, item.id);
          toast('Competency removed', 'success');
          await loadDetail(selected.id);
        } catch (e) {
          toast(errMsg(e), 'error');
        }
      },
    });
  };

  const targetsEditable = canEdit && selected && EDITABLE_STATUSES.includes(selected.status);
  const competenciesEditable = canEdit && selected && EDITABLE_STATUSES.includes(selected.status);

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <FileText size={20} className="text-accent" />
            IPCR/OPCR Appraisal
          </h1>
          <p className="text-sm text-muted mt-0.5">SPMS performance commitments, quarterly monitoring, and ratings</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={handleRefresh}><RefreshCw size={15} /> Refresh</button>
          {canEdit && <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Review</button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-4 card p-4 h-fit sticky top-24">
          <div className="flex items-center justify-between mb-3">
            <span className="mono-label uppercase text-xs text-muted">Reviews</span>
            <span className="mono-label text-xs">{reviews.length}</span>
          </div>
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted">No reviews yet. Create one to begin.</p>
          ) : (
            <div className="space-y-2 max-h-[65vh] overflow-auto pr-1">
              {reviews.map(r => (
                <button
                  key={r.id}
                  className={`w-full text-left p-3 rounded-lg border transition ${selectedId === r.id ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/40'}`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="font-medium text-sm text-ink truncate">
                    {r.employee ? `${r.employee.lastName}, ${r.employee.firstName}` : '—'}
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">
                    {r.employee?.department?.name || '—'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="mono-label text-xs text-muted">{r.reviewType} · {r.reviewYear}</span>
                    <span className={`badge ${badgeTone(r.status)}`}>{r.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="lg:col-span-8 space-y-4">
          {!selectedId ? (
            <div className="card p-10 text-center text-muted">
              <FileText size={48} className="mx-auto text-line mb-3" aria-hidden="true" />
              <p className="text-lg font-medium">Select a review</p>
              <p className="text-sm mt-1">Choose a review from the list to view and edit its IPCRF.</p>
            </div>
          ) : detailLoading ? (
            <div className="card p-10 text-center text-muted">
              <div className="skeleton h-4 w-48 mx-auto mb-2" />
              <div className="skeleton h-4 w-32 mx-auto" />
              <p className="mt-3">Loading review…</p>
            </div>
          ) : !selected ? (
            <div className="card p-10 text-center text-muted">
              <p>Review not found.</p>
            </div>
          ) : (
            <>
              <div className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-bold text-ink truncate">
                      {selected.employee ? `${selected.employee.lastName}, ${selected.employee.firstName}` : '—'} · {selected.reviewType} {selected.reviewYear}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted">
                      <span>{selected.employee?.department?.name || '—'}</span>
                      <span>·</span>
                      <span>{selected.employee?.position?.title || '—'}</span>
                      <span>·</span>
                      <span>Period: {formatDate(selected.periodStart)} – {formatDate(selected.periodEnd)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${badgeTone(selected.status)}`}>{selected.status}</span>
                      <RatingBadge rating={{ final: computed?.rating, adjectival: computed?.adjectival }} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canEdit && <button className="btn btn-primary gap-2" onClick={handleCompute}><Calculator size={15} /> Compute</button>}
                      <button className="btn btn-outline gap-2" onClick={handlePrint}><Printer size={15} /> Print</button>
                      {canEdit && selected.status !== 'APPROVED' && (
                        <button className="btn btn-ghost gap-2 text-error" onClick={confirmDeleteReview}><Trash2 size={15} /> Delete</button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {WEIGHT_FIELDS.map(w => (
                    <div key={w.key} className="p-3 rounded-lg border border-line bg-bg/50">
                      <div className="mono-label text-xs uppercase text-muted">{w.label} Weight %</div>
                      {canEdit ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="input mt-1"
                          value={weightDraft[w.key] ?? ''}
                          onChange={e => setWeightDraft(d => ({ ...d, [w.key]: e.target.value }))}
                          aria-label={`${w.label} weight percentage`}
                        />
                      ) : (
                        <div className="font-mono text-lg text-ink">{selected[w.key] ?? 0}%</div>
                      )}
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <div className="mt-3 flex justify-end">
                    <button className="btn btn-outline gap-2" onClick={saveWeights}><Save size={15} /> Save Weights</button>
                  </div>
                )}

                {canEdit && (
                  <div className="mt-4">
                    <label className="mono-label text-xs">Comments</label>
                    <textarea
                      className="input min-h-20 mt-1"
                      value={commentsDraft}
                      onChange={e => setCommentsDraft(e.target.value)}
                      placeholder="Rating notes and remarks…"
                      aria-label="Review comments"
                    />
                    <div className="mt-2 flex justify-end">
                      <button className="btn btn-outline gap-2" onClick={saveComments}><Save size={15} /> Save Comments</button>
                    </div>
                  </div>
                )}

                {(WORKFLOW[selected.status] || []).length > 0 && canEdit && (
                  <div className="mt-4 pt-4 border-t border-line flex flex-wrap gap-2">
                    {(WORKFLOW[selected.status] || []).map(a => {
                      const Icon = a.icon;
                      const variantClass = a.variant === 'primary' ? 'btn-primary' : a.variant === 'danger' ? 'btn-danger' : 'btn-outline';
                      return (
                        <button
                          key={a.label}
                          className={`btn gap-2 ${variantClass}`}
                          onClick={() => changeStatus(a.to)}
                          disabled={statusSaving}
                        >
                          <Icon size={15} /> {a.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!canEdit && (
                  <p className="mt-4 text-xs text-muted">Read-only — you do not have performance edit permission.</p>
                )}
              </div>

              <div className="card p-0 overflow-hidden">
                <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabList className="border-b border-line p-1 bg-bg/50" aria-label="IPCRF Sections">
                    <Tab value="targets" className="gap-2">
                      <Target size={16} />
                      <span>Part I — Targets</span>
                    </Tab>
                    <Tab value="competencies" className="gap-2">
                      <Award size={16} />
                      <span>Part II — Competencies</span>
                    </Tab>
                    <Tab value="summary" className="gap-2">
                      <TrendingUp size={16} />
                      <span>Part III — Summary</span>
                    </Tab>
                  </TabList>

                  <TabPanel value="targets" className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h3 className="font-display font-semibold flex items-center gap-2 text-ink">
                        <Target size={18} className="text-accent" /> Performance Targets
                      </h3>
                      {targetsEditable && (
                        <button className="btn btn-primary gap-2" onClick={addTargetRow}><Plus size={14} /> Add Target</button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {targets.length === 0 ? (
                        <div className="text-center py-12 text-muted">
                          <Target size={48} className="mx-auto text-line mb-3" aria-hidden="true" />
                          <p className="text-lg font-medium">No targets added yet.</p>
                          <p className="text-sm mt-1">Add your first performance target to begin.</p>
                          {targetsEditable && (
                            <button className="btn btn-primary mt-4 gap-2" onClick={addTargetRow}><Plus size={14} /> Add First Target</button>
                          )}
                        </div>
                      ) : (
                        targets.map((t, idx) => (
                          <TargetRow
                            key={t.id || `new-${idx}`}
                            target={t}
                            index={idx}
                            onChange={updateTargetRow}
                            onRemove={handleRemoveTarget}
                            onDuplicate={duplicateTargetRow}
                          />
                        ))
                      )}
                    </div>
                    {targetsEditable && targets.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-line flex justify-end">
                        <button className="btn btn-primary gap-2" onClick={saveTargets}><Save size={16} /> Save All Targets</button>
                      </div>
                    )}
                  </TabPanel>

                  <TabPanel value="competencies" className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h3 className="font-display font-semibold flex items-center gap-2 text-ink">
                        <Award size={18} className="text-accent" /> Competency Assessment
                      </h3>
                      <div className="flex gap-2">
                        {competenciesEditable && <button className="btn btn-primary gap-2" onClick={openAddCompetency}><Plus size={14} /> Add Competency</button>}
                        <button className="btn btn-outline gap-2" onClick={openCatalog}><RefreshCw size={14} /> Catalog</button>
                      </div>
                    </div>

                    {compAddOpen && (
                      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3 mb-4" role="dialog" aria-labelledby="add-comp-title">
                        <h4 id="add-comp-title" className="font-semibold text-ink">Add Competency from Catalog</h4>
                        <div className="grid md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="mono-label text-xs">Competency</label>
                            <select
                              className="select"
                              value={compForm.competencyId}
                              onChange={e => setCompForm(f => ({ ...f, competencyId: e.target.value }))}
                              aria-label="Select competency"
                            >
                              <option value="">Select competency…</option>
                              {catalogList.map(c => (
                                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mono-label text-xs">Score (1–5)</label>
                            <input type="number" min="1" max="5" step="0.1" className="input" value={compForm.score} onChange={e => setCompForm(f => ({ ...f, score: e.target.value }))} aria-label="Score" />
                          </div>
                          <div>
                            <label className="mono-label text-xs">Weight %</label>
                            <input type="number" min="0" max="100" className="input" value={compForm.weight} onChange={e => setCompForm(f => ({ ...f, weight: e.target.value }))} aria-label="Weight" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button className="btn btn-ghost" onClick={() => setCompAddOpen(false)}><X size={14} /> Cancel</button>
                          <button className="btn btn-primary" onClick={submitAddCompetency}><Plus size={14} /> Add</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {competencies.length === 0 ? (
                        <div className="text-center py-12 text-muted">
                          <Award size={48} className="mx-auto text-line mb-3" aria-hidden="true" />
                          <p className="text-lg font-medium">No competencies added.</p>
                          <p className="text-sm mt-1">Use the catalog to attach competencies to this review.</p>
                          {competenciesEditable && (
                            <button className="btn btn-primary mt-4 gap-2" onClick={openAddCompetency}><Plus size={14} /> Add First Competency</button>
                          )}
                        </div>
                      ) : (
                        competencies.map(c => (
                          <CompetencyRow
                            key={c.id}
                            competency={c}
                            onSave={payload => saveCompetencyItem(c, payload)}
                            onRemove={() => removeCompetencyItem(c)}
                            onEdit={editing => editing ? setEditingCompetencyId(c.id) : setEditingCompetencyId(null)}
                            isEditing={editingCompetencyId === c.id}
                            saving={false}
                          />
                        ))
                      )}
                    </div>
                  </TabPanel>

                  <TabPanel value="summary" className="p-5">
                    {computed ? (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="card p-5 text-center">
                            <div className="mono-label text-xs uppercase text-muted">Part I — Performance</div>
                            <div className="font-mono text-3xl font-bold text-ink mt-1">{fmt(computed.partI)}</div>
                            <div className="text-xs text-muted mt-1">Weighted average of output groups</div>
                          </div>
                          <div className="card p-5 text-center">
                            <div className="mono-label text-xs uppercase text-muted">Part II — Competency</div>
                            <div className="font-mono text-3xl font-bold text-ink mt-1">{fmt(computed.partII)}</div>
                            <div className="text-xs text-muted mt-1">Weighted average of competencies</div>
                          </div>
                          <div className="card p-5 text-center">
                            <div className="mono-label text-xs uppercase text-muted">Final Rating</div>
                            <RatingBadge rating={{ final: computed.rating, adjectival: computed.adjectival }} size="lg" />
                          </div>
                        </div>

                        <div className="card p-4">
                          <h4 className="font-display font-semibold mb-3 flex items-center gap-2 text-ink">
                            <Star size={18} className="text-accent" /> Output Group Breakdown
                          </h4>
                          <div className="grid md:grid-cols-3 gap-3">
                            {WEIGHT_FIELDS.filter(w => w.key !== 'competencyWeight').map(w => (
                              <div key={w.key} className="p-3 rounded border border-line bg-bg/50 text-center">
                                <div className="mono-label text-xs uppercase text-muted">{w.label}</div>
                                <div className="font-mono text-xl text-ink mt-1">{computed.groupAverages?.[w.key] != null ? fmt(computed.groupAverages[w.key]) : '—'}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="card p-4">
                          <h4 className="font-display font-semibold mb-3 flex items-center gap-2 text-ink">
                            <User size={18} className="text-accent" /> Weight Allocation
                          </h4>
                          <div className="grid md:grid-cols-4 gap-3">
                            {WEIGHT_FIELDS.map(w => (
                              <div key={w.key} className="p-3 rounded border border-line bg-bg/50 text-center">
                                <div className="mono-label text-xs uppercase text-muted">{w.label}</div>
                                <div className="font-mono text-xl text-ink mt-1">{selected[w.key] ?? 0}%</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {review.comments && (
                          <div className="card p-4">
                            <h4 className="font-display font-semibold mb-2 flex items-center gap-2 text-ink">
                              <FileText size={18} className="text-accent" /> Comments
                            </h4>
                            <p className="text-sm text-ink whitespace-pre-wrap">{review.comments}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted">
                        <Calculator size={48} className="mx-auto text-line mb-3" aria-hidden="true" />
                        <p className="text-lg font-medium">No computed ratings yet.</p>
                        <p className="text-sm mt-1">Click <strong>Compute</strong> after saving targets and competencies to calculate ratings.</p>
                        {canEdit && <button className="btn btn-primary mt-4 gap-2" onClick={handleCompute}><Calculator size={14} /> Compute Review</button>}
                      </div>
                    )}
                  </TabPanel>
                </Tabs>
              </div>
            </>
          )}
        </main>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Performance Review"
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}><X size={15} /> Cancel</button>
            <button className="btn btn-primary" onClick={submitCreate}><Plus size={15} /> Create Review</button>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="mono-label text-xs">Employee</label>
            <select
              className="select"
              value={createForm.employeeId || ''}
              onChange={e => setCreateForm(f => ({ ...f, employeeId: e.target.value }))}
              aria-label="Select employee"
            >
              <option value="">Select employee…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.lastName}, {e.firstName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mono-label text-xs">Review Type</label>
            <select
              className="select"
              value={createForm.reviewType || 'IPCR'}
              onChange={e => setCreateForm(f => ({ ...f, reviewType: e.target.value }))}
              aria-label="Review type"
            >
              {REVIEW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mono-label text-xs">Review Year</label>
            <input type="number" min="1900" max="2100" className="input" value={createForm.reviewYear ?? ''} onChange={e => setCreateForm(f => ({ ...f, reviewYear: e.target.value }))} aria-label="Review year" />
          </div>
          <div>
            <label className="mono-label text-xs">Period Start</label>
            <input type="date" className="input" value={createForm.periodStart || ''} onChange={e => setCreateForm(f => ({ ...f, periodStart: e.target.value }))} aria-label="Period start date" />
          </div>
          <div>
            <label className="mono-label text-xs">Period End</label>
            <input type="date" className="input" value={createForm.periodEnd || ''} onChange={e => setCreateForm(f => ({ ...f, periodEnd: e.target.value }))} aria-label="Period end date" />
          </div>
          {createForm.reviewType === 'IPCR' && (
            <div className="sm:col-span-2">
              <label className="mono-label text-xs">Parent OPCR (optional)</label>
              <select
                className="select"
                value={createForm.parentReviewId || ''}
                onChange={e => setCreateForm(f => ({ ...f, parentReviewId: e.target.value }))}
                aria-label="Parent OPCR"
              >
                <option value="">No parent OPCR</option>
                {parentOptions.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.employee ? `${o.employee.lastName}, ${o.employee.firstName}` : o.reviewYear} — {o.reviewYear} ({o.status})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            {WEIGHT_FIELDS.map(w => (
              <div key={w.key}>
                <label className="mono-label text-xs">{w.label} Weight %</label>
                <input type="number" min="0" max="100" className="input" value={createForm[w.key] ?? ''} onChange={e => setCreateForm(f => ({ ...f, [w.key]: e.target.value }))} aria-label={`${w.label} weight`} />
              </div>
            ))}
          </div>
          <div className="sm:col-span-2">
            <label className="mono-label text-xs">Comments</label>
            <textarea className="input min-h-24" value={createForm.comments || ''} onChange={e => setCreateForm(f => ({ ...f, comments: e.target.value }))} placeholder="Optional notes" aria-label="Comments" />
          </div>
        </div>
      </Modal>

      <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} title="Competency Catalog" size="lg">
        <div className="flex items-center justify-between mb-3">
          <div className="mono-label text-xs text-muted">{catalogList.length} competencies</div>
          <button className="btn btn-ghost text-xs" onClick={catalogRefresh}><RefreshCw size={14} /> Refresh</button>
        </div>
        <ul className="max-h-64 overflow-auto divide-y divide-line border border-line rounded-lg">
          {catalogList.map(c => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2 px-3 hover:bg-accent/5 transition-colors">
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink">{c.name}</div>
                <div className="text-xs text-muted">{c.code}{c.description ? ` — ${c.description}` : ''}</div>
              </div>
              <button className="btn btn-ghost text-error px-2" onClick={() => catalogRemove(c)} aria-label={`Remove ${c.name}`}><Trash2 size={14} /></button>
            </li>
          ))}
          {catalogList.length === 0 && <li className="text-sm text-muted py-6 text-center">No competencies in catalog.</li>}
        </ul>
        <div className="mt-4 pt-4 border-t border-line">
          <div className="mono-label text-xs text-muted mb-2">Add new competency</div>
          <div className="grid md:grid-cols-[1fr_1fr_2fr] gap-2">
            <input className="input" placeholder="Code" value={catalogDraft.code} onChange={e => setCatalogDraft(d => ({ ...d, code: e.target.value }))} aria-label="Competency code" />
            <input className="input" placeholder="Name" value={catalogDraft.name} onChange={e => setCatalogDraft(d => ({ ...d, name: e.target.value }))} aria-label="Competency name" />
            <input className="input" placeholder="Description (optional)" value={catalogDraft.description} onChange={e => setCatalogDraft(d => ({ ...d, description: e.target.value }))} aria-label="Description" />
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn btn-primary gap-2" onClick={catalogAdd}><Plus size={14} /> Add Competency</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm(c => ({ ...c, open: false }))}
        onConfirm={confirm.action}
        title={confirm.title}
        message={confirm.message}
        confirmLabel="Confirm"
        danger={confirm.danger}
      />
    </Layout>
  );
}