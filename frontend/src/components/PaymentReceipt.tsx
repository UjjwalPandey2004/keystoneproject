import React, { useState } from 'react';
import { CheckCircle2, Download, X } from 'lucide-react';
import { apiError, paymentApi } from '../services/api';
import { Payment, PaymentMethod, UpiApp } from '../types';

export const METHOD_LABEL: Record<PaymentMethod, string> = { CASH: 'Cash', UPI: 'UPI', UPI_QR: 'UPI QR', CARD: 'Card' };
export const UPI_APP_LABEL: Record<UpiApp, string> = { GOOGLE_PAY: 'Google Pay', PHONEPE: 'PhonePe', PAYTM: 'Paytm', OTHER: 'Other UPI app' };

// "UPI (PhonePe)", "Card", "Cash", ...
export const methodText = (p: Payment) =>
  p.method === 'UPI' && p.upiApp ? `UPI (${UPI_APP_LABEL[p.upiApp]})` : METHOD_LABEL[p.method];

export const formatMoney = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

// On-screen receipt for a confirmed payment, with the PDF download.
export const PaymentReceipt: React.FC<{ payment: Payment; onClose: () => void }> = ({ payment, onClose }) => {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      await paymentApi.downloadReceipt(payment);
    } catch (err) {
      setError(apiError(err, 'Could not download the receipt.'));
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, React.ReactNode][] = [
    ['Receipt number', payment.reference],
    ['Customer name', `${payment.payerName} (${payment.customerName})`],
    ['Problem / service', `${payment.workOrderCode} — ${payment.workOrderTitle}`],
    ['Amount paid', formatMoney(payment.amount, payment.currency)],
    ['Payment method', methodText(payment)],
    ['Transaction / reference ID', payment.transactionRef || payment.reference],
    ['Date & time', payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'],
    ['Payment status', <span className="badge badge-paid">{payment.status}</span>],
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>Payment Receipt</h3>
          <button className="ks-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="ks-receipt-hero">
          <CheckCircle2 size={34} />
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: 6 }}>Payment successful</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{formatMoney(payment.amount, payment.currency)}</div>
        </div>
        {rows.map(([label, value]) => (
          <div key={label} className="ks-field">
            <span className="ks-field-label">{label}</span>
            <span className="ks-field-value">{value}</span>
          </div>
        ))}
        {error && <div className="ks-alert ks-alert-error" style={{ marginTop: 12 }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={download} disabled={busy}><Download size={15} /> {busy ? 'Preparing…' : 'Download Receipt PDF'}</button>
        </div>
      </div>
    </div>
  );
};
