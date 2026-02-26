const path = require('path');

const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '');

const getUploadsRoot = () => {
  const configuredDir = String(process.env.UPLOADS_DIR || '').trim();
  if (!configuredDir) {
    return path.resolve(__dirname, '..', '..', 'uploads');
  }

  return path.isAbsolute(configuredDir)
    ? configuredDir
    : path.resolve(process.cwd(), configuredDir);
};

const getRequestOrigin = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();

  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');

  return `${protocol}://${host}`;
};

const getUploadPublicBaseUrl = (req) => {
  const configuredBaseUrl = trimTrailingSlash(process.env.UPLOAD_PUBLIC_BASE_URL || '');
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }
  return trimTrailingSlash(getRequestOrigin(req));
};

const buildUploadPublicUrl = (req, publicPath) => {
  const normalizedPath = String(publicPath || '').startsWith('/')
    ? publicPath
    : `/${publicPath}`;
  return `${getUploadPublicBaseUrl(req)}${normalizedPath}`;
};

module.exports = {
  buildUploadPublicUrl,
  getUploadsRoot
};
