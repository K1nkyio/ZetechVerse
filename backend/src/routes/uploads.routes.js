const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { authenticateToken } = require('../middleware/auth.middleware');
const { requireUserOrAdmin } = require('../middleware/role.middleware');
const { buildUploadPublicUrl, getUploadsRoot } = require('../config/uploads');

const router = express.Router();

const parseEnvInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi'
};

const MAX_UPLOAD_MB = parseEnvInt(process.env.UPLOAD_MAX_FILE_SIZE_MB, 100);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const uploadsRoot = getUploadsRoot();

const parseBase64Payload = (data) => {
  if (typeof data !== 'string' || data.trim() === '') return null;

  // Supports both plain base64 and data URLs.
  const dataUrlMatch = data.match(/^data:([a-zA-Z0-9/+.-]+);base64,([\s\S]+)$/);
  if (dataUrlMatch) {
    return {
      mimeTypeFromDataUrl: dataUrlMatch[1].toLowerCase(),
      base64: dataUrlMatch[2]
    };
  }

  return {
    mimeTypeFromDataUrl: null,
    base64: data
  };
};

router.post('/media', authenticateToken, requireUserOrAdmin, async (req, res) => {
  try {
    const { filename = '', mimeType = '', data = '' } = req.body || {};

    const parsed = parseBase64Payload(data);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        message: 'Missing upload data'
      });
    }

    const normalizedMimeType = String(parsed.mimeTypeFromDataUrl || mimeType).trim().toLowerCase();
    const extension = ALLOWED_MIME_TYPES[normalizedMimeType];

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type. Only image and video files are allowed.'
      });
    }

    const normalizedBase64 = String(parsed.base64 || '').replace(/\s/g, '');
    const padding = normalizedBase64.endsWith('==') ? 2 : normalizedBase64.endsWith('=') ? 1 : 0;
    const estimatedBytes = Math.floor((normalizedBase64.length * 3) / 4) - padding;

    if (estimatedBytes > MAX_UPLOAD_BYTES) {
      return res.status(400).json({
        success: false,
        message: `File is too large. Maximum allowed size is ${MAX_UPLOAD_MB}MB.`
      });
    }

    const buffer = Buffer.from(normalizedBase64, 'base64');
    if (!buffer.length) {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty'
      });
    }

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(400).json({
        success: false,
        message: `File is too large. Maximum allowed size is ${MAX_UPLOAD_MB}MB.`
      });
    }

    const mediaBucket = normalizedMimeType.startsWith('video/') ? 'videos' : 'images';
    const uploadsDir = path.join(uploadsRoot, mediaBucket);
    fs.mkdirSync(uploadsDir, { recursive: true });

    const safeBaseName = path
      .basename(String(filename || 'media'))
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 60)
      .replace(/\.[^.]+$/, '') || 'media';

    const uniqueSuffix = (typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const storedFileName = `${safeBaseName}-${uniqueSuffix}${extension}`;
    const storedPath = path.join(uploadsDir, storedFileName);

    await fs.promises.writeFile(storedPath, buffer);

    const publicPath = `/uploads/${mediaBucket}/${storedFileName}`;
    const publicUrl = buildUploadPublicUrl(req, publicPath);

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: publicUrl,
        media_type: mediaBucket === 'videos' ? 'video' : 'image',
        mime_type: normalizedMimeType,
        filename: storedFileName,
        size: buffer.length
      }
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
