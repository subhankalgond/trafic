import { FormEvent, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Send } from 'lucide-react';
import { Card, SectionTitle, Button, Input, Select, Textarea, ErrorState } from '../components/ui';
import { incidentService } from '../services/services';
import { ApiRequestError } from '../services/api';
import { useToast } from '../context/ToastContext';

const CENTER: [number, number] = [13.62, 74.72];

const TYPES = [
  { value: 'accident', label: 'Accident' },
  { value: 'road_block', label: 'Road block' },
  { value: 'construction', label: 'Construction' },
  { value: 'breakdown', label: 'Vehicle breakdown' },
  { value: 'waterlogging', label: 'Waterlogging' },
  { value: 'signal_failure', label: 'Signal failure' },
  { value: 'congestion', label: 'Heavy congestion' },
];

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const pin = L.divIcon({
  className: '',
  html: '<span style="display:block;width:16px;height:16px;border-radius:50%;background:#EF4444;border:2px solid white"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function ClickableMap({ onPick, marker }: { onPick: (p: [number, number]) => void; marker: [number, number] | null }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return marker ? <Marker position={marker} icon={pin} /> : null;
}

export default function ReportIncidentPage() {
  const toast = useToast();
  const [form, setForm] = useState({
    type: 'accident',
    severity: 'medium',
    description: '',
    locationName: '',
    latitude: '',
    longitude: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) =>
        f.latitude === ''
          ? { ...f, latitude: pos.coords.latitude.toFixed(5), longitude: pos.coords.longitude.toFixed(5) }
          : f
      );
    });
  }, []);

  const marker: [number, number] | null =
    form.latitude && form.longitude ? [Number(form.latitude), Number(form.longitude)] : null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFields({});
    setFatal(null);
    if (!marker) {
      toast('error', 'Pick the incident location on the map or use your current position.');
      return;
    }
    setLoading(true);
    try {
      const { data, message } = await incidentService.create(
        { ...form, latitude: form.latitude, longitude: form.longitude },
        image
      );
      toast('success', `${message} Reference: ${data.incident.incidentId}`);
      setForm((f) => ({ ...f, description: '', locationName: '' }));
      setImage(null);
    } catch (err) {
      const apiErr = err as ApiRequestError;
      setFields(apiErr.fields ?? {});
      if (apiErr.status === 0 || apiErr.status >= 500) setFatal(apiErr.message);
      else toast('error', apiErr.message);
    } finally {
      setLoading(false);
    }
  };

  if (fatal) return <ErrorState message={fatal} />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-white">Report an incident</h1>
      <p className="mt-1 text-sm text-slate-400">
        Reports are reviewed by operators before going live on the network map.
      </p>

      <Card className="mt-6">
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Type" value={form.type} onChange={set('type')}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
            <Select label="Severity" value={form.severity} onChange={set('severity')}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Location name"
            required
            value={form.locationName}
            error={fields.locationName}
            onChange={set('locationName')}
            placeholder="e.g. NH-66 near Bhatkal bus stand"
          />

          <Textarea
            label="Description"
            required
            rows={4}
            value={form.description}
            error={fields.description}
            onChange={set('description')}
            placeholder="What happened? Include anything responders should know (at least 10 characters)."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Latitude"
              required
              value={form.latitude}
              error={fields.latitude}
              onChange={set('latitude')}
              placeholder="13.62000"
            />
            <Input
              label="Longitude"
              required
              value={form.longitude}
              error={fields.longitude}
              onChange={set('longitude')}
              placeholder="74.72000"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-300">Pin on map</span>
            <div className="h-64 overflow-hidden rounded-xl border border-white/10">
              <MapContainer center={marker ?? CENTER} zoom={12} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickableMap
                  marker={marker}
                  onPick={(p) =>
                    setForm((f) => ({ ...f, latitude: p[0].toFixed(5), longitude: p[1].toFixed(5) }))
                  }
                />
              </MapContainer>
            </div>
            <p className="mt-1 text-xs text-slate-500">Click the map to move the pin.</p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">Photo (optional)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-sky-300 hover:file:bg-navy-700"
            />
            <span className="mt-1 block text-xs text-slate-500">JPG, PNG or WebP up to 5 MB.</span>
          </label>

          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            <Send className="h-4 w-4" aria-hidden /> Submit report
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        <SectionTitle sub="You can track responses under My Reports.">What happens next?</SectionTitle>
      </div>
    </div>
  );
}
