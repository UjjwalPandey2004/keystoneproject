import React, { useState, useEffect } from 'react';
import { workOrderApi, partApi } from '../services/api';
import { Part, WorkOrder } from '../types';
import { Play, Pause, CheckCircle, Package, Clock, MapPin, X } from 'lucide-react';

export const TechnicianFieldView: React.FC = () => {
  const [jobs, setJobs] = useState<WorkOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [activeJobForParts, setActiveJobForParts] = useState<WorkOrder | null>(null);
  const [activeJobForTime, setActiveJobForTime] = useState<WorkOrder | null>(null);
  const [holdModalJob, setHoldModalJob] = useState<WorkOrder | null>(null);

  // Form states
  const [selectedPartId, setSelectedPartId] = useState<number | ''>('');
  const [partQty, setPartQty] = useState<number>(1);
  const [laborMinutes, setLaborMinutes] = useState<number>(30);
  const [laborNote, setLaborNote] = useState<string>('');
  const [holdNote, setHoldNote] = useState<string>('');

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

  const handleStartJob = async (id: number) => {
    try {
      await workOrderApi.transitionStatus(id, 'IN_PROGRESS', 'Technician started work');
      fetchTechnicianData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start job');
    }
  };

  const handleResumeJob = async (id: number) => {
    try {
      await workOrderApi.transitionStatus(id, 'IN_PROGRESS', 'Technician resumed work');
      fetchTechnicianData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume job');
    }
  };

  const handleHoldJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdModalJob) return;

    try {
      await workOrderApi.transitionStatus(holdModalJob.id, 'ON_HOLD', holdNote || 'Waiting on parts/access');
      setHoldModalJob(null);
      setHoldNote('');
      fetchTechnicianData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to pause job');
    }
  };

  const handleCompleteJob = async (id: number) => {
    if (!window.confirm('Are you sure you want to mark this job as completed?')) return;
    try {
      await workOrderApi.transitionStatus(id, 'COMPLETED', 'Technician completed field work');
      fetchTechnicianData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete job');
    }
  };

  const handleLogParts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobForParts || !selectedPartId) return;

    try {
      await workOrderApi.logParts(activeJobForParts.id, Number(selectedPartId), Number(partQty));
      alert('Parts logged and stock decremented successfully!');
      setActiveJobForParts(null);
      setPartQty(1);
      fetchTechnicianData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to log parts: ' + err.message);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobForTime) return;

    try {
      await workOrderApi.logTime(activeJobForTime.id, Number(laborMinutes), laborNote);
      alert('Labor time logged successfully!');
      setActiveJobForTime(null);
      setLaborMinutes(30);
      setLaborNote('');
      fetchTechnicianData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to log labor time');
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Field Technician Workspace</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Update job status, log consumed parts, and track labor hours in real time.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Loading technician assigned jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          <h3>No assigned jobs at the moment</h3>
          <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Switch to the Dispatcher role to assign work orders to your account.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {jobs.map((job) => (
            <div key={job.id} className="card" style={{ borderLeft: job.status === 'IN_PROGRESS' ? '5px solid #f59e0b' : '5px solid #4f46e5' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '0.9rem' }}>{job.code}</span>
                  <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status}</span>
                </div>
                <span className={`badge badge-${job.priority.toLowerCase()}`}>{job.priority}</span>
              </div>

              {/* Title & Description */}
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                {job.title}
              </h3>
              {job.description && (
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 10, background: '#f8fafc', padding: 8, borderRadius: 6 }}>
                  {job.description}
                </p>
              )}

              {/* Site Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                <MapPin size={14} />
                <span><strong>{job.siteName}</strong> — {job.siteAddress || 'Main Campus'} ({job.customerName})</span>
              </div>

              {/* Stats Bar */}
              <div style={{ display: 'flex', gap: 16, padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, fontSize: '0.8rem', marginBottom: 14 }}>
                <div><strong>Parts:</strong> ${job.totalPartsCost.toFixed(2)}</div>
                <div><strong>Labor:</strong> {job.totalLaborMinutes} mins</div>
                <div><strong>SLA Due:</strong> {new Date(job.slaDueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              {/* Technician Action Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {job.status === 'ASSIGNED' && (
                    <button onClick={() => handleStartJob(job.id)} className="btn btn-primary btn-sm" style={{ background: '#10b981' }}>
                      <Play size={14} /> Start Job
                    </button>
                  )}

                  {job.status === 'IN_PROGRESS' && (
                    <>
                      <button onClick={() => setHoldModalJob(job)} className="btn btn-secondary btn-sm" style={{ color: '#ea580c' }}>
                        <Pause size={14} /> Hold
                      </button>
                      <button onClick={() => handleCompleteJob(job.id)} className="btn btn-primary btn-sm" style={{ background: '#059669' }}>
                        <CheckCircle size={14} /> Complete Work
                      </button>
                    </>
                  )}

                  {job.status === 'ON_HOLD' && (
                    <button onClick={() => handleResumeJob(job.id)} className="btn btn-primary btn-sm" style={{ background: '#d97706' }}>
                      <Play size={14} /> Resume Work
                    </button>
                  )}
                </div>

                {job.status !== 'CLOSED' && job.status !== 'CANCELLED' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setActiveJobForParts(job)} className="btn btn-secondary btn-sm">
                      <Package size={14} /> Log Parts
                    </button>
                    <button onClick={() => setActiveJobForTime(job)} className="btn btn-secondary btn-sm">
                      <Clock size={14} /> Log Time
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* LOG PARTS MODAL */}
      {activeJobForParts && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Log Parts Used</h3>
              <button onClick={() => setActiveJobForParts(null)}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 14 }}>
              Consuming parts decrements inventory in a transactional update.
            </p>

            <form onSubmit={handleLogParts} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Select Part</label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(Number(e.target.value))}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — ${p.unitCost.toFixed(2)} | In Stock: {p.stockQty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Quantity Used</label>
                <input
                  type="number"
                  min={1}
                  value={partQty}
                  onChange={(e) => setPartQty(Number(e.target.value))}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
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
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Log Labor Time</h3>
              <button onClick={() => setActiveJobForTime(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleLogTime} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Minutes Worked</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={laborMinutes}
                  onChange={(e) => setLaborMinutes(Number(e.target.value))}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Work Notes (Optional)</label>
                <textarea
                  value={laborNote}
                  onChange={(e) => setLaborNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Replaced filter and verified airflow"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setActiveJobForTime(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Record Labor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOLD REASON MODAL */}
      {holdModalJob && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Pause Job (Put on Hold)</h3>
              <button onClick={() => setHoldModalJob(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleHoldJob} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Reason for Pause</label>
                <input
                  type="text"
                  value={holdNote}
                  onChange={(e) => setHoldNote(e.target.value)}
                  required
                  placeholder="e.g. Awaiting specialized HVAC refrigerant delivery"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setHoldModalJob(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#ea580c' }}>Pause Work</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
