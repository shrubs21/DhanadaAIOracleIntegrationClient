import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // ✅ REQUIRED for Supabase
  },
});

/**
 * Log when DB connects
 */
pool.on("connect", () => {
  console.log("✅ PostgreSQL connected (Supabase)");
});

/**
 * Log DB errors
 */
pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err);
});

/**
 * 🔍 DEBUG: Confirm which DB Render is connected to
 * (SAFE to keep temporarily)
 */
(async () => {
  try {
    const res = await pool.query(
      "SELECT current_database(), inet_server_addr(), inet_server_port()"
    );
    console.log("🧠 DB INFO:", res.rows[0]);
  } catch (err) {
    console.error("❌ DB INFO FAILED:", err.message);
  }
})();

export default pool;
