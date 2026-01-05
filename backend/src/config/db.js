import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",
  database: process.env.DB_NAME || "oracle_ai",
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected (LOCAL DOCKER)");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err);
});

export default pool;
