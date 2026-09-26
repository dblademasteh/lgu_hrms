import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Search, Plus, RefreshCw, X, Save, CheckCircle, XCircle, Clock, Trash2, FileText, Briefcase } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { TabsLegacy } from '../components/Tabs.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ApplicantPane from '../components/ApplicantPane.jsx';
import { listApplicants, createApplicant, hireApplicant, updateApplicant } from '../api/recruitment.js';
import { interviewsApi } from '../api/interviews.js';
import { vacancyApi } from '../api/vacancy.js';
import { plantillaApi } from '../api/plantilla.js';
import { departmentsApi } from '../api/departments.js';
import { positionsApi } from '../api/positions.js';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';

const APPLICANT_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'SCREENED', label: 'Screened' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'INTERVIEWED', label: 'Interviewed' },
  { value: 'OFFERED', label: 'Offered' },
  { value: 'HIRED', label: 'Hired' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DISQUALIFIED', label: 'Disqualified' },
];

const STAGES = [
  { key: 'NEW', label: 'New' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'SCREENED', label: 'Screened' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'INTERVIEWED', label: 'Interviewed' },
  { key: 'OFFERED', label: 'Offered' },
  { key: 'HIRED', label: 'Hired' },
];

const INTERVIEW_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const VACANCY_STATUSES = ['DRAFT', 'PUBLISHED', 'OPEN', 'CLOSED', 'FILLED', 'CANCELLED'];
const APPOINTMENT_TYPES = ['PERMANENT', 'TEMPORARY', 'CONTRACTUAL', 'CASUAL', 'JOB_ORDER'];
const TODAY = new Date().toISOString().slice(0, 10);
const d10 = v => (v ? String(v).slice(0, 10) : '—');
const errMsg = err => err?.response?.data?.error?.message || 'Something went wrong';

export default function Recruitment() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(() => params.get('tab') || 'applicants');

  const [applicants, setApplicants] = useState([]);
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [plantillaItems, setPlantillaItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [positionId, setPositionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [stage, setStage] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: '', lastName: '', email: '', phone: '', appliedPositionId: '', appliedDepartmentId: '' });

  const [hireTarget, setHireTarget] = useState(null);
  const [hireForm, setHireForm] = useState({ appointmentType: 'PERMANENT', employeeNumber: '', monthlySalary: '', startDate: TODAY });
  const [hiring, setHiring] = useState(false);

  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ applicantId: '', scheduledAt: '', notes: '' });
  const [scheduling, setScheduling] = useState(false);

  const [vacancyStatus, setVacancyStatus] = useState('');
  const [showVacancy, setShowVacancy] = useState(false);
  const [vacancyForm, setVacancyForm] = useState({ plantillaItemId: '', title: '', description: '', qualifications: '', eligibilityRequirements: '', closesAt: '', status: 'OPEN' });
  const [savingVacancy, setSavingVacancy] = useState(false);

  const [confirm, setConfirm] = useState(null);

  const selectTab = t => {
    setTab(t);
    setParams(t === 'applicants' ? {} : { tab: t });
  };

  const loadApplicants = async () => {
    try {
      const res = await listApplicants({ page: 1, limit: 200 });
      setApplicants(res.items || []);
    } catch {
      toast('Failed to load applicants', 'error');
    }
  };

  const loadRefs = async () => {
    try { const { data } = await positionsApi.list(); setPositions(data?.items || []); } catch { setPositions([]); }
    try { setDepartments(await departmentsApi.list()); } catch { setDepartments([]); }
  };

  const loadInterviews = async () => {
    try {
      const res = await interviewsApi.list({ limit: 200 });
      setInterviews(res.items || []);
    } catch {
      toast('Failed to load interviews', 'error');
    }
  };

  const loadVacancies = async () => {
    try {
      const { data } = await vacancyApi.list({ limit: 200 });
      setVacancies(Array.isArray(data) ? data : data?.items || []);
      const p = await plantillaApi.list({ limit: 100 });
      setPlantillaItems((p.data?.items || []).filter(i => i.status === 'VACANT'));
    } catch {
      toast('Failed to load vacancies', 'error');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadApplicants(), loadRefs()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (tab === 'interviews') loadInterviews(); }, [tab]);
  useEffect(() => { if (tab === 'vacancies') loadVacancies(); }, [tab]);

  const selected = applicants.find(a => a.id === selectedId) || null;
  const closed = a => a.status === 'REJECTED' || a.status === 'DISQUALIFIED';
  const stageCount = key => applicants.filter(a => key === 'CLOSED' ? closed(a) : a.status === key).length;

  const filtered = applicants.filter(a => {
    if (stage !== 'ALL' && !(stage === 'CLOSED' ? closed(a) : a.status === stage)) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${a.firstName} ${a.lastName} ${a.email || ''}`.toLowerCase().includes(q)) return false;
    if (positionId && a.appliedPositionId !== positionId) return false;
    if (departmentId && a.appliedDepartmentId !== departmentId) return false;
    return true;
  });

  const patchApplicant = async (id, payload, msg) => {
    try {
      await updateApplicant(id, payload);
      toast(msg, 'success');
      await loadApplicants();
      return true;
    } catch (err) {
      toast(errMsg(err), 'error');
      return false;
    }
  };

  const onSubmit = async e => {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      toast('First and last name are required.', 'error');
      return;
    }
    try {
      await createApplicant({
        ...addForm,
        appliedPositionId: addForm.appliedPositionId || null,
        appliedDepartmentId: addForm.appliedDepartmentId || null,
        email: addForm.email || null,
        phone: addForm.phone || null,
      });
      toast('Applicant added.', 'success');
      setShowAdd(false);
      setAddForm({ firstName: '', lastName: '', email: '', phone: '', appliedPositionId: '', appliedDepartmentId: '' });
      await loadApplicants();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const openHire = applicant => {
    setHireTarget(applicant);
    setHireForm({
      appointmentType: 'PERMANENT',
      employeeNumber: '',
      monthlySalary: applicant.vacancy?.plantillaItem?.authorizedSalary ?? '',
      startDate: TODAY,
    });
  };

  const submitHire = async e => {
    e.preventDefault();
    if (!hireTarget) return;
    setHiring(true);
    try {
      await hireApplicant(hireTarget.id, {
        appointmentType: hireForm.appointmentType,
        monthlySalary: hireForm.monthlySalary === '' ? undefined : Number(hireForm.monthlySalary),
        employeeNumber: hireForm.employeeNumber || undefined,
        startDate: hireForm.startDate || undefined,
      });
      toast(`${hireTarget.firstName} ${hireTarget.lastName} hired`, 'success');
      setHireTarget(null);
      await loadApplicants();
      if (tab === 'interviews') loadInterviews();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setHiring(false);
    }
  };

  const submitSchedule = async e => {
    e.preventDefault();
    if (!scheduleForm.applicantId || !scheduleForm.scheduledAt) {
      toast('Applicant and scheduled date are required', 'error');
      return;
    }
    setScheduling(true);
    try {
      await interviewsApi.create({
        applicantId: scheduleForm.applicantId,
        scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
        notes: scheduleForm.notes || null,
      });
      toast('Interview scheduled', 'success');
      setShowSchedule(false);
      setScheduleForm({ applicantId: '', scheduledAt: '', notes: '' });
      loadInterviews();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setScheduling(false);
    }
  };

  const submitVacancy = async e => {
    e.preventDefault();
    if (!vacancyForm.plantillaItemId || !vacancyForm.title) {
      toast('Plantilla Item and Title are required.', 'error');
      return;
    }
    setSavingVacancy(true);
    try {
      await vacancyApi.create({
        ...vacancyForm,
        closesAt: vacancyForm.closesAt || null,
        description: vacancyForm.description || null,
        qualifications: vacancyForm.qualifications || null,
        eligibilityRequirements: vacancyForm.eligibilityRequirements || null,
      });
      toast('Vacancy published', 'success');
      setShowVacancy(false);
      setVacancyForm({ plantillaItemId: '', title: '', description: '', qualifications: '', eligibilityRequirements: '', closesAt: '', status: 'OPEN' });
      loadVacancies();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSavingVacancy(false);
    }
  };

  const runConfirm = async () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    try {
      if (c.kind === 'interview-delete') {
        await interviewsApi.remove(c.id);
        toast('Interview removed', 'success');
        loadInterviews();
      } else if (c.kind === 'vacancy-close') {
        await vacancyApi.update(c.id, { status: 'CLOSED' });
        toast('Vacancy closed', 'success');
        loadVacancies();
      } else if (c.kind === 'vacancy-remove') {
        await vacancyApi.remove(c.id);
        toast('Vacancy removed', 'success');
        loadVacancies();
      }
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const interviewRows = [...interviews]
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))
    .sort((a, b) => (a.status === 'SCHEDULED' ? -1 : b.status === 'SCHEDULED' ? 1 : 0));

  const visibleVacancies = vacancies.filter(v => !vacancyStatus || v.status === vacancyStatus);

  const tabs = [
    {
      id: 'applicants',
      label: 'Applicants',
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 flex-1 min-w-56 px-3 py-2 rounded-xl border border-line bg-surface text-ink shadow-xs transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
              <Search size={15} className="text-muted" aria-hidden="true" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email…" aria-label="Search applicants" className="w-full bg-transparent outline-none text-sm placeholder:text-muted/60" />
            </label>
            <select className="select w-auto" value={positionId} onChange={e => setPositionId(e.target.value)} aria-label="Filter by position">
              <option value="">All positions</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <select className="select w-auto" value={departmentId} onChange={e => setDepartmentId(e.target.value)} aria-label="Filter by department">
              <option value="">All departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
            </select>
            <span className="mono-label text-[10px] text-muted">{filtered.length} of {applicants.length} candidates</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="card p-4 min-w-0">
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Applied for</th>
                      <th>Department</th>
                      <th>Stage</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="text-sm text-muted py-8 text-center">Loading applicants…</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={5} className="text-sm text-muted py-12 text-center">No candidates match — try clearing filters.</td></tr>
                    ) : filtered.map(a => (
                      <tr key={a.id} className={`cursor-pointer ${a.id === selectedId ? 'bg-accent/5' : ''}`} onClick={() => setSelectedId(a.id)}>
                        <td>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-ink">{a.firstName} {a.lastName}</p>
                            <p className="font-mono text-xs text-muted truncate">{a.email || a.phone || '—'}</p>
                          </div>
                        </td>
                        <td className="text-sm">{a.vacancy?.title || a.position?.title || '—'}</td>
                        <td className="text-sm">{a.department?.name || '—'}</td>
                        <td>
                          <span className={`badge ${APPLICANT_STATUSES.find(s => s.value === a.status) ? { NEW: 'badge-accent', APPLIED: 'badge-accent', SCREENED: 'badge-warning', SHORTLISTED: 'badge-info', INTERVIEWED: 'badge-info', OFFERED: 'badge-accent', HIRED: 'badge-success', REJECTED: 'badge-error', DISQUALIFIED: 'badge-error' }[a.status] : 'badge-neutral'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="text-sm text-muted font-mono">{d10(a.createdAt || a.appliedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <ApplicantPane
              applicant={selected}
              busy={false}
              onAdvance={next => patchApplicant(selected.id, { status: next }, `Moved to ${next}`)}
              onStatus={status => patchApplicant(selected.id, { status }, `Stage set to ${status}`)}
              onScores={payload => patchApplicant(selected.id, payload, 'Scores saved')}
              onHire={openHire}
              onReject={kind => patchApplicant(selected.id, { status: kind }, kind === 'REJECTED' ? 'Applicant rejected' : 'Applicant disqualified')}
              refreshKey={applicants.length}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'interviews',
      label: 'Interviews',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Schedule and track candidate interviews. Complete an interview to move the funnel.</p>
            <button type="button" className="btn btn-primary gap-2 shrink-0" onClick={() => setShowSchedule(true)}>
              <Plus size={16} />
              Schedule
            </button>
          </div>
          <div className="card p-4">
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr><th>Applicant</th><th>Scheduled</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {interviewRows.length === 0 ? (
                    <tr><td colSpan={4} className="text-sm text-muted py-12 text-center">No interviews scheduled yet.</td></tr>
                  ) : interviewRows.map(it => (
                    <tr key={it.id} className="align-top">
                      <td>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-ink">{it.applicant?.firstName || ''} {it.applicant?.lastName || ''}</p>
                            <p className="font-mono text-xs text-muted truncate">{it.notes || it.applicantId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm whitespace-nowrap">{it.scheduledAt ? new Date(it.scheduledAt).toLocaleString() : '—'}</td>
                      <td>
                        <span className={`badge ${badgeTone(it.status)}`}>
                          <span className="inline-flex items-center gap-1">
                            {it.status === 'SCHEDULED' ? <Clock size={13} /> : it.status === 'COMPLETED' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                            {it.status}
                          </span>
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <span className="inline-flex gap-1">
                          {it.status === 'SCHEDULED' && (
                            <>
                              <button type="button" className="btn btn-ghost px-2 text-xs" onClick={async () => {
                                try { await interviewsApi.update(it.id, { status: 'COMPLETED' }); toast('Interview completed', 'success'); loadInterviews(); }
                                catch (err) { toast(errMsg(err), 'error'); }
                              }}><CheckCircle size={13} /> Complete</button>
                              <button type="button" className="btn btn-ghost px-2 text-xs" onClick={async () => {
                                try { await interviewsApi.update(it.id, { status: 'CANCELLED' }); toast('Interview cancelled', 'success'); loadInterviews(); }
                                catch (err) { toast(errMsg(err), 'error'); }
                              }}><XCircle size={13} /> Cancel</button>
                            </>
                          )}
                          <button type="button" className="btn btn-ghost px-2 text-xs text-error" onClick={() => setConfirm({ kind: 'interview-delete', id: it.id, label: `interview for ${it.applicant?.firstName || ''} ${it.applicant?.lastName || ''}` })}>
                            <Trash2 size={13} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'vacancies',
      label: 'Vacancies',
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select className="select w-auto" value={vacancyStatus} onChange={e => setVacancyStatus(e.target.value)} aria-label="Filter vacancy status">
                <option value="">All statuses</option>
                {VACANCY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="mono-label text-[10px] text-muted">{visibleVacancies.length} vacancies</span>
            </div>
            <button type="button" className="btn btn-primary gap-2" onClick={() => setShowVacancy(true)}>
              <Plus size={16} />
              New Vacancy
            </button>
          </div>
          <div className="card p-4">
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr><th>Title</th><th>Plantilla Item</th><th>Department</th><th>Closes</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {visibleVacancies.length === 0 ? (
                    <tr><td colSpan={6} className="text-sm text-muted py-12 text-center">No vacancies found.</td></tr>
                  ) : visibleVacancies.map(v => (
                    <tr key={v.id} className="align-top">
                      <td className="text-sm font-medium text-ink">{v.title}</td>
                      <td className="font-mono text-sm">{v.plantillaItem?.itemNumber || '—'}</td>
                      <td className="text-sm">{v.department?.name || '—'}</td>
                      <td className="text-sm text-muted font-mono">{d10(v.closesAt)}</td>
                      <td><span className={`badge ${badgeTone(v.status)}`}>{v.status}</span></td>
                      <td className="text-right whitespace-nowrap">
                        {v.status === 'OPEN' && (
                          <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => setConfirm({ kind: 'vacancy-close', id: v.id, label: v.title })}>
                            <CheckCircle size={13} /> Close
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost px-2 text-xs text-error" onClick={() => setConfirm({ kind: 'vacancy-remove', id: v.id, label: v.title })}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <User size={20} className="text-accent" />
            Recruitment
          </h1>
          <p className="text-sm text-muted mt-0.5">Hiring funnel — applicants, interviews and vacancy publication</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={loadApplicants} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="btn btn-primary gap-2" onClick={() => setShowAdd(v => !v)}>
            <Plus size={18} />
            New Applicant
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 mb-4">
          <form onSubmit={onSubmit} className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">First Name *</label>
                <input className="input" placeholder="First name" value={addForm.firstName} onChange={e => setAddForm({ ...addForm, firstName: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Last Name *</label>
                <input className="input" placeholder="Last name" value={addForm.lastName} onChange={e => setAddForm({ ...addForm, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Email</label>
                <input className="input" type="email" placeholder="email@example.com" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Phone</label>
                <input className="input" type="tel" placeholder="Mobile number" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Position</label>
                <select className="select" value={addForm.appliedPositionId} onChange={e => setAddForm({ ...addForm, appliedPositionId: e.target.value })}>
                  <option value="">Select position</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.salaryGrade ? ` (SG-${p.salaryGrade})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Department</label>
                <select className="select" value={addForm.appliedDepartmentId} onChange={e => setAddForm({ ...addForm, appliedDepartmentId: e.target.value })}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn btn-primary gap-2">
                <Save size={16} />
                Save Applicant
              </button>
              <button type="button" className="btn btn-ghost gap-2" onClick={() => setShowAdd(false)}>
                <X size={16} /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'ALL', label: 'All' }, ...STAGES, { key: 'CLOSED', label: 'Closed' }].map(s => {
            const active = stage === s.key;
            const count = s.key === 'ALL' ? applicants.length : stageCount(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStage(s.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  active ? 'bg-accent/10 text-accent border-accent/25 font-semibold' : 'text-muted border-transparent hover:text-ink hover:bg-bg/60'
                }`}
              >
                {s.label}
                <span className="mono-label ml-1.5">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <TabsLegacy tabs={tabs} label="Recruitment funnel sections" active={tab} onChange={selectTab} />

      <Modal
        open={!!hireTarget}
        onClose={() => setHireTarget(null)}
        title={`Hire ${hireTarget ? `${hireTarget.firstName} ${hireTarget.lastName}` : ''}`}
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setHireTarget(null)}>
              <X size={16} /> Cancel
            </button>
            <button type="submit" form="hire-form" className="btn btn-primary gap-2" disabled={hiring}>
              <CheckCircle size={16} /> {hiring ? 'Hiring…' : 'Confirm Hire'}
            </button>
          </>
        }
      >
        <form id="hire-form" onSubmit={submitHire} className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-surface border border-line p-3 text-sm">
            <Briefcase size={15} className="text-accent shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-ink truncate">{hireTarget?.vacancy?.title || hireTarget?.position?.title || 'Unspecified position'}</p>
              <p className="text-xs text-muted">Convert {hireTarget?.firstName || 'the applicant'} into an employee record and close the funnel.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="h-type" className="block text-sm font-medium text-ink mb-1">Appointment Type</label>
              <select id="h-type" className="select" value={hireForm.appointmentType} onChange={e => setHireForm({ ...hireForm, appointmentType: e.target.value })}>
                {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h-salary" className="block text-sm font-medium text-ink mb-1">Monthly Salary</label>
              <input id="h-salary" type="number" min={0} step="0.01" className="input font-mono" placeholder="₱ 0.00" value={hireForm.monthlySalary} onChange={e => setHireForm({ ...hireForm, monthlySalary: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="h-start" className="block text-sm font-medium text-ink mb-1">Start Date</label>
              <input id="h-start" type="date" className="input" value={hireForm.startDate} onChange={e => setHireForm({ ...hireForm, startDate: e.target.value })} />
            </div>
            <div>
              <label htmlFor="h-employee-no" className="block text-sm font-medium text-ink mb-1">Employee No.</label>
              <input id="h-employee-no" className="input font-mono" placeholder="Auto-generated" value={hireForm.employeeNumber} onChange={e => setHireForm({ ...hireForm, employeeNumber: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={showSchedule}
        onClose={() => setShowSchedule(false)}
        title="Schedule Interview"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setShowSchedule(false)}>
              <X size={16} /> Cancel
            </button>
            <button type="submit" form="schedule-form" className="btn btn-primary gap-2" disabled={scheduling}>
              <Save size={16} /> {scheduling ? 'Saving…' : 'Schedule'}
            </button>
          </>
        }
      >
        <form id="schedule-form" onSubmit={submitSchedule} className="space-y-4">
          <div>
            <label htmlFor="s-applicant" className="block text-sm font-medium text-ink mb-1">Applicant *</label>
            <select id="s-applicant" className="select" value={scheduleForm.applicantId} onChange={e => setScheduleForm({ ...scheduleForm, applicantId: e.target.value })} required>
              <option value="">Select applicant</option>
              {applicants.filter(a => !closed(a)).map(a => (
                <option key={a.id} value={a.id}>{a.lastName}, {a.firstName}{a.position?.title ? ` · ${a.position.title}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="s-when" className="block text-sm font-medium text-ink mb-1">Scheduled At *</label>
            <input id="s-when" type="datetime-local" className="input" value={scheduleForm.scheduledAt} onChange={e => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })} required />
          </div>
          <div>
            <label htmlFor="s-notes" className="block text-sm font-medium text-ink mb-1">Notes</label>
            <textarea id="s-notes" className="input" rows={3} value={scheduleForm.notes} onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal
        open={showVacancy}
        onClose={() => setShowVacancy(false)}
        title="New Vacancy"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setShowVacancy(false)}>
              <X size={16} /> Cancel
            </button>
            <button type="submit" form="vacancy-form" className="btn btn-primary gap-2" disabled={savingVacancy}>
              <Save size={16} /> {savingVacancy ? 'Saving…' : 'Save Vacancy'}
            </button>
          </>
        }
      >
        <form id="vacancy-form" onSubmit={submitVacancy} className="space-y-4">
          <div>
            <label htmlFor="v-item" className="block text-sm font-medium text-ink mb-1">Plantilla Item *</label>
            <select
              id="v-item"
              className="select"
              value={vacancyForm.plantillaItemId}
              onChange={e => {
                const item = plantillaItems.find(p => p.id === e.target.value);
                setVacancyForm({ ...vacancyForm, plantillaItemId: e.target.value, title: item?.position?.title || '' });
              }}
              required
            >
              <option value="">Select vacant item</option>
              {plantillaItems.map(p => (
                <option key={p.id} value={p.id}>
                  {p.itemNumber} — {p.position?.title || 'Unknown'}{p.department?.name ? ` (${p.department.name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="v-title" className="block text-sm font-medium text-ink mb-1">Title *</label>
            <input id="v-title" className="input" placeholder="Position title" value={vacancyForm.title} onChange={e => setVacancyForm({ ...vacancyForm, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="v-close" className="block text-sm font-medium text-ink mb-1">Closes At</label>
              <input id="v-close" type="date" className="input" value={vacancyForm.closesAt} onChange={e => setVacancyForm({ ...vacancyForm, closesAt: e.target.value })} />
            </div>
            <div>
              <label htmlFor="v-status" className="block text-sm font-medium text-ink mb-1">Status</label>
              <select id="v-status" className="select" value={vacancyForm.status} onChange={e => setVacancyForm({ ...vacancyForm, status: e.target.value })}>
                <option value="DRAFT">Draft</option>
                <option value="OPEN">Open</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="v-desc" className="block text-sm font-medium text-ink mb-1">Description</label>
            <textarea id="v-desc" className="input" rows={3} placeholder="Position description and responsibilities" value={vacancyForm.description} onChange={e => setVacancyForm({ ...vacancyForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="v-qual" className="block text-sm font-medium text-ink mb-1">Qualifications</label>
              <textarea id="v-qual" className="input" rows={2} placeholder="Education, experience, skills" value={vacancyForm.qualifications} onChange={e => setVacancyForm({ ...vacancyForm, qualifications: e.target.value })} />
            </div>
            <div>
              <label htmlFor="v-elig" className="block text-sm font-medium text-ink mb-1">Eligibility Requirements</label>
              <textarea id="v-elig" className="input" rows={2} placeholder="CSC, PRC, etc." value={vacancyForm.eligibilityRequirements} onChange={e => setVacancyForm({ ...vacancyForm, eligibilityRequirements: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title="Confirm action"
        message={confirm?.kind === 'interview-delete' ? `Remove the ${confirm.label}? This cannot be undone.` : confirm?.kind === 'vacancy-close' ? `Close the vacancy "${confirm.label}"?` : `Remove the vacancy "${confirm?.label}"? This cannot be undone.`}
        confirmLabel={confirm?.kind === 'interview-delete' ? 'Remove' : confirm?.kind === 'vacancy-close' ? 'Close' : 'Remove'}
        danger
      />
    </Layout>
  );
}