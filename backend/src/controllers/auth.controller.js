import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

/**
 * =========================
 * REGISTER USER
 * =========================
 */
export const register = async (req, res) => {
  try {
    const { firstName, email, password } = req.body;

    // 🔒 Basic validation
    if (!firstName || !email || !password) {
      return res.status(400).json({
        error: "First name, email and password are required",
      });
    }

    console.log("🟢 Register request received:", { firstName, email });

    //  DB connectivity sanity check
    await pool.query("SELECT 1");

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    //   Insert user
    const result = await pool.query(
      `INSERT INTO users (first_name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [firstName, email, hashedPassword]
    );

    console.log("✅ User registered with ID:", result.rows[0].id);

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);

    // Duplicate email
    if (err.code === "23505") {
      return res.status(409).json({
        error: "Email already exists",
      });
    }

    return res.status(500).json({
      error: "Server error",
      details: err.message, // 🔎 TEMP (remove after fix)
    });
  }
};

/**
 * =========================
 * LOGIN USER
 * =========================
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const result = await pool.query(
      "SELECT id, email, first_name, password FROM users WHERE email = $1",
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 🔐 JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
      },
    });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * =========================
 * CURRENT USER
 * =========================
 */
export const me = (req, res) => {
  return res.json({
    id: req.user.id,
    email: req.user.email,
    firstName: req.user.firstName,
  });
};
