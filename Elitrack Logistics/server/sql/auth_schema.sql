-- Auth + RBAC schema for MySQL
-- Roles supported: super_admin, admin, user

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user',
  phone VARCHAR(50),
  full_name VARCHAR(255),
  company VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default super admin only if the account does not already exist.
INSERT INTO users (email, password, role, full_name, company)
SELECT
  'chishibekabwe7@gmail.com',
  '$2b$12$pRU.vPQZUUvHQNnHrVx9POy22JXSlgPH1QxucSOErIbgM6IpMMF5K',
  'super_admin',
  'Default Super Admin',
  'Elitrack Logistics'
WHERE NOT EXISTS (
  SELECT 1
  FROM users
  WHERE email = 'chishibekabwe7@gmail.com'
);
