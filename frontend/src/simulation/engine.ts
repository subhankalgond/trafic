/**
 * SmartFlow AI 3D simulation engine (framework agnostic).
 *
 * Owns all state: vehicles, signals, congestion, emergency queue, event log.
 * React Three Fiber only renders a snapshot each frame. All data is
 * SIMULATED for the demo, not real-world traffic.
 */

export type Direction = 'N' | 'S' | 'E' | 'W';
export type SignalState = 'red' | 'yellow' | 'green';
export type VehicleKind = 'car' | 'bus' | 'bike' | 'ambulance' | 'patient_transport';
export type VehicleState = 'moving' | 'waiting' | 'crossing' | 'cleared';
export type EmergencyPhase =
  | 'idle'
  | 'detecting'
  | 'verifying'
  | 'verified'
  | 'priority'
  | 'crossing'
  | 'cleared';

export interface SimVehicle {
  id: number;
  kind: VehicleKind;
  dir: Direction; // approach direction
  lane: number; // -1 left, 0 center, 1 right (offset across road)
  pos: number; // meters from intersection along approach; negative = approaching
  speed: number; // km/h
  state: VehicleState;
  color: string;
}

export interface SimSignal {
  dir: Direction;
  state: SignalState;
  remaining: number; // seconds
}

export interface SimEvent {
  id: number;
  time: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface EmergencyCandidate {
  id: number;
  plate: string;
  kind: 'ambulance' | 'patient_transport';
  priority: 'critical' | 'high' | 'medium';
  dir: Direction;
  distance: number; // meters
  phase: EmergencyPhase;
  confidence: number;
}

export interface EngineSnapshot {
  time: number;
  running: boolean;
  mode: 'normal' | 'traffic_management' | 'emergency' | 'manual';
  vehicles: SimVehicle[];
  signals: Record<Direction, SimSignal>;
  density: number; // 0-100
  averageSpeed: number;
  queueLength: number;
  scenario: string;
  recommendation: string | null;
  emergency: {
    phase: EmergencyPhase;
    selected: EmergencyCandidate | null;
    queued: EmergencyCandidate[];
    reason: string | null;
    plate: string | null;
    confidence: number;
    distance: number;
  };
  events: SimEvent[];
}

const ROAD_HALF = 60; // meters from center to spawn/despawn
const CAR_COLORS = ['#38BDF8', '#94A3B8', '#F59E0B', '#A5B4FC', '#E2E8F0', '#34D399', '#F87171'];
const DIRS: Direction[] = ['N', 'S', 'E', 'W'];

export interface EngineOptions {
  onEvent?: (e: SimEvent) => void;
}

export class SimulationEngine {
  private vehicles: SimVehicle[] = [];
  private signals: Record<Direction, SimSignal>;
  private events: SimEvent[] = [];
  private emergencyQueue: EmergencyCandidate[] = [];
  private emergencyPhase: EmergencyPhase = 'idle';
  private selected: EmergencyCandidate | null = null;
  private reason: string | null = null;
  private nextId = 1;
  private eventId = 1;
  private time = 0;
  private spawnTimer = 0;
  private scenarioVehicles = 14;
  private scenarioName = 'Normal Traffic';
  private recommendation: string | null = null;
  private mode: 'normal' | 'traffic_management' | 'emergency' | 'manual' = 'normal';
  private manualState: { dir: Direction; state: SignalState; hold: number } | null = null;
  private running = false;
  private onEvent?: (e: SimEvent) => void;
  private phaseTimer = 0;

  constructor(opts: EngineOptions = {}) {
    this.onEvent = opts.onEvent;
    this.signals = {
      N: { dir: 'N', state: 'green', remaining: 10 },
      S: { dir: 'S', state: 'red', remaining: 10 },
      E: { dir: 'E', state: 'red', remaining: 10 },
      W: { dir: 'W', state: 'red', remaining: 10 },
    };
    this.seedVehicles(14);
  }

  // ------------- public control -------------
  start() {
    this.running = true;
  }
  pause() {
    this.running = false;
  }
  reset() {
    this.vehicles = [];
    this.emergencyQueue = [];
    this.emergencyPhase = 'idle';
    this.selected = null;
    this.reason = null;
    this.time = 0;
    this.events = [];
    this.recommendation = null;
    this.mode = 'normal';
    this.manualState = null;
    this.scenarioName = 'Normal Traffic';
    this.scenarioVehicles = 14;
    this.signals = {
      N: { dir: 'N', state: 'green', remaining: 10 },
      S: { dir: 'S', state: 'red', remaining: 10 },
      E: { dir: 'E', state: 'red', remaining: 10 },
      W: { dir: 'W', state: 'red', remaining: 10 },
    };
    this.seedVehicles(14);
  }

  setScenario(name: string) {
    this.reset();
    this.scenarioName = name;
    switch (name) {
      case 'Heavy Traffic':
        this.scenarioVehicles = 34;
        this.log('congestion', 'Heavy traffic scenario loaded. Density rising.', 'warning');
        break;
      case 'Traffic Accident':
        this.scenarioVehicles = 22;
        this.log('incident', 'Accident scenario: vehicle stopped on E approach.', 'critical');
        break;
      case 'Single Ambulance':
        this.scenarioVehicles = 14;
        break;
      case 'Patient Transport Vehicle':
        this.scenarioVehicles = 14;
        break;
      case 'Two Ambulances':
        this.scenarioVehicles = 14;
        break;
      case 'Emergency + Heavy Traffic':
        this.scenarioVehicles = 30;
        this.log('congestion', 'Heavy traffic with incoming emergency vehicle.', 'warning');
        break;
      case 'Road Block':
        this.scenarioVehicles = 18;
        this.log('incident', 'Road block scenario: W approach blocked.', 'critical');
        break;
      case 'Signal Failure':
        this.scenarioVehicles = 20;
        this.signals.N.state = 'red';
        this.signals.S.state = 'red';
        this.signals.E.state = 'red';
        this.signals.W.state = 'red';
        this.mode = 'manual';
        this.log('signal', 'Signal failure: all approaches flashing red. Manual control required.', 'critical');
        break;
      default:
        break;
    }
    this.start();
  }

  setMode(mode: 'normal' | 'traffic_management' | 'emergency' | 'manual') {
    this.mode = mode;
    this.log('mode', `Control mode set to ${mode.replace('_', ' ')}.`, 'info');
  }

  manualSignal(dir: Direction, state: SignalState) {
    this.mode = 'manual';
    this.manualState = { dir, state, hold: 12 };
    if (state === 'green') {
      DIRS.forEach((d) => {
        this.signals[d].state = d === dir ? 'green' : 'red';
        this.signals[d].remaining = 12;
      });
    } else {
      this.signals[dir].state = state;
      this.signals[dir].remaining = 12;
    }
    this.log('signal', `${dir} signal manually set to ${state.toUpperCase()}.`, 'warning');
  }

  /** Launch the emergency detection + priority pipeline for a vehicle. */
  triggerEmergency(
    kind: 'ambulance' | 'patient_transport',
    plate: string,
    dir: Direction,
    distance: number,
    priority: 'critical' | 'high' | 'medium'
  ) {
    const c: EmergencyCandidate = {
      id: this.nextId++,
      plate,
      kind,
      priority,
      dir,
      distance,
      phase: 'detecting',
      confidence: 0.91 + Math.random() * 0.08,
    };
    this.emergencyQueue.push(c);
    if (this.emergencyPhase === 'idle' || this.emergencyPhase === 'cleared') {
      this.emergencyPhase = 'detecting';
      this.phaseTimer = 0;
    }
    this.log('cctv', `CCTV-${String(1 + Math.floor(Math.random() * 8)).padStart(2, '0')} detected vehicle.`, 'info');
  }

  /** Two-ambulance scenario: second vehicle enters 2s after the first. */
  triggerTwoAmbulances() {
    this.triggerEmergency('ambulance', 'KA 05 MT 7321', 'N', 120, 'critical');
    window.setTimeout(() => {
      this.triggerEmergency('ambulance', 'KA 02 AV 9055', 'S', 350, 'critical');
    }, 2000);
  }

  // ------------- internal helpers -------------
  private log(type: string, message: string, severity: SimEvent['severity']) {
    const e: SimEvent = {
      id: this.eventId++,
      time: new Date().toLocaleTimeString('en-GB'),
      type,
      message,
      severity,
    };
    this.events.unshift(e);
    if (this.events.length > 60) this.events.pop();
    this.onEvent?.(e);
  }

  private seedVehicles(n: number) {
    for (let i = 0; i < n; i++) {
      this.vehicles.push(this.makeVehicle(DIRS[i % 4], 10 + Math.random() * (ROAD_HALF - 20)));
    }
  }

  private makeVehicle(dir: Direction, pos: number, kind?: VehicleKind): SimVehicle {
    const kinds: VehicleKind[] = ['car', 'car', 'car', 'car', 'bus', 'bike'];
    const k = kind ?? kinds[Math.floor(Math.random() * kinds.length)];
    return {
      id: this.nextId++,
      kind: k,
      dir,
      lane: Math.random() < 0.5 ? -1 : 1,
      pos,
      speed: k === 'bus' ? 30 : k === 'bike' ? 42 : 36 + Math.random() * 12,
      state: 'moving',
      color: k === 'ambulance' ? '#FFFFFF' : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    };
  }

  private emergencyVehicleFor(c: EmergencyCandidate): SimVehicle {
    return {
      id: 900000 + c.id,
      kind: c.kind,
      dir: c.dir,
      lane: 0,
      pos: -Math.min(ROAD_HALF - 6, c.distance / 2), // scale 120m -> road length
      speed: 28,
      state: 'moving',
      color: c.kind === 'ambulance' ? '#F8FAFC' : '#FDE68A',
    };
  }

  private isGreen(dir: Direction) {
    return this.signals[dir].state === 'green';
  }

  // ------------- main tick -------------
  tick(dt: number) {
    if (!this.running) return;
    this.time += dt;

    this.updateSignals(dt);
    this.updateEmergencyPipeline(dt);
    this.updateVehicles(dt);
    this.updateSpawning(dt);
    this.updateRecommendation();
  }

  private updateSignals(dt: number) {
    if (this.mode === 'emergency' || this.manualState) {
      if (this.manualState) {
        this.manualState.hold -= dt;
        if (this.manualState.hold <= 0) {
          this.manualState = null;
          this.mode = 'normal';
        }
      }
      DIRS.forEach((d) => (this.signals[d].remaining = Math.max(0, this.signals[d].remaining - dt)));
      return;
    }

    // decrement current phase
    DIRS.forEach((d) => {
      const s = this.signals[d];
      s.remaining = Math.max(0, s.remaining - dt);
    });

    const anyGreen = DIRS.some((d) => this.signals[d].state === 'green');
    const phaseLen = this.mode === 'traffic_management' ? this.adaptivePhase() : 10;

    if (!anyGreen || DIRS.every((d) => this.signals[d].remaining <= 0)) {
      // rotate: next direction gets green
      const current = DIRS.find((d) => this.signals[d].state === 'green') ?? 'W';
      const order: Direction[] = ['N', 'E', 'S', 'W'];
      const next = order[(order.indexOf(current) + 1) % 4];
      DIRS.forEach((d) => {
        this.signals[d].state = d === next ? 'green' : 'red';
        this.signals[d].remaining = phaseLen;
      });
    }
  }

  /** Traffic-aware mode: extend green for the approach with the longest queue. */
  private adaptivePhase(): number {
    const queues = DIRS.map((d) => ({
      dir: d,
      count: this.vehicles.filter((v) => v.dir === d && v.state === 'waiting').length,
    }));
    const busiest = queues.reduce((a, b) => (b.count > a.count ? b : a));
    if (busiest.count > 6 && this.recommendation === null) {
      this.recommendation = `${busiest.dir === 'N' ? 'North' : busiest.dir === 'S' ? 'South' : busiest.dir === 'E' ? 'East' : 'West'} requires extended green time.`;
    }
    return busiest.count > 6 ? 14 : 8;
  }

  private updateEmergencyPipeline(dt: number) {
    if (this.emergencyQueue.length === 0) {
      if (this.emergencyPhase === 'cleared') {
        this.emergencyPhase = 'idle';
        this.selected = null;
        this.reason = null;
      }
      return;
    }
    if (!this.running) return;
    this.phaseTimer += dt;

    const candidate = this.emergencyQueue[0];
    switch (this.emergencyPhase) {
      case 'detecting':
        if (this.phaseTimer > 1.5) {
          candidate.phase = 'verifying';
          this.emergencyPhase = 'verifying';
          this.phaseTimer = 0;
          this.log('ai', `AI identified ${candidate.kind.replace('_', ' ')} with ${Math.round(candidate.confidence * 100)} percent confidence.`, 'info');
        }
        break;
      case 'verifying':
        if (this.phaseTimer > 1.5) {
          candidate.phase = 'verified';
          this.emergencyPhase = 'verified';
          this.phaseTimer = 0;
          this.log('plate', `Number plate detected: ${candidate.plate}`, 'info');
        }
        break;
      case 'verified':
        if (this.phaseTimer > 1.5) {
          candidate.phase = 'priority';
          this.emergencyPhase = 'priority';
          this.selected = candidate;
          this.reason = `${candidate.priority} priority + ${this.emergencyQueue.length > 1 ? 'nearest of two candidates' : 'verified emergency vehicle'}`;
          this.phaseTimer = 0;
          this.mode = 'emergency';
          // green corridor for its direction
          DIRS.forEach((d) => {
            this.signals[d].state = d === candidate.dir ? 'green' : 'red';
            this.signals[d].remaining = 20;
          });
          this.log('priority', `Emergency priority activated for ${candidate.plate}. Conflicting traffic stopped.`, 'critical');
          this.log('signal', `${candidate.dir} signal changed to GREEN for emergency corridor.`, 'warning');
        }
        break;
      case 'priority': {
        if (this.phaseTimer > 2.5) {
          this.emergencyPhase = 'crossing';
          candidate.phase = 'crossing';
          this.phaseTimer = 0;
          if (!this.vehicles.find((v) => v.id === 900000 + candidate.id)) {
            this.vehicles.push(this.emergencyVehicleFor(candidate));
          }
        }
        break;
      }
      case 'crossing': {
        const ev = this.vehicles.find((v) => v.id === 900000 + candidate.id);
        if (ev) {
          ev.pos += (ev.speed * 1000 / 3600) * dt; // km/h -> m/s
          ev.state = 'crossing';
          if (ev.pos > ROAD_HALF) {
            this.vehicles = this.vehicles.filter((v) => v.id !== ev.id);
            candidate.phase = 'cleared';
            this.emergencyPhase = 'cleared';
            this.phaseTimer = 0;
            this.log('cleared', `${candidate.plate} crossed the intersection.`, 'success');
          }
        } else {
          this.emergencyPhase = 'cleared';
          this.phaseTimer = 0;
        }
        break;
      }
      case 'cleared':
        if (this.phaseTimer > 1.2) {
          this.mode = 'normal';
          this.selected = null;
          this.reason = null;
          this.emergencyQueue.shift();
          this.log('traffic', 'Normal traffic operation restored.', 'info');
          if (this.emergencyQueue.length > 0) {
            const next = this.emergencyQueue[0];
            this.emergencyPhase = 'detecting';
            this.phaseTimer = 0;
            next.phase = 'detecting';
            this.log('queue', `Evaluating next emergency vehicle: ${next.plate}.`, 'info');
          } else {
            this.emergencyPhase = 'idle';
          }
        }
        break;
      default:
        break;
    }
  }

  private updateVehicles(dt: number) {
    const stopLine = 8; // meters before intersection center
    for (const v of this.vehicles) {
      if (v.id >= 900000) continue; // emergency vehicles handled in pipeline
      const green = this.isGreen(v.dir);
      const yellow = this.signals[v.dir].state === 'yellow';
      const blockedAhead = this.vehicles.some(
        (o) => o !== v && o.dir === v.dir && o.lane === v.lane && o.pos > v.pos && o.pos - v.pos < 7
      );
      const incidentAhead = this.scenarioName === 'Traffic Accident' && v.dir === 'E' && v.pos < 30 && v.pos > -20;
      const roadBlock = this.scenarioName === 'Road Block' && v.dir === 'W' && v.pos < 30 && v.pos > -20;

      if (this.mode === 'emergency' && this.selected && this.selected.dir !== v.dir) {
        // conflicting traffic stops during emergency corridor
        v.state = 'stopped' as VehicleState;
        continue;
      }
      if (incidentAhead || roadBlock) {
        v.state = 'stopped' as VehicleState;
        continue;
      }

      if (!green && !yellow) {
        if (v.pos > -stopLine) {
          v.state = v.pos >= -stopLine - 1 ? 'waiting' : 'moving';
          v.pos = Math.max(-ROAD_HALF, v.pos - (v.speed * 1000 / 3600) * dt * 0.4);
          if (v.pos < -stopLine) v.state = 'moving';
        } else {
          v.state = 'waiting';
        }
        // queue up at the stop line
        if (v.pos > -stopLine - 1 && v.pos < 0) {
          v.pos = Math.max(v.pos - (v.speed * 1000 / 3600) * dt * 0.5, -stopLine - 1);
          v.state = 'waiting';
        }
        continue;
      }

      // green or yellow: move forward, maintain distance
      if (!blockedAhead) {
        v.pos += (v.speed * 1000 / 3600) * dt;
        v.state = v.pos > 0 && v.pos < ROAD_HALF ? 'crossing' : 'moving';
      } else {
        v.state = 'waiting';
      }
    }

    // respawn vehicles that exit
    this.vehicles = this.vehicles.filter((v) => {
      if (v.id >= 900000) return true;
      if (v.pos > ROAD_HALF || v.pos < -ROAD_HALF - 5) return false;
      return true;
    });
  }

  private updateSpawning(dt: number) {
    this.spawnTimer += dt;
    const interval = this.scenarioVehicles > 25 ? 0.35 : this.scenarioVehicles > 18 ? 0.6 : 0.9;
    if (this.spawnTimer > interval) {
      this.spawnTimer = 0;
      const count = this.vehicles.filter((v) => v.id < 900000).length;
      if (count < this.scenarioVehicles) {
        const dir = DIRS[Math.floor(Math.random() * 4)];
        this.vehicles.push(this.makeVehicle(dir, -ROAD_HALF + 2));
      }
    }
  }

  private updateRecommendation() {
    if (this.mode === 'emergency') {
      this.recommendation = 'Emergency priority active. Conflicting traffic stopped.';
      return;
    }
    const waiting = this.vehicles.filter((v) => v.state === 'waiting').length;
    const density = Math.min(100, Math.round((waiting / Math.max(1, this.vehicles.length)) * 130));
    if (this.scenarioName === 'Heavy Traffic' && density > 60) {
      this.recommendation = 'Congestion detected. Extend green phases and suggest alternate route.';
    } else if (waiting > 10) {
      this.recommendation = 'High queue length. Consider traffic management mode.';
    } else if (this.recommendation && this.mode === 'normal' && waiting < 4) {
      this.recommendation = null;
    }
  }

  /** Snapshot for rendering. */
  snapshot(): EngineSnapshot {
    const moving = this.vehicles.filter((v) => v.id < 900000 && v.state !== 'waiting');
    const waiting = this.vehicles.filter((v) => v.id < 900000 && v.state === 'waiting');
    const avg = moving.length
      ? moving.reduce((s, v) => s + v.speed * (this.mode === 'emergency' && this.selected && this.selected.dir !== v.dir ? 0.3 : 1), 0) / moving.length
      : 0;
    return {
      time: this.time,
      running: this.running,
      mode: this.mode,
      vehicles: [...this.vehicles],
      signals: { ...this.signals },
      density: Math.min(100, Math.round((waiting.length / Math.max(1, this.vehicles.length)) * 130)),
      averageSpeed: Math.round(avg),
      queueLength: waiting.length,
      scenario: this.scenarioName,
      recommendation: this.recommendation,
      emergency: {
        phase: this.emergencyPhase,
        selected: this.selected,
        queued: this.emergencyQueue.slice(1),
        reason: this.reason,
        plate: this.selected?.plate ?? this.emergencyQueue[0]?.plate ?? null,
        confidence: this.selected?.confidence ?? this.emergencyQueue[0]?.confidence ?? 0,
        distance: this.selected?.distance ?? this.emergencyQueue[0]?.distance ?? 0,
      },
      events: [...this.events],
    };
  }

  get isRunning() {
    return this.running;
  }

  /** Live vehicle list for renderers that read per-frame positions. */
  get liveVehicles(): readonly SimVehicle[] {
    return this.vehicles;
  }

  /** Current emergency pipeline state for renderers. */
  get emergencyState() {
    return {
      phase: this.emergencyPhase,
      selected: this.selected,
      queued: this.emergencyQueue.slice(1),
      reason: this.reason,
    };
  }

  get scenarioLabel() {
    return this.scenarioName;
  }
}
