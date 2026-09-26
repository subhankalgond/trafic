export const VEHICLE_TYPES = ['ambulance', 'patient_transport', 'emergency_medical'] as const;
export const VEHICLE_PRIORITIES = ['critical', 'high', 'medium'] as const;
export const TRAFFIC_LEVELS = ['low', 'moderate', 'high', 'severe'] as const;
export const ROAD_STATUSES = ['open', 'busy', 'congested', 'blocked', 'construction'] as const;
export const INCIDENT_TYPES = [
  'accident',
  'road_block',
  'construction',
  'breakdown',
  'waterlogging',
  'signal_failure',
  'congestion',
] as const;
export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export const INCIDENT_STATUSES = ['reported', 'under_review', 'verified', 'active', 'resolved'] as const;
export const SIM_MODES = ['normal', 'traffic_management', 'emergency', 'manual'] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];
export type VehiclePriority = (typeof VEHICLE_PRIORITIES)[number];
export type TrafficLevel = (typeof TRAFFIC_LEVELS)[number];
export type RoadStatus = (typeof ROAD_STATUSES)[number];
export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type SimMode = (typeof SIM_MODES)[number];

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  ambulance: 'Ambulance',
  patient_transport: 'Patient Transport',
  emergency_medical: 'Emergency Medical Vehicle',
};

export const PRIORITY_LABELS: Record<VehiclePriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
};

export const TRAFFIC_LEVEL_LABELS: Record<TrafficLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  severe: 'Severe',
};

export const ROAD_STATUS_LABELS: Record<RoadStatus, string> = {
  open: 'Open',
  busy: 'Busy',
  congested: 'Congested',
  blocked: 'Blocked',
  construction: 'Under Construction',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  accident: 'Accident',
  road_block: 'Road Block',
  construction: 'Construction',
  breakdown: 'Vehicle Breakdown',
  waterlogging: 'Waterlogging',
  signal_failure: 'Signal Failure',
  congestion: 'Heavy Congestion',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  under_review: 'Under Review',
  verified: 'Verified',
  active: 'Active',
  resolved: 'Resolved',
};
