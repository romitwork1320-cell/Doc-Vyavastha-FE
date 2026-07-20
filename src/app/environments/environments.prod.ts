const runtimeOrigin =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : '';

export const environment = {
  production: true,
  apiUrl: '/api',
  clientUrl: runtimeOrigin,
  fileStorageUrl: '',
};
