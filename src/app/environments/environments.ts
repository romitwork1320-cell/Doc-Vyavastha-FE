// Relative URLs so the API is always reached on the SAME origin that served
// the app (whatever host the browser used — localhost, a tunnel, or a LAN IP).
// The dev server proxies "/api" -> the backend (see proxy.conf.json); nginx
// does the same in production. No hardcoded host, no CORS, same-origin cookies.
const runtimeOrigin =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:4200';

export const environment = {
  production: false,
  apiUrl: '/api',
  clientUrl: runtimeOrigin,
  fileStorageUrl: '',
};
