const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'terralink_db',
  waitForConnections: true,
  connectionLimit: 10,
});

const applySchemaMigrations = async (conn, dbName) => {
  await conn.query(`USE ${dbName}`);

  // Expand role ENUM to include dispatcher and super_admin
  await conn.query(`
    ALTER TABLE users
    MODIFY COLUMN role ENUM('client','dispatcher','admin','super_admin') DEFAULT 'client'
  `);

  await conn.query(`UPDATE bookings SET status = 'pending_review' WHERE status = 'pending'`);
  await conn.query(`UPDATE bookings SET status = 'in_transit' WHERE status = 'active'`);
  await conn.query(`UPDATE bookings SET status = 'completed' WHERE status = 'cancelled'`);

  await conn.query(`
    ALTER TABLE bookings
    MODIFY COLUMN status ENUM(
      'pending_review',
      'approved',
      'dispatched',
      'in_transit',
      'completed'
    ) DEFAULT 'pending_review'
  `);

  await conn.query(`
    ALTER TABLE bookings
    MODIFY COLUMN hub VARCHAR(255) NOT NULL
  `);

  const hasColumn = async (columnName) => {
    const [columns] = await conn.query(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'bookings'
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [dbName, columnName]
    );
    return columns.length > 0;
  };

  if (!(await hasColumn('dispatcher_name'))) {
    await conn.query('ALTER TABLE bookings ADD COLUMN dispatcher_name VARCHAR(255)');
  }

  if (!(await hasColumn('eta'))) {
    await conn.query('ALTER TABLE bookings ADD COLUMN eta DATETIME');
  }

  if (!(await hasColumn('status_notes'))) {
    await conn.query('ALTER TABLE bookings ADD COLUMN status_notes TEXT');
  }

  const [legacyColumns] = await conn.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'bookings'
       AND COLUMN_NAME = 'admin_notes'
     LIMIT 1`,
    [dbName]
  );
  if (legacyColumns.length) {
    await conn.query('UPDATE bookings SET status_notes = COALESCE(NULLIF(status_notes, ""), admin_notes)');
  }
};

const initDB = async () => {
  const conn = await pool.getConnection();
  const dbName = process.env.DB_NAME || 'terralink_db';
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await conn.query(`USE ${dbName}`);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('client','dispatcher','admin','super_admin') DEFAULT 'client',
        full_name VARCHAR(255),
        company VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        booking_ref VARCHAR(20) UNIQUE NOT NULL,
        truck_type VARCHAR(100) NOT NULL,
        truck_price_per_day INT NOT NULL,
        units INT NOT NULL DEFAULT 1,
        days INT NOT NULL DEFAULT 1,
        hub VARCHAR(255) NOT NULL,
        security_tier VARCHAR(100) NOT NULL,
        security_price INT NOT NULL DEFAULT 0,
        total_amount INT NOT NULL,
        status ENUM('pending_review','approved','dispatched','in_transit','completed') DEFAULT 'pending_review',
        notes TEXT,
        dispatcher_name VARCHAR(255),
        eta DATETIME,
        status_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        user_id INT NOT NULL,
        amount INT NOT NULL,
        currency VARCHAR(10) DEFAULT 'ZMW',
        payment_method VARCHAR(50) DEFAULT 'pending',
        status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
        reference VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS fleet_telemetry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        truck_id VARCHAR(20) NOT NULL,
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        speed INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'TRACKING',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notification_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT,
        user_id INT,
        channel ENUM('email','sms','whatsapp') NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        recipient VARCHAR(255),
        status ENUM('sent','failed','skipped') NOT NULL,
        provider VARCHAR(50),
        message_subject VARCHAR(255),
        message_text TEXT,
        error_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_user_id INT NOT NULL,
        action VARCHAR(120) NOT NULL,
        entity_type VARCHAR(80),
        entity_id INT,
        details_json JSON,
        ip_address VARCHAR(80),
        user_agent VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_user_id) REFERENCES users(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_token (token),
        INDEX idx_user_expires (user_id, expires_at)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(120) NOT NULL,
        target_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Seed admin user if not exists
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    await conn.query(`
      INSERT IGNORE INTO users (email, phone, password_hash, role, full_name, company)
      VALUES ('admin@elitrack.zm', '0973930287', ?, 'admin', 'Elijah Mufwambi', 'Elitrack Logistics')
    `, [hash]);

    await applySchemaMigrations(conn, dbName);

    console.log('✅ Database initialized');
  } finally {
    conn.release();
  }
};

const closeDB = async () => {
  await pool.end();
};

module.exports = { pool, initDB, closeDB };
