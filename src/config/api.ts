import { Capacitor } from '@capacitor/core';

/**
 * Production and Development API URL resolution.
 * Takes domain from import.meta.env.VITE_API_URL if provided.
 * On native Android / iOS devices, default to the production server https://dakatarseial.bd
 * On standard web browsers, default to empty string "" to use relative paths seamlessly.
 */
const envApiUrl = String((import.meta as any).env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_BASE_URL = envApiUrl || (Capacitor.isNativePlatform() ? 'https://dakatarseial.bd' : '');

/**
 * Public Web Application URL resolution.
 * Takes domain from import.meta.env.VITE_APP_URL if provided.
 * Used for generating shareable doctor profile links, social shares, and deep links.
 * On native Android: defaults to https://dakatarseial.bd
 * On web: defaults to current window.location.origin
 */
const envAppUrl = String((import.meta as any).env?.VITE_APP_URL || '').trim().replace(/\/+$/, '');
export const APP_BASE_URL =
  envAppUrl ||
  (Capacitor.isNativePlatform()
    ? 'https://dakatarseial.bd'
    : (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://dakatarseial.bd'));

export const AUTH_TOKEN_KEY = 'daktar_token';
export const AUTH_USER_KEY = 'daktar_user';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

/**
 * Resolves full API URL given a relative or absolute path.
 */
export function getApiUrl(path: string = ''): string {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Resolves full Public Web App URL given a relative or absolute path.
 * Example: getAppUrl('/doctor/dr-test') => 'https://dakatarseial.bd/doctor/dr-test'
 */
export function getAppUrl(path: string = ''): string {
  if (!path) return APP_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE_URL}${cleanPath}`;
}

/**
 * Generates canonical Doctor Profile URL for sharing, deep-linking and browser navigation.
 * Uses centralized VITE_APP_URL configuration.
 * Example: getDoctorProfileUrl('dr-test') => 'https://dakatarseial.bd/doctor/dr-test'
 */
export function getDoctorProfileUrl(slugOrId: string | number): string {
  const clean = String(slugOrId || '').trim();
  return `${APP_BASE_URL}/doctor/${clean}`;
}

/**
 * Global fetch interceptor:
 * - Automatically prepends API_BASE_URL on native platforms (or when VITE_API_URL is set)
 * - Automatically attaches Authorization: Bearer <token> from localStorage
 * - Ensures credentials: 'include' for web cookies
 */
export function setupApiInterceptor(): void {
  if (typeof window === 'undefined') return;
  if ((window as any).__daktar_api_interceptor_set) return;
  (window as any).__daktar_api_interceptor_set = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      let url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request)?.url || '');

      // Prepend API_BASE_URL if configured and request targets /api or /uploads
      if (API_BASE_URL && (url.startsWith('/api') || url.startsWith('/uploads'))) {
        url = `${API_BASE_URL}${url}`;
      }

      // If input was a Request object and we did not prepend a base URL, delegate directly
      if (typeof input !== 'string' && !(input instanceof URL) && !API_BASE_URL) {
        return originalFetch(input, init);
      }

      const modifiedInit: RequestInit = { ...(init || {}) };
      const headers = new Headers(modifiedInit.headers || (typeof input !== 'string' && !(input instanceof URL) ? (input as Request)?.headers : {}));

      // Attach Bearer token if available and not explicitly provided
      const token = getAuthToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // Always include credentials (cookies)
      if (!modifiedInit.credentials) {
        modifiedInit.credentials = 'include';
      }

      modifiedInit.headers = headers;

      // Lightweight diagnostics: makes the Android auth/data-fetch flow
      // observable via Chrome inspect / `adb logcat` (Capacitor/Console).
      const method = String(
        modifiedInit.method ||
          (typeof input !== 'string' && !(input instanceof URL) ? (input as Request)?.method : '') ||
          'GET',
      ).toUpperCase();
      const isApiCall = url.includes('/api/');
      if (isApiCall) {
        console.info(`[Daktar API] -> ${method} ${url}${token ? ' (auth)' : ' (no-token)'}`);
      }

      try {
        const response = await originalFetch(url, modifiedInit);
        if (isApiCall) {
          console.info(`[Daktar API] <- ${method} ${url} ${response.status}`);
        }
        return response;
      } catch (error) {
        if (isApiCall) {
          console.error(
            `[Daktar API] !! ${method} ${url}`,
            error instanceof Error ? error.message : String(error),
          );
        }
        throw error;
      }
    } catch {
      return originalFetch(input, init);
    }
  };
}
