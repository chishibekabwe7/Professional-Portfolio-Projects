import { faBox, faChartBar, faHourglassEnd, faMoneyBill, faTruck, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [editingCurrentStatus, setEditingCurrentStatus] = useState(null);
  const [workflowError, setWorkflowError] = useState('');
  const [workflowForm, setWorkflowForm] = useState({
    status: 'approved',
    dispatcher_name: '',
    eta: '',
    status_notes: '',
  });

  // Admin creation form state (super_admin only)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({ email: '', phone: '', password: '', full_name: '', company: '', role: 'admin' });
  const [createAdminError, setCreateAdminError] = useState('');
  const [createAdminSuccess, setCreateAdminSuccess] = useState('');

  const STATUS_OPTIONS = ['pending_review', 'approved', 'dispatched', 'in_transit', 'completed'];
  const NEXT_STATUS_MAP = {
    pending_review: ['approved'],
    approved: ['dispatched'],
    dispatched: ['in_transit'],
    in_transit: ['completed'],
    completed: [],
  };
  const STATUS_LABELS = {
    pending_review: 'Pending Review',
    approved: 'Approved',
    dispatched: 'Dispatched',
    in_transit: 'In Transit',
    completed: 'Completed',
    pending: 'Pending Review',
    active: 'In Transit',
  };
  const normalizeStatus = (status) => (status === 'pending' ? 'pending_review' : status === 'active' ? 'in_transit' : status);
  const formatHubLocation = (hub) => {
    if (!hub) return '—';
    const lowerHub = String(hub).toLowerCase();
    if (lowerHub === 'kitwe') return 'Kitwe Hub (Copperbelt)';
    if (lowerHub === 'ndola') return 'Ndola Industrial';
    if (lowerHub === 'solwezi') return 'Solwezi (Kansanshi/Sentinel)';
    if (lowerHub === 'chingola') return 'Chingola (KCM)';
    return hub;
  };

  useEffect(() => { if (user?.role !== 'dispatcher') loadStats(); }, []);
  useEffect(() => {
    if (tab === 'bookings') loadBookings();
    if (tab === 'users') loadUsers();
    if (tab === 'transactions') loadTransactions();
    if (tab === 'notifications') loadNotifications();
  }, [tab]);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch {
      setStats({});
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try { const { data } = await api.get('/bookings/all'); setBookings(data); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/users'); setUsers(data); }
    finally { setLoading(false); }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/transactions'); setTransactions(data); }
    finally { setLoading(false); }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/notifications'); setNotifications(data); }
    finally { setLoading(false); }
  };

  const openWorkflowForm = (booking) => {
    const currentStatus = normalizeStatus(booking.status);
    const nextStatuses = NEXT_STATUS_MAP[currentStatus] || [];
    setEditingBookingId(booking.id);
    setEditingCurrentStatus(currentStatus);
    setWorkflowError('');
    setWorkflowForm({
      status: nextStatuses[0] || currentStatus,
      dispatcher_name: booking.dispatcher_name || '',
      eta: booking.eta ? new Date(booking.eta).toISOString().slice(0, 16) : '',
      status_notes: booking.status_notes || '',
    });
  };

  const updateBookingStatus = async (id) => {
    setWorkflowError('');

    const needsDispatchDetails = ['dispatched', 'in_transit'].includes(workflowForm.status);
    if (needsDispatchDetails && !workflowForm.dispatcher_name.trim()) {
      setWorkflowError('Dispatcher name is required when status is Dispatched or In Transit.');
      return;
    }
    if (needsDispatchDetails && !workflowForm.eta) {
      setWorkflowError('ETA is required when status is Dispatched or In Transit.');
      return;
    }

    try {
      await api.patch(`/bookings/${id}/status`, {
        status: workflowForm.status,
        dispatcher_name: workflowForm.dispatcher_name,
        eta: workflowForm.eta || null,
        status_notes: workflowForm.status_notes,
      });
      setEditingBookingId(null);
      setEditingCurrentStatus(null);
      loadBookings(); loadStats();
    } catch (error) {
      setWorkflowError(error?.response?.data?.error || 'Failed to update booking workflow.');
    }
  };

  const updatePayment = async (id, status) => {
    await api.patch(`/bookings/${id}/payment`, { status, payment_method: 'Manual' });
    loadTransactions(); loadStats();
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Are you sure you want to permanently remove user "${u.full_name || u.email}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to remove user.');
    }
  };

  const submitCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateAdminError('');
    setCreateAdminSuccess('');
    try {
      await api.post('/admin/create-admin', createAdminForm);
      setCreateAdminSuccess(`Admin account created for ${createAdminForm.email}.`);
      setCreateAdminForm({ email: '', phone: '', password: '', full_name: '', company: '', role: 'admin' });
      loadUsers();
    } catch (err) {
      setCreateAdminError(err?.response?.data?.error || 'Failed to create admin.');
    }
  };

  const TABS = [['overview','Overview'],['bookings','Bookings'],['transactions','Transactions'],['users','Users'],['notifications','Notifications']].filter(([k]) => {
    if (user?.role === 'dispatcher' && k === 'users') return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#1D2429', color: 'white' }}>
      {/* Header */}
      <header style={{ background: '#1D2429', borderBottom: '3px solid #30BDEC', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Roboto' }}>
        <div>
          <h1 style={{ color: '#30BDEC', fontSize: 20, fontWeight: 800, letterSpacing: 3, fontFamily: 'Roboto' }}>ELITRACK</h1>
          <p style={{ color: '#555', fontSize: 9, letterSpacing: 2 }}>ADMIN CONTROL CENTER</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#888' }}>{user?.full_name || user?.email}</span>
          <span style={{ background: '#30BDEC', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: 'Roboto' }}>{(user?.role || 'admin').toUpperCase()}</span>
          <button className="btn btn-dark btn-sm" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: '#131313', padding: '0 28px', display: 'flex', gap: 4, borderBottom: '1px solid #222', fontFamily: 'Roboto' }}>
        {TABS.map(([k,v]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontFamily: 'Roboto', fontWeight: 700,
            color: tab === k ? '#30BDEC' : '#444',
            borderBottom: tab === k ? '2px solid #30BDEC' : '2px solid transparent', letterSpacing: 1
          }}>{k === 'overview' ? <><FontAwesomeIcon icon={faChartBar} style={{color: '#30BDEC', marginRight: 8}}/>{v}</> : k === 'bookings' ? <><FontAwesomeIcon icon={faBox} style={{color: '#30BDEC', marginRight: 8}}/>{v}</> : k === 'transactions' ? <><FontAwesomeIcon icon={faMoneyBill} style={{color: '#30BDEC', marginRight: 8}}/>{v}</> : k === 'users' ? <><FontAwesomeIcon icon={faUsers} style={{color: '#30BDEC', marginRight: 8}}/>{v}</> : <><FontAwesomeIcon icon={faTruck} style={{color: '#30BDEC', marginRight: 8}}/>{v}</>}</button>
        ))}
      </div>

      <div style={{ padding: '28px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Overview */}
        {tab === 'overview' && (
          <div className="fade-up">
            <h2 style={{ color: '#30BDEC', marginBottom: 24, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto' }}>Dashboard Overview</h2>
            {user?.role !== 'dispatcher' && (stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
                {[
                  { label: 'Total Clients', value: stats.total_users, icon: faUsers },
                  { label: 'Total Bookings', value: stats.total_bookings, icon: faBox },
                  { label: 'Active Convoys', value: stats.active_bookings, icon: faTruck },
                  { label: 'Revenue (Paid)', value: `K${parseInt(stats.total_revenue).toLocaleString()}`, icon: faMoneyBill },
                  { label: 'Pending Revenue', value: `K${parseInt(stats.pending_revenue).toLocaleString()}`, icon: faHourglassEnd },
                ].map(s => (
                  <div className="stat-card" key={s.label}>
                    <div style={{ fontSize: 24, marginBottom: 8, color: '#30BDEC' }}><FontAwesomeIcon icon={s.icon} /></div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : <div className="spinner" />)}

              <div style={{ background: '#1D2429', borderRadius: 12, border: '1px solid #333', padding: 20, fontFamily: 'Roboto' }}>
              <p className="section-label">Quick Actions</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-gold btn-sm" onClick={() => setTab('bookings')}>Manage Bookings</button>
                {user?.role !== 'dispatcher' && (
                  <>
                    <button className="btn btn-dark btn-sm" onClick={() => setTab('transactions')}>View Transactions</button>
                    <button className="btn btn-dark btn-sm" onClick={() => setTab('users')}>View Clients</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bookings */}
        {tab === 'bookings' && (
          <div className="fade-up">
            <h2 style={{ color: '#30BDEC', marginBottom: 20, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto' }}>All Bookings</h2>
            {loading ? <div className="spinner" /> : (
              <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #333', overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table style={{ color: '#ddd' }}>
                    <thead>
                      <tr><th>Ref</th><th>Client</th><th>Asset</th><th>Hub</th><th>Units</th><th>Days</th><th>Total</th><th>Status</th><th>Dispatcher</th><th>ETA</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #222' }}>
                          <td className="mono" style={{ color: '#30BDEC', fontSize: 11 }}>{b.booking_ref}</td>
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{b.full_name || '—'}</div>
                            <div style={{ fontSize: 10, color: '#666' }}>{b.email}</div>
                          </td>
                          <td style={{ fontSize: 11 }}>{b.truck_type}</td>
                          <td style={{ fontSize: 11, maxWidth: 220 }}>{formatHubLocation(b.hub)}</td>
                          <td style={{ textAlign: 'center' }}>{b.units}</td>
                          <td style={{ textAlign: 'center' }}>{b.days}</td>
                          <td className="mono" style={{ fontWeight: 700, color: '#30BDEC' }}>K{parseInt(b.total_amount).toLocaleString()}</td>
                          <td><span className={`badge badge-${b.status}`}>{STATUS_LABELS[b.status] || b.status}</span></td>
                          <td style={{ fontSize: 12 }}>{b.dispatcher_name || '—'}</td>
                          <td style={{ fontSize: 12 }}>{b.eta ? new Date(b.eta).toLocaleString() : '—'}</td>
                          <td>
                            <button className="btn btn-success btn-sm" onClick={() => openWorkflowForm(b)}>Update Workflow</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bookings.length === 0 && <p style={{ textAlign: 'center', padding: '30px', color: '#555' }}>No bookings yet.</p>}
              </div>
            )}
          </div>
        )}

        {tab === 'bookings' && editingBookingId && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-label">Update Booking Workflow</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Next Status</label>
                <select
                  value={workflowForm.status}
                  onChange={(e) => setWorkflowForm((prev) => ({ ...prev, status: e.target.value }))}
                  disabled={((NEXT_STATUS_MAP[editingCurrentStatus] || []).length === 0)}
                >
                  {(NEXT_STATUS_MAP[editingCurrentStatus] || []).map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Dispatcher Name</label>
                <input
                  value={workflowForm.dispatcher_name}
                  onChange={(e) => setWorkflowForm((prev) => ({ ...prev, dispatcher_name: e.target.value }))}
                  placeholder="Dispatcher full name"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>ETA</label>
                <input
                  type="datetime-local"
                  value={workflowForm.eta}
                  onChange={(e) => setWorkflowForm((prev) => ({ ...prev, eta: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Status Notes</label>
              <textarea
                value={workflowForm.status_notes}
                onChange={(e) => setWorkflowForm((prev) => ({ ...prev, status_notes: e.target.value }))}
                placeholder="Add booking progress notes..."
                style={{ minHeight: 90 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-success btn-sm"
                onClick={() => updateBookingStatus(editingBookingId)}
                disabled={((NEXT_STATUS_MAP[editingCurrentStatus] || []).length === 0)}
              >
                Save Workflow
              </button>
              <button
                className="btn btn-dark btn-sm"
                onClick={() => {
                  setEditingBookingId(null);
                  setEditingCurrentStatus(null);
                  setWorkflowError('');
                }}
              >
                Cancel
              </button>
            </div>
            {(NEXT_STATUS_MAP[editingCurrentStatus] || []).length === 0 && (
              <p style={{ marginTop: 10, color: '#9ca3af', fontSize: 12 }}>
                This booking is already completed. No further workflow transitions are available.
              </p>
            )}
            {workflowError && (
              <p style={{ marginTop: 10, color: '#f87171', fontSize: 12 }}>
                {workflowError}
              </p>
            )}
          </div>
        )}

        {/* Transactions */}
        {tab === 'transactions' && (
          <div className="fade-up">
            <h2 style={{ color: '#30BDEC', marginBottom: 20, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto' }}>All Transactions</h2>
            {loading ? <div className="spinner" /> : (
              <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #333', overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table style={{ color: '#ddd' }}>
                    <thead>
                      <tr><th>Booking Ref</th><th>Client</th><th>Asset</th><th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #222' }}>
                          <td className="mono" style={{ color: '#30BDEC', fontSize: 11 }}>{t.booking_ref}</td>
                          <td style={{ fontSize: 12 }}>{t.full_name || t.email}</td>
                          <td style={{ fontSize: 11 }}>{t.truck_type}</td>
                          <td className="mono" style={{ fontWeight: 700, color: '#27ae60' }}>K{parseInt(t.amount).toLocaleString()}</td>
                          <td style={{ fontSize: 11 }}>{t.payment_method}</td>
                          <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                          <td>
                            {t.status === 'pending' && (
                              <button className="btn btn-success btn-sm" onClick={() => updatePayment(t.booking_id, 'paid')}>Mark Paid</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {transactions.length === 0 && <p style={{ textAlign: 'center', padding: '30px', color: '#555' }}>No transactions yet.</p>}
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#30BDEC', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto', margin: 0 }}>Registered Users</h2>
              {user?.role === 'super_admin' && (
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => { setShowCreateAdmin((v) => !v); setCreateAdminError(''); setCreateAdminSuccess(''); }}
                >
                  {showCreateAdmin ? 'Cancel' : '+ Create New Admin'}
                </button>
              )}
            </div>

            {/* Create New Admin form – super_admin only */}
            {user?.role === 'super_admin' && showCreateAdmin && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="section-label">Create New Admin Account</div>
                <form onSubmit={submitCreateAdmin}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Email *</label>
                      <input type="email" required value={createAdminForm.email} onChange={(e) => setCreateAdminForm((p) => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Phone *</label>
                      <input required value={createAdminForm.phone} onChange={(e) => setCreateAdminForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+260..." />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Password * (min 8 chars)</label>
                      <input type="password" required value={createAdminForm.password} onChange={(e) => setCreateAdminForm((p) => ({ ...p, password: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Full Name</label>
                      <input value={createAdminForm.full_name} onChange={(e) => setCreateAdminForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="John Doe" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Company</label>
                      <input value={createAdminForm.company} onChange={(e) => setCreateAdminForm((p) => ({ ...p, company: e.target.value }))} placeholder="Optional" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Role</label>
                      <select value={createAdminForm.role} onChange={(e) => setCreateAdminForm((p) => ({ ...p, role: e.target.value }))}>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-success btn-sm">Create Admin</button>
                  </div>
                  {createAdminError && <p style={{ marginTop: 10, color: '#f87171', fontSize: 12 }}>{createAdminError}</p>}
                  {createAdminSuccess && <p style={{ marginTop: 10, color: '#4ade80', fontSize: 12 }}>{createAdminSuccess}</p>}
                </form>
              </div>
            )}

            {loading ? <div className="spinner" /> : (
              <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #333', overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table style={{ color: '#ddd' }}>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ fontWeight: 700, fontSize: 13 }}>{u.full_name || '—'}</td>
                          <td style={{ fontSize: 12 }}>{u.email}</td>
                          <td className="mono" style={{ fontSize: 11 }}>{u.phone}</td>
                          <td style={{ fontSize: 12 }}>{u.company || '—'}</td>
                          <td><span style={{ background: u.role === 'super_admin' ? '#e67e22' : u.role === 'admin' ? '#30BDEC' : '#333', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: 'Roboto' }}>{u.role.toUpperCase()}</span></td>
                          <td style={{ fontSize: 11, color: '#666' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td>
                            {u.id !== user?.id && (
                              <button
                                className="btn btn-sm"
                                style={{ background: '#c0392b', color: 'white', fontSize: 11 }}
                                onClick={() => removeUser(u)}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {users.length === 0 && <p style={{ textAlign: 'center', padding: '30px', color: '#555' }}>No users yet.</p>}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {tab === 'notifications' && (
          <div className="fade-up">
            <h2 style={{ color: '#30BDEC', marginBottom: 20, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto' }}>Notification Audit Log</h2>
            {loading ? <div className="spinner" /> : (
              <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #333', overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table style={{ color: '#ddd' }}>
                    <thead>
                      <tr><th>Time</th><th>Booking</th><th>Client</th><th>Channel</th><th>Event</th><th>Status</th><th>Provider</th><th>Error</th></tr>
                    </thead>
                    <tbody>
                      {notifications.map((n) => (
                        <tr key={n.id} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ fontSize: 11, color: '#aaa' }}>{new Date(n.created_at).toLocaleString()}</td>
                          <td className="mono" style={{ color: '#30BDEC', fontSize: 11 }}>{n.booking_ref || '—'}</td>
                          <td style={{ fontSize: 12 }}>{n.full_name || n.email || '—'}</td>
                          <td style={{ fontSize: 11, textTransform: 'uppercase' }}>{n.channel}</td>
                          <td style={{ fontSize: 11 }}>{n.event_type}</td>
                          <td><span className={`badge badge-${n.status}`}>{n.status}</span></td>
                          <td style={{ fontSize: 11 }}>{n.provider || '—'}</td>
                          <td style={{ fontSize: 11, color: '#f87171', maxWidth: 260 }}>{n.error_text || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {notifications.length === 0 && <p style={{ textAlign: 'center', padding: '30px', color: '#555' }}>No notification events yet.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
