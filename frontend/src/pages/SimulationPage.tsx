import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Siren, RadioTower, Activity } from 'lucide-react';
import { SimulationEngine, EngineSnapshot, Direction } from '../simulation/engine';
import { SimulationScene } from '../simulation/Scene';
import { Button, Card, Badge, Modal, SectionTitle } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const SCENARIOS = [
  'Normal Traffic',
  'Heavy Traffic',
  'Traffic Accident',
  'Single Ambulance',
  'Patient Transport Vehicle',
  'Two Ambulances',
  'Emergency + Heavy Traffic',
  'Road Block',
  'Signal Failure',
];

export default function SimulationPage() {
  const engineRef = useRef<SimulationEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine();
  }
  const engine = engineRef.current;
  const toast = useToast();
  const { isOperator, isAdmin } = useAuth();
  const canControl = isOperator || isAdmin;

  const [snap, setSnap] = useState<EngineSnapshot>(() => engine.snapshot());
  const [scenario, setScenario] = useState('Normal Traffic');
  const [manualOpen, setManualOpen] = useState(false);
  const [lowPerf, setLowPerf] = useState(false);

  // main loop: engine tick + react re-render at ~20fps for HUD
  useEffect(() => {
    engine.start();
    let raf = 0;
    let last = performance.now();
    let hudAccum = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      engine.tick(dt);
      hudAccum += dt;
      if (hudAccum > 0.25) {
        hudAccum = 0;
        setSnap(engine.snapshot());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  // simplified 3D on small screens for performance
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setLowPerf(mq.matches);
  }, []);

  const runScenario = (name: string) => {
    setScenario(name);
    engine.setScenario(name);
    if (name === 'Single Ambulance') {
      engine.triggerEmergency('ambulance', 'KA 05 MT 7321', 'N', 120, 'critical');
    } else if (name === 'Patient Transport Vehicle') {
      engine.triggerEmergency('patient_transport', 'KA 09 PT 2277', 'E', 210, 'high');
    } else if (name === 'Two Ambulances') {
      engine.triggerTwoAmbulances();
    } else if (name === 'Emergency + Heavy Traffic') {
      window.setTimeout(() => engine.triggerEmergency('ambulance', 'KA 02 AV 9055', 'S', 350, 'critical'), 4000);
    }
    toast('info', `Scenario loaded: ${name}. All data is simulated.`);
  };

  const emergencyActive = snap.emergency.phase !== 'idle' && snap.emergency.phase !== 'cleared';
  const corridorDir = emergencyActive ? snap.emergency.selected?.dir ?? snap.emergency.queued[0]?.dir ?? null : null;

  const phaseBadge = useMemo(() => {
    const p = snap.emergency.phase;
    const map: Record<string, { label: string; tone: 'gray' | 'yellow' | 'blue' | 'red' | 'green' }> = {
      idle: { label: 'STANDBY', tone: 'gray' },
      detecting: { label: 'DETECTING', tone: 'yellow' },
      verifying: { label: 'VERIFYING', tone: 'yellow' },
      verified: { label: 'VERIFIED', tone: 'blue' },
      priority: { label: 'PRIORITY ACTIVE', tone: 'red' },
      crossing: { label: 'CROSSING', tone: 'red' },
      cleared: { label: 'CLEARED', tone: 'green' },
    };
    return map[p] ?? map.idle;
  }, [snap.emergency.phase]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">3D Traffic Simulation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Interactive intersection demo. All vehicles, signals and detections are simulated.
          </p>
        </div>
        <Badge tone="yellow">DEMO MODE - SIMULATED DATA</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* 3D viewport + controls */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            <div className="h-[380px] sm:h-[480px]">
              <SimulationScene engine={engine} snap={snap} simplified={lowPerf} />
            </div>

            {/* floating HUD */}
            <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
              <div className="glass rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Traffic Status</p>
                <p className={`text-sm font-bold ${snap.density > 70 ? 'text-red-400' : snap.density > 40 ? 'text-yellow-300' : 'text-emerald-400'}`}>
                  {snap.density > 70 ? 'SEVERE' : snap.density > 40 ? 'MODERATE' : 'LOW'} ({snap.density}%)
                </p>
              </div>
              <div className="glass rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Emergency Vehicles</p>
                <p className="text-sm font-bold text-slate-100">{String(snap.emergency.queued.length + (snap.emergency.selected ? 1 : 0)).padStart(2, '0')}</p>
              </div>
              <div className="glass rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Queue Length</p>
                <p className="text-sm font-bold text-slate-100">{snap.queueLength} vehicles</p>
              </div>
            </div>

            <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2">
              <div className="glass rounded-lg px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Average Speed</p>
                <p className="text-sm font-bold text-sky-300">{snap.averageSpeed} km/h</p>
              </div>
              <div className="glass rounded-lg px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Signal Priority</p>
                <p className={`text-sm font-bold ${emergencyActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {emergencyActive ? 'ACTIVE' : 'IDLE'}
                </p>
              </div>
            </div>

            {/* detection overlay */}
            {snap.emergency.phase !== 'idle' && (
              <div className="glass absolute bottom-3 left-3 right-3 rounded-lg px-4 py-3 sm:right-auto sm:w-80">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-sky-300">AI Detection</p>
                  <Badge tone={phaseBadge.tone}>{phaseBadge.label}</Badge>
                </div>
                {snap.emergency.plate ? (
                  <div className="mt-2">
                    <div className="relative overflow-hidden rounded-md border border-sky-500/40 bg-navy-900 px-3 py-2 font-mono text-sm tracking-widest text-white">
                      {snap.emergency.phase === 'verifying' && <span className="scanline" aria-hidden />}
                      {snap.emergency.plate}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Confidence {Math.round(snap.emergency.confidence * 100)}% - Distance {snap.emergency.distance}m
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">Scanning approach lanes...</p>
                )}
                {snap.emergency.reason && (
                  <p className="mt-2 text-xs text-emerald-300">Priority: {snap.emergency.reason}</p>
                )}
              </div>
            )}
          </div>

          {/* controls */}
          <Card className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              {snap.running ? (
                <Button variant="secondary" onClick={() => { engine.pause(); setSnap(engine.snapshot()); }}>
                  <Pause className="h-4 w-4" aria-hidden /> Pause
                </Button>
              ) : (
                <Button onClick={() => { engine.start(); setSnap(engine.snapshot()); }}>
                  <Play className="h-4 w-4" aria-hidden /> Start
                </Button>
              )}
              <Button variant="secondary" onClick={() => { engine.reset(); setScenario('Normal Traffic'); setSnap(engine.snapshot()); }}>
                <RotateCcw className="h-4 w-4" aria-hidden /> Reset
              </Button>
              {canControl && (
                <Button variant="secondary" onClick={() => setManualOpen(true)}>
                  Manual Signals
                </Button>
              )}
              <span className="ml-auto text-xs text-slate-500">
                Mode: {snap.mode.replace('_', ' ')} - Drag to orbit, scroll to zoom
              </span>
            </div>
          </Card>

          {/* scenario picker */}
          <Card className="mt-4">
            <SectionTitle sub="Every scenario runs the full detection, verification and priority pipeline in simulation.">
              Demo Scenarios
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s}
                  onClick={() => runScenario(s)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    scenario === s
                      ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                      : 'border-white/10 bg-navy-700/50 text-slate-300 hover:border-sky-500/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* right rail */}
        <div className="space-y-4">
          {/* signal status */}
          <Card>
            <SectionTitle sub="Live signal state from the simulation engine.">Signal Status</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {(['N', 'S', 'E', 'W'] as Direction[]).map((d) => {
                const s = snap.signals[d];
                const isCorridor = corridorDir === d && emergencyActive;
                return (
                  <div
                    key={d}
                    className={`rounded-lg border px-3 py-2 ${isCorridor ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-navy-900/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        {d === 'N' ? 'NORTH' : d === 'S' ? 'SOUTH' : d === 'E' ? 'EAST' : 'WEST'}
                      </span>
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: s.state === 'green' ? '#22C55E' : s.state === 'yellow' ? '#FACC15' : '#EF4444',
                          boxShadow: `0 0 8px ${s.state === 'green' ? '#22C55E' : s.state === 'yellow' ? '#FACC15' : '#EF4444'}`,
                        }}
                        aria-label={`${d} signal ${s.state}`}
                      />
                    </div>
                    <p className={`mt-1 text-sm font-bold ${s.state === 'green' ? 'text-emerald-400' : s.state === 'yellow' ? 'text-yellow-300' : 'text-red-400'}`}>
                      {s.state.toUpperCase()} {Math.ceil(s.remaining)}s
                    </p>
                  </div>
                );
              })}
            </div>
            {snap.recommendation && (
              <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                <Activity className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                Recommendation: {snap.recommendation}
              </div>
            )}
          </Card>

          {/* emergency panel */}
          <Card>
            <SectionTitle sub="Nearest verified vehicle gets priority first.">AI Priority Engine</SectionTitle>
            {snap.emergency.selected || snap.emergency.queued.length > 0 ? (
              <ul className="space-y-2">
                {snap.emergency.selected && (
                  <li className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-mono text-sm text-white">
                        <Siren className="h-4 w-4 text-red-400" aria-hidden /> {snap.emergency.selected.plate}
                      </span>
                      <Badge tone="green">SELECTED</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{snap.emergency.selected.distance}m - {snap.emergency.selected.dir} approach</p>
                  </li>
                )}
                {snap.emergency.queued.map((c) => (
                  <li key={c.id} className="rounded-lg border border-white/10 bg-navy-900/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-mono text-sm text-slate-200">
                        <Siren className="h-4 w-4 text-slate-500" aria-hidden /> {c.plate}
                      </span>
                      <Badge tone="gray">QUEUED</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{c.distance}m - waiting for corridor</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                No emergency vehicles in the simulation. Load an ambulance scenario to see the priority engine.
              </p>
            )}
          </Card>

          {/* event log */}
          <Card>
            <SectionTitle sub="Simulation event stream.">Event Log</SectionTitle>
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1" role="log" aria-live="polite">
              {snap.events.length === 0 && <p className="text-sm text-slate-500">Waiting for events...</p>}
              {snap.events.map((e) => (
                <div key={e.id} className="flex gap-2 text-xs">
                  <span className="shrink-0 font-mono text-slate-500">{e.time}</span>
                  <span
                    className={
                      e.severity === 'critical'
                        ? 'text-red-300'
                        : e.severity === 'warning'
                          ? 'text-yellow-300'
                          : e.severity === 'success'
                            ? 'text-emerald-300'
                            : 'text-slate-300'
                    }
                  >
                    {e.message}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* manual signal modal */}
      <ManualSignalModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onApply={(dir, state) => {
          engine.manualSignal(dir, state);
          setManualOpen(false);
          setSnap(engine.snapshot());
          toast('info', `Manual override applied: ${dir} signal is now ${state.toUpperCase()}.`);
        }}
      />
    </div>
  );
}

function ManualSignalModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (dir: Direction, state: 'red' | 'yellow' | 'green') => void;
}) {
  const [dir, setDir] = useState<Direction>('N');
  const [state, setState] = useState<'red' | 'yellow' | 'green'>('green');
  return (
    <Modal open={open} onClose={onClose} title="Manual Signal Control">
      <p className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
        Manual control overrides the automatic simulation logic.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-300">Direction</p>
          <div className="flex gap-1.5">
            {(['N', 'S', 'E', 'W'] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => setDir(d)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${dir === d ? 'border-sky-400 bg-sky-500/15 text-sky-200' : 'border-white/10 text-slate-300'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-300">State</p>
          <div className="flex gap-1.5">
            {(['red', 'yellow', 'green'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setState(s)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-sm capitalize ${state === s ? 'border-sky-400 bg-sky-500/15 text-sky-200' : 'border-white/10 text-slate-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onApply(dir, state)}>
          <RadioTower className="h-4 w-4" aria-hidden /> Apply Override
        </Button>
      </div>
    </Modal>
  );
}
