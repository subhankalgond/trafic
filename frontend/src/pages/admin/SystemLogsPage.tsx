import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, LoadingSkeleton, ErrorState, EmptyState, Button, Select, Badge } from '../../components/ui';
import { adminService, SystemLog } from '../../services/services';

const SEVERITIES = ['all', 'info', 'success', 'warning', 'critical'];
const SEVERITY_TONE = { info: 'blue', success: 'green', warning: 'yellow', critical: 'red' } as const;

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState('all');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminService
      .logs({ severity: severity === 'all' ? undefined : severity, limit: 200 })
      .then((d) => setLogs(d.logs))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [severity]);

  useEffect(load, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">System logs</h1>
          <p className="mt-1 text-sm text-slate-400">Most recent 200 events recorded by the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity">
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'All severities' : s}</option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : logs === null ? (
        <LoadingSkeleton rows={6} />
      ) : logs.length === 0 ? (
        <EmptyState title="No log entries" message="Events recorded by the system will appear here." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-700/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Badge tone={SEVERITY_TONE[l.severity] ?? 'gray'}>{l.severity}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-sky-300">{l.eventType}</td>
                  <td className="px-4 py-3 text-slate-300">{l.message}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
