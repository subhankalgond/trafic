import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LocateFixed, RefreshCw } from 'lucide-react';
import { Card, SectionTitle, Badge, LoadingSkeleton, ErrorState, Button, SearchBar } from '../components/ui';
import { TrafficLegend, TrafficLevelBadge, StatusBadge } from '../components/TrafficLegend';
import { trafficService, RoadFeed, incidentService, Incident } from '../services/services';
import { useToast } from '../context/ToastContext';

const CENTER: [number, number] = [13.6, 74.7];

const statusColors: Record<string, string> = {
  open: '#22C55E',
  busy: '#FACC15',
  congested: '#F97316',
  blocked: '#EF4444',
  construction: '#A855F7',
};

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);
  return null;
}

function makeIncidentIcon(severity: string) {
  const color =
    severity === 'critical' ? '#7F1D1D' : severity === 'high' ? '#EF4444' : severity === 'medium' ? '#F97316' : '#FACC15';
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #06111F;box-shadow:0 0 6px ${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function LiveTrafficPage() {
  const [roads, setRoads] = useState<RoadFeed[] | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [locateTo, setLocateTo] = useState<[number, number] | null>(null);
  const toast = useToast();

  const load = () => {
    setError(null);
    Promise.all([trafficService.roads(), incidentService.list({ status: 'active' })])
      .then(([r, i]) => {
        setRoads(r.roads);
        setIncidents(i.incidents);
      })
      .catch((e: Error) => setError(e.message));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!roads) return [];
    let list = roads;
    if (filter !== 'all') list = list.filter((r) => r.traffic_level === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.area.toLowerCase().includes(q)
      );
    }
    return list;
  }, [roads, filter, search]);

  const locate = () => {
    if (!navigator.geolocation) {
      toast('error', 'Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocateTo([pos.coords.latitude, pos.coords.longitude]),
      () => toast('error', 'Location permission denied. Enable it to use current location.')
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Live Traffic Map</h1>
          <p className="mt-1 text-sm text-slate-400">
            Road conditions and active incidents. Traffic levels are simulated sample data.
          </p>
        </div>
        <Badge tone="yellow">SIMULATED DATA</Badge>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && !roads && <LoadingSkeleton rows={4} />}

      {!error && roads && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            <MapContainer center={CENTER} zoom={9} className="h-[420px] w-full sm:h-[560px]" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Recenter center={locateTo} />
              {filtered.map((r) => (
                <CircleMarker
                  key={r.id}
                  center={[r.latitude, r.longitude]}
                  radius={Math.max(8, Math.min(18, 6 + r.density / 8))}
                  pathOptions={{
                    color: statusColors[r.road_status] ?? '#38BDF8',
                    fillColor: r.traffic_level === 'low' ? '#22C55E' : r.traffic_level === 'moderate' ? '#FACC15' : r.traffic_level === 'high' ? '#F97316' : '#EF4444',
                    fillOpacity: 0.65,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="min-w-44">
                      <b>{r.name}</b>
                      <p>
                        Traffic: {r.traffic_level.toUpperCase()}<br />
                        Vehicles: {r.vehicleCount}<br />
                        Avg speed: {r.averageSpeed} km/h<br />
                        Status: {r.road_status}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {incidents.map((i) => (
                <Marker key={i.id} position={[i.latitude, i.longitude]} icon={makeIncidentIcon(i.severity)}>
                  <Popup>
                    <div className="min-w-44">
                      <b>{i.incidentId}</b>
                      <p>
                        {i.type.replace('_', ' ').toUpperCase()} - {i.severity.toUpperCase()}<br />
                        {i.locationName}<br />
                        Status: {i.status}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            <div className="absolute bottom-4 left-4 z-[500]">
              <TrafficLegend />
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <div className="space-y-3">
                <SearchBar value={search} onChange={setSearch} placeholder="Search road, area or city..." label="Search roads" />
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'low', 'moderate', 'high', 'severe'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium capitalize ${
                        filter === f ? 'border-sky-400 bg-sky-500/15 text-sky-200' : 'border-white/10 text-slate-400 hover:border-sky-500/40'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={locate}>
                    <LocateFixed className="h-4 w-4" aria-hidden /> My location
                  </Button>
                  <Button variant="secondary" onClick={load}>
                    <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="max-h-[480px] overflow-y-auto">
              <SectionTitle sub={`${filtered.length} roads shown`}>Road Conditions</SectionTitle>
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No roads match this filter.</p>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((r) => (
                    <li key={r.id} className="rounded-lg border border-white/10 bg-navy-900/50 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{r.name}</p>
                        <TrafficLevelBadge level={r.traffic_level} />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {r.vehicleCount} vehicles - {r.averageSpeed} km/h - {r.area}, {r.city}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs" style={{ color: statusColors[r.road_status] }}>
                          {r.road_status.toUpperCase()}
                        </span>
                        {r.incidentCount > 0 && <StatusBadge status="active" />}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
