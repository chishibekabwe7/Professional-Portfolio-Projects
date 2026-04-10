import { faBox, faChartBar, faHourglassEnd, faMoneyBill, faTruck, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import api from '../api';
import ResponsiveNavbar from '../components/ResponsiveNavbar';
import { useAuth } from '../context/AuthContext';
import { queryKeys } from '../queryKeys';
import type { ApiError } from '../types/api';
import type { AdminStats, AuthUser, Booking, NotificationEvent, Transaction } from '../types/models';

const ADMIN_TABS = [
  { key: 'overview', label: 'Overview', icon: faChartBar },
  { key: 'bookings', label: 'Bookings', icon: faBox },
  { key: 'transactions', label: 'Transactions', icon: faMoneyBill },
  { key: 'users', label: 'Users', icon: faUsers },
  { key: 'notifications', label: 'Notifications', icon: faTruck },
];

const getApiErrorMessage = (error: unknown, fallback: string): string => (
  (error as ApiError)?.userMessage || (error as ApiError)?.response?.data?.error || fallback
);

const fetchAdminStats = async (): Promise<AdminStats> => {
  const { data } = await api.get('/admin/stats');
  return data || {};
};

const fetchAllBookings = async (): Promise<Booking[]> => {
  const { data } = await api.get('/bookings/all');
  return Array.isArray(data) ? data : [];
};

const fetchAdminUsers = async (): Promise<AuthUser[]> => {
  const { data } = await api.get('/admin/users');
  return Array.isArray(data) ? data : [];
};

const fetchAdminTransactions = async (): Promise<Transaction[]> => {
  const { data } = await api.get('/admin/transactions');
  return Array.isArray(data) ? data : [];
};

const fetchAdminNotifications = async (): Promise<NotificationEvent[]> => {
  const { data } = await api.get('/admin/notifications');
  return Array.isArray(data) ? data : [];
};

type WorkflowMutationPayload = {
  status: string;
  dispatcher_name: string;
  eta: string | null;
  status_notes: string;
};

type UpdateBookingStatusVariables = {
  id: number;
  payload: WorkflowMutationPayload;
};

type UpdatePaymentVariables = {
  id: number;
  status: string;
};

type AdminUser = {
  id: number;
  [key: string]: unknown;
};

type CreateAdminPayload = {
  email: string;
  password: string;
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const isBookingsTab = tab === 'bookings';
  const isUsersTab = tab === 'users';
  const isTransactionsTab = tab === 'transactions';
  const isNotificationsTab = tab === 'notifications';

  const statsQuery = useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: fetchAdminStats,
  });

  const bookingsQuery = useQuery({
    queryKey: queryKeys.admin.bookingsAll,
    queryFn: fetchAllBookings,
    enabled: isBookingsTab,
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: fetchAdminUsers,
    enabled: isUsersTab,
  });

  const transactionsQuery = useQuery({
    queryKey: queryKeys.admin.transactions,
    queryFn: fetchAdminTransactions,
    enabled: isTransactionsTab,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.admin.notifications,
    queryFn: fetchAdminNotifications,
    enabled: isNotificationsTab,
  });

  const updateBookingStatusMutation = useMutation<void, Error, UpdateBookingStatusVariables>({
    mutationFn: async ({ id, payload }) => {
      await api.patch(`/bookings/${id}/status`, payload);
    },
  });

  const updatePaymentMutation = useMutation<void, Error, UpdatePaymentVariables>({
    mutationFn: async ({ id, status }) => {
      await api.patch(`/bookings/${id}/payment`, { status, payment_method: 'Manual' });
    },
  });

  const removeUserMutation = useMutation<AdminUser, Error, AdminUser>({
    mutationFn: async (targetUser) => {
      await api.delete(`/admin/users/${targetUser.id}`);
      return targetUser;
    },
  });

  const createAdminMutation = useMutation<CreateAdminPayload, Error, CreateAdminPayload>({
    mutationFn: async (payload) => {
      await api.post('/admin/create-admin', payload);
      return payload;
    },
  });

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [apiError, setApiError] = useState('');
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [editingCurrentStatus, setEditingCurrentStatus] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState('');
  const [workflowForm, setWorkflowForm] = useState({
    status: 'approved',
    dispatcher_name: '',
    eta: '',
    status_notes: '',
  });

  // Admin creation form state (super_admin only)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({ email: '', password: '' });
  const [createAdminError, setCreateAdminError] = useState('');
  const [createAdminSuccess, setCreateAdminSuccess] = useState('');

  const loading = (
    (isBookingsTab && bookingsQuery.isFetching)
    || (isUsersTab && usersQuery.isFetching)
    || (isTransactionsTab && transactionsQuery.isFetching)
    || (isNotificationsTab && notificationsQuery.isFetching)
  );

  const STATUS_OPTIONS: string[] = ['pending_review', 'approved', 'dispatched', 'in_transit', 'completed'];
  const NEXT_STATUS_MAP: Record<string, string[]> = {
    pending_review: ['approved'],
    approved: ['dispatched'],
    dispatched: ['in_transit'],
    in_transit: ['completed'],
    completed: [],
  };
  const STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending Review',
    approved: 'Approved',
    dispatched: 'Dispatched',
    in_transit: 'In Transit',
    completed: 'Completed',
    pending: 'Pending Review',
    active: 'In Transit',
  };
  const normalizeStatus = (status: string): string => (status === 'pending' ? 'pending_review' : status === 'active' ? 'in_transit' : status);
  const formatHubLocation = (hub?: string | null): string => {
    if (!hub) return '—';
    const lowerHub = String(hub).toLowerCase();
    if (lowerHub === 'kitwe') return 'Kitwe Hub (Copperbelt)';
    if (lowerHub === 'ndola') return 'Ndola Industrial';
    if (lowerHub === 'solwezi') return 'Solwezi (Kansanshi/Sentinel)';
    if (lowerHub === 'chingola') return 'Chingola (KCM)';
    return hub;
  };

  useEffect(() => {
    if (!statsQuery.isSuccess) return;
    setApiError('');
    setStats(statsQuery.data || {});
  }, [statsQuery.isSuccess, statsQuery.data]);

  useEffect(() => {
    if (!statsQuery.isError) return;
    setStats({});
    setApiError(getApiErrorMessage(statsQuery.error, 'Could not load dashboard stats.'));
  }, [statsQuery.isError, statsQuery.error]);

  useEffect(() => {
    if (!bookingsQuery.isSuccess) return;
    setApiError('');
    setBookings(Array.isArray(bookingsQuery.data) ? bookingsQuery.data : []);
  }, [bookingsQuery.isSuccess, bookingsQuery.data]);

  useEffect(() => {
    if (!bookingsQuery.isError) return;
    setBookings([]);
    setApiError(getApiErrorMessage(bookingsQuery.error, 'Could not load bookings.'));
  }, [bookingsQuery.isError, bookingsQuery.error]);

  useEffect(() => {
    if (!usersQuery.isSuccess) return;
    setApiError('');
    setUsers(Array.isArray(usersQuery.data) ? usersQuery.data : []);
  }, [usersQuery.isSuccess, usersQuery.data]);

  useEffect(() => {
    if (!usersQuery.isError) return;
    setUsers([]);
    setApiError(getApiErrorMessage(usersQuery.error, 'Could not load users.'));
  }, [usersQuery.isError, usersQuery.error]);

  useEffect(() => {
    if (!transactionsQuery.isSuccess) return;
    setApiError('');
    setTransactions(Array.isArray(transactionsQuery.data) ? transactionsQuery.data : []);
  }, [transactionsQuery.isSuccess, transactionsQuery.data]);

  useEffect(() => {
    if (!transactionsQuery.isError) return;
    setTransactions([]);
    setApiError(getApiErrorMessage(transactionsQuery.error, 'Could not load transactions.'));
  }, [transactionsQuery.isError, transactionsQuery.error]);

  useEffect(() => {
    if (!notificationsQuery.isSuccess) return;
    setApiError('');
    setNotifications(Array.isArray(notificationsQuery.data) ? notificationsQuery.data : []);
  }, [notificationsQuery.isSuccess, notificationsQuery.data]);

  useEffect(() => {
    if (!notificationsQuery.isError) return;
    setNotifications([]);
    setApiError(getApiErrorMessage(notificationsQuery.error, 'Could not load notifications.'));
  }, [notificationsQuery.isError, notificationsQuery.error]);

  const openWorkflowForm = (booking: Booking): void => {
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

  const updateBookingStatus = async (id: number): Promise<void> => {
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
      await updateBookingStatusMutation.mutateAsync({
        id,
        payload: {
          status: workflowForm.status,
          dispatcher_name: workflowForm.dispatcher_name,
          eta: workflowForm.eta || null,
          status_notes: workflowForm.status_notes,
        },
      });
      setEditingBookingId(null);
      setEditingCurrentStatus(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.bookingsAll });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
    } catch (error) {
      setWorkflowError(getApiErrorMessage(error, 'Failed to update booking workflow.'));
    }
  };

  const updatePayment = async (id: number, status: string): Promise<void> => {
    try {
      await updatePaymentMutation.mutateAsync({ id, status });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.transactions });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'Failed to update payment status.'));
    }
  };

  const removeUser = async (u: AuthUser): Promise<void> => {
    if (!window.confirm(`Are you sure you want to permanently remove user "${u.full_name || u.email}"? This action cannot be undone.`)) return;
    try {
      await removeUserMutation.mutateAsync(u);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to remove user.'));
    }
  };

  const submitCreateAdmin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setCreateAdminError('');
    setCreateAdminSuccess('');
    try {
      await createAdminMutation.mutateAsync(createAdminForm);
      setCreateAdminSuccess(`Admin account created for ${createAdminForm.email}.`);
      setCreateAdminForm({ email: '', password: '' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
    } catch (err) {
      setCreateAdminError(err?.response?.data?.error || 'Failed to create admin.');
    }
  };

  const availableNextStatuses = editingCurrentStatus
    ? (NEXT_STATUS_MAP[editingCurrentStatus] || [])
    : [];

  return (
    <div className="app-page">
      <ResponsiveNavbar
        brand="ELITRACK"
        subtitle="ADMIN CONTROL CENTER"
        userLabel={user?.full_name || user?.email}
        roleLabel={(user?.role || 'admin').toUpperCase()}
        tabs={ADMIN_TABS}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={logout}
      />

      <main className="dashboard-main">
        <div className="admin-shell">
        {apiError && (
          <div style={{ marginBottom: 16, background: 'var(--danger-surface)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: 10, padding: 12, fontSize: 12 }}>
            Connection issue: {apiError}
          </div>
        )}

        {/* Overview */}
        {tab === 'overview' && (
          <div className="fade-up">
            <h2 style={{ color: 'var(--primary)', marginBottom: 24, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto' }}>Dashboard Overview</h2>
            {stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
                {[
                  { label: 'Total Clients', value: stats.total_users, icon: faUsers },
                  { label: 'Total Bookings', value: stats.total_bookings, icon: faBox },
                  { label: 'Active Convoys', value: stats.active_bookings, icon: faTruck },
                  { label: 'Revenue (Paid)', value: `K${Number(stats.total_revenue || 0).toLocaleString()}`, icon: faMoneyBill },
                  { label: 'Pending Revenue', value: `K${Number(stats.pending_revenue || 0).toLocaleString()}`, icon: faHourglassEnd },
                ].map(s => (
                  <div className="stat-card" key={s.label}>
                    <div style={{ fontSize: 24, marginBottom: 8, color: 'var(--primary)' }}><FontAwesomeIcon icon={s.icon} /></div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : <div className="spinner" />}

              <div style={{ background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, fontFamily: 'Roboto' }}>
              <p className="section-label">Quick Actions</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-gold btn-sm" onClick={() => setTab('bookings')}>Manage Bookings</button>
                <button className="btn btn-dark btn-sm" onClick={() => setTab('transactions')}>View Transactions</button>
                <button className="btn btn-dark btn-sm" onClick={() => setTab('users')}>View Users</button>
              </div>
            </div>
          </div>
        )}

        {/* Bookings */}
        {tab === 'bookings' && (
          <div className="fade-up">
            <h2 style={{ color: 'var(--primary)', marginBottom: 20, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto' }}>All Bookings</h2>
            {loading ? <div className="spinner" /> : (
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table style={{ color: 'var(--text)' }}>
                    <thead>
                      <tr><th>Ref</th><th>Client</th><th>Asset</th><th>Hub</th><th>Units</th><th>Days</th><th>Total</th><th>Status</th><th>Dispatcher</th><th>ETA</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="mono" style={{ color: 'var(--primary)', fontSize: 11 }}>{b.booking_ref}</td>
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{b.full_name || '—'}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{b.email}</div>
                          </td>
                          <td style={{ fontSize: 11 }}>{b.truck_type}</td>
                          <td style={{ fontSize: 11, maxWidth: 220 }}>{formatHubLocation(b.hub)}</td>
                          <td style={{ textAlign: 'center' }}>{b.units}</td>
                          <td style={{ textAlign: 'center' }}>{b.days}</td>
                          <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>K{Number(b.total_amount || 0).toLocaleString()}</td>
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
                {bookings.length === 0 && <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No bookings yet.</p>}
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
                  disabled={availableNextStatuses.length === 0}
                >
                  {availableNextStatuses.map((status) => (
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
                disabled={availableNextStatuses.length === 0}
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
            {availableNextStatuses.length === 0 && (
              <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 12 }}>
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
            <h2 style={{ color: 'var(--primary)', marginBottom: 20, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto' }}>All Transactions</h2>
            {loading ? <div className="spinner" /> : (
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table style={{ color: 'var(--text)' }}>
                    <thead>
                      <tr><th>Booking Ref</th><th>Client</th><th>Asset</th><th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="mono" style={{ color: 'var(--primary)', fontSize: 11 }}>{t.booking_ref}</td>
                          <td style={{ fontSize: 12 }}>{t.full_name || t.email}</td>
                          <td style={{ fontSize: 11 }}>{t.truck_type}</td>
                          <td className="mono" style={{ fontWeight: 700, color: '#27ae60' }}>K{Number(t.amount || 0).toLocaleString()}</td>
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
                {transactions.length === 0 && <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No transactions yet.</p>}
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="fade-up">
            <div className="section-head-row">
              <h2 style={{ color: 'var(--primary)', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto', margin: 0 }}>Registered Users</h2>
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
                      <label>Password * (min 8 chars)</label>
                      <input type="password" required value={createAdminForm.password} onChange={(e) => setCreateAdminForm((p) => ({ ...p, password: e.target.value }))} />
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
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table style={{ color: 'var(--text)' }}>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ fontWeight: 700, fontSize: 13 }}>{u.full_name || '—'}</td>
                          <td style={{ fontSize: 12 }}>{u.email}</td>
                          <td className="mono" style={{ fontSize: 11 }}>{u.phone}</td>
                          <td style={{ fontSize: 12 }}>{u.company || '—'}</td>
                          <td><span style={{ background: u.role === 'super_admin' ? '#e67e22' : u.role === 'admin' ? 'var(--primary)' : 'var(--border)', color: '#ffffff', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: 'Roboto' }}>{u.role.toUpperCase()}</span></td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                          <td>
                            {u.id !== user?.id && (
                              <button
                                className="btn btn-sm"
                                style={{ background: 'var(--danger)', color: '#ffffff', fontSize: 11 }}
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
                {users.length === 0 && <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No users yet.</p>}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {tab === 'notifications' && (
          <div className="fade-up">
            <h2 style={{ color: 'var(--primary)', marginBottom: 20, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Roboto' }}>Notification Audit Log</h2>
            {loading ? <div className="spinner" /> : (
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table style={{ color: 'var(--text)' }}>
                    <thead>
                      <tr><th>Time</th><th>Booking</th><th>Client</th><th>Channel</th><th>Event</th><th>Status</th><th>Provider</th><th>Error</th></tr>
                    </thead>
                    <tbody>
                      {notifications.map((n) => (
                        <tr key={n.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</td>
                          <td className="mono" style={{ color: 'var(--primary)', fontSize: 11 }}>{n.booking_ref || '—'}</td>
                          <td style={{ fontSize: 12 }}>{n.full_name || n.email || '—'}</td>
                          <td style={{ fontSize: 11, textTransform: 'uppercase' }}>{n.channel}</td>
                          <td style={{ fontSize: 11 }}>{n.event_type}</td>
                          <td><span className={`badge badge-${n.status}`}>{n.status}</span></td>
                          <td style={{ fontSize: 11 }}>{n.provider || '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--danger)', maxWidth: 260 }}>{n.error_text || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {notifications.length === 0 && <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No notification events yet.</p>}
              </div>
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
