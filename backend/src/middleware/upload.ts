import { Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from '../config/env';

const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const uploadRoot = path.resolve(process.cwd(), env.upload.dir);
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadRoot);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `inc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.upload.maxFileSizeMb * 1024 * 1024, files: 1 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMime.includes(file.mimetype) || !allowedExt.has(ext)) {
      cb(new Error('Only JPG, PNG or WebP images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

export const UPLOAD_ROOT = uploadRoot;
