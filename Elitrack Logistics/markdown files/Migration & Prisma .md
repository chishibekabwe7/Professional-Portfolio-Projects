I’ll extract the contract directly from the existing Express routes/controllers/auth middleware and keep it strictly read-only. I’m starting by enumerating the route files and linked controllers so the endpoint map is complete before I summarize fields and response keys.

Ran terminal command:  set -e
cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server'
printf 'ROUTES\n'; rg --files routes
printf '\nCONTROLLERS\n'; rg --files controllers
printf '\nMIDDLEWARE\n'; rg --files middleware

Ran terminal command:  cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server' && echo ROUTES && rg --files routes && echo CONTROLLERS && rg --files controllers && echo MIDDLEWARE && rg --files middleware
Completed with input:  cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server' && echo ROUTES && rg --files routes && echo CONTROLLERS && rg --files controllers && echo MIDDLEWARE && rg --files middleware

Ripgrep isn’t installed in this environment, so I’m switching to `find`/`grep` to keep the extraction moving without changing anything. Next I’ll read each route/controller and build the exact endpoint matrix with auth and payload/response keys.

Ran terminal command:  cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server' && echo ROUTES && find routes -type f | sort && echo CONTROLLERS && find controllers -type f | sort && echo MIDDLEWARE && find middleware -type f | sort

Ran terminal command:  cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server' && wc -l routes/auth.js routes/vehicles.js routes/bookings.js routes/admin.js controllers/vehiclesController.js middleware/auth.js

I have the exact files in scope now; I’m reading all of them next to extract endpoint methods, auth/roles, request fields, and response keys directly from source. After this pass I’ll compile the grouped contract and flag ambiguities.

Read [](file:///home/cj/Github/Professional-Portfolio-Projects/Elitrack%20Logistics/server/routes/auth.js)

Read [](file:///home/cj/Github/Professional-Portfolio-Projects/Elitrack%20Logistics/server/routes/bookings.js)

Read [](file:///home/cj/Github/Professional-Portfolio-Projects/Elitrack%20Logistics/server/routes/admin.js)

Read [](file:///home/cj/Github/Professional-Portfolio-Projects/Elitrack%20Logistics/server/middleware/auth.js)

Read [](file:///home/cj/Github/Professional-Portfolio-Projects/Elitrack%20Logistics/server/routes/vehicles.js)

Read [](file:///home/cj/Github/Professional-Portfolio-Projects/Elitrack%20Logistics/server/controllers/vehiclesController.js)

I’ve parsed all in-scope route/controller/auth files and identified every endpoint plus auth gate used. I’m now cross-checking line-level details for role checks, request fields, and response keys so the final contract is migration-grade and explicit about ambiguities.

Ran terminal command:  cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server' && echo 'AUTH ROUTES' && grep -n "router\." routes/auth.js && echo '
VEHICLE ROUTES' && grep -n "router\." routes/vehicles.js && echo '
BOOKING ROUTES' && grep -n "router\." routes/bookings.js && echo '
ADMIN ROUTES' && grep -n "router\." routes/admin.js && echo '
AUTH MIDDLEWARE' && grep -n "const authenticateToken\|const authorizeRoles\|const adminOnly" middleware/auth.js

Ran terminal command:  cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server' && grep -n "const createVehicle\|const getVehicles\|const updateVehicle\|const deleteVehicle\|const parseVehiclePayload" controllers/vehiclesController.js && grep -n "validateBookingCreate\|WORKFLOW_STATUSES\|ALLOWED_TRANSITIONS\|allowedPaymentStatuses" routes/bookings.js

Read-only extraction completed. No code was modified.

Primary sources used:
- auth.js
- vehicles.js
- bookings.js
- admin.js
- vehiclesController.js
- auth.js

Notes for contract reliability:
- Route files define router-relative paths. Full mount prefixes are outside the requested scope.
- Request body fields below are from body access and inline checks in scope.
- Additional validation middleware exists but is outside requested files (see auth.js and bookings.js).

**Auth Domain**
| Method | Route path | Required authentication | Request body fields | Response structure keys |
|---|---|---|---|---|
| POST | /register | No | email, password, phone, full_name, company | success: success, message; error: error |
| POST | /login | No | email, password | success: token, user(id, email, role, full_name, company); error: error |
| POST | /google | No | token | success: token, user(id, email, role, full_name, company); error: error |
| POST | /forgot-password | No | email | success: message; error: error |
| POST | /verify-reset-token | No | token | success: valid, message, user_id; error: error |
| POST | /reset-password | No | token, password | success: success, message; error: error |

Source lines: auth.js, auth.js, auth.js, auth.js, auth.js, auth.js

**Vehicles Domain**
All endpoints are protected by router-level JWT auth via vehicles.js.

| Method | Route path | Required authentication | Request body fields | Response structure keys |
|---|---|---|---|---|
| POST | / | Yes, JWT bearer (any authenticated user) | category, custom_category, vehicle_name, plate_number, tracking_enabled | success: vehicle row object (vehicles table columns); error: error |
| GET | / | Yes, JWT bearer (any authenticated user) | none | success: array of vehicle row objects (vehicles table columns); error: error |
| PUT | /:id | Yes, JWT bearer (any authenticated user) | category, custom_category, vehicle_name, plate_number, tracking_enabled | success: vehicle row object (vehicles table columns); error: error |
| DELETE | /:id | Yes, JWT bearer (any authenticated user) | none | success: success; error: error |

Controller sources: vehiclesController.js, vehiclesController.js, vehiclesController.js, vehiclesController.js

**Bookings Domain**
| Method | Route path | Required authentication | Request body fields | Response structure keys |
|---|---|---|---|---|
| POST | / | Yes, JWT bearer (any authenticated user) | vehicle_id, truck_type, truck_price_per_day, units, days, hub, manual_location, security_tier, security_price, total_amount, notes | success: id, booking_ref; error: error |
| GET | /mine | Yes, JWT bearer (any authenticated user) | none | success: array of booking row objects (bookings table columns); error: error |
| GET | /all | Yes, JWT bearer + role admin or super_admin | none | success: array of booking+user objects (bookings columns plus email, full_name, company); error: error |
| PATCH | /:id/status | Yes, JWT bearer + role admin or super_admin | status, dispatcher_name, eta, status_notes | success: success, status; error: error |
| PATCH | /:id/payment | Yes, JWT bearer + adminOnly (DB role check admin/super_admin) | status, payment_method | success: success; error: error |

Sources: bookings.js, bookings.js, bookings.js, bookings.js, bookings.js

**Admin Domain**
| Method | Route path | Required authentication | Request body fields | Response structure keys |
|---|---|---|---|---|
| GET | /dev/seeded-users-checklist | Yes, JWT bearer + role super_admin; also NODE_ENV must be development | none | success: environment, role_model, default_super_admin(email, exists, id, note), checklist(total_users, super_admin_count, admin_count, user_count, users_without_password_count, all_users_have_password_hash, has_exactly_one_super_admin), recent_users; error: error |
| GET | /stats | Yes, JWT bearer + role admin or super_admin | none | success: total_users, total_bookings, active_bookings, total_revenue, pending_revenue |
| GET | /users | Yes, JWT bearer + role admin or super_admin | none | success: array of user objects(id, email, phone, full_name, company, role, created_at) |
| POST | /create-admin | Yes, JWT bearer + role super_admin | email, password, full_name, company, phone | success: message, id, email, role; error: error |
| DELETE | /users/:id | Yes, JWT bearer + role admin or super_admin | none | success: message; error: error |
| GET | /transactions | Yes, JWT bearer + adminOnly (DB role check admin/super_admin) | none | success: array of transaction objects (transactions columns plus booking_ref, truck_type, hub, email, full_name) |
| GET | /notifications | Yes, JWT bearer + adminOnly (DB role check admin/super_admin) | none | success: array of notification objects (notification_events columns plus booking_ref, email, full_name) |
| GET | /audit-logs | Yes, JWT bearer + adminOnly (DB role check admin/super_admin) | none | success: array of audit objects (admin_audit_logs columns plus admin_email, admin_name) |

Sources: admin.js, admin.js, admin.js, admin.js, admin.js, admin.js, admin.js, admin.js

**Inconsistencies / Unclear Patterns**
1. Authorization strategy is mixed:
- Token-claim role checks via auth.js
- DB role checks via auth.js
This can produce different behavior for stale JWT role claims.
2. Full route mount prefixes are not visible in requested scope, only router-relative paths are visible in route files.
3. Required field rules are partly external middleware, so full validation contract is incomplete from scoped files alone (imports at auth.js, bookings.js).
4. Response shape is inconsistent across endpoints: some return envelope objects, some raw arrays, some raw rows from SELECT * (examples: auth.js, bookings.js, vehiclesController.js).
5. Payment endpoint naming is ambiguous: route is booking-scoped (/:id/payment) but updates transactions by booking_id ([payment update](Professional-Portfolio-Projects/Elitrack%20Logistics/server/routes/bookings.js#L233)).
6. Comment/behavior mismatch in admin deletion: comment says delete or deactivate, implementation hard-deletes user row ([comment and delete query](Professional-Portfolio-Projects/Elitrack%20Logistics/server/routes/admin.js#L112)).
7. Status model mixes legacy aliases and canonical workflow states ([legacy map](Professional-Portfolio-Projects/Elitrack%20Logistics/server/routes/bookings.js#L11), bookings.js).
8. Several endpoints rely on SELECT * and table wildcard output, which makes response keys drift-prone when schema changes (examples: vehiclesController.js, bookings.js, admin.js).




I’ll extract the schema directly from the runtime SQL definitions first, then cross-check table usage in controllers/services so the result stays grounded in visible SQL only. I’m starting with server/config/db.js and the SQL-calling files under controllers/services.

Ran terminal command:  cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server' && echo 'FILES' && find config controllers services -type f | sort && echo '
SQL CALL SITES (controllers/services)' && grep -RIn "pool.query\|CREATE TABLE\|ALTER TABLE\|INSERT INTO\|UPDATE \|DELETE FROM\|SELECT " controllers services || true

Ran terminal command:  cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server' && wc -l config/db.js controllers/vehiclesController.js services/notifications.js

I’ve located all in-scope SQL call sites. Next I’m reading those files fully to enumerate tables, column types, keys, and constraints exactly as declared.

Read [](file:///home/cj/Github/Professional-Portfolio-Projects/Elitrack%20Logistics/server/config/db.js)

Read [](file:///home/cj/Github/Professional-Portfolio-Projects/Elitrack%20Logistics/server/controllers/vehiclesController.js)

Read [](file:///home/cj/Github/Professional-Portfolio-Projects/Elitrack%20Logistics/server/services/notifications.js)

Ran terminal command:  cd '/home/cj/Github/Professional-Portfolio-Projects/Elitrack Logistics/server' && echo 'db.js table definitions and migration statements' && grep -n "CREATE TABLE IF NOT EXISTS\|ALTER TABLE users\|ALTER TABLE bookings\|ADD CONSTRAINT fk_bookings_vehicle\|UNIQUE KEY\|FOREIGN KEY\|MODIFY COLUMN\|ADD COLUMN\|ADD INDEX" config/db.js && echo '
controllers/services SQL table usage' && grep -RIn "INSERT INTO\|SELECT \|UPDATE \|DELETE FROM" controllers services

Schema extracted in read-only mode from:
- db.js
- vehiclesController.js
- notifications.js

No code changes were made.

**1. Tables**

1. users  
Source: db.js, db.js  
Columns + types:
- id INT AUTO_INCREMENT
- email VARCHAR(255) NOT NULL
- password VARCHAR(255) NOT NULL
- role ENUM('super_admin','admin','user') NOT NULL DEFAULT 'user'
- phone VARCHAR(50) NULL
- full_name VARCHAR(255) NULL
- company VARCHAR(255) NULL
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
Primary key:
- id  
Foreign keys:
- none  
Constraints/defaults:
- UNIQUE(email)
- role constrained to ENUM values above (final enforced set)

2. vehicles  
Source: db.js, db.js  
Columns + types:
- id INT AUTO_INCREMENT
- user_id INT NOT NULL
- category VARCHAR(60) NOT NULL DEFAULT 'other'
- vehicle_name VARCHAR(120) NOT NULL
- plate_number VARCHAR(30) NOT NULL
- tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
Primary key:
- id  
Foreign keys:
- user_id -> users.id ON DELETE CASCADE  
Constraints/defaults:
- UNIQUE KEY uniq_user_plate (user_id, plate_number)
- INDEX idx_vehicles_user_id (user_id)

3. bookings  
Source: db.js, db.js, db.js  
Columns + types:
- id INT AUTO_INCREMENT
- user_id INT NOT NULL
- vehicle_id INT NULL
- booking_ref VARCHAR(20) UNIQUE NOT NULL
- truck_type VARCHAR(100) NOT NULL
- truck_price_per_day INT NOT NULL
- units INT NOT NULL DEFAULT 1
- days INT NOT NULL DEFAULT 1
- hub VARCHAR(255) NOT NULL
- security_tier VARCHAR(100) NOT NULL
- security_price INT NOT NULL DEFAULT 0
- total_amount INT NOT NULL
- status ENUM('pending_review','approved','dispatched','in_transit','completed') DEFAULT 'pending_review'
- notes TEXT
- dispatcher_name VARCHAR(255)
- eta DATETIME
- status_notes TEXT
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP  
Primary key:
- id  
Foreign keys:
- user_id -> users.id
- vehicle_id -> vehicles.id ON DELETE SET NULL ON UPDATE CASCADE  
Constraints/defaults:
- UNIQUE(booking_ref)
- status constrained to ENUM values above
- INDEX idx_bookings_vehicle_id (vehicle_id) added conditionally in migration

4. transactions  
Source: db.js  
Columns + types:
- id INT AUTO_INCREMENT
- booking_id INT NOT NULL
- user_id INT NOT NULL
- amount INT NOT NULL
- currency VARCHAR(10) DEFAULT 'ZMW'
- payment_method VARCHAR(50) DEFAULT 'pending'
- status ENUM('pending','paid','failed','refunded') DEFAULT 'pending'
- reference VARCHAR(100)
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
Primary key:
- id  
Foreign keys:
- booking_id -> bookings.id
- user_id -> users.id  
Constraints/defaults:
- status constrained to ENUM values above

5. fleet_telemetry  
Source: db.js  
Columns + types:
- id INT AUTO_INCREMENT
- booking_id INT NOT NULL
- truck_id VARCHAR(20) NOT NULL
- latitude DECIMAL(10,7)
- longitude DECIMAL(10,7)
- speed INT DEFAULT 0
- status VARCHAR(50) DEFAULT 'TRACKING'
- recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
Primary key:
- id  
Foreign keys:
- booking_id -> bookings.id  
Constraints/defaults:
- speed default 0
- status default 'TRACKING'

6. notification_events  
Source: db.js, notifications.js  
Columns + types:
- id INT AUTO_INCREMENT
- booking_id INT
- user_id INT
- channel ENUM('email','sms','whatsapp') NOT NULL
- event_type VARCHAR(64) NOT NULL
- recipient VARCHAR(255)
- status ENUM('sent','failed','skipped') NOT NULL
- provider VARCHAR(50)
- message_subject VARCHAR(255)
- message_text TEXT
- error_text TEXT
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
Primary key:
- id  
Foreign keys:
- booking_id -> bookings.id
- user_id -> users.id  
Constraints/defaults:
- channel/status constrained to ENUM values above

7. admin_audit_logs  
Source: db.js  
Columns + types:
- id INT AUTO_INCREMENT
- admin_user_id INT NOT NULL
- action VARCHAR(120) NOT NULL
- entity_type VARCHAR(80)
- entity_id INT
- details_json JSON
- ip_address VARCHAR(80)
- user_agent VARCHAR(255)
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
Primary key:
- id  
Foreign keys:
- admin_user_id -> users.id  
Constraints/defaults:
- created_at default CURRENT_TIMESTAMP

8. password_reset_tokens  
Source: db.js  
Columns + types:
- id INT AUTO_INCREMENT
- user_id INT NOT NULL
- token VARCHAR(255) NOT NULL UNIQUE
- expires_at DATETIME NOT NULL
- used BOOLEAN DEFAULT FALSE
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
Primary key:
- id  
Foreign keys:
- user_id -> users.id  
Constraints/defaults:
- UNIQUE(token)
- INDEX idx_token (token)
- INDEX idx_user_expires (user_id, expires_at)

9. audit_logs  
Source: db.js  
Columns + types:
- id INT AUTO_INCREMENT
- user_id INT NOT NULL
- action VARCHAR(120) NOT NULL
- target_id INT
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
Primary key:
- id  
Foreign keys:
- user_id -> users.id  
Constraints/defaults:
- created_at default CURRENT_TIMESTAMP

**2. Relationships**

From visible foreign keys in db.js:

- users 1-to-many vehicles via vehicles.user_id
- users 1-to-many bookings via bookings.user_id
- vehicles 1-to-many bookings via bookings.vehicle_id (nullable link on booking side)
- bookings 1-to-many transactions via transactions.booking_id
- users 1-to-many transactions via transactions.user_id
- bookings 1-to-many fleet_telemetry via fleet_telemetry.booking_id
- bookings 1-to-many notification_events via notification_events.booking_id (nullable)
- users 1-to-many notification_events via notification_events.user_id (nullable)
- users 1-to-many admin_audit_logs via admin_audit_logs.admin_user_id
- users 1-to-many password_reset_tokens via password_reset_tokens.user_id
- users 1-to-many audit_logs via audit_logs.user_id

**3. Constraints and defaults highlights**

- Unique constraints:
- users.email
- bookings.booking_ref
- vehicles (user_id, plate_number)
- password_reset_tokens.token

- Enum constraints:
- users.role: super_admin, admin, user
- bookings.status: pending_review, approved, dispatched, in_transit, completed
- transactions.status: pending, paid, failed, refunded
- notification_events.channel: email, sms, whatsapp
- notification_events.status: sent, failed, skipped

- Default values (selected):
- users.role default user
- vehicles.category default other
- vehicles.tracking_enabled default TRUE
- bookings.status default pending_review
- bookings.units default 1
- bookings.days default 1
- bookings.security_price default 0
- transactions.currency default ZMW
- transactions.payment_method default pending
- transactions.status default pending
- fleet_telemetry.speed default 0
- fleet_telemetry.status default TRACKING
- password_reset_tokens.used default FALSE
- created_at fields default CURRENT_TIMESTAMP across tables

- On-delete behavior explicitly specified:
- vehicles.user_id -> users.id ON DELETE CASCADE
- bookings.vehicle_id -> vehicles.id ON DELETE SET NULL
- Other foreign keys do not specify ON DELETE/ON UPDATE clauses in visible SQL.

- Controllers/services SQL scope check:
- vehiclesController.js uses vehicles only.
- notifications.js inserts into notification_events.
- No extra tables/columns beyond the db.js schema are introduced by these controller/service SQL statements.