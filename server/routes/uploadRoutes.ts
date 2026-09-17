import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * POST /api/upload/image
 * Accepts { image: "data:image/...;base64,...", filename?: string }
 * Decodes and writes to /uploads folder, returns public URL /uploads/<file>
 */
router.post('/image', async (req, res) => {
  try {
    const { image, filename } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data (base64 or URL) is required.' });
    }

    // If it's already an external HTTP/HTTPS URL, return it directly
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return res.json({ url: image });
    }

    // Check if it's a data URI
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // If it's pure base64 without prefix or already a valid URL
      if (image.startsWith('/uploads/')) {
        return res.json({ url: image });
      }
      // Return as is
      return res.json({ url: image });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine extension
    let ext = '.jpg';
    if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('svg')) ext = '.svg';

    const safePrefix = 'doctor_avatar';
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const outputFileName = `${safePrefix}_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadsDir, outputFileName);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${outputFileName}`;
    return res.json({ url: publicUrl, success: true });
  } catch (err: any) {
    console.error('Failed to process image upload:', err);
    // If saving to disk failed, fallback to returning the image data URI so UI never breaks
    if (req.body?.image) {
      return res.json({ url: req.body.image, fallback: true });
    }
    return res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});

export default router;
