import express from "express";
import multer from "multer";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), (req, res) => {
  res.json({
    ok: true,
    filename: req.file?.originalname
  });
});

console.log("✅ UPLOAD ROUTE LOADED");

export default router;
