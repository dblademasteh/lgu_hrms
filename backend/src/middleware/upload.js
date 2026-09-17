import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../lib/errors.js';

const uploadDir = path.resolve(process.cwd(), 'uploads/documents');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

const EXT_MIME_MAP = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
};

const MAGIC_BYTES = {
  'application/pdf': [{ offset: 0, bytes: Buffer.from('%PDF') }],
  'image/jpeg': [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }],
  'image/png': [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  'image/webp': [{ offset: 0, bytes: Buffer.from('RIFF') }, { offset: 8, bytes: Buffer.from('WEBP') }],
  'image/gif': [
    { offset: 0, bytes: Buffer.from('GIF87a') },
    { offset: 0, bytes: Buffer.from('GIF89a') },
  ],
  'application/msword': [{ offset: 0, bytes: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) }],
};

function sniffMime(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);
  for (const [mime, rules] of Object.entries(MAGIC_BYTES)) {
    if (rules.every((r) => buf.slice(r.offset, r.offset + r.bytes.length).equals(r.bytes))) {
      return mime;
    }
  }
  if (buf[0] === 0x50 && buf[1] === 0x4b) return 'application/zip';
  return null;
}

function extFromFilename(name) {
  const idx = name.lastIndexOf('.');
  if (idx < 0) return '';
  return name.slice(idx + 1).toLowerCase();
}

const fileFilter = (_req, file, cb) => {
  const ext = extFromFilename(file.originalname);
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error('Unsupported file type.'));
  }
  if (ext && EXT_MIME_MAP[ext] && EXT_MIME_MAP[ext] !== file.mimetype) {
    return cb(new Error('File extension does not match its content type.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter,
});

export function validateUploadedFile(req, _res, next) {
  if (!req.file) return next();
  const claimed = req.file.mimetype;
  const ext = extFromFilename(req.file.originalname);
  if (claimed === 'text/plain' || claimed === 'text/csv') {
    return next();
  }
  const sniffed = sniffMime(req.file.path);
  if (sniffed === null) {
    fs.unlink(req.file.path, () => {});
    throw new AppError('Unsupported file type.', 400, 'VALIDATION_ERROR');
  }
  if (sniffed === 'application/zip') {
    const zipExts = ['docx', 'xlsx', 'pptx'];
    if (!zipExts.includes(ext)) {
      fs.unlink(req.file.path, () => {});
      throw new AppError('File extension does not match its content type.', 400, 'VALIDATION_ERROR');
    }
    return next();
  }
  if (sniffed !== claimed) {
    fs.unlink(req.file.path, () => {});
    throw new AppError('File content does not match its declared type.', 400, 'VALIDATION_ERROR');
  }
  next();
}

export { upload, uploadDir };
