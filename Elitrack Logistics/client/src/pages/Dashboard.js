import {
  faBroadcastTower,
  faCalendarCheck,
  faClipboard,
  faLocationDot,
  faWarehouse,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import AddVehicle from '../components/AddVehicle';
import FleetDashboard from '../components/FleetDashboard';
import ResponsiveNavbar from '../components/ResponsiveNavbar';
import VehicleCategory, { CATEGORY_BASE_RATE } from '../components/VehicleCategory';
import VehicleTracking from '../components/VehicleTracking';
import { useAuth } from '../context/AuthContext';

const HUBS = {
  kitwe: { coords: [-12.8167, 28.2], label: 'Kitwe Hub (Copperbelt)' },
  ndola: { coords: [-12.9667, 28.6333], label: 'Ndola Industrial' },
  solwezi: { coords: [-12.1833, 26.4], label: 'Solwezi (Kansanshi/Sentinel)' },
  chingola: { coords: [-12.5333, 27.85], label: 'Chingola (KCM)' },
};

const OTHER_HUB_VALUE = 'other';

const SEC_TIERS = [
  { value: 0, label: 'Standard (GPS Tracking Only)' },
  { value: 4500, label: 'Silver: 1x Armed Escort (+K4,500)' },
  { value: 9000, label: 'Gold: 2x Tactical Vehicles (+K9,000)' },
  { value: 15000, label: 'Diamond: Full Convoy Security (+K15,000)' },
];

const STATUS_LABELS = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  completed: 'Completed',
  pending: 'Pending Review',
  active: 'In Transit',
};

const DASHBOARD_TABS = [
  { key: 'fleet', label: 'My Fleet', icon: faWarehouse },
  { key: 'book', label: 'Create Booking', icon: faCalendarCheck },
  { key: 'track', label: 'Live Tracking', icon: faBroadcastTower },
  { key: 'bookings', label: 'My Bookings', icon: faClipboard },
];

const TRACKABLE_BOOKING_STATUSES = ['dispatched', 'in_transit'];

const parseInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatHubLabel = (hub) => {
  const normalized = String(hub || '').toLowerCase();
  return HUBS[normalized]?.label || hub || 'Unknown';
};

const resolveVehicleRate = (vehicle) => {
  if (!vehicle) return 0;

  const category = String(vehicle.category || 'other').toLowerCase();
  return CATEGORY_BASE_RATE[category] || CATEGORY_BASE_RATE.other;
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const firstFleetLoadRef = useRef(true);

  const [tab, setTab] = useState('fleet');
  const [fleet, setFleet] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState('');
  const [bookings, setBookings] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('truck');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [trackingVehicle, setTrackingVehicle] = useState(null);

  const [bookingForm, setBookingForm] = useState({
    vehicle_id: '',
    units: 1,
    days: 1,
    hub: 'kitwe',
    customHub: '',
    sec: 0,
  });

  const selectedBookingVehicle = useMemo(
    () => fleet.find((vehicle) => vehicle.id === Number(bookingForm.vehicle_id)) || null,
    [fleet, bookingForm.vehicle_id]
  );

  const selectedTrackingVehicle = useMemo(
    () => fleet.find((vehicle) => vehicle.id === Number(trackingVehicle?.id)) || trackingVehicle,
    [fleet, trackingVehicle]
  );

  const bookingTotal = useMemo(() => {
    const baseRate = resolveVehicleRate(selectedBookingVehicle);
    const units = Math.max(1, parseInteger(bookingForm.units, 1));
    const days = Math.max(1, parseInteger(bookingForm.days, 1));
    const security = Math.max(0, parseInteger(bookingForm.sec, 0));
    return baseRate * units * days + security;
  }, [selectedBookingVehicle, bookingForm.units, bookingForm.days, bookingForm.sec]);

  const activeTrackedBooking = useMemo(() => {
    if (!selectedTrackingVehicle) return null;

    return bookings.find(
      (booking) =>
        Number(booking.vehicle_id) === Number(selectedTrackingVehicle.id)
        && TRACKABLE_BOOKING_STATUSES.includes(booking.status)
    ) || null;
  }, [bookings, selectedTrackingVehicle]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const applyFleetResult = (vehicles) => {
    const normalizedFleet = Array.isArray(vehicles) ? vehicles : [];
    setFleet(normalizedFleet);

    if (firstFleetLoadRef.current) {
      setTab('fleet');
      firstFleetLoadRef.current = false;
    }

    if (!normalizedFleet.length) {
      setBookingForm((previous) => ({ ...previous, vehicle_id: '' }));
      setTrackingVehicle(null);
      setEditingVehicle(null);
      return;
    }

    setBookingForm((previous) => {
      const hasSelectedVehicle = normalizedFleet.some((vehicle) => vehicle.id === Number(previous.vehicle_id));
      return {
        ...previous,
        vehicle_id: hasSelectedVehicle ? previous.vehicle_id : String(normalizedFleet[0].id),
      };
    });

    setTrackingVehicle((previous) => {
      if (!previous) return normalizedFleet[0];
      const matchedVehicle = normalizedFleet.find((vehicle) => vehicle.id === Number(previous.id));
      return matchedVehicle || normalizedFleet[0];
    });
  };

  const loadFleet = async (silent = false) => {
    if (!silent) {
      setLoadingFleet(true);
    }

    try {
      setApiError('');
      const { data } = await api.get('/vehicles');
      applyFleetResult(data);
    } catch (error) {
      setFleet([]);
      setApiError(error.userMessage || error.response?.data?.error || 'Could not load your fleet.');
    } finally {
      if (!silent) {
        setLoadingFleet(false);
      }
    }
  };

  const loadBookings = async () => {
    setLoadingBookings(true);

    try {
      setApiError('');
      const { data } = await api.get('/bookings/mine');
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      setBookings([]);
      setApiError(error.userMessage || error.response?.data?.error || 'Could not load bookings right now.');
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, []);

  useEffect(() => {
    if (tab === 'bookings' || tab === 'track') {
      loadBookings();
    }
  }, [tab]);

  const saveVehicle = async (payload) => {
    setSavingVehicle(true);

    try {
      const normalizedPayload = {
        ...payload,
        category: payload.category === 'other'
          ? (payload.custom_category || 'other')
          : payload.category,
      };

      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, normalizedPayload);
        showToast('Vehicle updated successfully.');
      } else {
        await api.post('/vehicles', normalizedPayload);
        showToast('Vehicle registered in your fleet.');
      }

      setShowVehicleForm(false);
      setEditingVehicle(null);
      await loadFleet(true);
    } catch (error) {
      const message = error.userMessage || error.response?.data?.error || 'Vehicle save failed.';
      setApiError(message);
      showToast(message);
      throw error;
    } finally {
      setSavingVehicle(false);
    }
  };

  const removeVehicle = async (vehicle) => {
    if (!window.confirm(`Remove ${vehicle.vehicle_name} from your fleet?`)) return;

    setDeletingVehicleId(vehicle.id);
    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      showToast('Vehicle removed from fleet.');
      await loadFleet(true);
      await loadBookings();
    } catch (error) {
      const message = error.userMessage || error.response?.data?.error || 'Failed to remove vehicle.';
      setApiError(message);
      showToast(message);
    } finally {
      setDeletingVehicleId(null);
    }
  };

  const createBooking = async () => {
    const customHub = bookingForm.customHub.trim();

    if (!selectedBookingVehicle) {
      showToast('Select a vehicle before creating a booking.');
      setTab('fleet');
      return;
    }

    if (bookingForm.hub === OTHER_HUB_VALUE && !customHub) {
      showToast('Please specify the exact location for manual entry.');
      return;
    }

    setSubmittingBooking(true);

    try {
      const selectedSecurityTier = SEC_TIERS.find((tier) => tier.value === Number(bookingForm.sec)) || SEC_TIERS[0];
      const selectedHubLabel = bookingForm.hub === OTHER_HUB_VALUE
        ? customHub
        : (HUBS[bookingForm.hub]?.label || bookingForm.hub);

      await api.post('/bookings', {
        vehicle_id: selectedBookingVehicle.id,
        truck_type: `${selectedBookingVehicle.vehicle_name} (${selectedBookingVehicle.category})`,
        truck_price_per_day: resolveVehicleRate(selectedBookingVehicle),
        units: parseInteger(bookingForm.units, 1),
        days: parseInteger(bookingForm.days, 1),
        hub: bookingForm.hub,
        manual_location: customHub,
        security_tier: selectedSecurityTier.label,
        security_price: selectedSecurityTier.value,
        total_amount: bookingTotal,
      });

      setTrackingVehicle(selectedBookingVehicle);
      showToast(`Booking created for ${selectedBookingVehicle.vehicle_name} from ${selectedHubLabel}.`);
      setTab('track');
      await loadBookings();
    } catch (error) {
      const message = error.userMessage || error.response?.data?.error || 'Unknown booking error.';
      setApiError(message);
      showToast(`Booking failed: ${message}`);
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className="app-page">
      <ResponsiveNavbar
        brand="ELITRACK LOGISTICS"
        subtitle="CLIENT FLEET PORTAL"
        userLabel={user?.full_name || user?.email}
        tabs={DASHBOARD_TABS}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={logout}
      />

      <main className="dashboard-main">
        <div className="dashboard-shell">
          {apiError && (
            <div
              style={{
                marginBottom: 16,
                background: 'var(--danger-surface)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger-text)',
                borderRadius: 10,
                padding: 12,
                fontSize: 12,
              }}
            >
              Connection issue: {apiError}
            </div>
          )}

          {tab === 'fleet' && (
            <>
              {loadingFleet ? (
                <div className="card"><div className="spinner" /></div>
              ) : showVehicleForm ? (
                <AddVehicle
                  initialCategory={selectedCategory}
                  initialVehicle={editingVehicle}
                  submitting={savingVehicle}
                  onSubmit={saveVehicle}
                  onCancel={() => {
                    setShowVehicleForm(false);
                    setEditingVehicle(null);
                  }}
                />
              ) : fleet.length === 0 ? (
                <VehicleCategory
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onContinue={() => {
                    setEditingVehicle(null);
                    setShowVehicleForm(true);
                  }}
                />
              ) : (
                <FleetDashboard
                  vehicles={fleet}
                  loading={loadingFleet}
                  deletingVehicleId={deletingVehicleId}
                  onAddVehicle={() => {
                    setEditingVehicle(null);
                    setSelectedCategory('truck');
                    setShowVehicleForm(true);
                  }}
                  onViewTracking={(vehicle) => {
                    setTrackingVehicle(vehicle);
                    setTab('track');
                  }}
                  onEditVehicle={(vehicle) => {
                    setEditingVehicle(vehicle);
                    setSelectedCategory(String(vehicle.category || 'other').toLowerCase());
                    setShowVehicleForm(true);
                  }}
                  onRemoveVehicle={removeVehicle}
                />
              )}
            </>
          )}

          {tab === 'book' && (
            <div className="fade-up">
              {fleet.length === 0 ? (
                <div className="card empty-state">
                  <p style={{ marginBottom: 14 }}>No fleet vehicles found. Register a vehicle to continue.</p>
                  <button className="btn btn-gold" onClick={() => setTab('fleet')}>
                    Go To My Fleet
                  </button>
                </div>
              ) : (
                <>
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-label">Booking Setup</div>

                    <div className="form-group">
                      <label>Registered Vehicle</label>
                      <select
                        value={bookingForm.vehicle_id}
                        onChange={(event) => setBookingForm((previous) => ({ ...previous, vehicle_id: event.target.value }))}
                      >
                        {fleet.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicle_name} ({vehicle.category}) - {vehicle.plate_number}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="responsive-split">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Support Units</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={bookingForm.units}
                          onChange={(event) => setBookingForm((previous) => ({ ...previous, units: event.target.value }))}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Contract Days</label>
                        <input
                          type="number"
                          min="1"
                          value={bookingForm.days}
                          onChange={(event) => setBookingForm((previous) => ({ ...previous, days: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-label">
                      <FontAwesomeIcon icon={faLocationDot} style={{ marginRight: 8 }} />
                      Deployment Logistics
                    </div>

                    <div className="form-group">
                      <label>Strategic Hub</label>
                      <select
                        value={bookingForm.hub}
                        onChange={(event) => setBookingForm((previous) => ({ ...previous, hub: event.target.value }))}
                      >
                        {Object.entries(HUBS).map(([hubKey, hub]) => (
                          <option key={hubKey} value={hubKey}>{hub.label}</option>
                        ))}
                        <option value={OTHER_HUB_VALUE}>Other / Manual Entry</option>
                      </select>
                    </div>

                    {bookingForm.hub === OTHER_HUB_VALUE && (
                      <div className="form-group">
                        <label>Specify Exact Location</label>
                        <input
                          type="text"
                          value={bookingForm.customHub}
                          onChange={(event) => setBookingForm((previous) => ({ ...previous, customHub: event.target.value }))}
                          placeholder="e.g. specific mine site or coordinates"
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label>Security Tier</label>
                      <select
                        value={bookingForm.sec}
                        onChange={(event) => setBookingForm((previous) => ({ ...previous, sec: event.target.value }))}
                      >
                        {SEC_TIERS.map((tier) => (
                          <option key={tier.value} value={tier.value}>{tier.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pricing-summary">
                    <p style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>
                      TOTAL LOGISTICS VALUE
                    </p>
                    <p className="pricing-summary__amount">K{bookingTotal.toLocaleString()}</p>
                    <button
                      className="btn btn-gold btn-full"
                      style={{ marginTop: 20 }}
                      onClick={createBooking}
                      disabled={submittingBooking}
                    >
                      {submittingBooking ? 'Creating Booking...' : 'Create Booking'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'track' && (
            <div className="fade-up">
              {fleet.length === 0 ? (
                <div className="card empty-state">
                  <p style={{ marginBottom: 14 }}>No fleet vehicles available for tracking.</p>
                  <button className="btn btn-gold" onClick={() => setTab('fleet')}>Open My Fleet</button>
                </div>
              ) : (
                <>
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-label">Select Vehicle To Track</div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Vehicle</label>
                      <select
                        value={selectedTrackingVehicle?.id || ''}
                        onChange={(event) => {
                          const nextVehicle = fleet.find((vehicle) => vehicle.id === Number(event.target.value)) || null;
                          setTrackingVehicle(nextVehicle);
                        }}
                      >
                        {fleet.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicle_name} ({vehicle.plate_number})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedTrackingVehicle && !selectedTrackingVehicle.tracking_enabled ? (
                    <div className="card empty-state">
                      <p style={{ marginBottom: 14 }}>
                        Tracking is disabled for {selectedTrackingVehicle.vehicle_name}. Enable tracking in My Fleet.
                      </p>
                      <button className="btn btn-dark" onClick={() => setTab('fleet')}>Back To Fleet</button>
                    </div>
                  ) : selectedTrackingVehicle ? (
                    <VehicleTracking
                      vehicle={selectedTrackingVehicle}
                      lastBookedHub={activeTrackedBooking?.hub}
                      bookingMeta={activeTrackedBooking}
                    />
                  ) : null}
                </>
              )}
            </div>
          )}

          {tab === 'bookings' && (
            <div className="fade-up">
              <div className="card">
                <div className="section-label">My Bookings</div>
                {loadingBookings ? (
                  <div className="spinner" />
                ) : bookings.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                    No bookings yet.
                  </p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Ref</th>
                          <th>Vehicle</th>
                          <th>Hub</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th>Dispatcher</th>
                          <th>ETA</th>
                          <th>Status Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="mono" style={{ color: 'var(--warning)', fontSize: 11 }}>
                              {booking.booking_ref}
                            </td>
                            <td style={{ fontSize: 12 }}>{booking.truck_type}</td>
                            <td style={{ fontSize: 12 }}>{formatHubLabel(booking.hub)}</td>
                            <td className="mono" style={{ fontWeight: 700 }}>
                              K{parseInteger(booking.total_amount).toLocaleString()}
                            </td>
                            <td>
                              <span className={`badge badge-${booking.status}`}>
                                {STATUS_LABELS[booking.status] || booking.status}
                              </span>
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180 }}>
                              {booking.dispatcher_name || '-'}
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180 }}>
                              {booking.eta ? new Date(booking.eta).toLocaleString() : '-'}
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 240 }}>
                              {booking.status_notes || 'No updates from dispatch yet.'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div className="app-toast">
          {toast}
        </div>
      )}
    </div>
  );
}
