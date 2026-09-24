import {
    faBroadcastTower,
    faCalendarCheck,
    faClipboard,
    faLocationDot,
    faWarehouse,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import AddVehicle from '../components/AddVehicle';
import FleetDashboard from '../components/FleetDashboard';
import ResponsiveNavbar from '../components/ResponsiveNavbar';
import VehicleCategory, { CATEGORY_BASE_RATE } from '../components/VehicleCategory';
import VehicleTracking from '../components/VehicleTracking';
import { useAuth } from '../context/AuthContext';
import { queryKeys } from '../queryKeys';
import type { ApiError } from '../types/api';
import type { Booking, Vehicle } from '../types/models';

const HUBS: Record<string, { coords: [number, number]; label: string }> = {
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

const STATUS_LABELS: Record<string, string> = {
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

type BookingFormState = {
  vehicle_id: string;
  units: number | string;
  days: number | string;
  hub: string;
  customHub: string;
  sec: number | string;
};

type VehicleMutationPayload = Record<string, unknown> & {
  category?: string;
  custom_category?: string;
};

const parseInteger = (value: number | string | undefined, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const fetchMyFleet = async (): Promise<Vehicle[]> => {
  const { data } = await api.get('/vehicles');
  return Array.isArray(data) ? data : [];
};

const fetchMyBookings = async (): Promise<Booking[]> => {
  const { data } = await api.get('/bookings/mine');
  return Array.isArray(data) ? data : [];
};

const getApiErrorMessage = (error: unknown, fallback: string): string => (
  (error as ApiError)?.userMessage || (error as ApiError)?.response?.data?.error || fallback
);

const formatHubLabel = (hub?: string | null): string => {
  const normalized = String(hub || '').toLowerCase();
  return HUBS[normalized]?.label || hub || 'Unknown';
};

const resolveVehicleRate = (vehicle?: Vehicle | null): number => {
  if (!vehicle) return 0;

  const category = String(vehicle.category || 'other').toLowerCase();
  return CATEGORY_BASE_RATE[category] || CATEGORY_BASE_RATE.other;
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const firstFleetLoadRef = useRef(true);

  const [tab, setTab] = useState('fleet');
  const shouldLoadBookings = tab === 'bookings' || tab === 'track';

  const fleetQuery = useQuery({
    queryKey: queryKeys.vehicles.mine,
    queryFn: fetchMyFleet,
  });

  const bookingsQuery = useQuery({
    queryKey: queryKeys.bookings.mine,
    queryFn: fetchMyBookings,
    enabled: shouldLoadBookings,
  });

  const saveVehicleMutation = useMutation<
    'updated' | 'created',
    Error,
    { vehicleId?: number; payload: VehicleMutationPayload }
  >({
    mutationFn: async ({ vehicleId, payload }) => {
      if (vehicleId) {
        await api.put(`/vehicles/${vehicleId}`, payload);
        return 'updated';
      }

      await api.post('/vehicles', payload);
      return 'created';
    },
  });

  const removeVehicleMutation = useMutation<void, Error, { vehicleId: number }>({
    mutationFn: async ({ vehicleId }) => {
      await api.delete(`/vehicles/${vehicleId}`);
    },
  });

  const createBookingMutation = useMutation<void, Error, { payload: Record<string, unknown> }>({
    mutationFn: async ({ payload }) => {
      await api.post('/bookings', payload);
    },
  });

  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);

  const loadingFleet = fleetQuery.isPending;
  const loadingBookings = shouldLoadBookings && bookingsQuery.isFetching;
  const savingVehicle = saveVehicleMutation.isPending;
  const submittingBooking = createBookingMutation.isPending;

  const [selectedCategory, setSelectedCategory] = useState('truck');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [trackingVehicle, setTrackingVehicle] = useState<Vehicle | null>(null);

  const [bookingForm, setBookingForm] = useState<BookingFormState>({
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

  const showToast = (message: string): void => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const applyFleetResult = (vehicles: Vehicle[]): void => {
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

    setTrackingVehicle((previous: Vehicle | null) => {
      if (!previous) return normalizedFleet[0];
      const matchedVehicle = normalizedFleet.find((vehicle) => vehicle.id === Number(previous.id));
      return matchedVehicle || normalizedFleet[0];
    });
  };

  useEffect(() => {
    if (!fleetQuery.isSuccess) return;
    setApiError('');
    applyFleetResult(fleetQuery.data);
  }, [fleetQuery.isSuccess, fleetQuery.data]);

  useEffect(() => {
    if (!fleetQuery.isError) return;
    setFleet([]);
    setApiError(getApiErrorMessage(fleetQuery.error, 'Could not load your fleet.'));
  }, [fleetQuery.isError, fleetQuery.error]);

  useEffect(() => {
    if (!bookingsQuery.isSuccess) return;
    setApiError('');
    setBookings(Array.isArray(bookingsQuery.data) ? bookingsQuery.data : []);
  }, [bookingsQuery.isSuccess, bookingsQuery.data]);

  useEffect(() => {
    if (!bookingsQuery.isError) return;
    setBookings([]);
    setApiError(getApiErrorMessage(bookingsQuery.error, 'Could not load bookings right now.'));
  }, [bookingsQuery.isError, bookingsQuery.error]);

  const saveVehicle = async (payload: VehicleMutationPayload) => {
    try {
      const normalizedPayload = {
        ...payload,
        category: payload.category === 'other'
          ? (payload.custom_category || 'other')
          : payload.category,
      };

      const mode = await saveVehicleMutation.mutateAsync({
        vehicleId: editingVehicle?.id,
        payload: normalizedPayload,
      });

      if (mode === 'updated') {
        showToast('Vehicle updated successfully.');
      } else {
        showToast('Vehicle registered in your fleet.');
      }

      setShowVehicleForm(false);
      setEditingVehicle(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Vehicle save failed.');
      setApiError(message);
      showToast(message);
      throw error;
    }
  };

  const removeVehicle = async (vehicle: Vehicle) => {
    if (!window.confirm(`Remove ${vehicle.vehicle_name} from your fleet?`)) return;

    setDeletingVehicleId(vehicle.id);
    try {
      await removeVehicleMutation.mutateAsync({ vehicleId: vehicle.id });
      showToast('Vehicle removed from fleet.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine });
      await queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to remove vehicle.');
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

    try {
      const selectedSecurityTier = SEC_TIERS.find((tier) => tier.value === Number(bookingForm.sec)) || SEC_TIERS[0];
      const selectedHubLabel = bookingForm.hub === OTHER_HUB_VALUE
        ? customHub
        : (HUBS[bookingForm.hub]?.label || bookingForm.hub);

      await createBookingMutation.mutateAsync({
        payload: {
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
        },
      });

      setTrackingVehicle(selectedBookingVehicle);
      showToast(`Booking created for ${selectedBookingVehicle.vehicle_name} from ${selectedHubLabel}.`);
      setTab('track');
      await queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unknown booking error.');
      setApiError(message);
      showToast(`Booking failed: ${message}`);
    }
  };

  return (
    <div className="app-page">
      <ResponsiveNavbar
        brand="ELITRACK LOGISTICS"
        subtitle="CLIENT FLEET PORTAL"
        userLabel={user?.full_name || user?.email}
        roleLabel={undefined}
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
