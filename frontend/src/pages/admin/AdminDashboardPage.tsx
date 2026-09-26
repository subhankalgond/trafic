import { useEffect, useState } from 'react';
import { Users, FileWarning, Car, Radio, Activity, Gauge, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, KpiCard, LoadingSkeleton, ErrorState } from '../../components/ui';
import { adminService, AdminDashboard } from '../../services/services';

const SEVERITY_COLORS = ['#22C55E', '#FACC15', '#F97316', '#EF4444'];

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    adminService
      .dashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingSkeleton rows={6} />;

  const k = data.kpis;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-white">Control center overview</h1>
      <p className="mt-1 text-sm text-slate-400">Operational snapshot across the simulated network.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<Users className="h-6 w-6" aria-hidden />} label="Registered users" value={k.totalUsers} tone="blue" />
        <KpiCard icon={<FileWarning className="h-6 w-6" aria-hidden />} label="Open incidents" value={k.openIncidents} tone="red" />
        <KpiCard icon={<Car className="h-6 w-6" aria-hidden />} label="Active emergency vehicles" value={k.activeEmergencyVehicles} tone="green" />
        <KpiCard icon={<Radio className="h-6 w-6" aria-hidden />} label="Signals online" value={k.signalsOnline} tone="blue" />
        <KpiCard icon={<Gauge className="h-6 w-6" aria-hidden />} label="Monitored roads" value={k.monitoredRoads} tone="yellow" />
        <KpiCard icon={<Activity className="h-6 w-6" aria-hidden />} label="Emergency events" value={k.activeEmergencyEvents} tone="orange" />
        <KpiCard icon={<Gauge className="h-6 w-6" aria-hidden />} label="Congested roads" value={k.congestedRoads} tone="red" />
        <KpiCard icon={<TrendingUp className="h-6 w-6" aria-hidden />} label="7-day reports" value={data.volumeTrend.reduce((a, d) => a + d.count, 0)} tone="blue" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold text-white">Reported incidents per day (7d)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.volumeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16344F" />
              <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#102A44', border: '1px solid #16344F', borderRadius: 8 }} />
              <Area type="monotone" dataKey="count" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.2} name="reports" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-white">Average clearance time (minutes, 7d)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.clearanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16344F" />
              <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} />
              <Tooltip contentStyle={{ background: '#102A44', border: '1px solid #16344F', borderRadius: 8 }} />
              <Area type="monotone" dataKey="minutes" stroke="#22C55E" fill="#22C55E" fillOpacity={0.2} name="minutes" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-white">Incidents by type</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.incidentsByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16344F" />
              <XAxis dataKey="type" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#102A44', border: '1px solid #16344F', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#0EA5E9" name="incidents" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 font-bold text-white">Incidents by severity</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.incidentsBySeverity} dataKey="count" nameKey="severity" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {data.incidentsBySeverity.map((entry, i) => (
                  <Cell key={entry.severity} fill={SEVERITY_COLORS[i % SEVERITY_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: '#102A44', border: '1px solid #16344F', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
