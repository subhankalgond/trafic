import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, LoadingSkeleton, ErrorState, SearchBar, Button, Badge } from '../../components/ui';
import { TrafficLevelBadge } from '../../components/TrafficLegend';
import { trafficService, RoadFeed } from '../../services/services';

export default function TrafficManagementPage() {
  const [roads, setRoads] = useState<RoadFeed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    trafficService
      .roads()
      .then((d) => setRoads(d.roads))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = (roads ?? []).filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.area.toLowerCase().includes(q) || r.city.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Traffic management</h1>
          <p className="mt-1 text-sm text-slate-400">Live road conditions across the monitored network.</p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
        </Button>
      </div>

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder="Search roads, areas or cities…" />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : roads === null ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-700/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Road</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Vehicles</th>
                <th className="px-4 py-3 text-right">Avg speed</th>
                <th className="px-4 py-3 text-right">Density</th>
                <th className="px-4 py-3 text-right">Incidents</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                  <td className="px-4 py-3 text-slate-400">{r.area}, {r.city}</td>
                  <td className="px-4 py-3"><TrafficLevelBadge level={r.traffic_level} /></td>
                  <td className="px-4 py-3">
                    <Badge tone={r.road_status === 'open' ? 'green' : r.road_status === 'busy' ? 'yellow' : r.road_status === 'construction' ? 'orange' : 'red'}>
                      {r.road_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.vehicleCount}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.averageSpeed} km/h</td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.density}%</td>
                  <td className="px-4 py-3 text-right">
                    {r.incidentCount > 0 ? <Badge tone="red">{r.incidentCount}</Badge> : <span className="text-slate-500">0</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No roads match your search.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
