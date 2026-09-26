import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Card, LoadingSkeleton, ErrorState, Button, Select } from '../../components/ui';
import { adminService } from '../../services/services';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
];

type Analytics = Awaited<ReturnType<typeof adminService.analytics>>;

export default function AnalyticsPage() {
  const [range, setRange] = useState('7');
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminService
      .analytics(range)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(load, [load]);

  const tooltipStyle = { background: '#102A44', border: '1px solid #16344F', borderRadius: 8 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Network analytics</h1>
          <p className="mt-1 text-sm text-slate-400">Traffic volume, density, speed and incident trends.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" onClick={load} loading={loading}>Apply</Button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data === null ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-bold text-white">Traffic volume</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.volume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#16344F" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={2} name="vehicles" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-white">Average density (%)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.density}>
                <CartesianGrid strokeDasharray="3 3" stroke="#16344F" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="#FACC15" strokeWidth={2} name="density" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-white">Average speed (km/h)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.speed}>
                <CartesianGrid strokeDasharray="3 3" stroke="#16344F" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} name="speed" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-white">Incidents per day</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.incidentsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#16344F" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} name="incidents" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-white">Emergency events per day</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.emergencyByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#16344F" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#F97316" strokeWidth={2} name="events" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-white">Emergency events by type</h2>
            <div className="space-y-2">
              {data.emergencyByType.length === 0 && (
                <p className="text-sm text-slate-500">No emergency events in this range.</p>
              )}
              {data.emergencyByType.map((t) => (
                <div key={t.type} className="flex items-center justify-between rounded-lg border border-white/10 bg-navy-900/50 px-3 py-2 text-sm">
                  <span className="text-slate-300">{t.type.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-white">{t.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
