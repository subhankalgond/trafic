/** Great-circle distance between two [lat, lng] points, in meters. */
export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Compass bearing (0-360, north=0) from point A to point B. */
export function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(bLng - aLng)) * Math.cos(toRad(bLat));
  const x =
    Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
    Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLng - aLng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Map a bearing to the closest of the simulator's approach directions.
 * N = 0, E = 90, S = 180, W = 270.
 */
export function bearingToDirection(bearing: number): 'N' | 'E' | 'S' | 'W' {
  const dirs = ['N', 'E', 'S', 'W'] as const;
  const idx = Math.round((((bearing % 360) + 360) % 360) / 90) % 4;
  return dirs[idx];
}

/* ------------------------------------------------------------------ */
/* Minimal fetch wrapper (Node 18+ global fetch, no DOM lib needed)    */
/* ------------------------------------------------------------------ */

interface FetchResponseLike {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }
) => Promise<FetchResponseLike>;

const globalFetch = (globalThis as unknown as { fetch?: FetchLike }).fetch;

/** Fetch JSON with a hard timeout; returns parsed body or throws a descriptive error. */
export async function fetchJson<T>(url: string, init: { headers?: Record<string, string> } = {}, timeoutMs = 8000): Promise<T> {
  if (!globalFetch) {
    throw new Error('Outbound HTTP requires Node.js 18 or newer (global fetch unavailable)');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await globalFetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'SmartFlowAI/1.0', ...init.headers },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Provider responded with HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Provider request timed out');
    }
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    clearTimeout(timer);
  }
}
