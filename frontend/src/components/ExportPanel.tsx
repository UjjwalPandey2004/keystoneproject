import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { apiError, exportApi } from '../services/api';

// Manager reports as CSV (opens in Excel), optionally limited to a date range.
export const ExportPanel: React.FC = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const run = async (key: string, action: () => Promise<void>) => {
    if (from && to && from > to) {
      setError('The start date must be on or before the end date.');
      return;
    }
    setError('');
    setBusy(key);
    try {
      await action();
    } catch (err) {
      setError(apiError(err, 'The export failed. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const reports = [
    { key: 'wo', label: 'Work orders', action: () => exportApi.workOrders(from, to) },
    { key: 'pay', label: 'Payments', action: () => exportApi.payments(from, to) },
    { key: 'tech', label: 'Technician workload', action: () => exportApi.technicianWorkload(from, to) },
  ];

  return (
    <section className="card" style={{ padding: 18, marginBottom: 24 }} aria-labelledby="export-title">
      <h3 id="export-title" className="ks-section-title" style={{ marginBottom: 10 }}><FileSpreadsheet size={17} /> Export reports (CSV / Excel)</h3>
      <div className="ks-filter-bar" style={{ marginBottom: 0 }}>
        <label className="ks-label" style={{ display: 'grid', gap: 4, margin: 0 }}>From
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="ks-label" style={{ display: 'grid', gap: 4, margin: 0 }}>To
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="ks-actions" style={{ alignSelf: 'flex-end' }}>
          {reports.map((r) => (
            <button key={r.key} className="btn btn-secondary" disabled={busy !== null} onClick={() => run(r.key, r.action)}>
              <Download size={15} /> {busy === r.key ? 'Preparing…' : r.label}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="ks-field-error" role="alert" style={{ marginTop: 8 }}>{error}</div>}
      <div className="ks-hint" style={{ marginTop: 8 }}>Leave the dates empty to export everything. Records are filtered by the date they were created.</div>
    </section>
  );
};
