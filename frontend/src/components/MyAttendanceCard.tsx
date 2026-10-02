import React, { useEffect, useState } from 'react';
import { CalendarCheck, LogIn, LogOut } from 'lucide-react';
import { apiError, attendanceApi } from '../services/api';
import { AttendanceRecord } from '../types';
import { ATTENDANCE_BADGE } from '../pages/StaffPage';
import { hoursText, timeOf, todayIso } from '../pages/AttendancePage';

// Technician / dispatcher: check in and out, and see only their own recent attendance.
export const MyAttendanceCard: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => attendanceApi.mine(7).then(setRecords).catch(() => setRecords([]));
  useEffect(() => { load(); }, []);

  const today = records.find((r) => r.date === todayIso());

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(apiError(err, 'Could not update attendance.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ks-card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 className="ks-section-title" style={{ margin: 0 }}><CalendarCheck size={18} /> My Attendance — today</h3>
          <div className="ks-muted" style={{ fontSize: '0.86rem', marginTop: 4 }}>
            {today?.checkIn
              ? <>Checked in {timeOf(today.checkIn)}{today.checkOut ? ` · out ${timeOf(today.checkOut)}` : ''} · {hoursText(today.hours)} · <span className={`badge ${ATTENDANCE_BADGE[today.status].badge}`}>{ATTENDANCE_BADGE[today.status].label}</span></>
              : today ? <span className={`badge ${ATTENDANCE_BADGE[today.status].badge}`}>{ATTENDANCE_BADGE[today.status].label}</span>
              : 'You have not checked in yet.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!today?.checkIn && <button className="btn btn-success" disabled={busy || today?.status === 'ON_LEAVE'} onClick={() => act(attendanceApi.checkIn)}><LogIn size={15} /> Check In</button>}
          {today?.checkIn && !today.checkOut && <button className="btn btn-warning" disabled={busy} onClick={() => act(attendanceApi.checkOut)}><LogOut size={15} /> Check Out</button>}
        </div>
      </div>
      {error && <div className="ks-alert ks-alert-error" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}
      {records.length > 0 && (
        <div className="ks-table-wrap" style={{ marginTop: 14 }}>
          <table className="ks-table">
            <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Hours</th></tr></thead>
            <tbody>{records.map((r) => (
              <tr key={r.date}>
                <td>{new Date(r.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                <td>{timeOf(r.checkIn)}</td>
                <td>{timeOf(r.checkOut)}</td>
                <td><span className={`badge ${ATTENDANCE_BADGE[r.status].badge}`}>{ATTENDANCE_BADGE[r.status].label}</span></td>
                <td>{hoursText(r.hours)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};
