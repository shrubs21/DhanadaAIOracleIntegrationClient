import express from "express";
import pool from "../../src/config/db.js";

const router = express.Router();

/**
 * GET ALL SUPPLIERS
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        supplier_id,
        supplier_name,
        supplier_number,
        tax_id,
        email,
        phone,
        country,
        business_unit,
        supplier_site_id,
        status,
        created_at
       FROM public.suppliers
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error("Fetch Suppliers Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers"
    });
  }
});

export default router;