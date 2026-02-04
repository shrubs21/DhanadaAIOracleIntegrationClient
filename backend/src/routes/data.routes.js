import express from "express";
import Redis from "ioredis";

const router = express.Router();

/*  Redis Connection */
const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379,
});

/*  FIX 3: GET FULL DATA FROM REDIS WITH SERVER-SIDE PAGINATION */
router.get("/data/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // ✅ Optional pagination parameters
    const page = parseInt(req.query.page) || null;
    const limit = parseInt(req.query.limit) || null;

    const raw = await redis.get(`data:${conversationId}`);

    if (!raw) {
      return res.json({
        success: false,
        message: "No dataset stored",
        data: [],
        count: 0
      });
    }

    const parsed = JSON.parse(raw);

    // ✅ FIX 3: If pagination requested, slice data server-side
    if (page && limit) {
      const start = (page - 1) * limit;
      const end = start + limit;
      
      console.log(`Pagination requested: page ${page}, limit ${limit}`);
      console.log(`  Total records: ${parsed.count}`);
      console.log(`  Returning records ${start}-${end}`);
      
      return res.json({
        success: true,
        data: parsed.data.slice(start, end),
        count: parsed.count,  // Total count
        page,
        limit,
        totalPages: Math.ceil(parsed.count / limit),
        summary: parsed.summary
      });
    }

    // ✅ No pagination - return full dataset (current behavior)
    console.log(`Full dataset requested: ${parsed.count} records`);
    
    return res.json({
      success: true,
      data: parsed.data,
      count: parsed.count,
      summary: parsed.summary
    });

  } catch (err) {
    console.error("Redis Data API Error:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch Redis dataset",
      data: [],
      count: 0
    });
  }
});

/* ✅ OPTIONAL: Health check endpoint */
router.get("/data/health", async (req, res) => {
  try {
    await redis.ping();
    res.json({ 
      success: true, 
      redis: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      redis: "disconnected",
      error: err.message
    });
  }
});

export default router;