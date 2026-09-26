import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Save, Clock, Route as RouteIcon } from 'lucide-react';
import { Card, SectionTitle, Button, Input, Badge } from '../components/ui';
import { demoRoute, DemoRoute, userService } from '../services/services';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CENTER: [number, number] = [13.62, 74.72];

const pinIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const ROUTE_TONES = {
  low: '#22C55E',
  moderate: '#FACC15',
  high: '#F97316',
  severe: '#EF4444',
} as const;

export default function RoutesPage() {
  const [start, setStart] = useState('Bhatkal Main Road');
  const [destination, setDestination] = useState('Murudeshwar');
  const [routes, setRoutes] = useState<DemoRoute[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const toast = useToast();

  // deterministic demo coordinates derived from the query text
  const coords = useMemo(() => {
    const h = (s: string) => {
      let x = 0;
      for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) % 1000;
      return x / 1000;
    };
    const startPt: [number, number] = [13.98 + h(start) * 0.04 - 0.02, 74.55 + h(start + 'x') * 0.04 - 0.02];
    const endPt: [number, number] = [14.09 + h(destination) * 0.04 - 0.02, 74.48 + h(destination + 'x') * 0.04 - 0.02];
    return { startPt, endPt };
  }, [start, destination]);

  const findRoutes = () => {
    if (!start.trim() || !destination.trim()) {
      toast('error', 'Enter both a start and a destination.');
      return;
    }
    setLoading(true);
    // Simulated route generation. Swap demoRoute for OSRM/Mapbox later.
    window.setTimeout(() => {
      setRoutes(demoRoute(coords.startPt, coords.endPt));
      setSelected(0);
      setLoading(false);
      toast('info', 'Routes generated from simulated data, not live traffic.');
    }, 400);
  };

  const saveRoute = async () => {
    if (!user) {
      toast('error', 'Log in to save routes.');
      return;
    }
    try {
      await userService.saveRoute({ name: `${start} to ${destination}`, startLocation: start, destination });
      toast('success', 'Route saved to your account.');
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-white">Route Planner</h1>
        <p className="mt-1 text-sm text-slate-400">
          Simulated routes with traffic-based travel estimates. A real routing API can be connected later.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Card>
            <SectionTitle>Plan a trip</SectionTitle>
            <div className="space-y-3">
              <Input label="Start" value={start} onChange={(e) => setStart(e.target.value)} placeholder="Start location" />
              <Input label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" />
              <Button className="w-full" onClick={findRoutes} loading={loading}>
                <Navigation className="h-4 w-4" aria-hidden /> Find Route
              </Button>
              {user && routes && (
                <Button variant="secondary" className="w-full" onClick={saveRoute}>
                  <Save className="h-4 w-4" aria-hidden /> Save this trip
                </Button>
              )}
            </div>
          </Card>

          {routes && (
            <Card>
              <SectionTitle sub="Ranked by simulated traffic conditions.">Route Options</SectionTitle>
              <ul className="space-y-2">
                {routes.map((r, i) => (
                  <li key={r.label}>
                    <button
                      onClick={() => setSelected(i)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                        selected === i ? 'border-sky-400 bg-sky-500/10' : 'border-white/10 bg-navy-900/50 hover:border-sky-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{r.label}</span>
                        <Badge tone={r.traffic === 'low' ? 'green' : r.traffic === 'moderate' ? 'yellow' : r.traffic === 'high' ? 'orange' : 'red'}>
                          {r.traffic.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><RouteIcon className="h-3.5 w-3.5" aria-hidden /> {r.distanceKm} km</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> {r.minutes} min</span>
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card className="!p-2">
          <MapContainer center={routes ? routes[selected].path[0] : CENTER} zoom={11} className="h-[420px] w-full rounded-xl sm:h-[560px]">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routes && (
              <>
                <Marker position={routes[selected].path[0]} icon={pinIcon('#22C55E')} />
                <Marker position={routes[selected].path[routes[selected].path.length - 1]} icon={pinIcon('#EF4444')} />
                {routes.map((r, i) => (
                  <Polyline
                    key={r.label}
                    positions={r.path}
                    pathOptions={{
                      color: ROUTE_TONES[r.traffic],
                      weight: selected === i ? 6 : 3,
                      opacity: selected === i ? 0.9 : 0.45,
                    }}
                  />
                ))}
              </>
            )}
          </MapContainer>
        </Card>
      </div>
    </div>
  );
}
