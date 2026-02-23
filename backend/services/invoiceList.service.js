import pool from "../src/config/db.js";


export async function listInvoicesService(userId) {

  if (!userId) {
    return { status: "ERROR", message: "userId required" };
  }

  try {

    const result = await pool.query(
      `SELECT id,
              invoice_number,
              invoice_date,
              amount,
              currency,
              business_unit_id,
              business_unit_name,
              supplier_id,
              supplier_name,
              site_id,
              site_name,
              payment_policy,
              description,
              status,
              created_at
       FROM public.invoices
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return {
      status: "SUCCESS",
      invoices: result.rows
    };

  } catch (error) {

    return {
      status: "ERROR",
      message: error.message
    };

  }
}
