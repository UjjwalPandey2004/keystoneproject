import React, { useState, useEffect } from 'react';
import { apiError, workOrderApi, partApi } from '../services/api';
import { Part, WorkOrder } from '../types';
import { Play, Pause, CheckCircle, Package, Clock, MapPin, X, Pencil, Eye, RefreshCw, Building } from 'lucide-react';
import { AttachmentsPanel } from '../components/AttachmentsPanel';

const today = () => new Date().toISOString().slice(0, 10);

// Minutes between two "HH:mm" values, or null when the range is incomplete or reversed.
export const minutesBetween = (start: string, end: string): number | null => {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
};

export const formatMinutes = (minutes: number) =>
  minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;

export const TechnicianFieldView: React.FC = () => {
  const [jobs, setJobs] = useState<WorkOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Modal states
  const [activeJobForParts, setActiveJobForParts] = useState<WorkOrder | null>(null);
  const [activeJobForTime, setActiveJobForTime] = useState<WorkOrder | null>(null);
  const [holdModalJob, setHoldModalJob] = useState<WorkOrder | null>(null);
  const [editJob, setEditJob] = useState<WorkOrder | null>(null);
  const [viewJob, setViewJob] = useState<WorkOrder | null>(null);
  const [modalError, setModalError] = useState('');

  // Form states
  const [selectedPartId, setSelectedPartId] = useState<number | ''>('');
  const [partQty, setPartQty] = useState<number>(1);
  const [workDate, setWorkDate] = useState(today());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [laborNote, setLaborNote] = useState<string>('');
  const [holdNote, setHoldNote] = useState<string>('');
  const [notesDraft, setNotesDraft] = useState('');

  const fetchTechnicianData = async () => {
    try {
      setLoading(true);
      const [woRes, partsRes] = await Promise.all([
        workOrderApi.list({ size: 50 }),
        partApi.list(),
      ]);
      setJobs(woRes.content || []);
      setParts(partsRes || []);
      if (partsRes && partsRes.length > 0) {
        setSelectedPartId(partsRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load technician jobs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicianData();
  }, []);

  const run = async (action: () => Promise<unknown>, success: string, fallback: string) => {
    try {
      await action();
      setMessage({ ok: true, text: success });
      fetchTechnicianData();
      return true;
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, fallback) });
      return false;
    }
  };

  const handleStartJob = (id: number) => run(() => workOrderApi.transitionStatus(id, 'IN_PROGRESS', 'Technician started work'), 'Job started.', 'Failed to start job');
  const handleResumeJob = (id: number) => run(() => workOrderApi.transitionStatus(id, 'IN_PROGRESS', 'Technician resumed work'), 'Job resumed.', 'Failed to resume job');

  const handleHoldJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdModalJob) return;
    try {
      await workOrderApi.transitionStatus(holdModalJob.id, 'ON_HOLD', holdNote || 'Waiting on parts/access');
      setHoldModalJob(null);
      setHoldNote('');
      setMessage({ ok: true, text: 'Job put on hold.' });
      fetchTechnicianData();
    } catch (err) {
      setModalError(apiError(err, 'Failed to pause job'));
    }
  };

  const handleCompleteJob = (id: number) => {
    if (!window.confirm('Mark this job as completed?')) return;
    run(() => workOrderApi.transitionStatus(id, 'COMPLETED', 'Technician completed field work'), 'Job marked as completed. The customer has been notified.', 'Failed to complete job');
  };

  const handleLogParts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobForParts || !selectedPartId) return;
    try {
      await workOrderApi.logParts(activeJobForParts.id, Number(selectedPartId), Number(partQty));
      setActiveJobForParts(null);
      setPartQty(1);
      setMessage({ ok: true, text: 'Parts logged and stock updated.' });
      fetchTechnicianData();
    } catch (err) {
      setModalError(apiError(err, 'Failed to log parts'));
    }
  };

  const openLogTime = (job: WorkOrder) => {
    setModalError('');
    setWorkDate(today());
    setStartTime('');
    setEndTime('');
    setLaborNote('');
    setActiveJobForTime(job);
  };

  const duration = minutesBetween(startTime, endTime);

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobForTime) return;
    if (duration === null) {
      setModalError('Enter a start and end time; the end must be after the start.');
      return;
    }
    try {
      await workOrderApi.logTime(activeJobForTime.id, { workDate, startTime, endTime, note: laborNote || undefined });
      setActiveJobForTime(null);
      setMessage({ ok: true, text: `Logged ${formatMinutes(duration)} on ${activeJobForTime.code}.` });
      fetchTechnicianData();
    } catch (err) {
      setModalError(apiError(err, 'Failed to log time'));
    }
  };

  const openEdit = (job: WorkOrder) => {
    setModalError('');
    setNotesDraft(job.technicianNotes || '');
    setEditJob(job);
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editJob) return;
    try {
      await workOrderApi.updateTechnicianNotes(editJob.id, notesDraft);
      setEditJob(null);
      setMessage({ ok: true, text: `Notes saved on ${editJob.code}.` });
      fetchTechnicianData();
    } catch (err) {
      setModalError(apiError(err, 'Failed to save notes'));
    }
  };

  const open = (job: WorkOrder) => job.status !== 'CLOSED' && job.status !== 'CANCELLED' && job.status !== 'COMPLETED';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">My Work Orders</h2>
          <p className="ks-page-sub">Update job status, log time and parts, and keep on-site notes.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchTechnicianData}><RefreshCw size={15} /> Refresh</button>
      </div>

      {message && <div className={`ks-alert ${message.ok ? 'ks-alert-success' : 'ks-alert-error'}`}>{message.text}</div>}

      {loading ? (
        <div className="ks-empty">Loading your assigned jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="card ks-empty">
          <h3 className="ks-text">No assigned jobs at the moment</h3>
          <p style={{ fontSize: '0.875rem', marginTop: 8 }}>New jobs appear here (and in your notifications) as soon as a dispatcher assigns them to you.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {jobs.map((job) => (
            <div key={job.id} className="card" style={{ borderLeft: `5px solid ${job.status === 'IN_PROGRESS' ? '#f59e0b' : job.status === 'COMPLETED' ? '#10b981' : '#6366f1'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ks-code">{job.code}</span>
                  <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status.replace('_', ' ')}</span>
                </div>
                <span className={`badge badge-${job.priority.toLowerCase()}`}>{job.priority}</span>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>{job.title}</h3>
              {job.description && <p className="ks-inset ks-muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>{job.description}</p>}

              <div className="ks-muted" style={{ display: 'grid', gap: 4, fontSize: '0.84rem', marginBottom: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> <strong className="ks-text">{job.siteName}</strong> — {job.siteAddress || 'Address not provided'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building size={14} /> Customer: {job.customerName}</span>
              </div>

              {job.technicianNotes && (
                <div className="ks-inset" style={{ fontSize: '0.84rem', marginBottom: 12 }}>
                  <strong>My notes:</strong> <span className="ks-muted">{job.technicianNotes}</span>
                </div>
              )}

              <div className="ks-inset" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', marginBottom: 14 }}>
                <div><strong>Parts:</strong> ${(job.totalPartsCost ?? 0).toFixed(2)}</div>
                <div><strong>Time logged:</strong> {formatMinutes(job.totalLaborMinutes)}</div>
                <div><strong>SLA due:</strong> {new Date(job.slaDueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--ks-border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {job.status === 'ASSIGNED' && (
                    <button onClick={() => handleStartJob(job.id)} className="btn btn-success btn-sm"><Play size={14} /> Start Job</button>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    <>
                      <button onClick={() => { setModalError(''); setHoldModalJob(job); }} className="btn btn-warning btn-sm"><Pause size={14} /> Hold</button>
                      <button onClick={() => handleCompleteJob(job.id)} className="btn btn-success btn-sm"><CheckCircle size={14} /> Complete Work</button>
                    </>
                  )}
                  {job.status === 'ON_HOLD' && (
                    <button onClick={() => handleResumeJob(job.id)} className="btn btn-warning btn-sm"><Play size={14} /> Resume Work</button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => setViewJob(job)} className="btn btn-secondary btn-sm"><Eye size={14} /> View</button>
                  {open(job) && (
                    <>
                      <button onClick={() => openEdit(job)} className="btn btn-secondary btn-sm"><Pencil size={14} /> Edit</button>
                      <button onClick={() => { setModalError(''); setActiveJobForParts(job); }} className="btn btn-secondary btn-sm"><Package size={14} /> Log Parts</button>
                      <button onClick={() => openLogTime(job)} className="btn btn-primary btn-sm"><Clock size={14} /> Log Time</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOG PARTS MODAL */}
      {activeJobForParts && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Log Parts Used — {activeJobForParts.code}</h3>
              <button className="ks-icon-btn" onClick={() => setActiveJobForParts(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <p className="ks-muted" style={{ fontSize: '0.85rem' }}>Consuming parts decrements inventory in a transactional update.</p>
            {modalError && <div className="ks-alert ks-alert-error">{modalError}</div>}
            <form onSubmit={handleLogParts} className="ks-form">
              <div>
                <label className="ks-label">Select Part</label>
                <select value={selectedPartId} onChange={(e) => setSelectedPartId(Number(e.target.value))} required>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) — ${p.unitCost.toFixed(2)} | In Stock: {p.stockQty}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ks-label">Quantity Used</label>
                <input type="number" min={1} value={partQty} onChange={(e) => setPartQty(Number(e.target.value))} required />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setActiveJobForParts(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Parts Usage</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG TIME MODAL */}
      {activeJobForTime && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Log Time — {activeJobForTime.code}</h3>
              <button className="ks-icon-btn" onClick={() => setActiveJobForTime(null)} aria-label="Close"><X size={20} /></button>
            </div>
            {modalError && <div className="ks-alert ks-alert-error">{modalError}</div>}
            <form onSubmit={handleLogTime} className="ks-form">
              <div>
                <label className="ks-label" htmlFor="lt-date">Date</label>
                <input id="lt-date" type="date" value={workDate} max={today()} onChange={(e) => setWorkDate(e.target.value)} required />
              </div>
              <div className="ks-form-grid">
                <div>
                  <label className="ks-label" htmlFor="lt-start">Start Time</label>
                  <input id="lt-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div>
                  <label className="ks-label" htmlFor="lt-end">End Time</label>
                  <input id="lt-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>
              <div className={`ks-inset ${duration ? 'ks-stat-tint-info' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="ks-label" style={{ margin: 0 }}>Duration</span>
                <strong style={{ fontSize: '1.1rem' }}>
                  {duration ? `${formatMinutes(duration)} (${duration} min)` : startTime && endTime ? 'End must be after start' : '—'}
                </strong>
              </div>
              <div>
                <label className="ks-label" htmlFor="lt-notes">Notes</label>
                <textarea id="lt-notes" value={laborNote} onChange={(e) => setLaborNote(e.target.value)} rows={3} placeholder="e.g. Replaced filter and verified airflow" />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setActiveJobForTime(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!duration}><Clock size={15} /> Save Time</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT (TECHNICIAN NOTES) MODAL */}
      {editJob && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Edit Job — {editJob.code}</h3>
              <button className="ks-icon-btn" onClick={() => setEditJob(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <p className="ks-muted" style={{ fontSize: '0.85rem' }}>
              Technicians can edit their on-site notes. Title, priority and customer details are managed by dispatch.
            </p>
            {modalError && <div className="ks-alert ks-alert-error">{modalError}</div>}
            <form onSubmit={handleSaveNotes} className="ks-form">
              <div>
                <label className="ks-label" htmlFor="tech-notes">Technician notes</label>
                <textarea id="tech-notes" rows={6} maxLength={4000} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Findings, access details, parts to order, follow-up needed…" />
                <div className="ks-hint">{notesDraft.length}/4000</div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditJob(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary"><Pencil size={15} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW JOB MODAL */}
      {viewJob && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 660 }}>
            <div className="modal-header">
              <div>
                <span className="ks-code">{viewJob.code}</span>
                <h3 style={{ marginTop: 2 }}>{viewJob.title}</h3>
              </div>
              <button className="ks-icon-btn" onClick={() => setViewJob(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="ks-inset" style={{ display: 'grid', gap: 6, fontSize: '0.86rem' }}>
              <div><strong>Status:</strong> {viewJob.status.replace('_', ' ')} · <strong>Priority:</strong> {viewJob.priority}</div>
              <div><strong>Customer:</strong> {viewJob.customerName}</div>
              <div><strong>Location:</strong> {viewJob.siteName} — {viewJob.siteAddress || 'Address not provided'}</div>
              <div><strong>SLA due:</strong> {new Date(viewJob.slaDueDate).toLocaleString()}</div>
              {viewJob.description && <div><strong>Description:</strong> <span className="ks-muted">{viewJob.description}</span></div>}
            </div>

            <h4 className="ks-section-title" style={{ marginTop: 18 }}><Clock size={16} /> Time log</h4>
            {(viewJob.timeLogs || []).length === 0 ? (
              <div className="ks-hint">No time logged yet.</div>
            ) : (
              <div className="ks-table-wrap">
                <table className="ks-table">
                  <thead><tr><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Notes</th></tr></thead>
                  <tbody>
                    {(viewJob.timeLogs || []).map((t) => (
                      <tr key={t.id}>
                        <td>{t.workDate ? new Date(t.workDate).toLocaleDateString() : new Date(t.loggedAt).toLocaleDateString()}</td>
                        <td>{t.startTime?.slice(0, 5) || '—'}</td>
                        <td>{t.endTime?.slice(0, 5) || '—'}</td>
                        <td><strong>{formatMinutes(t.minutes)}</strong></td>
                        <td className="ks-muted">{t.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <AttachmentsPanel workOrderId={viewJob.id} canUpload={open(viewJob)} />

            <div className="modal-actions">
              <button onClick={() => setViewJob(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* HOLD REASON MODAL */}
      {holdModalJob && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Put Job on Hold</h3>
              <button className="ks-icon-btn" onClick={() => setHoldModalJob(null)} aria-label="Close"><X size={20} /></button>
            </div>
            {modalError && <div className="ks-alert ks-alert-error">{modalError}</div>}
            <form onSubmit={handleHoldJob} className="ks-form">
              <div>
                <label className="ks-label">Reason for Pause</label>
                <input type="text" value={holdNote} onChange={(e) => setHoldNote(e.target.value)} required placeholder="e.g. Awaiting specialized HVAC refrigerant delivery" />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setHoldModalJob(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-warning"><Pause size={15} /> Pause Work</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
