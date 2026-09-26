import { Card, SectionTitle, Badge } from '../components/ui';
import { DEMO_DISCLAIMER } from '../config';
import { Radar, ShieldCheck, Zap, Map as MapIcon, Boxes, Database } from 'lucide-react';

const MODULES = [
  {
    icon: Radar,
    title: 'AI vehicle detection',
    text: 'Simulated CCTV feeds produce detections with vehicle class, plate read and confidence. The detection feed in the control center streams from the detections table.',
  },
  {
    icon: ShieldCheck,
    title: 'Plate verification',
    text: 'A detected plate only earns priority after matching an active vehicle in the emergency registry. Unregistered plates are logged and ignored.',
  },
  {
    icon: Zap,
    title: 'Priority corridor',
    text: 'Verified emergency vehicles trigger signal preemption: the approach turns green, conflicting approaches are held red, and the queue restores normal phasing after clearance.',
  },
  {
    icon: MapIcon,
    title: 'Live traffic monitoring',
    text: 'Road-level traffic level, status, speed and density are exposed through the traffic API and rendered on the public map with severity filters.',
  },
  {
    icon: Boxes,
    title: '3D intersection simulation',
    text: 'A three.js scene runs nine scenarios covering congestion, accidents, signal failure and single or dual ambulance priority runs.',
  },
  {
    icon: Database,
    title: 'Analytics and logs',
    text: 'Volume, density, incident mix and clearance-time analytics are computed server-side from traffic_records, incidents and emergency_events.',
  },
];

const STACK = [
  ['Frontend', 'React 18, TypeScript, Vite, Tailwind CSS, react-leaflet, three.js (@react-three/fiber), recharts'],
  ['Backend', 'Node.js, Express, TypeScript, zod validation, JWT auth, bcrypt, multer uploads, express-rate-limit, helmet'],
  ['Database', 'PostgreSQL (Supabase-ready) with schema in database/schema.sql and demo seed in database/seed.sql'],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <Badge tone="yellow">DEMO MODE - SIMULATED DATA</Badge>
      <h1 className="mt-4 text-3xl font-extrabold text-white">About SmartFlow AI</h1>
      <p className="mt-3 max-w-3xl text-slate-300">
        SmartFlow AI is an educational simulation of an intelligent traffic management system with
        emergency vehicle prioritization. It models the complete pipeline (detection, verification,
        priority queueing, signal control and analytics) against a real REST API and database, but
        every data point is simulated.
      </p>

      <div className="mt-10">
        <SectionTitle sub="Each module is implemented end to end: UI, REST API and database.">System modules</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((m) => (
            <Card key={m.title} className="transition-colors hover:border-sky-500/30">
              <m.icon className="h-6 w-6 text-sky-400" aria-hidden />
              <h3 className="mt-3 font-bold text-white">{m.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{m.text}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle>Technology</SectionTitle>
        <Card>
          <dl className="space-y-4">
            {STACK.map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm font-semibold text-sky-300">{k}</dt>
                <dd className="mt-0.5 text-sm text-slate-400">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="glass mt-10 rounded-2xl border-yellow-500/20 p-6">
        <h2 className="font-bold text-white">Scope and limitations</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{DEMO_DISCLAIMER}</p>
      </div>
    </div>
  );
}
