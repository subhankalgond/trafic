import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Siren, AlertTriangle, Gauge, ArrowRight, Bell } from 'lucide-react';
import { Card, KpiCard, LoadingSkeleton, ErrorState, Badge } from '../components/ui';
import { StatusBadge, SeverityBadge } from '../components/TrafficLegend';
import { trafficService, TrafficKpis, incidentService, Incident, userService, NotificationItem } from '../services/services';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<TrafficKpis | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      trafficService.overview(),
      incidentService.list({ status: 'active' }),
      userService.notifications(),
    ])
      .then(([k, i, n]) => {
        setKpis(k.kpis);
        setIncidents(i.incidents.slice(0, 5));
        setNotifications(n.notifications.slice(0, 4));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <ErrorState message={error} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-white">Welcome back, {user?.name.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-slate-400">
        Live overview of the monitored network. All figures are simulated demo data.
      </p>

      {!kpis ? (
        <LoadingSkeleton rows={2} className="mt-6" />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard icon={<Activity className="h-6 w-6" aria-hidden />} label="Vehicles tracked" value={kpis.totalVehicles} tone="blue" />
          <KpiCard icon={<AlertTriangle className="h-6 w-6" aria-hidden />} label="Active incidents" value={kpis.activeIncidents} tone="red" />
          <KpiCard icon={<Gauge className="h-6 w-6" aria-hidden />} label="Congested roads" value={kpis.congestedRoads} tone="orange" />
          <KpiCard icon={<Siren className="h-6 w-6" aria-hidden />} label="Emergency vehicles" value={kpis.emergencyVehicles} tone="green" />
          <KpiCard icon={<Gauge className="h-6 w-6" aria-hidden />} label="Signals monitored" value={kpis.signalsMonitored} tone="blue" />
          <KpiCard icon={<Activity className="h-6 w-6" aria-hidden />} label="Avg speed (km/h)" value={kpis.averageSpeed} tone="yellow" />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Active incidents</h2>
            <Link to="/incidents" className="flex items-center gap-1 text-sm font-medium text-sky-300 hover:text-sky-200">
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {incidents.length === 0 ? (
            <p className="text-sm text-slate-400">No active incidents. Roads are clear.</p>
          ) : (
            <ul className="space-y-3">
              {incidents.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-navy-900/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{i.locationName}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{i.incidentId} · {i.type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={i.status} />
                    <SeverityBadge severity={i.severity} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Bell className="h-4 w-4 text-sky-400" aria-hidden /> Latest notifications
            </h2>
            <Link to="/notifications" className="flex items-center gap-1 text-sm font-medium text-sky-300 hover:text-sky-200">
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing new right now.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li key={n.id} className="rounded-lg border border-white/10 bg-navy-900/50 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{n.title}</p>
                    {!n.isRead && <Badge tone="blue">New</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{n.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
