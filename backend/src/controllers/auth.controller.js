import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

/**
 * REGISTER USER
 * Stores first_name, email, hashed password
 */
export const register = async (req, res) => {
  try {
    const { firstName, email, password } = req.body;

    // 🔒 Validation
    if (!firstName || !email || !password) {
      return res.status(400).json({
        error: "First name, email and password are required",
      });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🗄️ Insert user
    await pool.query(
      "INSERT INTO users (first_name, email, password) VALUES ($1, $2, $3)",
      [firstName, email, hashedPassword]
    );

    res.status(201).json({
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("REGISTER ERROR ❌", err);

    // Handle duplicate email
    if (err.code === "23505") {
      return res.status(409).json({
        error: "Email already exists",
      });
    }

    res.status(500).json({ error: "Server error" });
  }
};

/**
 * LOGIN USER
 * Returns JWT with identity info
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔒 Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // 🔍 Fetch user
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // 🔐 Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 🔑 Create JWT (include identity)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ token });
  } catch (err) {
    console.error("LOGIN ERROR ❌", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * CURRENT USER
 * Used by frontend auth context
 */
export const me = (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    firstName: req.user.firstName,
  });
};
