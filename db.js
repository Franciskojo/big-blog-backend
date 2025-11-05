import dotenv from "dotenv";
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Connected to Neon PostgreSQL:", result.rows[0].now);
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  }
})();

export default pool;

