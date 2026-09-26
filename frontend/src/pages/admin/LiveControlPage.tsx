import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, LoadingSkeleton, ErrorState, Badge, Button } from '../../components/ui';
import { StatusBadge } from '../../components/TrafficLegend';
import {
  vehicleService, DetectionFeed,
  signalService, SignalRow,
  emergencyService, EmergencyEvent,
} from '../../services/services';

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

const SIGNAL_TONE = { green: 'green', yellow: 'yellow', red: 'red' } as const;

export default function LiveControlPage() {
  const [detections, setDetections] = useState<DetectionFeed[] | null>(null);
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([vehicleService.detections(), signalService.list(), emergencyService.events()])
      .then(([d, s, e]) => {
        setDetections(d.detections);
        setSignals(s.signals);
        setEvents(e.events);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (detections === null) return <LoadingSkeleton rows={6} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Live control</h1>
          <p className="mt-1 text-sm text-slate-400">Streaming detection feed, signal states and emergency events.</p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-bold text-white">AI detection feed</h2>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-navy-700/90 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Camera</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {detections.map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="px-3 py-2 font-mono text-xs text-sky-300">{d.cameraId}</td>
                    <td className="px-3 py-2 text-slate-200">{d.vehicleNumber ?? 'Unknown'}</td>
                    <td className="px-3 py-2 text-slate-400">{d.vehicleType?.replace(/_/g, ' ') ?? 'Unknown'}</td>
                    <td className="px-3 py-2">
                      <Badge tone={d.confidence >= 0.9 ? 'green' : d.confidence >= 0.75 ? 'yellow' : 'gray'}>
                        {(d.confidence * 100).toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{timeAgo(d.detectedAt)}</td>
                  </tr>
                ))}
                {detections.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No detections yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-bold text-white">Signal states</h2>
            <ul className="space-y-2">
              {signals.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-navy-900/50 px-3 py-2">
                  <span className="text-sm text-slate-200">{s.intersection} · {s.direction}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={SIGNAL_TONE[s.state] ?? 'gray'}>{s.state.toUpperCase()}</Badge>
                    {s.remainingSeconds > 0 && <span className="text-xs text-slate-500">{s.remainingSeconds}s</span>}
                  </span>
                </li>
              ))}
              {signals.length === 0 && <p className="text-sm text-slate-500">No signals registered.</p>}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-white">Emergency events</h2>
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">No emergency activity.</p>
            ) : (
              <ul className="space-y-2">
                {events.slice(0, 8).map((e) => (
                  <li key={e.id} className="rounded-lg border border-white/10 bg-navy-900/50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">{e.vehicleNumber ?? 'Unknown vehicle'}</span>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {e.intersection} · {e.direction} · {e.distance}m · {timeAgo(e.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
