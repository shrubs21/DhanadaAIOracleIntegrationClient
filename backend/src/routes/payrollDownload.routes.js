import express from "express";
const router = express.Router();

router.get("/payslips", async (req, res) => {
  const { empId, period } = req.query;

  // Example file path
  const filePath = `downloads/payroll_${empId}_${period}.zip`;

  return res.download(filePath);
});

export default router;
