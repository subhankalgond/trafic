import { z } from 'zod';

// ---------- shared primitives ----------
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number (10 to 15 digits)');

// ---------- auth ----------
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  phone,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, 'Invalid or expired reset token'),
    password,
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  phone,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  });

// ---------- enums ----------
export const vehicleType = z.enum(['ambulance', 'patient_transport', 'emergency_medical']);
export const vehiclePriority = z.enum(['critical', 'high', 'medium']);
export const trafficLevel = z.enum(['low', 'moderate', 'high', 'severe']);
export const roadStatus = z.enum(['open', 'busy', 'congested', 'blocked', 'construction']);
export const incidentType = z.enum([
  'accident',
  'road_block',
  'construction',
  'breakdown',
  'waterlogging',
  'signal_failure',
  'congestion',
]);
export const severity = z.enum(['low', 'medium', 'high', 'critical']);
export const incidentStatus = z.enum(['reported', 'under_review', 'verified', 'active', 'resolved']);
export const signalState = z.enum(['red', 'yellow', 'green']);
export const signalDirection = z.enum(['N', 'S', 'E', 'W']);
export const simMode = z.enum(['normal', 'traffic_management', 'emergency', 'manual']);
export const userRole = z.enum(['user', 'operator', 'admin']);
export const userStatus = z.enum(['active', 'suspended']);

// ---------- vehicles ----------
export const vehicleSchema = z.object({
  vehicleNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}\s?[0-9]{1,2}\s?[A-Z]{1,3}\s?[0-9]{3,4}$/, 'Enter a valid plate like KA 05 MT 7321'),
  vehicleType,
  organization: z.string().trim().min(2, 'Organization is required').max(120),
  priority: vehiclePriority,
  status: z.enum(['active', 'inactive']).default('active'),
});

// ---------- roads ----------
export const roadSchema = z.object({
  name: z.string().trim().min(3, 'Road name must be at least 3 characters').max(150),
  area: z.string().trim().min(2, 'Area is required').max(100),
  city: z.string().trim().min(2, 'City is required').max(100),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  lanes: z.coerce.number().int().min(1).max(12).default(2),
  speedLimit: z.coerce.number().int().min(10).max(120).default(50),
  trafficLevel,
  roadStatus,
});

// ---------- incidents ----------
export const createIncidentSchema = z.object({
  type: incidentType,
  severity,
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  locationName: z.string().trim().min(3, 'Location is required').max(200),
});

export const updateIncidentStatusSchema = z.object({
  status: incidentStatus,
  note: z.string().trim().max(1000).optional(),
});

// ---------- signals ----------
export const manualSignalSchema = z.object({
  direction: signalDirection,
  state: signalState,
  seconds: z.coerce.number().int().min(5).max(120).optional(),
});

// ---------- simulation ----------
export const emergencySimulateSchema = z.object({
  plate: z.string().trim().toUpperCase().min(4).max(20),
  direction: signalDirection,
  distance: z.coerce.number().int().min(20).max(2000).default(120),
  scenario: z.enum(['single', 'two_ambulance']).default('single'),
});

// ---------- users (admin) ----------
export const adminUserStatusSchema = z.object({ status: userStatus });
export const adminUserRoleSchema = z.object({ role: userRole });

// ---------- misc ----------
export const savedRouteSchema = z.object({
  name: z.string().trim().min(1, 'Route name is required').max(100),
  startLocation: z.string().trim().min(1, 'Start location is required').max(200),
  destination: z.string().trim().min(1, 'Destination is required').max(200),
});

/** Collect zod issues into a field map for frontend form errors. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export { z };
