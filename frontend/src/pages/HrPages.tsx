import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase, CalendarClock, CheckCircle2, Download, Eye, FileText, Plus, RefreshCw, Search, Send, UserCheck, UserPlus, Users, X, XCircle,
} from 'lucide-react';
import { apiError, careersApi, exportApi, hrApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ApplicationStatus, EmploymentType, HrStats, Interview, InterviewInput, InterviewType, JobApplication, JobOpening, JobOpeningInput, Role,
} from '../types';
import { JobApplicationForm } from '../components/JobApplicationForm';
import { Tab } from '../navigation';

// ---------- shared labels ----------

export const APPLICATION_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW_SCHEDULED: 'Interview scheduled',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  HIRED: 'Hired',
};
const ALL_STATUSES = Object.keys(APPLICATION_LABEL) as ApplicationStatus[];
const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship',
};
const INTERVIEW_TYPE_LABEL: Record<InterviewType, string> = { IN_PERSON: 'In person', PHONE: 'Phone', VIDEO: 'Video call' };

const StatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => (
  <span className={`badge badge-app-${status.toLowerCase()}`}>{APPLICATION_LABEL[status]}</span>
);
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString([], { dateStyle: 'medium' }) : '—');

type Msg = { ok: boolean; text: string } | null;
const Alert: React.FC<{ msg: Msg }> = ({ msg }) =>
  msg ? <div className={`ks-alert ${msg.ok ? 'ks-alert-success' : 'ks-alert-error'}`} role="status">{msg.text}</div> : null;

// ---------- HR dashboard ----------

export const HrDashboard: React.FC<{ onTabChange: (tab: Tab) => void }> = ({ onTabChange }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<HrStats | null>(null);
  const [upcoming, setUpcoming] = useState<Interview[]>([]);
  const [recent, setRecent] = useState<JobApplication[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([hrApi.stats(), hrApi.interviews(true), hrApi.applications()])
      .then(([s, i, a]) => { setStats(s); setUpcoming(i.slice(0, 5)); setRecent(a.slice(0, 6)); })
      .catch((err) => setError(apiError(err, 'Unable to load recruitment data.')))
      .finally(() => setLoading(false));
  }, []);

  const tiles: { label: string; value?: number; tab: Tab; icon: React.ReactNode }[] = [
    { label: 'Job openings', value: stats?.totalOpenings, tab: 'jobs', icon: <Briefcase size={20} /> },
    { label: 'Total applications', value: stats?.totalApplications, tab: 'applications', icon: <FileText size={20} /> },
    { label: 'New applications', value: stats?.newApplications, tab: 'applications', icon: <Plus size={20} /> },
    { label: 'Under review', value: stats?.underReview, tab: 'applications', icon: <Eye size={20} /> },
    { label: 'Interviews scheduled', value: stats?.interviewsScheduled, tab: 'interviews', icon: <CalendarClock size={20} /> },
    { label: 'Selected', value: stats?.selected, tab: 'applications', icon: <CheckCircle2 size={20} /> },
    { label: 'Rejected', value: stats?.rejected, tab: 'applications', icon: <XCircle size={20} /> },
    { label: 'Hired', value: stats?.hired, tab: 'applications', icon: <UserCheck size={20} /> },
  ];

  return (
    <div>
      <div className="ks-hero ks-hero-split">
        <div>
          <div className="ks-page-title">Welcome back, {user?.userName}</div>
          <div className="ks-page-sub">Recruitment and hiring for KEYSTONE Maintenance Solutions.</div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => onTabChange('hire')}><UserPlus size={18} /> Hire Now</button>
      </div>
      {error && <div className="ks-alert ks-alert-error">{error}</div>}
      <div className="ks-stat-grid">
        {tiles.map((t) => (
          <button key={t.label} className="ks-stat" onClick={() => onTabChange(t.tab)}>
            <span className="ks-stat-icon">{t.icon}</span>
            <span className="ks-stat-value">{loading ? '…' : t.value ?? 0}</span>
            <span className="ks-stat-label">{t.label}</span>
          </button>
        ))}
      </div>
      {stats && !stats.candidateEmailEnabled && (
        <div className="ks-alert ks-alert-info">
          Email delivery is not configured (MAIL_ENABLED=false), so candidates are not emailed about interviews.
          Share the interview details with them directly, or set the MAIL_* settings to enable it.
        </div>
      )}
      <div className="ks-two-col">
        <section className="ks-card">
          <h3 className="ks-section-title"><CalendarClock size={17} /> Upcoming interviews</h3>
          {upcoming.length === 0 ? <div className="ks-empty-sm">No interviews scheduled.</div> : (
            <ul className="ks-list">
              {upcoming.map((i) => (
                <li key={i.id}>
                  <div><strong>{i.candidateName}</strong> <span className="ks-dim">· {i.jobTitle}</span></div>
                  <div className="ks-muted">{when(i.scheduledAt)} · {INTERVIEW_TYPE_LABEL[i.type]} · {i.interviewer}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ks-card">
          <h3 className="ks-section-title"><FileText size={17} /> Latest applications</h3>
          {recent.length === 0 ? <div className="ks-empty-sm">No applications yet. Publish a job opening to start receiving them.</div> : (
            <ul className="ks-list">
              {recent.map((a) => (
                <li key={a.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{a.fullName}</strong><StatusBadge status={a.status} /></div>
                  <div className="ks-muted">{a.jobTitle} · {day(a.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

// ---------- Hire Now ----------

export const HireNowPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | undefined>();

  useEffect(() => {
    hrApi.jobs()
      .then((all) => setJobs(all.filter((j) => j.acceptingApplications)))
      .catch((err) => setError(apiError(err, 'Unable to load job openings.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Hire Now</h2>
          <p className="ks-page-sub">Open positions and the candidate application form. Candidates can also apply themselves on the public Careers page.</p>
        </div>
      </div>
      {error && <div className="ks-alert ks-alert-error">{error}</div>}
      <div className="ks-two-col ks-two-col-wide">
        <section>
          <h3 className="ks-section-title"><Briefcase size={17} /> Available job openings</h3>
          {loading ? <div className="ks-empty">Loading…</div> : jobs.length === 0 ? (
            <div className="card ks-empty">No published openings are accepting applications. Publish one under Job Openings.</div>
          ) : (
            <div className="ks-job-list">
              {jobs.map((j) => (
                <button key={j.id} className={`ks-job-card ${selected === j.id ? 'selected' : ''}`} onClick={() => setSelected(j.id)}>
                  <strong>{j.title}</strong>
                  <span className="ks-muted">{j.department} · {j.location} · {EMPLOYMENT_LABEL[j.employmentType]}</span>
                  <span className="ks-dim">{j.applicationDeadline ? `Apply by ${day(j.applicationDeadline)}` : 'Open until filled'} · {j.applicationCount ?? 0} applications</span>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="ks-card">
          <h3 className="ks-section-title"><UserPlus size={17} /> Candidate application</h3>
          <JobApplicationForm
            jobs={jobs}
            initialJobId={selected}
            submitLabel="Save Application"
            onSubmit={async (jobId, form, resume) => {
              const created = await hrApi.addApplication(jobId, form, resume);
              return `Application ${created.reference} saved for ${created.fullName}. Find it under Applications.`;
            }}
          />
        </section>
      </div>
    </div>
  );
};

// ---------- Job openings ----------

const EMPTY_JOB: JobOpeningInput = { title: '', department: '', description: '', requiredSkills: '', location: '', employmentType: 'FULL_TIME', applicationDeadline: '' };

export const JobsPage: React.FC<{ onTabChange: (tab: Tab) => void }> = ({ onTabChange }) => {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg>(null);
  const [editing, setEditing] = useState<{ id?: number; form: JobOpeningInput } | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'CLOSED'>('ALL');

  const load = () => {
    setLoading(true);
    hrApi.jobs().then(setJobs).catch((err) => setMsg({ ok: false, text: apiError(err, 'Unable to load job openings.') })).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const input = { ...editing.form, applicationDeadline: editing.form.applicationDeadline || null };
    setSaving(true);
    try {
      const saved = editing.id ? await hrApi.updateJob(editing.id, input) : await hrApi.createJob(input);
      setMsg({ ok: true, text: editing.id ? `${saved.title} updated.` : `${saved.title} saved as a draft. Publish it to accept applications.` });
      setEditing(null);
      load();
    } catch (err) {
      setMsg({ ok: false, text: apiError(err, 'Could not save the job opening.') });
    } finally {
      setSaving(false);
    }
  };

  const act = async (job: JobOpening, action: 'publish' | 'close') => {
    if (action === 'close' && !window.confirm(`Close "${job.title}"? It will stop accepting applications.`)) return;
    try {
      await (action === 'publish' ? hrApi.publishJob(job.id) : hrApi.closeJob(job.id));
      setMsg({ ok: true, text: `${job.title} ${action === 'publish' ? 'published on the careers page' : 'closed'}.` });
      load();
    } catch (err) {
      setMsg({ ok: false, text: apiError(err, 'Could not update the job opening.') });
    }
  };

  const set = (key: keyof JobOpeningInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEditing((cur) => (cur ? { ...cur, form: { ...cur.form, [key]: e.target.value } } : cur));
  const shown = filter === 'ALL' ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Job Openings</h2>
          <p className="ks-page-sub">Create openings, publish them on the careers page, and close them when filled.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setEditing({ form: { ...EMPTY_JOB } })}><Plus size={15} /> New Opening</button>
        </div>
      </div>
      <Alert msg={msg} />
      <div className="ks-filter-row">
        {(['ALL', 'PUBLISHED', 'DRAFT', 'CLOSED'] as const).map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {loading ? <div className="ks-empty">Loading…</div> : shown.length === 0 ? (
        <div className="card ks-empty">No job openings here yet.</div>
      ) : (
        <div className="ks-table-wrap">
          <table className="ks-table">
            <thead><tr><th>Position</th><th>Location</th><th>Type</th><th>Deadline</th><th>Status</th><th>Applications</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.map((j) => (
                <tr key={j.id}>
                  <td><strong>{j.title}</strong><div className="ks-dim" style={{ fontSize: '0.78rem' }}>{j.department}</div></td>
                  <td>{j.location}</td>
                  <td>{EMPLOYMENT_LABEL[j.employmentType]}</td>
                  <td>{j.applicationDeadline ? day(j.applicationDeadline) : 'None'}</td>
                  <td>
                    <span className={`badge badge-job-${(j.status || 'DRAFT').toLowerCase()}`}>{j.status}</span>
                    {j.status === 'PUBLISHED' && !j.acceptingApplications && <div className="ks-dim" style={{ fontSize: '0.74rem' }}>deadline passed</div>}
                  </td>
                  <td><button className="ks-link-btn" onClick={() => onTabChange('applications')}>{j.applicationCount ?? 0}</button></td>
                  <td>
                    <div className="ks-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditing({ id: j.id, form: {
                        title: j.title, department: j.department, description: j.description, requiredSkills: j.requiredSkills || '',
                        location: j.location, employmentType: j.employmentType, applicationDeadline: j.applicationDeadline || '',
                      } })}>Edit</button>
                      {j.status !== 'PUBLISHED' && <button className="btn btn-sm btn-success" onClick={() => act(j, 'publish')}>Publish</button>}
                      {j.status !== 'CLOSED' && <button className="btn btn-sm btn-danger" onClick={() => act(j, 'close')}>Close</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="job-form-title">
          <div className="modal-content" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 id="job-form-title">{editing.id ? 'Edit job opening' : 'New job opening'}</h3>
              <button className="ks-icon-btn" onClick={() => setEditing(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <form className="ks-form" onSubmit={save}>
              <div className="ks-form-grid">
                <div><label className="ks-label" htmlFor="job-title">Job title *</label><input id="job-title" required maxLength={150} value={editing.form.title} onChange={set('title')} placeholder="e.g. HVAC Technician" /></div>
                <div><label className="ks-label" htmlFor="job-dept">Department *</label><input id="job-dept" required maxLength={100} value={editing.form.department} onChange={set('department')} placeholder="e.g. Field Services" /></div>
                <div><label className="ks-label" htmlFor="job-loc">Location *</label><input id="job-loc" required maxLength={150} value={editing.form.location} onChange={set('location')} placeholder="e.g. Jaipur" /></div>
                <div>
                  <label className="ks-label" htmlFor="job-type">Employment type *</label>
                  <select id="job-type" value={editing.form.employmentType} onChange={set('employmentType')}>
                    {(Object.keys(EMPLOYMENT_LABEL) as EmploymentType[]).map((t) => <option key={t} value={t}>{EMPLOYMENT_LABEL[t]}</option>)}
                  </select>
                </div>
                <div><label className="ks-label" htmlFor="job-deadline">Application deadline</label><input id="job-deadline" type="date" min={new Date().toISOString().slice(0, 10)} value={editing.form.applicationDeadline || ''} onChange={set('applicationDeadline')} /></div>
              </div>
              <div><label className="ks-label" htmlFor="job-desc">Description *</label><textarea id="job-desc" required rows={5} maxLength={5000} value={editing.form.description} onChange={set('description')} placeholder="Responsibilities, working hours, benefits…" /></div>
              <div><label className="ks-label" htmlFor="job-skills">Required skills</label><input id="job-skills" maxLength={1000} value={editing.form.requiredSkills || ''} onChange={set('requiredSkills')} placeholder="Comma-separated, e.g. HVAC, refrigeration, electrical safety" /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Applications ----------

export const ApplicationsPage: React.FC = () => {
  const { role } = useAuth();
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [jobId, setJobId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    hrApi.applications({ status: status || undefined, jobId: jobId || undefined, search: search.trim() || undefined })
      .then(setApps)
      .catch((err) => setMsg({ ok: false, text: apiError(err, 'Unable to load applications.') }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { hrApi.jobs().then(setJobs).catch(() => {}); }, []);
  useEffect(load, [status, jobId]);

  const exportCsv = () => exportApi.applications().catch((err) => setMsg({ ok: false, text: apiError(err, 'Export failed.') }));

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">{role === 'MANAGER' ? 'Recruitment' : 'Applications'}</h2>
          <p className="ks-page-sub">Review candidates, schedule interviews and move them through the hiring pipeline.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={exportCsv}><Download size={15} /> Export CSV</button>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
        </div>
      </div>
      <Alert msg={msg} />
      <form className="ks-filter-bar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <div className="ks-search">
          <Search size={16} aria-hidden="true" />
          <input aria-label="Search applications" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, reference or skill" />
        </div>
        <select aria-label="Filter by job" value={jobId} onChange={(e) => setJobId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">All job openings</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus | '')}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_LABEL[s]}</option>)}
        </select>
        <button className="btn btn-primary" type="submit"><Search size={15} /> Search</button>
      </form>
      {loading ? <div className="ks-empty">Loading…</div> : apps.length === 0 ? (
        <div className="card ks-empty">No applications match these filters.</div>
      ) : (
        <div className="ks-table-wrap">
          <table className="ks-table">
            <thead><tr><th>Reference</th><th>Candidate</th><th>Position</th><th>Applied</th><th>Status</th><th /></tr></thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td><span className="ks-code">{a.reference}</span></td>
                  <td><strong>{a.fullName}</strong><div className="ks-dim" style={{ fontSize: '0.78rem' }}>{a.email} · {a.phone}</div></td>
                  <td>{a.jobTitle}<div className="ks-dim" style={{ fontSize: '0.78rem' }}>{a.department}</div></td>
                  <td className="ks-muted">{day(a.createdAt)}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><button className="btn btn-sm btn-primary" onClick={() => setOpenId(a.id)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openId && <ApplicationDetail id={openId} onClose={() => { setOpenId(null); load(); }} />}
    </div>
  );
};

const toLocalInput = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 24 * 3600 * 1000);
  if (!iso) d.setHours(11, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ApplicationDetail: React.FC<{ id: number; onClose: () => void }> = ({ id, onClose }) => {
  const { role } = useAuth();
  const [app, setApp] = useState<JobApplication | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState<{ status: ApplicationStatus; note: string } | null>(null);
  const [interviewForm, setInterviewForm] = useState<{ id?: number; input: InterviewInput } | null>(null);
  const [account, setAccount] = useState<{ role: Role; password: string; location: string } | null>(null);

  const load = () => hrApi.application(id).then((a) => { setApp(a); setNotes(a.internalNotes || ''); })
    .catch((err) => setMsg({ ok: false, text: apiError(err, 'Unable to load the application.') }));
  useEffect(() => { load(); }, [id]);

  const run = async (action: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await action();
      setMsg({ ok: true, text: ok });
      await load();
      return true;
    } catch (err) {
      setMsg({ ok: false, text: apiError(err, 'That did not work. Please try again.') });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const scheduled = useMemo(() => app?.interviews?.find((i) => i.status === 'SCHEDULED'), [app]);
  if (!app) {
    return (
      <div className="modal-backdrop"><div className="modal-content" style={{ maxWidth: 720 }}>
        {msg ? <Alert msg={msg} /> : <div className="ks-empty">Loading…</div>}
        <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
      </div></div>
    );
  }
  const canInterview = app.status === 'SHORTLISTED' || app.status === 'INTERVIEW_SCHEDULED';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="app-title">
      <div className="modal-content" style={{ maxWidth: 820 }}>
        <div className="modal-header">
          <div>
            <span className="ks-code">{app.reference}</span>
            <h3 id="app-title" style={{ marginTop: 2 }}>{app.fullName}</h3>
            <div className="ks-muted" style={{ fontSize: '0.85rem' }}>{app.jobTitle} · {app.department}</div>
          </div>
          <button className="ks-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <Alert msg={msg} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <StatusBadge status={app.status} />
          {app.rejectionReason && <span className="ks-danger-text" style={{ fontSize: '0.82rem' }}>Reason: {app.rejectionReason}</span>}
          <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => hrApi.downloadResume(app).catch((err) => setMsg({ ok: false, text: apiError(err, 'Could not download the resume.') }))}>
            <Download size={14} /> Resume ({app.resumeFileName})
          </button>
        </div>

        <div className="ks-detail-grid">
          <div><span className="ks-label">Email</span><a href={`mailto:${app.email}`} className="ks-accent">{app.email}</a></div>
          <div><span className="ks-label">Phone</span>{app.phone}</div>
          <div><span className="ks-label">Applied</span>{when(app.createdAt)}</div>
          <div><span className="ks-label">Education</span>{app.education || '—'}</div>
          <div className="ks-span-2"><span className="ks-label">Experience</span><p className="ks-pre">{app.experience || '—'}</p></div>
          <div className="ks-span-2"><span className="ks-label">Skills</span>{app.skills || '—'}</div>
          {app.coverLetter && <div className="ks-span-2"><span className="ks-label">Cover letter</span><p className="ks-pre">{app.coverLetter}</p></div>}
        </div>

        {/* Pipeline actions */}
        {app.allowedNextStatuses.length > 0 && (
          <section className="ks-inset" style={{ marginTop: 14 }}>
            <h4 className="ks-section-title" style={{ marginBottom: 8 }}>Next step</h4>
            <div className="ks-actions">
              {app.allowedNextStatuses.map((s) => (
                <button key={s} disabled={busy} className={`btn btn-sm ${s === 'REJECTED' ? 'btn-danger' : s === 'HIRED' || s === 'SELECTED' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setDecision({ status: s, note: '' })}>
                  {s === 'SHORTLISTED' ? 'Shortlist' : s === 'UNDER_REVIEW' ? 'Start review' : s === 'SELECTED' ? 'Select candidate' : s === 'HIRED' ? 'Mark as hired' : s === 'REJECTED' ? 'Reject' : APPLICATION_LABEL[s]}
                </button>
              ))}
              {canInterview && !scheduled && (
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => setInterviewForm({ input: { scheduledAt: toLocalInput(), durationMinutes: 45, type: 'IN_PERSON', locationOrLink: '', interviewer: '', instructions: '' } })}>
                  <CalendarClock size={14} /> Schedule interview
                </button>
              )}
            </div>
            {decision && (
              <form className="ks-form" style={{ marginTop: 10 }} onSubmit={async (e) => {
                e.preventDefault();
                if (await run(() => hrApi.changeStatus(app.id, decision.status, decision.note), `Moved to ${APPLICATION_LABEL[decision.status]}.`)) setDecision(null);
              }}>
                <label className="ks-label" htmlFor="decision-note">{decision.status === 'REJECTED' ? 'Reason for rejection (optional)' : `Note for "${APPLICATION_LABEL[decision.status]}" (optional)`}</label>
                <input id="decision-note" maxLength={500} value={decision.note} onChange={(e) => setDecision({ ...decision, note: e.target.value })} />
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setDecision(null)}>Cancel</button>
                  <button type="submit" className={`btn ${decision.status === 'REJECTED' ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>Confirm: {APPLICATION_LABEL[decision.status]}</button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* Hiring: employee account */}
        {app.status === 'HIRED' && (
          <section className="ks-inset" style={{ marginTop: 14 }}>
            <h4 className="ks-section-title" style={{ marginBottom: 8 }}><UserCheck size={16} /> Employee account</h4>
            {app.employeeEmail ? (
              <div className="ks-success-text">Staff login created: <strong>{app.employeeEmail}</strong></div>
            ) : account ? (
              <form className="ks-form" onSubmit={async (e) => {
                e.preventDefault();
                if (await run(() => hrApi.createEmployeeAccount(app.id, { role: account.role, initialPassword: account.password, location: account.location || undefined }),
                  `${account.role} login created for ${app.email}. Share the first password with them securely.`)) setAccount(null);
              }}>
                <div className="ks-form-grid">
                  <div>
                    <label className="ks-label" htmlFor="acc-role">Role</label>
                    <select id="acc-role" value={account.role} onChange={(e) => setAccount({ ...account, role: e.target.value as Role })}>
                      <option value="TECHNICIAN">Technician</option>
                      <option value="DISPATCHER">Dispatcher</option>
                      {role === 'MANAGER' && <option value="HR">HR</option>}
                    </select>
                  </div>
                  <div><label className="ks-label" htmlFor="acc-pass">First password (min 8)</label><input id="acc-pass" type="password" minLength={8} required autoComplete="new-password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} /></div>
                  {account.role === 'TECHNICIAN' && <div><label className="ks-label" htmlFor="acc-loc">Base location</label><input id="acc-loc" maxLength={150} value={account.location} onChange={(e) => setAccount({ ...account, location: e.target.value })} placeholder="e.g. Jaipur" /></div>}
                </div>
                <div className="ks-hint">The login uses the candidate&apos;s email ({app.email}). Manager accounts are never created here.</div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setAccount(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={busy}>Create account</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="ks-muted">Hiring does not create a login automatically.</span>
                <button className="btn btn-sm btn-primary" onClick={() => setAccount({ role: 'TECHNICIAN', password: '', location: '' })}><UserPlus size={14} /> Create employee account</button>
              </div>
            )}
          </section>
        )}

        {/* Interviews */}
        <section style={{ marginTop: 16 }}>
          <h4 className="ks-section-title"><CalendarClock size={16} /> Interviews</h4>
          {(app.interviews || []).length === 0 ? <div className="ks-dim" style={{ fontSize: '0.85rem' }}>{canInterview ? 'No interview yet.' : 'Shortlist the candidate to schedule an interview.'}</div> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {app.interviews!.map((i) => (
                <div key={i.id} className="ks-inset" style={{ fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{when(i.scheduledAt)} · {i.durationMinutes} min · {INTERVIEW_TYPE_LABEL[i.type]}</strong>
                    <span className={`badge badge-iv-${i.status.toLowerCase()}`}>{i.status}</span>
                  </div>
                  <div className="ks-muted">With {i.interviewer} · {i.locationOrLink}{i.rescheduleCount > 0 ? ` · rescheduled ${i.rescheduleCount}×` : ''}</div>
                  {i.instructions && <div className="ks-dim">{i.instructions}</div>}
                  <div className="ks-dim">{i.candidateEmailed ? 'Candidate emailed.' : 'Candidate not emailed (email delivery off) — share these details directly.'}</div>
                  {i.status === 'SCHEDULED' && (
                    <div className="ks-actions" style={{ marginTop: 6 }}>
                      <button className="btn btn-sm btn-secondary" disabled={busy} onClick={() => setInterviewForm({ id: i.id, input: { scheduledAt: toLocalInput(i.scheduledAt), durationMinutes: i.durationMinutes, type: i.type, locationOrLink: i.locationOrLink, interviewer: i.interviewer, instructions: i.instructions || '' } })}>Reschedule</button>
                      <button className="btn btn-sm btn-success" disabled={busy} onClick={() => run(() => hrApi.completeInterview(i.id), 'Interview marked as held.')}>Mark held</button>
                      <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => {
                        const reason = window.prompt('Cancel this interview? Optional reason:');
                        if (reason !== null) run(() => hrApi.cancelInterview(i.id, reason), 'Interview cancelled.');
                      }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {interviewForm && (
            <form className="ks-form ks-inset" style={{ marginTop: 10 }} onSubmit={async (e) => {
              e.preventDefault();
              const input = { ...interviewForm.input, durationMinutes: Number(interviewForm.input.durationMinutes) };
              if (new Date(input.scheduledAt) <= new Date()) { setMsg({ ok: false, text: 'Choose an interview time in the future.' }); return; }
              const ok = await run(() => (interviewForm.id ? hrApi.rescheduleInterview(interviewForm.id, input) : hrApi.scheduleInterview(app.id, input)),
                interviewForm.id ? 'Interview rescheduled.' : 'Interview scheduled.');
              if (ok) setInterviewForm(null);
            }}>
              <h4 className="ks-section-title" style={{ margin: 0 }}>{interviewForm.id ? 'Reschedule interview' : 'Schedule interview'}</h4>
              <div className="ks-form-grid">
                <div><label className="ks-label" htmlFor="iv-when">Date and time *</label><input id="iv-when" type="datetime-local" required min={toLocalInput(new Date().toISOString())} value={interviewForm.input.scheduledAt} onChange={(e) => setInterviewForm({ ...interviewForm, input: { ...interviewForm.input, scheduledAt: e.target.value } })} /></div>
                <div><label className="ks-label" htmlFor="iv-len">Length (minutes) *</label><input id="iv-len" type="number" min={15} max={480} step={5} required value={interviewForm.input.durationMinutes} onChange={(e) => setInterviewForm({ ...interviewForm, input: { ...interviewForm.input, durationMinutes: Number(e.target.value) } })} /></div>
                <div>
                  <label className="ks-label" htmlFor="iv-type">Type *</label>
                  <select id="iv-type" value={interviewForm.input.type} onChange={(e) => setInterviewForm({ ...interviewForm, input: { ...interviewForm.input, type: e.target.value as InterviewType } })}>
                    {(Object.keys(INTERVIEW_TYPE_LABEL) as InterviewType[]).map((t) => <option key={t} value={t}>{INTERVIEW_TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div><label className="ks-label" htmlFor="iv-who">Interviewer *</label><input id="iv-who" required maxLength={120} value={interviewForm.input.interviewer} onChange={(e) => setInterviewForm({ ...interviewForm, input: { ...interviewForm.input, interviewer: e.target.value } })} /></div>
              </div>
              <div><label className="ks-label" htmlFor="iv-where">{interviewForm.input.type === 'VIDEO' ? 'Meeting link *' : interviewForm.input.type === 'PHONE' ? 'Phone number *' : 'Address *'}</label><input id="iv-where" required maxLength={500} value={interviewForm.input.locationOrLink} onChange={(e) => setInterviewForm({ ...interviewForm, input: { ...interviewForm.input, locationOrLink: e.target.value } })} /></div>
              <div><label className="ks-label" htmlFor="iv-notes">Instructions for the candidate</label><textarea id="iv-notes" rows={2} maxLength={2000} value={interviewForm.input.instructions || ''} onChange={(e) => setInterviewForm({ ...interviewForm, input: { ...interviewForm.input, instructions: e.target.value } })} placeholder="e.g. Bring a photo ID and your certificates" /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setInterviewForm(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}><Send size={14} /> {interviewForm.id ? 'Save new time' : 'Schedule'}</button>
              </div>
            </form>
          )}
        </section>

        {/* Internal notes */}
        <section style={{ marginTop: 16 }}>
          <h4 className="ks-section-title">Internal notes <span className="ks-dim" style={{ fontWeight: 500 }}>(HR only, never shown to the candidate)</span></h4>
          <textarea aria-label="Internal notes" rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="modal-actions" style={{ marginTop: 6 }}>
            <button className="btn btn-sm btn-secondary" disabled={busy || notes === (app.internalNotes || '')} onClick={() => run(() => hrApi.updateApplication(app.id, { internalNotes: notes }), 'Notes saved.')}>Save notes</button>
          </div>
        </section>

        {/* History */}
        <section style={{ marginTop: 8 }}>
          <h4 className="ks-section-title">Hiring history</h4>
          <ol className="ks-timeline">
            {(app.history || []).map((h) => (
              <li key={h.id}>
                <div><strong>{h.action}</strong></div>
                <div className="ks-dim">{when(h.changedAt)} · {h.changedByName}</div>
              </li>
            ))}
          </ol>
        </section>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
};

// ---------- Interviews ----------

export const InterviewsPage: React.FC = () => {
  const [list, setList] = useState<Interview[]>([]);
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    hrApi.interviews(upcomingOnly).then(setList)
      .catch((err) => setMsg({ ok: false, text: apiError(err, 'Unable to load interviews.') }))
      .finally(() => setLoading(false));
  };
  useEffect(load, [upcomingOnly]);

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Interviews</h2>
          <p className="ks-page-sub">The interview schedule. Open a candidate to reschedule, cancel or record the outcome.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => exportApi.interviews().catch((err) => setMsg({ ok: false, text: apiError(err, 'Export failed.') }))}><Download size={15} /> Export CSV</button>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
        </div>
      </div>
      <Alert msg={msg} />
      <div className="ks-filter-row">
        <button className={`btn btn-sm ${upcomingOnly ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setUpcomingOnly(true)}>Upcoming</button>
        <button className={`btn btn-sm ${!upcomingOnly ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setUpcomingOnly(false)}>All</button>
      </div>
      {loading ? <div className="ks-empty">Loading…</div> : list.length === 0 ? (
        <div className="card ks-empty">{upcomingOnly ? 'No upcoming interviews.' : 'No interviews yet.'}</div>
      ) : (
        <div className="ks-table-wrap">
          <table className="ks-table">
            <thead><tr><th>When</th><th>Candidate</th><th>Position</th><th>Type</th><th>Interviewer</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><strong>{when(i.scheduledAt)}</strong><div className="ks-dim" style={{ fontSize: '0.76rem' }}>{i.durationMinutes} min</div></td>
                  <td>{i.candidateName}<div className="ks-dim" style={{ fontSize: '0.76rem' }}>{i.applicationReference}</div></td>
                  <td>{i.jobTitle}</td>
                  <td>{INTERVIEW_TYPE_LABEL[i.type]}<div className="ks-dim" style={{ fontSize: '0.76rem', maxWidth: 220, overflowWrap: 'anywhere' }}>{i.locationOrLink}</div></td>
                  <td>{i.interviewer}</td>
                  <td><span className={`badge badge-iv-${i.status.toLowerCase()}`}>{i.status}</span></td>
                  <td><button className="btn btn-sm btn-primary" onClick={() => setOpenId(i.applicationId)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openId && <ApplicationDetail id={openId} onClose={() => { setOpenId(null); load(); }} />}
    </div>
  );
};

// ---------- Public careers ----------

export const CareersSection: React.FC = () => {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<number | undefined>();

  useEffect(() => {
    careersApi.jobs().then(setJobs).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="site-careers">
      <div className="site-job-list">
        {loading ? <p className="site-muted">Loading open positions…</p> : failed ? (
          <p className="site-muted">Open positions could not be loaded right now. Please try again later.</p>
        ) : jobs.length === 0 ? (
          <p className="site-muted">There are no open positions at the moment. Please check back soon.</p>
        ) : jobs.map((j) => (
          <article key={j.id} className={`site-job ${selected === j.id ? 'selected' : ''}`}>
            <div className="site-job-head">
              <h3>{j.title}</h3>
              <span className="site-chip">{EMPLOYMENT_LABEL[j.employmentType]}</span>
            </div>
            <p className="site-muted">{j.department} · {j.location}{j.applicationDeadline ? ` · Apply by ${day(j.applicationDeadline)}` : ''}</p>
            <p className="site-job-desc">{j.description}</p>
            {j.requiredSkills && <p className="site-muted"><strong>Skills:</strong> {j.requiredSkills}</p>}
            <button className="site-btn site-btn-outline" onClick={() => { setSelected(j.id); document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <Users size={16} /> Apply for this role
            </button>
          </article>
        ))}
      </div>
      {jobs.length > 0 && (
        <div id="apply-form" className="site-form-card">
          <h3>Apply now</h3>
          <p className="site-muted">Your resume is stored privately and only our HR team can open it.</p>
          <JobApplicationForm jobs={jobs} initialJobId={selected}
            onSubmit={async (jobId, form, resume) => (await careersApi.apply(jobId, form, resume)).message} />
        </div>
      )}
    </div>
  );
};
