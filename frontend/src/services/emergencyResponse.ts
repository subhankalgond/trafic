/**
 * Emergency response service layer.
 *
 * Talks to /api/emergency-response/*. Hospital and routing data come from
 * OpenStreetMap/OSRM providers proxied by the backend; see backend/.env.example
 * for the optional Mapbox/TomTom credentials.
 */
import { apiGet, apiPost, apiPut } from './api';

export interface VerifyPlateResult {
  authorized: boolean;
  reason?: string;
  vehicle?: {
    id: number;
    vehicleNumber: string;
    vehicleType: 'ambulance' | 'patient_transport' | 'emergency_medical';
    organization: string;
    priority: 'critical' | 'high' | 'medium';
    status: string;
  };
  lastSeen?: { latitude: number; longitude: number; detectedAt: string } | null;
  activeSession?: { id: number; status: string } | null;
}

export interface Hospital {
  id: string;
  name: string;
  amenity: string;
  kind: 'hospital' | 'clinic';
  emergency: boolean;
  phone: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceM: number;
}

export interface HospitalsResult {
  hospitals: Hospital[];
  provider: string;
  searchCenter: { latitude: number; longitude: number };
  radiusM: number;
}

export interface EmergencyRoute {
  distanceM: number;
  durationS: number;
  coordinates: [number, number][];
  legs: { distanceM: number; durationS: number; summary: string }[];
  provider: string;
  traffic: 'unavailable';
  trafficNote: string;
}

export interface RouteResult {
  route: EmergencyRoute;
  nearestIntersection: { name: string; latitude: number; longitude: number; distanceM: number } | null;
}

export interface EmergencySession {
  id: number;
  vehicleId?: number;
  vehicleNumber: string;
  vehicleType?: string;
  priority?: string;
  sessionType: string;
  simulated: boolean;
  hospital?: { id: string; name: string; lat: number; lng: number } | null;
  hospitalName?: string | null;
  hospitalLat?: number | null;
  hospitalLng?: number | null;
  originLabel?: string | null;
  lastLat?: number | null;
  lastLng?: number | null;
  lastSpeedKph?: number | null;
  grantedCount?: number;
  status: string;
  startedAt: string;
}

export interface PriorityDecision {
  requestId: number;
  decision: 'granted' | 'denied';
  reason: string;
  intersection: { name: string; latitude: number; longitude: number };
  approach: string;
  distanceM: number;
  signals: { direction: string; state: string; remainingSeconds: number; mode: string }[];
  physicalActuation: boolean;
  actuationNote: string;
  yellowHold: boolean;
  minGreenSeconds: number;
  allRedClearanceSeconds: number;
}

export interface SimIntersection {
  name: string;
  latitude: number;
  longitude: number;
  signals: { direction: string; state: string; remaining: number; mode: string }[];
}

export const emergencyResponseService = {
  verifyPlate: (body: { plate: string; vehicleType: string }) =>
    apiPost<VerifyPlateResult>('/emergency-response/verify-plate', body),

  hospitals: (latitude: number, longitude: number, radius?: number) =>
    apiGet<HospitalsResult>('/emergency-response/hospitals', { latitude, longitude, ...(radius ? { radius } : {}) }),

  route: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
    apiGet<RouteResult>('/emergency-response/route', { fromLat, fromLng, toLat, toLng }),

  startSession: (body: {
    plate: string;
    vehicleType: string;
    sessionType?: 'hospital_transport' | 'scene_response';
    origin?: { lat: number; lng: number; label?: string };
    hospital?: { id: string; name: string; lat: number; lng: number };
    simulated: boolean;
  }) => apiPost<{ session: EmergencySession }>('/emergency-response/sessions', body),

  activeSessions: () =>
    apiGet<{ sessions: EmergencySession[] }>('/emergency-response/sessions/active'),

  pushGps: (sessionId: number, body: { lat: number; lng: number; speedKph?: number; accuracyM?: number }) =>
    apiPut<{ received: boolean; gpsValid: boolean }>(`/emergency-response/sessions/${sessionId}/gps`, body),

  endSession: (sessionId: number) =>
    apiPut<{ ended: boolean; releasedPriorities?: number }>(`/emergency-response/sessions/${sessionId}/end`),

  requestPriority: (sessionId: number, body: { direction: string; distanceM: number; speedKph?: number }) =>
    apiPost<PriorityDecision>(`/emergency-response/sessions/${sessionId}/request-priority`, body),

  releasePriority: (sessionId: number) =>
    apiPost<{ released: number }>(`/emergency-response/sessions/${sessionId}/release-priority`),

  intersections: () =>
    apiGet<{ intersections: SimIntersection[]; physicalActuation: boolean }>('/emergency-response/intersections'),
};
