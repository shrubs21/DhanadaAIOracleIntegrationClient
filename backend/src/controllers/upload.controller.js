import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import pdf from "pdf-parse";
import { redis } from "../queue/redis.client.js";

export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const fileId = uuidv4();

    const fileData = {
      id: fileId,
      filename: file.originalname,
      storedName: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString()
    };

    /* PDF TEXT EXTRACTION */
    if (file.mimetype === "application/pdf") {
      try {
        const buffer = fs.readFileSync(file.path);
        const pdfData = await pdf(buffer);
        fileData.pages = pdfData.numpages;
        fileData.extractedText = pdfData.text.slice(0, 5000);
      } catch {
        fileData.extractedText = "PDF text extraction failed";
      }
    }

    /* STORE IN REDIS */
    await redis.set(
      `upload:${fileId}`,
      JSON.stringify(fileData),
      "EX",
      60 * 60
    );

    /* OPTIONAL: Notify Chat Stream */
    if (req.body.conversationId) {
      await redis.rpush(
        `stream:${req.body.conversationId}`,
        JSON.stringify({
          token: `📎 File received: ${file.originalname}\n`,
          done: false
        })
      );
    }

    res.json({
      success: true,
      file: fileData
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
}
