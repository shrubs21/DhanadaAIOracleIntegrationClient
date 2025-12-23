import jwt from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 * - Accepts token from Authorization header OR query param (SSE)
 * - Normalizes user object for downstream controllers
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1] || req.query.token;

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * ✅ NORMALIZE USER PAYLOAD HERE
     * This fixes the issue permanently
     */
    req.user = {
      id: decoded.id || decoded.userId,   // 👈 FIX
      email: decoded.email,
    };

    if (!req.user.id) {
      console.error("❌ JWT payload missing user id:", decoded);
      return res.status(403).json({ error: "Invalid token payload" });
    }

    next();
  } catch (error) {
    console.error("❌ JWT VERIFY ERROR:", error.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
