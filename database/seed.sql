-- ============================================================
-- SmartFlow AI demo seed data
-- All traffic levels, speeds, detections and events below are
-- SAMPLE DATA for the simulation demo. They are not real-time
-- or real-world measurements.
-- ============================================================

INSERT INTO users (name, email, phone, password_hash, role) VALUES
('Aarav Shetty',  'demo@smartflow.test',   '+919876500001', '$2a$10$gRrOCRuUXGBdTDap0ayA7eyYHGyr4pljQwdC9A0ilgfDBuZ1T44AK', 'user'),
('Ananya Pai',    'ananya@smartflow.test', '+919876500002', '$2a$10$gRrOCRuUXGBdTDap0ayA7eyYHGyr4pljQwdC9A0ilgfDBuZ1T44AK', 'user'),
('Operator One',  'operator@smartflow.test','+919876500003','$2a$10$gRrOCRuUXGBdTDap0ayA7eyYHGyr4pljQwdC9A0ilgfDBuZ1T44AK', 'operator'),
('Admin User',    'admin@smartflow.test',  '+919876500004', '$2a$10$pDk2XO9/oqZ7zHRG7/dfhOGRCGJOJpC86nN12dhTxBtk9YSrsMoUO', 'admin');

INSERT INTO vehicles (vehicle_number, vehicle_type, organization, priority, status) VALUES
('KA 05 MT 7321', 'ambulance',              'Coastal Emergency Services', 'critical', 'active'),
('KA 19 EM 4410', 'patient_transport',      'CityCare Hospitals',         'high',     'active'),
('KA 31 MV 1188', 'emergency_medical',      'State Medical Response',     'high',     'active'),
('KA 02 AV 9055', 'ambulance',              'Udupi District Ambulance',   'critical', 'active'),
('KA 09 PT 2277', 'patient_transport',      'Manipal Health Services',    'medium',   'active'),
('KA 40 EM 6633', 'emergency_medical',      'Mangaluru City EMS',         'medium',   'inactive');

INSERT INTO roads (name, area, city, latitude, longitude, lanes, speed_limit, traffic_level, road_status) VALUES
('NH 66 Bhatkal Bypass',      'Bhatkal',     'Uttara Kannada', 13.9824, 74.5560, 4, 80, 'severe',  'congested'),
('Bhatkal Main Road',         'Bhatkal',     'Uttara Kannada', 13.9872, 74.5551, 2, 40, 'moderate','busy'),
('Murudeshwar Temple Road',   'Murudeshwar', 'Uttara Kannada', 14.0938, 74.4879, 2, 50, 'low',     'open'),
('Honnavar NH 66 Section',    'Honnavar',    'Uttara Kannada', 14.2797, 74.4451, 4, 80, 'high',    'busy'),
('Kumta Market Road',         'Kumta',       'Uttara Kannada', 14.4275, 74.4129, 2, 40, 'moderate','busy'),
('Ankola Ghat Section',       'Ankola',      'Uttara Kannada', 14.5501, 74.3024, 2, 60, 'low',     'open'),
('Karwar Beach Road',         'Karwar',      'Uttara Kannada', 14.8139, 74.1295, 2, 50, 'low',     'open'),
('Kundapura NH 66 Stretch',   'Kundapura',   'Udupi',          13.6276, 74.6872, 4, 80, 'moderate','busy'),
('Udupi Kalsanka Road',       'Udupi',       'Udupi',          13.3408, 74.7421, 4, 50, 'high',    'congested'),
('Manipal University Road',   'Manipal',     'Udupi',          13.3524, 74.7849, 2, 40, 'moderate','busy'),
('Mangaluru Pumpwell Circle', 'Pumpwell',    'Dakshina Kannada', 12.8752, 74.8376, 6, 50, 'severe','congested'),
('Mangaluru KPT Junction',    'Kadri',       'Dakshina Kannada', 12.9601, 74.8203, 6, 50, 'high', 'busy');

INSERT INTO traffic_records (road_id, vehicle_count, average_speed, density, recorded_at)
SELECT r.id,
       40 + ((r.id * 37 + d.slot * 53) % 260),
       14 + ((r.id * 11 + d.slot * 7) % 36),
       30 + ((r.id * 13 + d.slot * 17) % 65),
       NOW() - (d.slot * INTERVAL '2 hours')
FROM roads r
CROSS JOIN (
  SELECT 0 AS slot UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL
  SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) d;

INSERT INTO incidents (incident_id, user_id, type, severity, description, latitude, longitude, location_name, status, admin_note, created_at, resolved_at) VALUES
('INC-2026-001201', 1, 'accident',     'high',   'Two vehicles collided near the bypass junction. One lane blocked, police on site.',        13.9831, 74.5568, 'NH 66 Bhatkal Bypass junction', 'verified', 'Confirmed by local traffic police.',           NOW() - interval '50 minutes', NULL),
('INC-2026-001202', 2, 'congestion',   'severe', 'Queue stretching almost two kilometres. Average speed below 20 km/h.',                     13.9812, 74.5549, 'NH 66 Bhatkal Bypass',          'active',   NULL,                                          NOW() - interval '3 hours', NULL),
('INC-2026-001203', 2, 'waterlogging', 'medium', 'Water accumulated on the left lane after continuous rain.',                                13.9869, 74.5548, 'Bhatkal Main Road',             'verified', 'Municipality informed.',                      NOW() - interval '6 hours', NULL),
('INC-2026-001204', 1, 'road_block',   'medium', 'Festival procession blocking the temple approach road.',                                   14.0941, 74.4882, 'Murudeshwar Temple Road',       'resolved', 'Procession ended and road cleared.',          NOW() - interval '1 day', NOW() - interval '20 hours'),
('INC-2026-001205', 3, 'construction', 'medium', 'Bridge repair work between Honnavar and Kumta. Expect delays.',                            14.2805, 74.4469, 'Honnavar NH 66 Section',        'active',   'Scheduled work, legitimate.',                 NOW() - interval '2 days', NULL),
('INC-2026-001206', 2, 'breakdown',    'low',    'Truck parked on the shoulder with engine trouble. Minor slowdown.',                        14.2778, 74.4437, 'Honnavar NH 66 Section',        'resolved', 'Vehicle towed within an hour.',               NOW() - interval '3 days', NOW() - interval '2 days'),
('INC-2026-001207', 3, 'signal_failure', 'high', 'Traffic signal dark at the market junction. Manual control by volunteers.',                14.4281, 74.4135, 'Kumta Market Road',             'under_review', NULL,                                    NOW() - interval '35 minutes', NULL),
('INC-2026-001208', 1, 'congestion',   'medium', 'Slow movement on the ghat section during morning hours.',                                  14.5510, 74.3031, 'Ankola Ghat Section',           'reported', NULL,                                          NOW() - interval '1 day', NULL),
('INC-2026-001209', 2, 'breakdown',    'low',    'Auto rickshaw stopped in the left lane near the university gate.',                         13.3529, 74.7854, 'Manipal University Road',       'reported', NULL,                                          NOW() - interval '20 minutes', NULL),
('INC-2026-001210', 3, 'accident',     'critical','Bus and lorry collision at Pumpwell Circle. Both lanes blocked.',                         12.8758, 74.8381, 'Mangaluru Pumpwell Circle',     'active',   'Serious incident, police case registered.',   NOW() - interval '90 minutes', NULL),
('INC-2026-001211', 1, 'congestion',   'severe', 'Backlog from the accident spreading towards Kalsanka. Avoid this stretch.',                12.8745, 74.8369, 'Mangaluru Pumpwell Circle',     'verified', NULL,                                          NOW() - interval '40 minutes', NULL),
('INC-2026-001212', 2, 'construction', 'low',    'Footpath work near the KPT junction. One lane open with flagmen.',                         12.9607, 74.8210, 'Mangaluru KPT Junction',        'resolved', 'Work completed ahead of schedule.',           NOW() - interval '6 days', NOW() - interval '5 days');

INSERT INTO traffic_signals (intersection_name, direction, state, remaining_seconds, mode) VALUES
('NH 66 Central Junction', 'N', 'green',  12, 'auto'),
('NH 66 Central Junction', 'S', 'red',    12, 'auto'),
('NH 66 Central Junction', 'E', 'red',    12, 'auto'),
('NH 66 Central Junction', 'W', 'red',    12, 'auto'),
('Pumpwell Circle',        'N', 'red',    8,  'auto'),
('Pumpwell Circle',        'S', 'green',  8,  'auto'),
('Pumpwell Circle',        'E', 'red',    8,  'auto'),
('Pumpwell Circle',        'W', 'red',    8,  'auto');

INSERT INTO detections (vehicle_id, camera_id, vehicle_number, vehicle_type, confidence, latitude, longitude, direction, distance, detected_at) VALUES
(1, 'CCTV-04', 'KA 05 MT 7321', 'ambulance',         0.98, 13.9838, 74.5565, 'N', 120, NOW() - interval '12 minutes'),
(4, 'CCTV-09', 'KA 02 AV 9055', 'ambulance',         0.97, 12.8755, 74.8378, 'N', 150, NOW() - interval '5 hours');

INSERT INTO emergency_events (vehicle_id, intersection_id, priority, distance, direction, status, created_at, cleared_at) VALUES
(1, 'NH 66 Central Junction', 'critical', 120, 'N', 'cleared', NOW() - interval '12 minutes', NOW() - interval '9 minutes'),
(2, 'NH 66 Central Junction', 'high',     350, 'S', 'cleared', NOW() - interval '8 minutes',  NOW() - interval '4 minutes'),
(3, 'Pumpwell Circle',        'high',     210, 'E', 'cleared', NOW() - interval '2 hours',    NOW() - interval '2 hours'),
(5, 'NH 66 Central Junction', 'medium',   480, 'W', 'cleared', NOW() - interval '1 day',      NOW() - interval '1 day');

INSERT INTO signal_events (signal_id, vehicle_id, previous_state, new_state, reason, created_at) VALUES
(1, 1, 'green', 'green', 'Emergency priority extension for KA 05 MT 7321', NOW() - interval '12 minutes'),
(5, 2, 'red',    'green', 'Emergency priority for KA 19 EM 4410',           NOW() - interval '8 minutes'),
(6, 3, 'green',  'green', 'Emergency priority extension for KA 31 MV 1188', NOW() - interval '2 hours');

INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES
(1, 'Incident verified',      'Your report INC-2026-001201 has been verified by the control room.', 'incident',  false, NOW() - interval '40 minutes'),
(1, 'Road cleared',           'INC-2026-001204 has been resolved. Thank you for the report.',        'incident',  true,  NOW() - interval '20 hours'),
(2, 'Heavy congestion alert', 'Sample alert: NH 66 Bhatkal Bypass is severely congested.',           'traffic',   false, NOW() - interval '1 hour'),
(2, 'Emergency activity',     'Emergency vehicle priority was activated near your saved route.',     'emergency', false, NOW() - interval '12 minutes'),
(3, 'New incident reported',  'INC-2026-001207 reported on Kumta Market Road.',                      'incident',  false, NOW() - interval '35 minutes');

INSERT INTO system_logs (event_type, message, severity, created_at) VALUES
('cctv_detection',    'CCTV-04 detected vehicle.',                                'info',     NOW() - interval '12 minutes'),
('ai_detection',      'AI identified ambulance with 98 percent confidence.',      'info',     NOW() - interval '12 minutes'),
('plate_recognition', 'Number plate detected: KA 05 MT 7321',                     'info',     NOW() - interval '12 minutes'),
('vehicle_verified',  'Vehicle verified against emergency database.',             'success',  NOW() - interval '12 minutes'),
('priority_activated','Emergency priority activated at NH 66 Central Junction.',  'critical', NOW() - interval '11 minutes'),
('signal_change',     'North signal changed to GREEN for emergency corridor.',    'warning',  NOW() - interval '11 minutes'),
('emergency_cleared', 'Ambulance crossed. Corridor cleared.',                     'success',  NOW() - interval '9 minutes'),
('traffic_normal',    'Normal traffic operation restored.',                       'info',     NOW() - interval '9 minutes'),
('incident_report',   'INC-2026-001207 reported on Kumta Market Road.',           'warning',  NOW() - interval '35 minutes'),
('congestion_alert',  'Severe congestion detected on NH 66 Bhatkal Bypass.',      'warning',  NOW() - interval '1 hour');

INSERT INTO saved_routes (user_id, name, start_location, destination) VALUES
(1, 'Morning commute', 'Bhatkal Main Road', 'Murudeshwar'),
(1, 'Weekend trip',    'Bhatkal',           'Gokarna'),
(2, 'College route',   'Kundapura',         'Manipal');
