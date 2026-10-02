import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ListChecks, MapPin, Pause, Play } from 'lucide-react';
import { workOrderApi } from '../services/api';
import { WorkOrder, WorkOrderStatus } from '../types';
import { formatMinutes } from './TechnicianFieldView';
import { Tab } from '../navigation';

// The next thing the technician has to do for a job in each status.
const NEXT_STEP: Partial<Record<WorkOrderStatus, { label: string; icon: React.ReactNode; tone: string }>> = {
  ASSIGNED: { label: 'Travel to site and start the job', icon: <Play size={15} />, tone: 'ks-alert-info' },
  IN_PROGRESS: { label: 'Log your time, then complete the work', icon: <Clock size={15} />, tone: 'ks-alert-warning' },
  ON_HOLD: { label: 'Resolve the blocker and resume', icon: <Pause size={15} />, tone: 'ks-alert-warning' },
};

const ORDER: WorkOrderStatus[] = ['IN_PROGRESS', 'ASSIGNED', 'ON_HOLD'];

export const MyTasksPage: React.FC<{ onTabChange: (tab: Tab) => void }> = ({ onTabChange }) => {
  const [jobs, setJobs] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workOrderApi.list({ size: 100 })
      .then((page) => setJobs(page.content || []))
      .finally(() => setLoading(false));
  }, []);

  const todo = jobs
    .filter((j) => ORDER.includes(j.status))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)
      || new Date(a.slaDueDate).getTime() - new Date(b.slaDueDate).getTime());
  const done = jobs.filter((j) => j.status === 'COMPLETED' || j.status === 'CLOSED');
  const todayKey = new Date().toISOString().slice(0, 10);
  const minutesToday = jobs
    .flatMap((j) => j.timeLogs || [])
    .filter((t) => (t.workDate || t.loggedAt.slice(0, 10)) === todayKey)
    .reduce((sum, t) => sum + t.minutes, 0);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">My Tasks</h2>
          <p className="ks-page-sub">What to do next, ordered by urgency and SLA deadline.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onTabChange('field')}><ListChecks size={15} /> Open My Work Orders</button>
      </div>

      <div className="ks-grid" style={{ marginBottom: 20 }}>
        <div className="ks-card"><div className="ks-tile-value">{todo.length}</div><div className="ks-tile-title">Open tasks</div></div>
        <div className="ks-card"><div className="ks-tile-value">{formatMinutes(minutesToday)}</div><div className="ks-tile-title">Logged today</div></div>
        <div className="ks-card"><div className="ks-tile-value">{done.length}</div><div className="ks-tile-title">Completed jobs</div></div>
      </div>

      {loading ? (
        <div className="ks-empty">Loading tasks…</div>
      ) : todo.length === 0 ? (
        <div className="card ks-empty"><CheckCircle2 size={28} className="ks-success-text" /><p style={{ marginTop: 8 }}>Nothing waiting for you. Nice work!</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {todo.map((job) => {
            const step = NEXT_STEP[job.status]!;
            return (
              <div key={job.id} className="card" style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <span className="ks-code">{job.code}</span> <strong>{job.title}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status.replace('_', ' ')}</span>
                    <span className={`badge badge-${job.priority.toLowerCase()}`}>{job.priority}</span>
                  </div>
                </div>
                <div className="ks-muted" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.84rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={14} /> {job.siteName}{job.siteAddress ? `, ${job.siteAddress}` : ''}</span>
                  <span className={job.slaBreached ? 'ks-danger-text' : ''} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {job.slaBreached ? <AlertTriangle size={14} /> : <Clock size={14} />}
                    {job.slaBreached ? 'SLA breached' : `Due ${new Date(job.slaDueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </div>
                <div className={`ks-alert ${step.tone}`} style={{ marginBottom: 0 }}>{step.icon} <span><strong>Next:</strong> {step.label}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
