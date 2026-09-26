import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/error';
import { authenticate, optionalAuth, requireOperator, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as auth from '../controllers/authController';
import * as traffic from '../controllers/trafficController';
import * as roads from '../controllers/roadController';
import * as vehicles from '../controllers/vehicleController';
import * as incidents from '../controllers/incidentController';
import * as signals from '../controllers/signalController';
import * as emergency from '../controllers/emergencyController';
import * as notifications from '../controllers/notificationController';
import * as admin from '../controllers/adminController';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

// ---------- health ----------
router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// ---------- auth ----------
router.post('/auth/register', authLimiter, asyncHandler(auth.register));
router.post('/auth/login', authLimiter, asyncHandler(auth.login));
router.post('/auth/forgot-password', authLimiter, asyncHandler(auth.forgotPassword));
router.post('/auth/reset-password', authLimiter, asyncHandler(auth.resetPassword));
router.get('/users/me', authenticate, asyncHandler(auth.getMe));
router.put('/users/me', authenticate, asyncHandler(auth.updateMe));
router.put('/users/change-password', authenticate, asyncHandler(auth.changePassword));

// ---------- traffic (public) ----------
router.get('/traffic', apiLimiter, asyncHandler(traffic.trafficOverview));
router.get('/traffic/roads', apiLimiter, asyncHandler(traffic.trafficRoads));
router.get('/traffic/intersections', apiLimiter, asyncHandler(traffic.trafficIntersections));
router.get('/traffic/density', apiLimiter, asyncHandler(traffic.trafficDensity));

// ---------- roads ----------
router.get('/roads', apiLimiter, asyncHandler(roads.listRoads));
router.get('/roads/:id', apiLimiter, asyncHandler(roads.getRoad));
router.post('/roads', authenticate, requireAdmin, asyncHandler(roads.createRoad));
router.put('/roads/:id', authenticate, requireAdmin, asyncHandler(roads.updateRoad));
router.delete('/roads/:id', authenticate, requireAdmin, asyncHandler(roads.deleteRoad));

// ---------- vehicles ----------
router.get('/vehicles', authenticate, requireOperator, asyncHandler(vehicles.listVehicles));
router.get('/vehicles/:id', authenticate, requireOperator, asyncHandler(vehicles.getVehicle));
router.post('/vehicles', authenticate, requireAdmin, asyncHandler(vehicles.createVehicle));
router.put('/vehicles/:id', authenticate, requireAdmin, asyncHandler(vehicles.updateVehicle));
router.delete('/vehicles/:id', authenticate, requireAdmin, asyncHandler(vehicles.deleteVehicle));
router.get('/detections', apiLimiter, asyncHandler(vehicles.listDetections));

// ---------- incidents ----------
router.get('/incidents', optionalAuth, apiLimiter, asyncHandler(incidents.listIncidents));
router.get('/incidents/:id', optionalAuth, asyncHandler(incidents.getIncident));
router.post('/incidents', authenticate, upload.single('image'), asyncHandler(incidents.createIncident));
router.put('/incidents/:id', authenticate, requireOperator, asyncHandler(incidents.updateIncidentStatus));
router.delete('/incidents/:id', authenticate, requireAdmin, asyncHandler(incidents.deleteIncident));
router.get('/my-reports', authenticate, asyncHandler(incidents.myReports));

// ---------- signals ----------
router.get('/signals', apiLimiter, asyncHandler(signals.listSignals));
router.put('/signals/:direction', authenticate, requireOperator, asyncHandler(signals.manualControl));
router.put('/signals-mode', authenticate, requireOperator, asyncHandler(signals.setMode));

// ---------- emergency ----------
router.get('/emergency', apiLimiter, asyncHandler(emergency.listEmergencyEvents));
router.post('/emergency/simulate', authenticate, requireOperator, asyncHandler(emergency.simulateEmergency));
router.post('/emergency/reset', authenticate, requireOperator, asyncHandler(emergency.resetEmergency));
router.get('/analytics/emergency', apiLimiter, asyncHandler(emergency.emergencyAnalytics));

// ---------- notifications + saved routes ----------
router.get('/notifications', authenticate, asyncHandler(notifications.myNotifications));
router.put('/notifications/read-all', authenticate, asyncHandler(notifications.markAllRead));
router.put('/notifications/:id/read', authenticate, asyncHandler(notifications.markRead));
router.delete('/notifications/:id', authenticate, asyncHandler(notifications.deleteNotification));
router.get('/saved-routes', authenticate, asyncHandler(notifications.listSavedRoutes));
router.post('/saved-routes', authenticate, asyncHandler(notifications.createSavedRoute));
router.delete('/saved-routes/:id', authenticate, asyncHandler(notifications.deleteSavedRoute));

// ---------- admin + logs ----------
router.get('/admin/dashboard', authenticate, requireOperator, asyncHandler(admin.dashboard));
router.get('/admin/analytics', authenticate, requireOperator, asyncHandler(admin.analytics));
router.get('/admin/users', authenticate, requireAdmin, asyncHandler(admin.listUsers));
router.put('/admin/users/:id/status', authenticate, requireAdmin, asyncHandler(admin.setUserStatus));
router.put('/admin/users/:id/role', authenticate, requireAdmin, asyncHandler(admin.setUserRole));
router.get('/admin/settings', authenticate, requireOperator, asyncHandler(admin.settings));
router.get('/logs', authenticate, requireOperator, asyncHandler(admin.listLogs));

export default router;
