import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, _file, cb) => {
    cb(null, `cv-${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
}

export const uploadCV = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export function validatePDF(req: Request, res: Response, next: NextFunction) {
  if (!req.file) return next();
  const buf = Buffer.alloc(4);
  let fd: number | undefined;
  try {
    fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, buf, 0, 4, 0);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  if (buf.toString('ascii') !== '%PDF') {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'File is not a valid PDF' });
  }
  return next();
}
