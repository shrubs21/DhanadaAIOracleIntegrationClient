import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Supabase
  },
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected (Supabase direct)");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err.message);
});

export default pool;
