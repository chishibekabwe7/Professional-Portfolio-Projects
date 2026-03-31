/**
 * scripts/seedAdmin.js
 *
 * Run once to insert the first super_admin account into the database.
 * Usage: node scripts/seedAdmin.js
 *
 * Reads connection details from server/.env (or process environment).
 * The script will exit with a non-zero code if anything goes wrong.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const SALT_ROUNDS = 12;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
  console.log('\n=== Elitrack – Super Admin Seeder ===\n');

  const email = (await ask('Super-admin email: ')).trim();
  const phone = (await ask('Phone number     : ')).trim();
  const fullName = (await ask('Full name        : ')).trim();
  const password = (await ask('Password (min 8) : ')).trim();

  if (!email || !phone || !password) {
    console.error('❌  email, phone and password are all required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('❌  Password must be at least 8 characters.');
    process.exit(1);
  }

  rl.close();

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'terralink_db',
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      console.error(`❌  A user with email "${email}" already exists.`);
      process.exit(1);
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      `INSERT INTO users (email, phone, password_hash, role, full_name) VALUES (?, ?, ?, 'super_admin', ?)`,
      [email, phone, password_hash, fullName || null]
    );

    console.log(`\n✅  super_admin account created (id=${result.insertId}).`);
    console.log(`    Email : ${email}`);
    console.log(`    Role  : super_admin\n`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌  Seeder failed:', err.message);
  process.exit(1);
});
