# Elitrack Logistics

**Elitrack Logistics** is a full-stack logistics platform with a fleet-first client portal and an admin dashboard for booking operations, payment control, and dispatch visibility.

## What it does

### Client side (Dashboard)

- **Sign in** using email/password or Google sign-in.
- **My Fleet** system where users can:
  - register vehicles
  - edit/remove vehicles
  - enable or disable tracking per vehicle
- **Vehicle categories** with card selection:
  - Trucks
  - Vans
  - SUVs
  - Motorbikes
  - Other (custom category)
- **Smart onboarding flow**:
  - no vehicles -> category selection + Add Vehicle flow
  - has vehicles -> direct entry into My Fleet dashboard
- **Booking with registered vehicles** (no truck-only dependency)
- **Detailed live tracking view** per selected vehicle:
  - simulated GPS map
  - route line visualization
  - speed/status telemetry
  - simulated live camera feed
- **My bookings** list to view booking status, dispatcher updates, and ETA.

### Admin side (Admin Dashboard)

- **Overview stats** (clients, bookings, active convoys, paid vs pending revenue).
- **Manage bookings**:
  - view all bookings
  - update booking status (workflow states)
- **Manage transactions**:
  - mark payments as paid (manual)
- **View users** (registered clients list).

## MySQL schema (vehicles)

```sql
CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'other',
  vehicle_name VARCHAR(120) NOT NULL,
  plate_number VARCHAR(30) NOT NULL,
  tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_plate (user_id, plate_number),
  INDEX idx_vehicles_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Booking integration uses `bookings.vehicle_id` with a foreign key to `vehicles.id`.

## Nest routes and handlers

- `POST /vehicles` -> create vehicle
- `GET /vehicles` -> list vehicles
- `PATCH /vehicles/:id` -> update vehicle
- `DELETE /vehicles/:id` -> delete vehicle

Controller file:
- `server/src/vehicles/vehicles.controller.ts`

Service file:
- `server/src/vehicles/vehicles.service.ts`

## React fleet components

- `VehicleCategory.jsx` -> category cards and onboarding selection
- `AddVehicle.jsx` -> create/edit vehicle form
- `FleetDashboard.jsx` -> fleet card grid with tracking/edit/remove actions
- `VehicleTracking.jsx` -> map route, telemetry panel, and simulated live camera feed

## Example UI layout

```text
Dashboard Tabs
|- My Fleet
|  |- Category Cards (if no vehicles)
|  |- Add Vehicle Form
|  |- Fleet Card Grid
|     |- View Live Tracking
|     |- Edit Vehicle
|     |- Remove Vehicle
|- Create Booking
|  |- Select Registered Vehicle
|  |- Contract + Hub + Security
|- Live Tracking
|  |- Vehicle Selector
|  |- GPS Map + Route + Speed + Status
|  |- Live Feed (Simulated)
|- My Bookings
   |- Booking history + status + dispatcher + ETA
```

