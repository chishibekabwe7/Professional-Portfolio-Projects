  |- Booking history + status + dispatcher + ETA
```

## Controlled migration plan (analysis-first, no rewrite)

### 1) Summary of current system

- **Monorepo layout:** `client/` (React JS SPA), `server/` (Express API), MySQL via `server/config/db.js`.
- **API domains:** auth (`/api/auth`), bookings (`/api/bookings`), vehicles (`/api/vehicles`), admin (`/api/admin`), health (`/api/health`).
- **Business logic highlights:**
  - Auth with email/password + Google OAuth + password reset token flow.
  - Bookings workflow (`pending_review -> approved -> dispatched -> in_transit -> completed`) and payment status updates.
  - Fleet/vehicles CRUD tied to authenticated user.
  - Admin stats, users, transactions, notifications, audit logs.
- **Database usage:** direct SQL (`mysql2`) across route/controller/service files; schema + migration logic runs at startup in `server/config/db.js`.
- **Authentication:** JWT bearer tokens (`server/middleware/auth.js`), role checks for `user`, `admin`, `super_admin`; client stores token in localStorage.

### 2) Proposed target architecture

#### Backend (NestJS + TypeScript)

- `AppModule`
  - `PrismaModule`
  - `AuthModule`
  - `UsersModule`
  - `BookingsModule`
  - `ShipmentsModule`
  - `VehiclesModule`
  - `AdminModule`
  - `NotificationsModule`
- Shared building blocks:
  - `common/guards` (JWT + role guards)
  - `common/interceptors` (audit + request logging)
  - `common/pipes` (Zod validation pipe)
  - `config/` (env-validated config)

#### Prisma schema structure (initial mapping)

- Models: `User`, `Vehicle`, `Booking`, `Transaction`, `PasswordResetToken`, `NotificationEvent`, `AdminAuditLog`, `AuditLog`, `FleetTelemetry`.
- Enums:
  - `UserRole`: `SUPER_ADMIN | ADMIN | USER`
  - `BookingStatus`: `PENDING_REVIEW | APPROVED | DISPATCHED | IN_TRANSIT | COMPLETED`
  - `TransactionStatus`: `PENDING | PAID | FAILED | REFUNDED`
- Required relations:
  - `User 1-n Booking`, `User 1-n Vehicle`, `Booking 1-n Transaction`, `Booking n-1 Vehicle (nullable)`, audit/notification links.

#### Frontend (React + TypeScript + Axios + React Query + Tailwind CSS)

- `src/features/{auth,bookings,shipments,vehicles,admin}/`
- `src/lib/api/axios.ts` with typed API client + auth interceptor.
- `src/lib/query/` for React Query client, keys, and shared fetch hooks.
- `src/types/` for DTO/domain types aligned with NestJS responses.
- Incremental conversion from `.js/.jsx` to `.ts/.tsx` per feature, preserving behavior.

### 3) Ordered migration steps (independent + testable)

1. **Baseline freeze & API contract snapshot**
2. **Initialize NestJS workspace in parallel to Express**
3. **Add Prisma with current MySQL schema (no behavior change)**
4. **Migrate Users/Auth module to NestJS + JWT + Zod**
5. **Migrate Vehicles module**
6. **Migrate Bookings + Transactions module**
7. **Migrate Admin module**
8. **Introduce Shipments module boundary**
9. **Switch frontend to TypeScript foundation**
10. **Adopt Axios service layer + React Query feature by feature**
11. **Introduce Tailwind CSS and migrate UI styles incrementally**
12. **Cut over traffic from Express routes to NestJS routes**

### 4) Step-by-step execution prompts (generated for iterative use)

> **Execution rule:** run one step, verify, show result, then pause for approval before continuing.
#### Step 1 — Baseline freeze & API contract snapshot
- **Goal:** Document current API and DB behavior so migration can be verified against it.
- **Generated prompt:**  
  “Scan `server/routes`, `server/controllers`, and `server/config/db.js`; produce a machine-readable endpoint and schema contract (methods, paths, request fields, response fields, auth rules, key SQL tables). Do not change runtime logic.”
- **Expected result:** A committed baseline contract document used for regression checks.

#### Step 2 — Initialize NestJS workspace in parallel
- **Goal:** Create a non-invasive NestJS app folder without replacing Express.
- **Generated prompt:**  
  “Initialize a NestJS TypeScript backend in `server-nest/` with starter modules (`auth`, `users`, `bookings`, `shipments`, `vehicles`, `admin`) and a `/health` endpoint. Keep existing Express server untouched.”
- **Expected result:** NestJS app compiles and runs independently.

#### Step 3 — Add Prisma mapped to existing MySQL schema
- **Goal:** Introduce ORM safely before feature migration.
- **Generated prompt:**  
  “Add Prisma to `server-nest`, create schema models/enums matching current MySQL tables, generate client, and verify connection against existing DB. Do not alter business logic yet.”
- **Expected result:** Prisma client works with existing schema and passes a basic connectivity check.

#### Step 4 — Migrate Users/Auth module
- **Goal:** Move auth flow to NestJS with Zod validation and JWT.
- **Generated prompt:**  
  “Implement `AuthModule` + `UsersModule` in NestJS for register/login/google/forgot-password/reset-password using Prisma, JWT guards, and Zod DTO validation. Keep endpoint contracts aligned with existing frontend.”
- **Expected result:** Auth endpoints functionally match current behavior; Express auth can be toggled off later.

#### Step 5 — Migrate Vehicles module
- **Goal:** Port fleet CRUD logic with ownership checks.
- **Generated prompt:**  
  “Implement NestJS `VehiclesModule` with Prisma CRUD and user-ownership enforcement for create/list/update/delete, preserving category and plate uniqueness behavior.”
- **Expected result:** Vehicle endpoints match current responses and permissions.

#### Step 6 — Migrate Bookings + Transactions
- **Goal:** Preserve workflow and payment lifecycle with safer transactions.
- **Generated prompt:**  
  “Implement NestJS `BookingsModule` for create/mine/all/status/payment endpoints with Prisma transactions and existing booking status transition rules.”
- **Expected result:** Booking creation and payment updates remain compatible and atomic.

#### Step 7 — Migrate Admin module
- **Goal:** Recreate admin capabilities with role guards and audit support.
- **Generated prompt:**  
  “Implement NestJS `AdminModule` endpoints for stats, users, create-admin, delete-user, transactions, notifications, and audit logs using role-based guards.”
- **Expected result:** Admin dashboard API parity with controlled authorization.

#### Step 8 — Introduce Shipments module boundary
- **Goal:** Establish future-ready logistics domain boundary.
- **Generated prompt:**  
  “Create `ShipmentsModule` with initial shipment entity/service/controller mapped from booking dispatch lifecycle, without breaking current booking flow.”
- **Expected result:** Clear shipment domain seam for future scaling.

#### Step 9 — Frontend TypeScript foundation
- **Goal:** Prepare frontend for typed API integration.
- **Generated prompt:**  
  “Set up React TypeScript migration incrementally: add tsconfig, convert app shell/auth context/api client to TS first, keep UI behavior unchanged.”
- **Expected result:** Mixed JS/TS app builds successfully with typed core layer.

#### Step 10 — Axios + React Query incremental adoption
- **Goal:** Improve data fetching reliability and caching safely.
- **Generated prompt:**  
  “Introduce React Query provider and migrate one feature at a time (auth -> vehicles -> bookings -> admin) to typed Axios hooks with loading/error states.”
- **Expected result:** Feature-level parity with improved request handling and caching.

#### Step 11 — Tailwind CSS incremental UI migration
- **Goal:** Modernize styling without visual regression spikes.
- **Generated prompt:**  
  “Add Tailwind CSS and migrate shared layout/components first (navbar, cards, forms, tables), leaving route logic untouched and validating each page visually.”
- **Expected result:** Tailwind in place with progressively migrated components.

#### Step 12 — Controlled cutover to NestJS
- **Goal:** Complete migration without downtime-style breakage.
- **Generated prompt:**  
  “Switch client API base and route proxy to NestJS endpoints module-by-module, keep rollback toggles, and remove Express routes only after parity checks pass.”
- **Expected result:** System runs on modern stack with preserved functionality.

---

### Current execution status

- This update intentionally performs **analysis and migration orchestration only**.
- No runtime refactor/rewrite was performed in this step.