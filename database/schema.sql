-- ============================================================
-- SmartFlow AI database schema (PostgreSQL / Supabase)
-- Educational simulation platform. Run in Supabase SQL editor:
--   1. schema.sql  2. seed.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(254) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'user',
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS vehicles (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_number VARCHAR(20)  NOT NULL UNIQUE,
  vehicle_type   VARCHAR(40)  NOT NULL,
  organization   VARCHAR(120) NOT NULL,
  priority       VARCHAR(10)  NOT NULL DEFAULT 'medium',
  status         VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roads (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  area         VARCHAR(100) NOT NULL,
  city         VARCHAR(100) NOT NULL,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  lanes        SMALLINT NOT NULL DEFAULT 2,
  speed_limit  SMALLINT NOT NULL DEFAULT 50,
  traffic_level VARCHAR(10) NOT NULL DEFAULT 'low',
  road_status  VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roads_city ON roads(city);

CREATE TABLE IF NOT EXISTS traffic_records (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  road_id       BIGINT NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
  vehicle_count INT    NOT NULL DEFAULT 0,
  average_speed INT    NOT NULL DEFAULT 0,
  density       INT    NOT NULL DEFAULT 0,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_traffic_records_road_time ON traffic_records(road_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id  VARCHAR(20) NOT NULL UNIQUE,
  user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  type         VARCHAR(30) NOT NULL,
  severity     VARCHAR(10) NOT NULL DEFAULT 'low',
  description  TEXT NOT NULL,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  location_name VARCHAR(200),
  image_url    VARCHAR(255),
  status       VARCHAR(20) NOT NULL DEFAULT 'reported',
  admin_note   VARCHAR(1000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);

CREATE TABLE IF NOT EXISTS detections (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id  BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  camera_id   VARCHAR(20) NOT NULL,
  vehicle_number VARCHAR(20),
  vehicle_type VARCHAR(40),
  confidence  NUMERIC(4,3) NOT NULL,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  direction   VARCHAR(10),
  distance    INT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_detections_time ON detections(detected_at DESC);

CREATE TABLE IF NOT EXISTS traffic_signals (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  intersection_name  VARCHAR(100) NOT NULL,
  direction          VARCHAR(10) NOT NULL,
  state              VARCHAR(6) NOT NULL DEFAULT 'red',
  remaining_seconds  INT NOT NULL DEFAULT 0,
  mode               VARCHAR(15) NOT NULL DEFAULT 'auto',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (intersection_name, direction)
);

CREATE TABLE IF NOT EXISTS signal_events (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  signal_id      BIGINT REFERENCES traffic_signals(id) ON DELETE CASCADE,
  vehicle_id     BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  previous_state VARCHAR(6),
  new_state      VARCHAR(6),
  reason         VARCHAR(200),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_events (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id      BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  intersection_id VARCHAR(100) NOT NULL,
  priority        VARCHAR(10) NOT NULL,
  distance        INT NOT NULL,
  direction       VARCHAR(10) NOT NULL,
  status          VARCHAR(15) NOT NULL DEFAULT 'detected',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cleared_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_emergency_events_time ON emergency_events(created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(150) NOT NULL,
  message    VARCHAR(500) NOT NULL,
  type       VARCHAR(20) NOT NULL DEFAULT 'system',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS system_logs (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type VARCHAR(40) NOT NULL,
  message    VARCHAR(500) NOT NULL,
  severity   VARCHAR(10) NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_system_logs_time ON system_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS saved_routes (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(100) NOT NULL,
  start_location VARCHAR(200) NOT NULL,
  destination    VARCHAR(200) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
