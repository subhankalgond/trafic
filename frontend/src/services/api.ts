import axios from 'axios';
import { API_BASE } from '../config';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  error?: Record<string, string>;
}

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

// Attach JWT when present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Envelope unwrapping + error normalization
export class ApiRequestError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const message =
      status === 0
        ? 'Unable to connect to the traffic service. Check your connection and try again.'
        : data?.message ?? 'Something went wrong. Please try again.';
    return Promise.reject(new ApiRequestError(status, message, data?.error ?? {}));
  }
);

/** Typed GET returning the envelope data. */
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(url, { params });
  return res.data.data;
}

/** Typed POST returning envelope data + server message. */
export async function apiPost<T>(
  url: string,
  body?: unknown,
  opts?: { headers?: Record<string, string> }
): Promise<{ data: T; message: string }> {
  const res = await api.post<ApiEnvelope<T>>(url, body, opts?.headers ? { headers: opts.headers } : undefined);
  return { data: res.data.data, message: res.data.message };
}

/** Typed PUT returning envelope data + server message. */
export async function apiPut<T>(
  url: string,
  body?: unknown
): Promise<{ data: T; message: string }> {
  const res = await api.put<ApiEnvelope<T>>(url, body);
  return { data: res.data.data, message: res.data.message };
}

/** Typed DELETE returning server message. */
export async function apiDelete(url: string): Promise<string> {
  const res = await api.delete<ApiEnvelope<null>>(url);
  return res.data.message;
}
