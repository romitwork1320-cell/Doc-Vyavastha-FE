// Dev-server proxy: forwards /api (and /health) to the backend.
// Target is env-driven so the same config works both natively
// (default http://localhost:8080) and inside Docker (API_PROXY_TARGET=http://api:8080).
const target = process.env['API_PROXY_TARGET'] || 'http://localhost:8081';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
  },
  '/health': {
    target,
    secure: false,
    changeOrigin: true,
  },
};
