// En desarrollo (ng serve en 4200) apunta al backend en 8080.
// En el modo demo el frontend se sirve desde el mismo backend, asi que usa el mismo origen.
const host =
  typeof window !== 'undefined' && window.location.port === '4200'
    ? 'http://localhost:8080'
    : typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:8080';

export const API_URL = `${host}/api`;
export const UPLOADS_URL = host;
