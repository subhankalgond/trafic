-- ============================================================
-- Migration: emergency response feature (additive, safe to re-run)
-- Adds: emergency_sessions, signal_priority_requests
-- Run:  psql -d trafficflow -f database/migrations/001_emergency_response.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS emergency_sessions (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id            BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  session_type          VARCHAR(30) NOT NULL DEFAULT 'hospital_transport',
  status                VARCHAR(15) NOT NULL DEFAULT 'active',
  simulated             BOOLEAN NOT NULL DEFAULT FALSE,
  origin_lat            DOUBLE PRECISION,
  origin_lng            DOUBLE PRECISION,
  origin_label          VARCHAR(200),
  hospital_id           VARCHAR(120),
  hospital_name         VARCHAR(200),
  hospital_lat          DOUBLE PRECISION,
  hospital_lng          DOUBLE PRECISION,
  last_lat              DOUBLE PRECISION,
  last_lng              DOUBLE PRECISION,
  last_speed_kph        DOUBLE PRECISION,
  last_accuracy_m       DOUBLE PRECISION,
  last_ping_at          TIMESTAMPTZ,
  priority_intersections TEXT NOT NULL DEFAULT '',
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at              TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_emergency_sessions_status ON emergency_sessions(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_sessions_vehicle ON emergency_sessions(vehicle_id);

CREATE TABLE IF NOT EXISTS signal_priority_requests (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id        BIGINT NOT NULL REFERENCES emergency_sessions(id) ON DELETE CASCADE,
  intersection_name VARCHAR(100) NOT NULL,
  direction         VARCHAR(10) NOT NULL,
  distance_m        INT NOT NULL DEFAULT 0,
  decision          VARCHAR(10) NOT NULL,
  reason            VARCHAR(500) NOT NULL,
  granted_seconds   INT,
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at       TIMESTAMPTZ,
  released_reason   VARCHAR(200)
);
CREATE INDEX IF NOT EXISTS idx_priority_requests_session ON signal_priority_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_priority_requests_open ON signal_priority_requests(released_at) WHERE released_at IS NULL;
