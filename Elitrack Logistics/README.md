# Elitrack Logistics

**Elitrack Logistics** is a small web app for booking and (simulated) tracking truck/convoy deployments, with a client portal and an admin dashboard for managing bookings and payments.

## What it does

### Client side (Dashboard)

- **Sign in** using email/password or Google sign-in.
- **Book a convoy** by selecting:
  - vehicle type
  - number of units
  - contract days
  - deployment hub (Kitwe / Ndola / Solwezi / Chingola)
  - security tier
- **Creates a booking** and a **pending transaction** for the total amount.
- **Live tracking view** showing a map and “telematics” UI:
  - GPS positions and speed are **simulated** (demo data) to represent live movement.
- **My bookings** list to view previous bookings and their statuses.

### Admin side (Admin Dashboard)

- **Overview stats** (clients, bookings, active convoys, paid vs pending revenue).
- **Manage bookings**:
  - view all bookings
  - update booking status (activate / complete / cancel)
- **Manage transactions**:
  - mark payments as paid (manual)
- **View users** (registered clients list).

