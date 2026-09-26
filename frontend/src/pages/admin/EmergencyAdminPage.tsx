import { useEffect, useState } from 'react';
import { Siren, RotateCcw } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Card, KpiCard, LoadingSkeleton, ErrorState, Button, Input, Select } from '../../components/ui';
import { StatusBadge } from '../../components/TrafficLegend';
import { emergencyService, EmergencyEvent } from '../../services/services';
import { ApiRequestError } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function EmergencyAdminPage() {
  const toast = useToast();
  const [events, setEvents] = useState<EmergencyEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [plate, setPlate] = useState('KA 05 MT 7321');
  const [direction, setDirection] = useState('N');
  const [distance, setDistance] = useState('120');
  const [scenario, setScenario] = useState<'single' | 'two_ambulance'>('single');
  const [simulating, setSimulating] = useState(false);

  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof emergencyService.analytics>> | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([emergencyService.events(), emergencyService.analytics()])
      .then(([e, a]) => {
        setEvents(e.events);
        setAnalytics(a);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const simulate = async () => {
    setSimulating(true);
    try {
      const { data, message } = await emergencyService.simulate({
        plate,
        direction,
        distance: Number(distance),
        scenario,
      });
      toast('success', `${message}: ${data.selected.vehicleNumber} → ${data.signal.state.toUpperCase()} on ${data.signal.direction}`);
      load();
    } catch (err) {
      const apiErr = err as ApiRequestError;
      toast('error', apiErr.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const reset = async () => {
    try {
      await emergencyService.reset();
      toast('success', 'Signals restored to automatic mode.');
      load();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Emergency prioritization</h1>
          <p className="mt-1 text-sm text-slate-400">
            Simulate verified emergency vehicles and monitor the priority corridor.
          </p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-bold text-white">
            <Siren className="h-5 w-5 text-red-400 emergency-pulse" aria-hidden /> Run simulation
          </h2>
          <div className="space-y-4">
            <Input
              label="Vehicle plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="KA 05 MT 7321"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Direction" value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="N">North</option>
                <option value="S">South</option>
                <option value="E">East</option>
                <option value="W">West</option>
              </Select>
              <Input
                label="Distance (m)"
                type="number"
                min={20}
                max={2000}
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
            <Select label="Scenario" value={scenario} onChange={(e) => setScenario(e.target.value as 'single' | 'two_ambulance')}>
              <option value="single">Single ambulance</option>
              <option value="two_ambulance">Two ambulances (priority queue)</option>
            </Select>
            <div className="flex gap-2">
              <Button onClick={simulate} loading={simulating} className="flex-1">
                <Siren className="h-4 w-4" aria-hidden /> Simulate
              </Button>
              <Button variant="secondary" onClick={reset}>
                Reset signals
              </Button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-bold text-white">Recent events</h2>
          {events === null ? (
            <LoadingSkeleton rows={4} />
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-500">No emergency events recorded yet.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-navy-700/90 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Intersection</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-t border-white/5">
                      <td className="px-3 py-2 font-medium text-white">{e.vehicleNumber ?? 'None'}</td>
                      <td className="px-3 py-2 text-slate-400">{e.intersection} · {e.direction}</td>
                      <td className="px-3 py-2 text-slate-400">{e.priority}</td>
                      <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                      <td className="px-3 py-2 text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {analytics && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <KpiCard
            icon={<Siren className="h-6 w-6" aria-hidden />}
            label="Total detections"
            value={analytics.totals.detected}
            tone="blue"
          />
          <KpiCard
            icon={<Siren className="h-6 w-6" aria-hidden />}
            label="Active corridors"
            value={analytics.totals.active}
            tone="red"
          />
          <KpiCard
            icon={<Siren className="h-6 w-6" aria-hidden />}
            label="Avg clearance (min)"
            value={analytics.totals.avgClearanceMinutes}
            tone="green"
          />
        </div>
      )}

      {analytics && analytics.perDay.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-4 font-bold text-white">Emergency events per day</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.perDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16344F" />
              <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#102A44', border: '1px solid #16344F', borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="count" fill="#EF4444" name="events" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
