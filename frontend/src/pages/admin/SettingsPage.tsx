import { useEffect, useState } from 'react';
import { Database, Activity, Server } from 'lucide-react';
import { Card, LoadingSkeleton, ErrorState, Badge } from '../../components/ui';
import { adminService } from '../../services/services';
import { DEMO_DISCLAIMER } from '../../config';

export default function SettingsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminService.settings>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    adminService
      .settings()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingSkeleton rows={4} />;

  const s = data.settings;

  const rows: [string, React.ReactNode][] = [
    ['Database', <span key="db" className="font-mono text-sky-300">{s.database}</span>],
    ['Data source', <Badge key="src" tone="yellow">{s.dataSource}</Badge>],
    ['Monitored roads', s.roads],
    ['Registered emergency vehicles', s.registeredVehicles],
    ['Signals', s.signals],
    ['Registered users', s.users],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-white">Platform settings</h1>
      <p className="mt-1 text-sm text-slate-400">Read-only view of the platform configuration.</p>

      <Card className="mt-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
          <Database className="h-5 w-5 text-sky-400" aria-hidden /> System status
        </h2>
        <dl className="divide-y divide-white/5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-slate-400">{k}</dt>
              <dd className="text-sm font-medium text-white">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-white">
          <Server className="h-5 w-5 text-emerald-400" aria-hidden /> Deployment notes
        </h2>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            Configure <code className="rounded bg-navy-900 px-1.5 py-0.5 font-mono text-xs text-sky-300">backend/.env</code> with the Supabase
            connection string, JWT secret and CORS origins.
          </li>
          <li className="flex items-start gap-2">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            Run <code className="rounded bg-navy-900 px-1.5 py-0.5 font-mono text-xs text-sky-300">database/schema.sql</code> then{' '}
            <code className="rounded bg-navy-900 px-1.5 py-0.5 font-mono text-xs text-sky-300">database/seed.sql</code> in the Supabase SQL editor.
          </li>
          <li className="flex items-start gap-2">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            Build the frontend with <code className="rounded bg-navy-900 px-1.5 py-0.5 font-mono text-xs text-sky-300">npm run build</code> and
            serve it from any static host.
          </li>
        </ul>
      </Card>

      <div className="glass mt-6 rounded-xl border-yellow-500/20 p-4 text-xs leading-relaxed text-slate-400">
        {DEMO_DISCLAIMER}
      </div>
    </div>
  );
}
