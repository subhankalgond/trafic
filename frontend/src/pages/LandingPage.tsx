import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrafficCone, Radar, Map as MapIcon, Boxes, FileWarning,
  ArrowRight, MonitorPlay, ShieldCheck, Zap, Database,
} from 'lucide-react';
import { Badge, Card } from '../components/ui';
import { StatusBadge } from '../components/TrafficLegend';
import { trafficService, incidentService, TrafficKpis, Incident } from '../services/services';

const FEATURES = [
  {
    icon: Radar,
    title: 'AI Vehicle Detection',
    text: 'Simulated CCTV feeds with bounding-box detection, vehicle classification and confidence scoring.',
  },
  {
    icon: ShieldCheck,
    title: 'Number Plate Verification',
    text: 'Detected plates are checked against the registered emergency vehicle database before any priority is granted.',
  },
  {
    icon: Zap,
    title: 'Emergency Priority Corridor',
    text: 'Verified ambulances receive a green corridor. Conflicting traffic stops and multiple vehicles queue by priority and distance.',
  },
  {
    icon: MapIcon,
    title: 'Live Traffic Monitoring',
    text: 'Road-level density, speeds, incidents and signal states on an interactive map with severity filters.',
  },
  {
    icon: Boxes,
    title: '3D Intersection Simulation',
    text: 'A full three.js intersection with vehicles, signals, CCTV cameras and nine working demo scenarios.',
  },
  {
    icon: Database,
    title: 'Control Center Analytics',
    text: 'Traffic volume, congestion trends, incident mix and emergency clearance times with date filters.',
  },
];

const WORKFLOW = [
  { step: '1', title: 'CCTV detects vehicle', text: 'Simulated cameras watch each approach of the intersection.' },
  { step: '2', title: 'AI classifies vehicle', text: 'Ambulance, patient transport or regular traffic, with confidence.' },
  { step: '3', title: 'Plate is verified', text: 'ANPR result is checked against the emergency vehicle registry.' },
  { step: '4', title: 'Priority corridor opens', text: 'Signals switch, conflicting traffic stops, the ambulance crosses.' },
];

const SCENARIOS = [
  'Normal Traffic', 'Heavy Traffic', 'Traffic Accident', 'Single Ambulance',
  'Patient Transport', 'Two Ambulances', 'Emergency + Heavy Traffic', 'Road Block', 'Signal Failure',
];

interface NetworkStatus {
  kpis: TrafficKpis | null;
  incidents: Incident[];
  failed: boolean;
}

export default function LandingPage() {
  const [status, setStatus] = useState<NetworkStatus>({ kpis: null, incidents: [], failed: false });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [overview, incidentsRes] = await Promise.all([
          trafficService.overview(),
          incidentService.list({ status: 'active' }),
        ]);
        if (!cancelled) {
          setStatus({ kpis: overview.kpis, incidents: incidentsRes.incidents.slice(0, 3), failed: false });
        }
      } catch {
        if (!cancelled) setStatus((s) => ({ ...s, failed: true }));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = status.kpis;
  const tiles: { label: string; value: string; cls: string }[] = kpis
    ? [
        { label: 'Average speed', value: `${kpis.averageSpeed} km/h`, cls: 'text-sky-300' },
        { label: 'Active incidents', value: String(kpis.activeIncidents), cls: 'text-red-300' },
        { label: 'Emergency vehicles', value: String(kpis.emergencyVehicles), cls: 'text-sky-300' },
        { label: 'Signals monitored', value: String(kpis.signalsMonitored), cls: 'text-emerald-300' },
      ]
    : Array.from({ length: 4 }).map((_, i) => ({
        label: ['Average speed', 'Active incidents', 'Emergency vehicles', 'Signals monitored'][i],
        value: status.failed ? 'Unavailable' : 'Loading',
        cls: 'text-slate-500',
      }));

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(14,165,233,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.07) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <Badge tone="yellow">DEMO MODE - SIMULATED DATA</Badge>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Traffic control with emergency vehicle priority
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-300">
              SmartFlow AI detects emergency vehicles on camera, verifies their plates against a
              registry and holds a green corridor so they clear the junction first. The full
              pipeline runs on a real REST API and PostgreSQL database, with simulated traffic data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/live-traffic"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-3 font-semibold text-navy-900 transition-colors hover:bg-sky-400"
              >
                Launch Live Traffic <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/simulation"
                className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-6 py-3 font-semibold text-sky-200 transition-colors hover:bg-sky-500/20"
              >
                <Boxes className="h-5 w-5" aria-hidden /> Start 3D Simulation
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              No real traffic infrastructure is connected. Every signal, vehicle and detection on
              this platform is simulated.
            </p>
          </div>

          {/* HUD panel */}
          <div className="relative">
            <div className="glass rounded-2xl border-sky-500/20 p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold text-white">
                  <MonitorPlay className="h-4 w-4 text-sky-400" aria-hidden /> Intersection Overview
                </p>
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 emergency-pulse" aria-hidden /> LIVE SIM
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {tiles.map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/10 bg-navy-900/70 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                    <p className={`mt-1 text-xl font-extrabold ${s.cls}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-navy-900/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active incidents</p>
                {status.failed ? (
                  <p className="mt-2 text-xs text-slate-500">Network status unavailable right now.</p>
                ) : status.incidents.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">No active incidents on the monitored roads.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {status.incidents.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-300">
                          <span className="capitalize text-slate-200">{i.type.replace(/_/g, ' ')}</span>
                          {i.locationName ? ` - ${i.locationName}` : ''}
                        </span>
                        <StatusBadge status={i.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="border-t border-white/5 bg-navy-800/30 py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">What SmartFlow AI demonstrates</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Every capability below is implemented and interactive, not a mockup.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="transition-colors hover:border-sky-500/30">
                <f.icon className="h-7 w-7 text-sky-400" aria-hidden />
                <h3 className="mt-3 font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* workflow */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">How the priority pipeline works</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {WORKFLOW.map((w) => (
              <Card key={w.step}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 font-bold text-sky-300">
                  {w.step}
                </span>
                <h3 className="mt-3 font-bold text-white">{w.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{w.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* scenarios */}
      <section className="border-t border-white/5 bg-navy-800/30 py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Nine working demo scenarios</h2>
              <p className="mt-2 max-w-2xl text-slate-400">
                Each scenario runs the complete pipeline: congestion, detection, verification,
                priority queueing and signal restoration.
              </p>
            </div>
            <Link
              to="/simulation"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 font-semibold text-navy-900 hover:bg-sky-400"
            >
              Open simulation <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <span key={s} className="rounded-lg border border-white/10 bg-navy-900/60 px-3 py-1.5 text-sm text-slate-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="glass rounded-2xl border-sky-500/20 px-6 py-12 text-center">
            <TrafficCone className="mx-auto h-10 w-10 text-sky-400" aria-hidden />
            <h2 className="mt-4 text-2xl font-extrabold text-white sm:text-3xl">
              See emergency prioritization in action
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Run the two-ambulance scenario and watch the system verify plates, queue vehicles by
              priority and restore normal traffic automatically.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/simulation" className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-3 font-semibold text-navy-900 hover:bg-sky-400">
                Start 3D Simulation <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/incidents" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3 font-semibold text-slate-200 hover:bg-white/5">
                <FileWarning className="h-4 w-4" aria-hidden /> Browse Incidents
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
