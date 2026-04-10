import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
    faBoxesStacked,
    faCarSide,
    faMotorcycle,
    faPenToSquare,
    faTrashCan,
    faTruck,
    faVanShuttle,
    faWaveSquare,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Vehicle } from '../types/models';

type FleetDashboardProps = {
  vehicles: Vehicle[];
  loading: boolean;
  deletingVehicleId: number | null;
  onAddVehicle: () => void;
  onViewTracking: (vehicle: Vehicle) => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onRemoveVehicle: (vehicle: Vehicle) => void;
};

const CATEGORY_ICON_MAP: Record<string, IconProp> = {
  truck: faTruck,
  van: faVanShuttle,
  suv: faCarSide,
  motorbike: faMotorcycle,
  other: faBoxesStacked,
};

const toLabel = (value?: string | null): string => {
  if (!value) return 'Other';
  const normalized = String(value).replace(/_/g, ' ').trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export default function FleetDashboard({
  vehicles,
  loading,
  deletingVehicleId,
  onAddVehicle,
  onViewTracking,
  onEditVehicle,
  onRemoveVehicle,
}: FleetDashboardProps) {
  if (loading) {
    return (
      <div className="card fade-up">
        <div className="section-label">My Fleet</div>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="fleet-header-row">
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>My Fleet</div>
            <p className="fleet-copy-muted">Manage your registered vehicles and launch live tracking per unit.</p>
          </div>
          <button type="button" className="btn btn-gold" onClick={onAddVehicle}>
            Add Vehicle
          </button>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="card empty-state">
          <p>No registered vehicles yet.</p>
        </div>
      ) : (
        <div className="fleet-grid">
          {vehicles.map((vehicle) => {
            const categoryKey = String(vehicle.category || 'other').toLowerCase();
            const icon = CATEGORY_ICON_MAP[categoryKey] || CATEGORY_ICON_MAP.other;

            return (
              <article key={vehicle.id} className="card fleet-vehicle-card">
                <div className="fleet-vehicle-top">
                  <span className="fleet-vehicle-icon">
                    <FontAwesomeIcon icon={icon} />
                  </span>
                  <div>
                    <h3 className="fleet-vehicle-name">{vehicle.vehicle_name}</h3>
                    <p className="fleet-vehicle-sub">
                      {toLabel(vehicle.category)} · {vehicle.plate_number}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <span className={vehicle.tracking_enabled ? 'badge badge-active' : 'badge badge-failed'}>
                    {vehicle.tracking_enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="fleet-card-actions">
                  <button
                    type="button"
                    className="btn btn-dark btn-sm"
                    onClick={() => onViewTracking(vehicle)}
                    disabled={!vehicle.tracking_enabled}
                    title={vehicle.tracking_enabled ? 'Open live tracking' : 'Tracking disabled for this vehicle'}
                  >
                    <FontAwesomeIcon icon={faWaveSquare} />
                    View Live Tracking
                  </button>

                  <button
                    type="button"
                    className="btn btn-dark btn-sm"
                    onClick={() => onEditVehicle(vehicle)}
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                    Edit Vehicle
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => onRemoveVehicle(vehicle)}
                    disabled={deletingVehicleId === vehicle.id}
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                    {deletingVehicleId === vehicle.id ? 'Removing...' : 'Remove Vehicle'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
