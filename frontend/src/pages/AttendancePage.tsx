import React, { useEffect, useState } from 'react';
import { CalendarCheck, Pencil, RefreshCw, X } from 'lucide-react';
import { apiError, attendanceApi } from '../services/api';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { ATTENDANCE_BADGE } from './StaffPage';

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const timeOf = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
export const hoursText = (h?: number | null) => (h == null ? '—' : `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`);

const STATUSES: AttendanceStatus[] = ['PRESENT', 'HALF_DAY', 'ON_LEAVE', 'ABSENT'];

// Manager: organisation-wide staff attendance for any day.
export const AttendancePage: React.FC = () => {
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>('ON_LEAVE');
  const [note, setNote] = useState('');

  const load = (day = date) => {
    setLoading(true);
    attendanceApi.forDay(day)
      .then((list) => setRows(list))
      .catch((err) => setMessage({ ok: false, text: apiError(err, 'Unable to load attendance.') }))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(date), [date]);

  const count = (s: string) => rows.filter((r) => r.status === s).length;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await attendanceApi.mark(editing.userId, { date, status, note: note || undefined });
      setMessage({ ok: true, text: `${editing.userName} marked ${status.replace('_', ' ').toLowerCase()} on ${date}. They have been notified.` });
      setEditing(null);
      load();
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Could not update attendance.') });
    }
  };

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Staff Attendance</h2>
          <p className="ks-page-sub">Technicians and dispatchers check in and out from their dashboard. Mark leave or absence here.</p>
        </div>
        <div className="ks-toolbar-actions" style={{ alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" style={{ width: 'auto' }} />
          <button className="btn btn-secondary" onClick={() => load()}><RefreshCw size={15} /> Refresh</button>
        </div>
      </div>

      {message && <div className={`ks-alert ${message.ok ? 'ks-alert-success' : 'ks-alert-error'}`}>{message.text}</div>}

      <div className="ks-grid" style={{ marginBottom: 18 }}>
        <div className="ks-card"><div className="ks-tile-value">{count('PRESENT') + count('HALF_DAY')}</div><div className="ks-tile-title">Present</div></div>
        <div className="ks-card"><div className="ks-tile-value">{count('ON_LEAVE')}</div><div className="ks-tile-title">On leave</div></div>
        <div className="ks-card"><div className="ks-tile-value">{count('ABSENT')}</div><div className="ks-tile-title">Absent</div></div>
        <div className="ks-card"><div className="ks-tile-value">{count('NOT_MARKED')}</div><div className="ks-tile-title">Not checked in</div></div>
      </div>

      {loading ? <div className="ks-empty">Loading attendance…</div> : rows.length === 0 ? <div className="card ks-empty">No staff yet.</div> : (
        <div className="ks-table-wrap">
          <table className="ks-table">
            <thead><tr><th>Name</th><th>Role</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Hours</th><th>Actions</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.userId}>
                <td><strong>{r.userName}</strong>{r.location && <div className="ks-dim" style={{ fontSize: '0.76rem' }}>{r.location}</div>}</td>
                <td><span className="badge badge-assigned">{r.role}</span></td>
                <td className="ks-muted">{new Date(r.date).toLocaleDateString()}</td>
                <td>{timeOf(r.checkIn)}</td>
                <td>{timeOf(r.checkOut)}</td>
                <td>
                  <span className={`badge ${ATTENDANCE_BADGE[r.status].badge}`}>{ATTENDANCE_BADGE[r.status].label}</span>
                  {r.note && <div className="ks-dim" style={{ fontSize: '0.74rem', marginTop: 4 }}>{r.note}</div>}
                </td>
                <td>{hoursText(r.hours)}</td>
                <td><button className="btn btn-sm btn-secondary" onClick={() => { setStatus(r.status === 'NOT_MARKED' ? 'ON_LEAVE' : r.status); setNote(r.note || ''); setEditing(r); }}><Pencil size={13} /> Edit</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3><CalendarCheck size={18} /> {editing.userName} — {date}</h3>
              <button className="ks-icon-btn" onClick={() => setEditing(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <form className="ks-form" onSubmit={save}>
              <div>
                <label className="ks-label" htmlFor="att-status">Status</label>
                <select id="att-status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{ATTENDANCE_BADGE[s].label}</option>)}
                </select>
              </div>
              <div>
                <label className="ks-label" htmlFor="att-note">Note (optional)</label>
                <input id="att-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Approved sick leave" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
