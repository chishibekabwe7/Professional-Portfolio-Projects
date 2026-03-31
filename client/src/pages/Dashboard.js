import { faBroadcastTower, faClipboard, faLocationDot, faRocket, faTruck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import api from '../api';
import { useAuth } from '../context/AuthContext';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const HUBS = {
  kitwe: { coords: [-12.8167, 28.2000], label: 'Kitwe Hub (Copperbelt)' },
  ndola: { coords: [-12.9667, 28.6333], label: 'Ndola Industrial' },
  solwezi: { coords: [-12.1833, 26.4000], label: 'Solwezi (Kansanshi/Sentinel)' },
  chingola: { coords: [-12.5333, 27.8500], label: 'Chingola (KCM)' },
};
const OTHER_HUB_VALUE = 'other';

const TRUCKS = [
  { value: 11500, label: 'Volvo FMX Dump Truck', price: 11500 },
  { value: 15000, label: 'Heavy-Duty Low Loader', price: 15000 },
  { value: 10000, label: 'Excavator CAT 320', price: 10000 },
  { value: 8000, label: 'Bullion Van / Escort Vehicle', price: 8000 },
];

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

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 13); }, [center, map]);
  return null;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('book');
  const [form, setForm] = useState({ truck: 11500, units: 1, days: 1, hub: 'kitwe', customHub: '', sec: 0 });
  const [total, setTotal] = useState(11500);
  const [deployed, setDeployed] = useState(false);
  const [positions, setPositions] = useState([]);
  const [activeHub, setActiveHub] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const intervalRef = useRef(null);
  const activeTrackedBooking = bookings.find((b) => ['dispatched', 'in_transit'].includes(b.status));

  useEffect(() => {
    const t = parseInt(form.truck) * parseInt(form.units) * parseInt(form.days) + parseInt(form.sec);
    setTotal(t);
  }, [form]);

  useEffect(() => {
    if (tab === 'bookings' || tab === 'track') loadBookings();
  }, [tab]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const { data } = await api.get('/bookings/mine');
      setBookings(data);
    } finally { setLoadingBookings(false); }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const deploy = async () => {
    const customHub = form.customHub.trim();
    if (form.hub === OTHER_HUB_VALUE && !customHub) {
      showToast('Please specify the exact location for manual entry.');
      return;
    }

    setSubmitting(true);
    try {
      const truck = TRUCKS.find(t => t.value === parseInt(form.truck));
      const sec = SEC_TIERS.find(s => s.value === parseInt(form.sec));
      const selectedHubLabel = form.hub === OTHER_HUB_VALUE ? customHub : (HUBS[form.hub]?.label || form.hub);
      await api.post('/bookings', {
        truck_type: truck.label,
        truck_price_per_day: truck.price,
        units: form.units,
        days: form.days,
        hub: form.hub,
        manual_location: customHub,
        security_tier: sec.label,
        security_price: sec.value,
        total_amount: total,
      });

      const hub = HUBS[form.hub]?.coords || HUBS.kitwe.coords;
      setActiveHub(hub);
      const pos = Array.from({ length: form.units }, (_, i) => ({
        id: `TL-${101 + i}`,
        lat: hub[0] + i * 0.006,
        lng: hub[1] + i * 0.006,
      }));
      setPositions(pos);
      setDeployed(true);

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setPositions(p => p.map(t => ({ ...t, lat: t.lat + (Math.random() - 0.5) * 0.001, lng: t.lng + (Math.random() - 0.5) * 0.001 })));
        setSpeed(Math.floor(Math.random() * 20 + 45));
      }, 4000);

      showToast(`Convoy of ${form.units} deployed from ${selectedHubLabel}`);
      setTab('track');
    } catch (e) {
      showToast('Booking failed: ' + (e.response?.data?.error || 'Unknown error'));
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1D2429' }}>
      {/* Header */}
      <header style={{ background: '#1D2429', borderBottom: '3px solid #30BDEC', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Roboto' }}>
        <div>
          <h1 style={{ color: '#30BDEC', fontSize: 22, fontWeight: 800, letterSpacing: 3, fontFamily: 'Roboto' }}>ELITRACK LOGISTICS</h1>
          <p style={{ color: '#666', fontSize: 10, letterSpacing: 2 }}>CLIENT PORTAL</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#888', fontSize: 12 }}>{user?.full_name || user?.email}</span>
          <button className="btn btn-dark btn-sm" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: '#1D2429', padding: '0 24px', display: 'flex', gap: 4, fontFamily: 'Roboto' }}>
        {[['book','Book Convoy'],['track','Live Tracking'],['bookings','My Bookings']].map(([k,v]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Roboto', fontWeight: 700,
            color: tab === k ? '#30BDEC' : '#555', borderBottom: tab === k ? '2px solid #30BDEC' : '2px solid transparent', letterSpacing: 1
          }}>{k === 'book' ? <><FontAwesomeIcon icon={faTruck} style={{color: '#30BDEC', marginRight: 8}}/>{v}</> : k === 'track' ? <><FontAwesomeIcon icon={faBroadcastTower} style={{color: '#30BDEC', marginRight: 8}}/>{v}</> : <><FontAwesomeIcon icon={faClipboard} style={{color: '#30BDEC', marginRight: 8}}/>{v}</>}</button>
        ))}
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        {/* Book Tab */}
        {tab === 'book' && (
          <div className="fade-up">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-label"><FontAwesomeIcon icon={faTruck} style={{color: '#30BDEC', marginRight: 8}}/>Asset Selection</div>
              <div className="form-group">
                <label>Primary Vehicle Type</label>
                <select value={form.truck} onChange={e => setForm(f => ({...f, truck: e.target.value}))}>
                  {TRUCKS.map(t => <option key={t.value} value={t.value}>{t.label} (K{t.price.toLocaleString()}/day)</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Total Units</label>
                  <input type="number" min="1" max="10" value={form.units} onChange={e => setForm(f => ({...f, units: e.target.value}))} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Contract Days</label>
                  <input type="number" min="1" value={form.days} onChange={e => setForm(f => ({...f, days: e.target.value}))} />
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-label"><FontAwesomeIcon icon={faLocationDot} style={{color: '#30BDEC', marginRight: 8}}/>Deployment Logistics</div>
              <div className="form-group">
                <label>Strategic Hub</label>
                <select value={form.hub} onChange={e => setForm(f => ({...f, hub: e.target.value}))}>
                  {Object.entries(HUBS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  <option value={OTHER_HUB_VALUE}>Other / Manual Entry</option>
                </select>
              </div>
              {form.hub === OTHER_HUB_VALUE && (
                <div className="form-group">
                  <label>Specify Exact Location</label>
                  <input
                    type="text"
                    value={form.customHub}
                    onChange={e => setForm(f => ({ ...f, customHub: e.target.value }))}
                    placeholder="e.g., specific mine site or coordinates"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Security Tier</label>
                <select value={form.sec} onChange={e => setForm(f => ({...f, sec: e.target.value}))}>
                  {SEC_TIERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ background: '#1D2429', borderRadius: 16, border: '1px solid #30BDEC', padding: '24px', textAlign: 'center', marginBottom: 16, fontFamily: 'Roboto' }}>
              <p style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>TOTAL LOGISTICS VALUE</p>
              <p style={{ color: '#30BDEC', fontSize: 36, fontWeight: 800 }}>K{total.toLocaleString()}</p>
              <button className="btn btn-gold btn-full" style={{ marginTop: 20 }} onClick={deploy} disabled={submitting}>
                {submitting ? 'Deploying...' : <><FontAwesomeIcon icon={faRocket} style={{color: 'white', marginRight: 8}}/>Deploy Convoy & Link Cams</>}
              </button>
            </div>
          </div>
        )}

        {/* Track Tab */}
        {tab === 'track' && (
          <div className="fade-up">
            {!deployed ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}><FontAwesomeIcon icon={faBroadcastTower} style={{color: '#30BDEC'}}/></p>
                <p>No active convoy. Book and deploy first.</p>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="section-label">🛰️ Live Telematics</div>
                  {activeTrackedBooking && (
                    <div style={{ marginBottom: 14, background: '#222', border: '1px solid #30BDEC', borderRadius: 10, padding: 10, fontSize: 12 }}>
                      <div style={{ marginBottom: 6 }}>
                        <b>Dispatcher:</b> {activeTrackedBooking.dispatcher_name || 'Not assigned yet'}
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <b>ETA:</b> {activeTrackedBooking.eta ? new Date(activeTrackedBooking.eta).toLocaleString() : 'Not provided yet'}
                      </div>
                      <div style={{ color: '#9ca3af' }}>
                        {activeTrackedBooking.status_notes || 'No status notes yet.'}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 16 }}>
                    <span>Network: <b style={{ color: '#27ae60' }}>4G LTE</b></span>
                    <span>Cam: <b style={{ color: '#27ae60' }}>24H Live</b></span>
                    <span>Speed: <b style={{ color: '#d4af37' }}>{speed} km/h</b></span>
                  </div>
                  <div style={{ background: '#000', borderRadius: 8, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: '1px solid #333' }}>
                    <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,0,0,0.8)', color: 'white', padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>● LIVE</div>
                    <img src="https://images.unsplash.com/photo-1519003722824-192d992a605b?auto=format&fit=crop&w=600&q=60" alt="cam" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                    <div style={{ position: 'absolute', bottom: 10, left: 10, color: 'white', fontSize: 11, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 4 }}>
                      {positions[0]?.id} — PRIMARY CAM
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="section-label">📡 Real-Time GPS</div>
                  <div style={{ height: 300, borderRadius: 10, overflow: 'hidden' }}>
                    <MapContainer center={activeHub} zoom={12} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <FlyTo center={activeHub} />
                      {positions.map(t => (
                        <Marker key={t.id} position={[t.lat, t.lng]}>
                          <Popup><b>{t.id}</b></Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {tab === 'bookings' && (
          <div className="fade-up">
            <div className="card">
              <div className="section-label">📋 My Bookings</div>
              {loadingBookings ? <div className="spinner" /> : bookings.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '30px 0' }}>No bookings yet.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Ref</th><th>Asset</th><th>Hub</th><th>Total</th><th>Status</th><th>Dispatcher</th><th>ETA</th><th>Status Notes</th></tr></thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.id}>
                          <td className="mono" style={{ color: '#d4af37', fontSize: 11 }}>{b.booking_ref}</td>
                          <td style={{ fontSize: 12 }}>{b.truck_type}</td>
                           <td style={{ fontSize: 12 }}>{HUBS[b.hub]?.label || b.hub}</td>
                          <td className="mono" style={{ fontWeight: 700 }}>K{parseInt(b.total_amount).toLocaleString()}</td>
                          <td><span className={`badge badge-${b.status}`}>{STATUS_LABELS[b.status] || b.status}</span></td>
                          <td style={{ fontSize: 11, color: '#9ca3af', maxWidth: 180 }}>
                            {b.dispatcher_name || '—'}
                          </td>
                          <td style={{ fontSize: 11, color: '#9ca3af', maxWidth: 180 }}>
                            {b.eta ? new Date(b.eta).toLocaleString() : '—'}
                          </td>
                          <td style={{ fontSize: 11, color: '#9ca3af', maxWidth: 240 }}>
                            {b.status_notes || 'No updates from dispatch yet.'}
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

      {/* Sticky Call */}
      <a href="tel:0973930287" style={{ position: 'fixed', bottom: 20, right: 20, background: '#27ae60', color: 'white', padding: '14px 22px', borderRadius: 50, fontWeight: 700, textDecoration: 'none', fontSize: 12, boxShadow: '0 5px 20px rgba(0,0,0,0.3)', zIndex: 999 }}>
        📞 Call Dispatch
      </a>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: 'white', padding: '14px 24px', borderRadius: 12, border: '1px solid #d4af37', fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
