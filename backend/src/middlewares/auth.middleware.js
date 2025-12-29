import jwt from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1] || req.query.token;

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Normalize payload
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email
    };

    if (!req.user.id) {
      return res.status(403).json({ error: "Invalid token payload" });
    }

    next();
  } catch (error) {
    console.error("❌ JWT VERIFY ERROR:", error.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}