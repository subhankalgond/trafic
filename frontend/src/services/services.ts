/**
 * Service layer.
 *
 * Every function talks to the SmartFlow AI REST API. The backend currently
 * serves simulated/demo data (see DEMO MODE in the README). To integrate a
 * real provider later (traffic API, ANPR, signal controllers, routing),
 * swap the implementation here without touching UI components.
 */
import { apiGet, apiPost, apiPut, apiDelete } from './api';

// ---------------- auth ----------------
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'operator' | 'admin';
  status: string;
  createdAt: string;
}

export const authService = {
  register: (body: { name: string; email: string; phone: string; password: string }) =>
    apiPost<{ token: string; user: AuthUser }>('/auth/register', body),
  login: (body: { email: string; password: string }) =>
    apiPost<{ token: string; user: AuthUser }>('/auth/login', body),
  me: () => apiGet<{ user: AuthUser }>('/users/me'),
  updateProfile: (body: { name: string; phone: string }) =>
    apiPut<{ user: AuthUser }>('/users/me', body),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiPut<null>('/users/change-password', body),
  forgotPassword: (email: string) => apiPost<{ resetToken?: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiPost<null>('/auth/reset-password', { token, password }),
};

// ---------------- traffic ----------------
export interface TrafficKpis {
  totalVehicles: number;
  activeIncidents: number;
  congestedRoads: number;
  emergencyVehicles: number;
  signalsMonitored: number;
  averageSpeed: number;
}

export interface RoadFeed {
  id: number;
  name: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  traffic_level: 'low' | 'moderate' | 'high' | 'severe';
  road_status: string;
  speedLimit: number;
  vehicleCount: number;
  averageSpeed: number;
  density: number;
  incidentCount: number;
}

export const trafficService = {
  overview: () => apiGet<{ kpis: TrafficKpis; dataSource: string; note: string }>('/traffic'),
  roads: () => apiGet<{ roads: RoadFeed[]; dataSource: string }>('/traffic/roads'),
  density: () => apiGet<{ density: RoadFeed[]; dataSource: string }>('/traffic/density'),
};

// ---------------- roads (admin) ----------------
export interface AdminRoad {
  id: number;
  name: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  lanes: number;
  speedLimit: number;
  trafficLevel: string;
  roadStatus: string;
}

export const roadService = {
  list: (params?: { search?: string; status?: string }) =>
    apiGet<{ roads: AdminRoad[] }>('/roads', params),
  create: (body: Omit<AdminRoad, 'id'>) => apiPost<{ road: AdminRoad }>('/roads', body),
  update: (id: number, body: Omit<AdminRoad, 'id'>) => apiPut<{ road: AdminRoad }>(`/roads/${id}`, body),
  remove: (id: number) => apiDelete(`/roads/${id}`),
};

// ---------------- vehicles ----------------
export interface EmergencyVehicle {
  id: number;
  vehicleNumber: string;
  vehicleType: 'ambulance' | 'patient_transport' | 'emergency_medical';
  organization: string;
  priority: 'critical' | 'high' | 'medium';
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface DetectionFeed {
  id: number;
  cameraId: string;
  vehicleNumber: string | null;
  vehicleType: string | null;
  confidence: number;
  direction: string | null;
  distance: number | null;
  detectedAt: string;
  verified: boolean;
}

export const vehicleService = {
  list: (params?: { search?: string; type?: string }) =>
    apiGet<{ vehicles: EmergencyVehicle[] }>('/vehicles', params),
  create: (body: Omit<EmergencyVehicle, 'id' | 'createdAt'>) =>
    apiPost<{ vehicle: EmergencyVehicle }>('/vehicles', body),
  update: (id: number, body: Omit<EmergencyVehicle, 'id' | 'createdAt'>) =>
    apiPut<{ vehicle: EmergencyVehicle }>(`/vehicles/${id}`, body),
  remove: (id: number) => apiDelete(`/vehicles/${id}`),
  detections: () => apiGet<{ detections: DetectionFeed[]; dataSource: string; note: string }>('/detections'),
};

// ---------------- incidents ----------------
export interface Incident {
  id: number;
  incidentId: string;
  type: string;
  severity: string;
  description: string;
  latitude: number;
  longitude: number;
  locationName: string;
  imageUrl: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporterName?: string | null;
}

export const incidentService = {
  list: (params?: { type?: string; status?: string; severity?: string }) =>
    apiGet<{ incidents: Incident[] }>('/incidents', params),
  get: (idOrCode: string | number) => apiGet<{ incident: Incident }>(`/incidents/${idOrCode}`),
  create: (body: Record<string, unknown>, imageFile?: File | null) => {
    const form = new FormData();
    Object.entries(body).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v));
    });
    if (imageFile) form.append('image', imageFile);
    return apiPost<{ incident: { id: number; incidentId: string } }>('/incidents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateStatus: (id: number, body: { status: string; note?: string }) =>
    apiPut<{ incident: Incident }>(`/incidents/${id}`, body),
  remove: (id: number) => apiDelete(`/incidents/${id}`),
  myReports: () => apiGet<{ reports: Incident[] }>('/my-reports'),
};

// ---------------- signals ----------------
export interface SignalRow {
  id: number;
  intersection: string;
  direction: 'N' | 'S' | 'E' | 'W';
  state: 'red' | 'yellow' | 'green';
  remainingSeconds: number;
  mode: string;
}

export const signalService = {
  list: () => apiGet<{ signals: SignalRow[] }>('/signals'),
  manual: (body: { direction: string; state: string; seconds?: number }) =>
    apiPut<{ direction: string; state: string }>(`/signals/${body.direction}`, body),
  setMode: (mode: string) => apiPut<{ mode: string }>('/signals-mode', { mode }),
};

// ---------------- emergency ----------------
export interface EmergencyEvent {
  id: number;
  intersection: string;
  priority: string;
  distance: number;
  direction: string;
  status: string;
  createdAt: string;
  clearedAt: string | null;
  vehicleNumber: string | null;
  vehicleType: string | null;
  organization: string | null;
}

export const emergencyService = {
  events: () => apiGet<{ events: EmergencyEvent[]; dataSource: string }>('/emergency'),
  simulate: (body: { plate: string; direction: string; distance: number; scenario: 'single' | 'two_ambulance' }) =>
    apiPost<{
      selected: { vehicleNumber: string; priority: string; distance: number; direction: string; reason: string };
      queued: { vehicleNumber: string; distance: number; priority: string } | null;
      signal: { direction: string; state: string; mode: string };
    }>('/emergency/simulate', body),
  reset: () => apiPost<{ restored: boolean }>('/emergency/reset'),
  analytics: () =>
    apiGet<{
      totals: { detected: number; active: number; avgClearanceMinutes: number };
      perDay: { day: string; count: number }[];
    }>('/analytics/emergency'),
};

// ---------------- notifications + saved routes ----------------
export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface SavedRoute {
  id: number;
  name: string;
  startLocation: string;
  destination: string;
  createdAt: string;
}

export const userService = {
  notifications: () =>
    apiGet<{ notifications: NotificationItem[]; unread: number }>('/notifications'),
  markRead: (id: number) => apiPut<null>(`/notifications/${id}/read`),
  markAllRead: () => apiPut<null>('/notifications/read-all'),
  deleteNotification: (id: number) => apiDelete(`/notifications/${id}`),
  savedRoutes: () => apiGet<{ routes: SavedRoute[] }>('/saved-routes'),
  saveRoute: (body: { name: string; startLocation: string; destination: string }) =>
    apiPost<{ route: SavedRoute }>('/saved-routes', body),
  deleteRoute: (id: number) => apiDelete(`/saved-routes/${id}`),
};

// ---------------- admin ----------------
export interface AdminDashboard {
  kpis: {
    totalUsers: number;
    openIncidents: number;
    activeEmergencyVehicles: number;
    monitoredRoads: number;
    signalsOnline: number;
    activeEmergencyEvents: number;
    congestedRoads: number;
  };
  volumeTrend: { day: string; count: number }[];
  incidentsByType: { type: string; count: number }[];
  incidentsBySeverity: { severity: string; count: number }[];
  clearanceTrend: { day: string; minutes: number }[];
}

export interface SystemLog {
  id: number;
  eventType: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  createdAt: string;
}

export const adminService = {
  dashboard: () => apiGet<AdminDashboard>('/admin/dashboard'),
  analytics: (range: string) =>
    apiGet<{
      range: number;
      volume: { day: string; value: number }[];
      density: { day: string; value: number }[];
      speed: { day: string; value: number }[];
      incidentsByDay: { day: string; value: number }[];
      emergencyByDay: { day: string; value: number }[];
      emergencyByType: { type: string; count: number }[];
    }>('/admin/analytics', { range }),
  users: (params?: { search?: string; page?: number }) =>
    apiGet<{
      users: {
        id: number;
        name: string;
        email: string;
        phone: string;
        role: string;
        status: string;
        createdAt: string;
      }[];
      pagination: { page: number; pageSize: number; total: number };
    }>('/admin/users', params),
  setUserStatus: (id: number, status: 'active' | 'suspended') =>
    apiPut<null>(`/admin/users/${id}/status`, { status }),
  setUserRole: (id: number, role: 'user' | 'operator' | 'admin') =>
    apiPut<null>(`/admin/users/${id}/role`, { role }),
  logs: (params?: { limit?: number; severity?: string }) =>
    apiGet<{ logs: SystemLog[] }>('/logs', params),
  settings: () =>
    apiGet<{
      settings: {
        database: string;
        dataSource: string;
        roads: number;
        registeredVehicles: number;
        signals: number;
        users: number;
      };
    }>('/admin/settings'),
};

// ---------------- routing (demo) ----------------
export interface DemoRoute {
  label: string;
  distanceKm: number;
  minutes: number;
  traffic: 'low' | 'moderate' | 'high' | 'severe';
  path: [number, number][];
}

/**
 * Demo route planner. Generates deterministic simulated routes between two
 * map points. Swap this with OSRM/Mapbox/Google in the future; the UI only
 * consumes DemoRoute objects.
 */
export function demoRoute(start: [number, number], end: [number, number]): DemoRoute[] {
  const dist = (a: [number, number], b: [number, number]) => {
    const R = 6371;
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLon = ((b[1] - a[1]) * Math.PI) / 180;
    const la1 = (a[0] * Math.PI) / 180;
    const la2 = (b[0] * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const base = dist(start, end);
  const build = (label: string, factor: number, traffic: DemoRoute['traffic'], waypoints: [number, number][]): DemoRoute => {
    const distanceKm = Number((base * factor).toFixed(1));
    const speed = traffic === 'low' ? 42 : traffic === 'moderate' ? 30 : traffic === 'high' ? 21 : 15;
    return {
      label,
      distanceKm,
      minutes: Math.max(2, Math.round((distanceKm / speed) * 60)),
      traffic,
      path: waypoints,
    };
  };
  const mid1: [number, number] = [
    start[0] + (end[0] - start[0]) * 0.5,
    start[1] + (end[1] - start[1]) * 0.5 + 0.01,
  ];
  const mid2: [number, number] = [
    start[0] + (end[0] - start[0]) * 0.5 - 0.012,
    start[1] + (end[1] - start[1]) * 0.5,
  ];
  return [
    build('Route A (fastest)', 1.08, 'moderate', [start, mid1, end]),
    build('Route B (alternate)', 1.22, 'low', [start, mid2, end]),
    build('Route C (highway)', 1.0, 'high', [start, end]),
  ];
}
