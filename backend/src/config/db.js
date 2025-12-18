import "dotenv/config"; // ✅ ESM-safe env loading

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: false, // set to true for cloud DBs (Supabase, Neon, AWS)
});

// Optional: log successful connection (once)
pool.on("connect", () => {
  console.log("PostgreSQL connected successfully");
});

// Optional: catch unexpected errors
pool.on("error", (err) => {
  console.error("Unexpected PG error", err);
  process.exit(1);
});

export default pool;
