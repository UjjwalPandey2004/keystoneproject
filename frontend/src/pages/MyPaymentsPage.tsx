import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Banknote, CreditCard, ExternalLink, FileText, QrCode, RefreshCw, Smartphone, X } from 'lucide-react';
import { apiError, paymentApi, workOrderApi } from '../services/api';
import { Payment, PaymentConfig, PaymentMethod, UpiApp, WorkOrder } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatMoney, methodText, PaymentReceipt, UPI_APP_LABEL } from '../components/PaymentReceipt';

const REF_PATTERN = /^[A-Za-z0-9]{6,35}$/;

// App-specific links open that app directly on Android; "Other" opens the phone's UPI app chooser.
const APP_SCHEME: Record<UpiApp, string> = {
  GOOGLE_PAY: 'tez://upi/pay?',
  PHONEPE: 'phonepe://pay?',
  PAYTM: 'paytmmp://pay?',
  OTHER: 'upi://pay?',
};
const appLink = (upiUri: string, app: UpiApp) => upiUri.replace('upi://pay?', APP_SCHEME[app]);

const UPI_APPS: UpiApp[] = ['GOOGLE_PAY', 'PHONEPE', 'PAYTM', 'OTHER'];

// QR of the server-built upi://pay link; works with every UPI app.
const UpiQr: React.FC<{ uri: string; caption?: string }> = ({ uri, caption = 'Scan with any UPI app' }) => {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(uri, { width: 440, margin: 1, errorCorrectionLevel: 'M' }).then(setSrc).catch(() => setSrc(''));
  }, [uri]);
  return (
    <div className="ks-qr">
      {src ? <img src={src} alt="UPI payment QR code" /> : <div style={{ width: 220, height: 220 }} />}
      <strong>{caption}</strong>
      <span style={{ fontSize: '0.78rem', color: '#475569' }}>Google Pay · PhonePe · Paytm · BHIM</span>
    </div>
  );
};

export const MyPaymentsPage: React.FC = () => {
  const { role } = useAuth();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // New payment form
  const [workOrderId, setWorkOrderId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [upiApp, setUpiApp] = useState<UpiApp>('GOOGLE_PAY');
  const [saving, setSaving] = useState(false);

  // Follow-up on a pending payment
  const [active, setActive] = useState<Payment | null>(null);
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<Payment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cfg, list, wo] = await Promise.all([paymentApi.config(), paymentApi.list(), workOrderApi.list({ size: 100 })]);
      setConfig(cfg);
      setPayments(list);
      setOrders(wo.content || []);
      if (!cfg.upiEnabled) setMethod('CASH');
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Unable to load payments.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Work orders that can be paid now: not cancelled and without a pending payment.
  const payable = useMemo(() => {
    const pending = new Set(payments.filter((p) => p.status === 'PENDING').map((p) => p.workOrderId));
    return orders.filter((o) => o.status !== 'CANCELLED' && !pending.has(o.id));
  }, [orders, payments]);
  const selected = orders.find((o) => o.id === workOrderId) || null;

  const paidTotal = payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingTotal = payments.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + Number(p.amount), 0);

  const startPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!workOrderId || !(value >= 1)) {
      setMessage({ ok: false, text: 'Choose the problem / work order and enter an amount of at least ₹1.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await paymentApi.create({
        workOrderId: Number(workOrderId),
        amount: value,
        method,
        upiApp: method === 'UPI' ? upiApp : undefined,
      });
      setPayments((list) => [created, ...list]);
      setWorkOrderId('');
      setAmount('');
      setReference('');
      setActive(created);
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Could not start the payment.') });
    } finally {
      setSaving(false);
    }
  };

  const replace = (updated: Payment) => setPayments((list) => list.map((p) => (p.id === updated.id ? updated : p)));

  const submitReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!REF_PATTERN.test(reference.trim())) {
      setMessage({ ok: false, text: 'The reference is 6-35 letters or digits (a UPI UTR is usually 12 digits).' });
      return;
    }
    try {
      const updated = await paymentApi.submitReference(active.id, reference.trim());
      replace(updated);
      setActive(null);
      setMessage({ ok: true, text: `Reference saved. ${updated.reference} will be marked Paid once KEYSTONE confirms it.` });
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Could not save the reference.') });
    }
  };

  const cancel = async (payment: Payment) => {
    if (!window.confirm(`Cancel payment ${payment.reference}?`)) return;
    try {
      replace(await paymentApi.cancel(payment.id));
      if (active?.id === payment.id) setActive(null);
      setMessage({ ok: true, text: `${payment.reference} cancelled.` });
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Could not cancel the payment.') });
    }
  };

  const methods: { key: PaymentMethod; label: string; hint: string; icon: React.ReactNode; needsUpi: boolean }[] = [
    { key: 'UPI', label: 'UPI', hint: 'Google Pay, PhonePe, Paytm', icon: <Smartphone size={20} />, needsUpi: true },
    { key: 'UPI_QR', label: 'UPI QR', hint: 'Scan a QR code', icon: <QrCode size={20} />, needsUpi: true },
    { key: 'CARD', label: 'Card', hint: 'Debit / credit card', icon: <CreditCard size={20} />, needsUpi: false },
    { key: 'CASH', label: 'Cash', hint: 'Pay technician / office', icon: <Banknote size={20} />, needsUpi: false },
  ];

  return (
    <div>
      <div className="ks-toolbar">
        <div>
          <h2 className="ks-page-title">My Payments</h2>
          <p className="ks-page-sub">Pay for your services by UPI, card or cash, and download receipts once KEYSTONE confirms them.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>

      {role !== 'CUSTOMER' && (
        <div className="ks-alert ks-alert-info">Preview of the customer screen. Only customers make payments; managers view and confirm them under Payments.</div>
      )}
      {message && <div className={`ks-alert ${message.ok ? 'ks-alert-success' : 'ks-alert-error'}`}>{message.text}</div>}

      <div className="ks-grid" style={{ marginBottom: 20 }}>
        <div className="ks-card"><div className="ks-tile-value">{formatMoney(paidTotal)}</div><div className="ks-tile-title">Paid</div></div>
        <div className="ks-card"><div className="ks-tile-value">{formatMoney(pendingTotal)}</div><div className="ks-tile-title">Waiting for confirmation</div></div>
        <div className="ks-card"><div className="ks-tile-value">{payments.length}</div><div className="ks-tile-title">Payments</div></div>
      </div>

      <form className="ks-card" onSubmit={startPayment}>
        <h3 className="ks-section-title"><CreditCard size={18} /> Make a payment</h3>
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
          <div className="ks-form">
            <div>
              <label className="ks-label" htmlFor="pay-wo">Problem / work order</label>
              <select id="pay-wo" value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Select what you are paying for…</option>
                {payable.map((o) => (
                  <option key={o.id} value={o.id}>{o.code} — {o.title} ({o.status.replace('_', ' ')})</option>
                ))}
              </select>
            </div>
            {selected && (
              <div className="ks-inset" style={{ fontSize: '0.86rem', display: 'grid', gap: 4 }}>
                <div><strong>{selected.title}</strong></div>
                {selected.description && <div className="ks-muted">{selected.description}</div>}
                <div className="ks-dim">{selected.siteName} · Technician: {selected.assignedToName || 'not assigned yet'}</div>
              </div>
            )}
            <div>
              <label className="ks-label" htmlFor="pay-amount">Amount</label>
              <div className="ks-amount-input">
                <span>₹</span>
                <input id="pay-amount" type="number" inputMode="decimal" min={1} max={1000000} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
              </div>
            </div>
          </div>

          <div className="ks-form">
            <div>
              <span className="ks-label">Payment method</span>
              <div className="ks-choice-group" role="radiogroup" aria-label="Payment method">
                {methods.map((m) => {
                  const disabled = m.needsUpi && !config?.upiEnabled;
                  return (
                    <button type="button" key={m.key} role="radio" aria-checked={method === m.key} disabled={disabled}
                      className={`ks-choice ${method === m.key ? 'selected' : ''}`} onClick={() => setMethod(m.key)}>
                      {m.icon}
                      <span>{m.label}<small>{disabled ? 'Not set up yet' : m.hint}</small></span>
                    </button>
                  );
                })}
              </div>
            </div>

            {method === 'UPI' && (
              <div>
                <span className="ks-label">Pay with</span>
                <div className="ks-choice-group" role="radiogroup" aria-label="UPI app">
                  {UPI_APPS.map((app) => (
                    <button type="button" key={app} role="radio" aria-checked={upiApp === app}
                      className={`ks-choice ${upiApp === app ? 'selected' : ''}`} onClick={() => setUpiApp(app)}>
                      <span className={`ks-upi-logo ks-upi-${app.toLowerCase()}`}>{app === 'GOOGLE_PAY' ? 'G' : app === 'PHONEPE' ? 'Pe' : app === 'PAYTM' ? 'P' : '₹'}</span>
                      <span>{UPI_APP_LABEL[app]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {method === 'CARD' && (
              <div className="ks-hint">Card payments are taken on the card machine during the service visit or at the office. Card details are never entered on this website.</div>
            )}
            {method === 'CASH' && <div className="ks-hint">Hand the cash to the technician or at the KEYSTONE office.</div>}

            <button type="submit" className="btn btn-primary" disabled={saving || loading}>
              {saving ? 'Starting…'
                : method === 'UPI' ? `Pay with ${UPI_APP_LABEL[upiApp]}`
                : method === 'UPI_QR' ? 'Show QR code'
                : method === 'CARD' ? 'Pay by Card'
                : 'Pay by Cash'}
            </button>
          </div>
        </div>
      </form>

      <div className="ks-card" style={{ marginTop: 20 }}>
        <h3 className="ks-section-title">Payment history</h3>
        {loading ? (
          <div className="ks-empty">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="ks-empty">No payments yet.</div>
        ) : (
          <div className="ks-table-wrap">
            <table className="ks-table">
              <thead><tr><th>Reference</th><th>Problem</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th /></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.reference}</strong>{p.transactionRef && <div className="ks-dim" style={{ fontSize: '0.76rem' }}>Ref {p.transactionRef}</div>}</td>
                    <td><span className="ks-code">{p.workOrderCode}</span><div>{p.workOrderTitle}</div></td>
                    <td><strong>{formatMoney(p.amount, p.currency)}</strong></td>
                    <td>{methodText(p)}</td>
                    <td>
                      <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status === 'PENDING' ? 'Waiting' : p.status}</span>
                      {p.failureReason && <div className="ks-danger-text" style={{ fontSize: '0.76rem', marginTop: 4 }}>{p.failureReason}</div>}
                    </td>
                    <td className="ks-muted" style={{ whiteSpace: 'nowrap' }}>{new Date(p.paidAt || p.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {p.status === 'PAID' && <button className="btn btn-sm btn-primary" onClick={() => setReceipt(p)}><FileText size={13} /> Receipt</button>}
                      {p.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {p.method !== 'CASH' && <button className="btn btn-sm btn-secondary" onClick={() => { setReference(p.transactionRef || ''); setActive(p); }}>{p.transactionRef ? 'Details' : 'Complete'}</button>}
                          <button className="btn btn-sm btn-danger" onClick={() => cancel(p)}>Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending payment: open the UPI app / show QR / card or cash instructions, then the reference */}
      {active && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{methodText(active)} — {active.reference}</h3>
              <button className="ks-icon-btn" onClick={() => setActive(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="ks-inset" style={{ textAlign: 'center', marginBottom: 14 }}>
              <div className="ks-dim" style={{ fontSize: '0.8rem' }}>{active.workOrderCode} — {active.workOrderTitle}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{formatMoney(active.amount, active.currency)}</div>
              <span className="badge badge-pending">Waiting for confirmation</span>
            </div>

            {active.method === 'CASH' ? (
              <>
                <div className="ks-alert ks-alert-info">Please pay this amount in cash to the technician or at the KEYSTONE office, quoting <strong>{active.reference}</strong>. It shows as Paid once KEYSTONE confirms it.</div>
                <div className="modal-actions"><button className="btn btn-primary" onClick={() => setActive(null)}>Done</button></div>
              </>
            ) : (
              <form className="ks-form" onSubmit={submitReference}>
                {active.method === 'UPI' && active.upiUri && (
                  <>
                    <a className="btn btn-primary" href={appLink(active.upiUri, active.upiApp || 'OTHER')}>
                      <ExternalLink size={15} /> Open {UPI_APP_LABEL[active.upiApp || 'OTHER']}
                    </a>
                    <div className="ks-hint" style={{ textAlign: 'center' }}>On a computer? Scan this with {UPI_APP_LABEL[active.upiApp || 'OTHER']} on your phone instead:</div>
                    <UpiQr uri={active.upiUri} caption={`Scan with ${UPI_APP_LABEL[active.upiApp || 'OTHER']}`} />
                  </>
                )}
                {active.method === 'UPI_QR' && active.upiUri && <UpiQr uri={active.upiUri} />}
                {active.method === 'CARD' && (
                  <div className="ks-alert ks-alert-info">Pay by debit or credit card on the card machine at the service visit or the KEYSTONE office, quoting <strong>{active.reference}</strong>. Enter the slip / approval number below if you have it.</div>
                )}
                {config?.upiVpa && active.method !== 'CARD' && <div className="ks-hint" style={{ textAlign: 'center' }}>Payee: <strong>{config.payeeName}</strong> · {config.upiVpa}</div>}
                <div>
                  <label className="ks-label" htmlFor="pay-ref">{active.method === 'CARD' ? 'Card slip / approval number' : 'UPI transaction reference (UTR)'}</label>
                  <input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={active.method === 'CARD' ? 'e.g. 004512' : 'e.g. 412345678901'} maxLength={35} required />
                  <div className="ks-hint">{active.method === 'CARD' ? 'Printed on the card-machine slip.' : 'Shown in your UPI app after paying (12 digits).'}</div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setActive(null)}>Later</button>
                  <button type="submit" className="btn btn-primary">I have paid — submit</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {receipt && <PaymentReceipt payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
};
