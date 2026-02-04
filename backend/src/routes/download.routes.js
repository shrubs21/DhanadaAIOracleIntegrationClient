import express from 'express';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Serve download files
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'public', 'downloads', filename);

    // Check if file exists
    await fs.access(filePath);

    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Download failed' });
      }
    });

  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

export default router;