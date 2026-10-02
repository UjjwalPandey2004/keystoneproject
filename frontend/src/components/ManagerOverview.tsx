import React, { useEffect, useState } from 'react';
import { CalendarCheck, UserPlus } from 'lucide-react';
import { attendanceApi, directoryApi } from '../services/api';
import { AttendanceRecord, CustomerAccount } from '../types';
import { initials } from './Navbar';
import { CUSTOMER_STATUS, CustomerDetailModal, formatJoined } from '../pages/CustomersPage';
import { ATTENDANCE_BADGE } from '../pages/StaffPage';
import { Tab } from '../navigation';

// Manager dashboard: newest customers and today's staff attendance.
export const ManagerOverview: React.FC<{ onTabChange: (tab: Tab) => void }> = ({ onTabChange }) => {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);

  useEffect(() => {
    directoryApi.customerAccounts(5).then(setCustomers).catch(() => setCustomers([]));
    attendanceApi.forDay().then(setAttendance).catch(() => setAttendance([]));
  }, []);

  return (
    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', marginBottom: 24 }}>
      <div className="ks-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="ks-section-title" style={{ margin: 0 }}><UserPlus size={18} /> Recent Customers</h3>
          <button className="btn btn-sm btn-secondary" onClick={() => onTabChange('customers')}>View All</button>
        </div>
        {customers.length === 0 ? <div className="ks-hint">No customers yet.</div> : (
          <div className="ks-table-wrap">
            <table className="ks-table">
              <thead><tr><th>Name</th><th>Joined</th><th>Status</th></tr></thead>
              <tbody>{customers.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setViewing(c.id)}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="ks-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(c.name)}</span><div><strong>{c.name}</strong><div className="ks-dim" style={{ fontSize: '0.74rem' }}>{c.email}</div>{c.phone && <div className="ks-dim" style={{ fontSize: '0.74rem' }}>{c.phone}</div>}</div></div></td>
                  <td className="ks-muted" style={{ whiteSpace: 'nowrap' }}>{formatJoined(c.joinedAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><span className={`badge ${CUSTOMER_STATUS[c.status].badge}`}>{CUSTOMER_STATUS[c.status].label}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ks-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="ks-section-title" style={{ margin: 0 }}><CalendarCheck size={18} /> Staff Attendance — today</h3>
          <button className="btn btn-sm btn-secondary" onClick={() => onTabChange('attendance')}>View All</button>
        </div>
        {attendance.length === 0 ? <div className="ks-hint">No staff yet.</div> : (
          <div className="ks-table-wrap">
            <table className="ks-table">
              <thead><tr><th>Staff</th><th>Role</th><th>Today</th></tr></thead>
              <tbody>{attendance.slice(0, 6).map((a) => (
                <tr key={a.userId}>
                  <td><strong>{a.userName}</strong>{a.location && <div className="ks-dim" style={{ fontSize: '0.74rem' }}>{a.location}</div>}</td>
                  <td className="ks-muted">{a.role.charAt(0) + a.role.slice(1).toLowerCase()}</td>
                  <td><span className={`badge ${ATTENDANCE_BADGE[a.status].badge}`}>{ATTENDANCE_BADGE[a.status].label}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {viewing && <CustomerDetailModal userId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};
