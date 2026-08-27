import {useEffect, useState} from 'react';
import {api} from '../lib/api';

type PaymentAttempt = {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  status: string;
  totalPrice: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  branchName: string;
  orderId: string;
  refundId: string;
  createdAt: string;
};

const PaymentsPage = () => {
  const [payments, setPayments] = useState<PaymentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/payment-attempts');
      setPayments(response.data.paymentAttempts || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const refund = async (payment: PaymentAttempt) => {
    if (!window.confirm(`Refund ₹${payment.totalPrice}?`)) return;
    setBusyId(payment.id);
    setError('');
    try {
      await api.post(`/admin/payment-attempts/${payment.id}/refund`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Refund failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="page-stack">
      <div className="section-header"><div><p className="eyebrow">Payments</p><h2>Payment attempts</h2></div></div>
      {error ? <div className="form-error">{error}</div> : null}
      {loading ? <div className="content-card">Loading payments...</div> : (
        <div className="data-table-card">
          <table className="data-table">
            <thead><tr><th>Gateway</th><th>Customer</th><th>Branch</th><th>Order</th><th>Amount</th><th>Status</th><th /></tr></thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td><strong>{payment.razorpayOrderId}</strong><span>{payment.razorpayPaymentId || 'No payment id'}</span></td>
                  <td>{payment.customerName || '—'}<span>{payment.customerPhone || ''}</span></td>
                  <td>{payment.branchName || '—'}</td>
                  <td>{payment.orderId || '—'}</td>
                  <td>₹{payment.totalPrice}</td>
                  <td><span className={payment.status === 'paid' ? 'status-badge' : 'status-badge-muted'}>{payment.status}</span></td>
                  <td>{payment.status === 'paid' ? <button className="danger-button" disabled={busyId === payment.id} onClick={() => refund(payment)}>Refund</button> : payment.refundId || '—'}</td>
                </tr>
              ))}
              {!payments.length ? <tr><td colSpan={7}>No payment attempts found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default PaymentsPage;
