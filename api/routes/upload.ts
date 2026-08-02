import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export function createUploadRouter(authenticate: any) {
  const router = Router();
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Base64 or Binary direct upload route with validation
  router.post('/file', authenticate, async (req: Request | any, res: Response) => {
    try {
      const { filename, mimeType, dataBase64 } = req.body;

      if (!dataBase64 || !filename) {
        return res.status(400).json({ error: "Missing file data or filename" });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf'];
      if (mimeType && !allowedMimes.includes(mimeType)) {
        return res.status(400).json({ error: "Disallowed file type" });
      }

      const buffer = Buffer.from(dataBase64, 'base64');
      const maxSizeBytes = 20 * 1024 * 1024; // 20 MB max file size
      if (buffer.length > maxSizeBytes) {
        return res.status(400).json({ error: "File exceeds maximum permitted upload limit of 20MB" });
      }

      const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9_.-]/g, '')}`;
      const filePath = path.join(uploadDir, safeFilename);
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${safeFilename}`;
      return res.json({ success: true, url: fileUrl, filename: safeFilename });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
