import path from "path";
import fs from "fs";

export async function downloadPayrollPDF(req, res) {
  const { empId, period } = req.query;

  if (!empId || !period) {
    return res.status(400).json({
      error: "empId and period are required"
    });
  }

  // TEMP demo PDF (replace later with Oracle-generated PDF)
  const pdfPath = path.resolve("uploads/sample-payroll.pdf");

  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({
      error: "Payroll PDF not found"
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Payroll_${empId}_${period}.pdf`
  );

  return res.sendFile(pdfPath);
}
