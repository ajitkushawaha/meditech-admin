import {useEffect, useState} from 'react';
import {api} from '../lib/api';

type Order = {
  id: string;
  orderId: string;
  status: string;
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  branchName: string;
  deliveryPartnerName: string;
  items: {name: string; count: number; quantity: string}[];
  createdAt: string;
};

const statuses = ['available', 'confirmed', 'arriving', 'delivered', 'cancelled'];

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/orders');
      setOrders(response.data.orders || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const updateStatus = async (order: Order, status: string) => {
    try {
      await api.patch(`/admin/orders/${order.id}/status`, {status});
      await loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to update order');
    }
  };

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Sales</p>
          <h2>Orders</h2>
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? (
        <div className="content-card">Loading orders...</div>
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.orderId}</strong>
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </td>
                  <td>
                    {order.customerName || '—'}
                    <span>{order.customerPhone || ''}</span>
                  </td>
                  <td>{order.branchName || '—'}</td>
                  <td>{order.items.map(item => `${item.name} × ${item.count}`).join(', ') || '—'}</td>
                  <td>₹{order.totalPrice}</td>
                  <td>
                    <select value={order.status} onChange={event => updateStatus(order, event.target.value)}>
                      {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!orders.length ? <tr><td colSpan={6}>No orders found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default OrdersPage;
