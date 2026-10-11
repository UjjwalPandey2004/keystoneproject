import React, { useEffect, useState } from 'react';
import { Banknote, Check, CreditCard, Download, QrCode, RefreshCw, Smartphone, X, XCircle } from 'lucide-react';
import { apiError, paymentApi } from '../services/api';
import { Payment, PaymentMethod, PaymentStats, PaymentStatus } from '../types';
import { formatMoney, methodText, PaymentReceipt } from '../components/PaymentReceipt';

type Filter = 'ALL' | PaymentStatus;

const METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote size={13} />, UPI: <Smartphone size={13} />, UPI_QR: <QrCode size={13} />, CARD: <CreditCard size={13} />,
};

const MethodBadge: React.FC<{ payment: Payment }> = ({ payment }) => (
  <span className={`badge badge-method-${payment.method.toLowerCase()}`} style={{ whiteSpace: 'nowrap' }}>
    <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: '-2px' }}>{METHOD_ICON[payment.method]}</span> {methodText(payment)}
  </span>
);

// Manager view: every payment customers made. Managers confirm or reject; they never pay.
export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [reason, setReason] = useState('');
  const [receipt, setReceipt] = useState<Payment | null>(null);

  // Totals are computed by the server; re-read them whenever a payment changes.
  const loadStats = () => paymentApi.stats().then(setStats).catch(() => setStats(null));

  const load = () => {
    setLoading(true);
    Promise.all([paymentApi.list().then(setPayments), loadStats()])
      .catch((err) => setMessage({ ok: false, text: apiError(err, 'Unable to load payments.') }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const replace = (updated: Payment) => {
    setPayments((list) => list.map((p) => (p.id === updated.id ? updated : p)));
    loadStats();
  };

  const confirm = async (p: Payment) => {
    const detail = p.method === 'CASH' ? 'the cash was received' : p.method === 'CARD' ? 'the card payment appears on the card-machine settlement' : `UPI reference ${p.transactionRef} is in your bank statement`;
    if (!window.confirm(`Confirm ${formatMoney(p.amount)} from ${p.customerName}? Only confirm if ${detail}.`)) return;
    try {
      replace(await paymentApi.confirm(p.id));
      setMessage({ ok: true, text: `${p.reference} confirmed. The customer has been notified and can download the receipt.` });
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Could not confirm the payment.') });
    }
  };

  const reject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejecting) return;
    try {
      replace(await paymentApi.reject(rejecting.id, reason));
      setMessage({ ok: true, text: `${rejecting.reference} marked as failed. The customer has been notified.` });
      setRejecting(null);
      setReason('');
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Could not update the payment.') });
    }
  };

  const download = async (p: Payment) => {
    try {
      await paymentApi.downloadReceipt(p);
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Could not download the receipt.') });
    }
  };

  const shown = filter === 'ALL' ? payments : payments.filter((p) => p.status === filter);

  const tiles: { label: string; value: string | number; sub?: string }[] = stats ? [
    { label: 'Total revenue', value: formatMoney(stats.totalRevenue), sub: `${stats.paidPayments} confirmed` },
    { label: 'Total payments', value: stats.totalPayments },
    { label: 'Cash payments', value: stats.cashPayments, sub: `${formatMoney(stats.cashRevenue)} received` },
    { label: 'UPI payments', value: stats.upiPayments, sub: `${formatMoney(stats.upiRevenue)} received` },
    { label: 'QR payments', value: stats.qrPayments, sub: `${formatMoney(stats.qrRevenue)} received` },
    { label: 'Card payments', value: stats.cardPayments, sub: `${formatMoney(stats.cardRevenue)} received` },
    { label: 'Pending payments', value: stats.pendingPayments, sub: `${formatMoney(stats.pendingAmount)} waiting` },
    { label: 'Failed payments', value: stats.failedPayments, sub: `${stats.cancelledPayments} cancelled by customers` },
  ] : [];

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">Payment Management</h2>
          <p className="ks-page-sub">Every payment made by customers (cash, UPI, QR, card). Confirm each one once the money has arrived.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>

      {message && <div className={`ks-alert ${message.ok ? 'ks-alert-success' : 'ks-alert-error'}`}>{message.text}</div>}

      <div className="ks-grid" style={{ marginBottom: 20 }}>
        {tiles.map((t) => (
          <div className="ks-card" key={t.label}>
            <div className="ks-tile-value">{t.value}</div>
            <div className="ks-tile-title">{t.label}</div>
            {t.sub && <div className="ks-dim" style={{ fontSize: '0.78rem', marginTop: 4 }}>{t.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['ALL', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'] as Filter[]).map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ks-empty">Loading payments…</div>
      ) : shown.length === 0 ? (
        <div className="card ks-empty">No payments in this view.</div>
      ) : (
        <div className="ks-table-wrap">
          <table className="ks-table">
            <thead>
              <tr><th>Payment ID</th><th>Customer</th><th>Service</th><th>Amount</th><th>Method</th><th>Transaction ID</th><th>Status</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.reference}</strong><div className="ks-dim" style={{ fontSize: '0.74rem' }}>#{p.id}</div></td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{p.payerName}</div>
                    <div className="ks-dim" style={{ fontSize: '0.78rem' }}>{p.customerName} · ID {p.customerId}</div>
                    <div className="ks-muted" style={{ fontSize: '0.78rem' }}>{p.payerEmail}</div>
                    <div className="ks-muted" style={{ fontSize: '0.78rem' }}>{p.payerPhone || 'No phone'}</div>
                  </td>
                  <td><span className="ks-code">{p.workOrderCode}</span><div style={{ fontWeight: 600 }}>{p.workOrderTitle}</div>{p.workOrderDescription && <div className="ks-dim" style={{ fontSize: '0.76rem', maxWidth: 240 }}>{p.workOrderDescription}</div>}</td>
                  <td><strong>{formatMoney(p.amount, p.currency)}</strong></td>
                  <td><MethodBadge payment={p} /></td>
                  <td>
                    {p.transactionRef ? <span className="ks-code">{p.transactionRef}</span>
                      : <span className="ks-muted" style={{ fontSize: '0.78rem' }}>{p.method === 'CASH' ? 'Not needed (cash)' : 'Not entered yet'}</span>}
                  </td>
                  <td>
                    <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                    {p.failureReason && <div className="ks-danger-text" style={{ fontSize: '0.76rem', marginTop: 4 }}>{p.failureReason}</div>}
                    {p.verifiedByName && <div className="ks-dim" style={{ fontSize: '0.74rem', marginTop: 4 }}>by {p.verifiedByName}</div>}
                  </td>
                  <td className="ks-muted" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(p.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    {p.paidAt && <div className="ks-success-text" style={{ fontSize: '0.76rem' }}>Paid {new Date(p.paidAt).toLocaleDateString()}</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {p.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-success" onClick={() => confirm(p)} disabled={(p.method === 'UPI' || p.method === 'UPI_QR') && !p.transactionRef} title={(p.method === 'UPI' || p.method === 'UPI_QR') && !p.transactionRef ? 'Waiting for the customer to enter the UPI reference' : 'Mark as paid'}>
                          <Check size={13} /> Confirm
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => { setReason(''); setRejecting(p); }}><XCircle size={13} /> Reject</button>
                      </div>
                    )}
                    {p.status === 'PAID' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => setReceipt(p)}>Receipt</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => download(p)} aria-label="Download receipt PDF"><Download size={13} /> PDF</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receipt && <PaymentReceipt payment={receipt} onClose={() => setReceipt(null)} />}

      {rejecting && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Reject {rejecting.reference}</h3>
              <button className="ks-icon-btn" onClick={() => setRejecting(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <form className="ks-form" onSubmit={reject}>
              <p className="ks-muted" style={{ margin: 0 }}>{formatMoney(rejecting.amount)} from {rejecting.customerName}. The customer will see this reason.</p>
              <div>
                <label className="ks-label" htmlFor="reject-reason">Reason</label>
                <input id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required placeholder="e.g. No matching UPI credit found for this reference" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setRejecting(null)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Mark as Failed</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
