-- Fleet vehicles schema
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

-- Booking integration for existing databases
-- Execute only if bookings.vehicle_id does not already exist.
ALTER TABLE bookings
  ADD COLUMN vehicle_id INT NULL AFTER user_id;

ALTER TABLE bookings
  ADD INDEX idx_bookings_vehicle_id (vehicle_id);

ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_vehicle
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
