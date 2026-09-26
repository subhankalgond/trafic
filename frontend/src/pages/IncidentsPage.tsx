import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin } from 'lucide-react';
import { Card, LoadingSkeleton, ErrorState, EmptyState, SearchBar, Button, Modal } from '../components/ui';
import { SeverityBadge, StatusBadge } from '../components/TrafficLegend';
import { incidentService, Incident } from '../services/services';
import { useAuth } from '../context/AuthContext';

const TYPES = ['all', 'accident', 'road_block', 'construction', 'breakdown', 'waterlogging', 'signal_failure', 'congestion'];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Incident | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    incidentService
      .list()
      .then((d) => setIncidents(d.incidents))
      .catch((e: Error) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!incidents) return [];
    let list = incidents;
    if (type !== 'all') list = list.filter((i) => i.type === type);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.incidentId.toLowerCase().includes(q) ||
          i.locationName.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [incidents, type, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Traffic Incidents</h1>
          <p className="mt-1 text-sm text-slate-400">Community reported incidents on the monitored network.</p>
        </div>
        <div className="flex gap-2">
          {user && (
            <Link to="/report-incident">
              <Button>
                <Plus className="h-4 w-4" aria-hidden /> Report Incident
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ID, location or description..." label="Search incidents" />
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium capitalize ${
                type === t ? 'border-sky-400 bg-sky-500/15 text-sky-200' : 'border-white/10 text-slate-400 hover:border-sky-500/40'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {!error && !incidents && <LoadingSkeleton rows={5} />}
      {!error && incidents && filtered.length === 0 && (
        <EmptyState
          title="No incidents found"
          message={type === 'all' ? 'No incidents have been reported on the network yet.' : 'Nothing matches this filter. Try a different type.'}
        />
      )}

      {!error && incidents && filtered.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((i) => (
            <Card key={i.id} className="cursor-pointer transition-colors hover:border-sky-500/40" >
              <button className="w-full text-left" onClick={() => setDetail(i)}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-slate-500">{i.incidentId}</span>
                  <StatusBadge status={i.status} />
                </div>
                <h3 className="mt-2 font-bold capitalize text-white">{i.type.replace('_', ' ')}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{i.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" aria-hidden /> {i.locationName}
                  </span>
                  <SeverityBadge severity={i.severity} />
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.incidentId ?? ''}>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold capitalize text-white">{detail.type.replace('_', ' ')}</span>
              <div className="flex gap-2">
                <SeverityBadge severity={detail.severity} />
                <StatusBadge status={detail.status} />
              </div>
            </div>
            <p className="text-slate-300">{detail.description}</p>
            <div className="rounded-lg border border-white/10 bg-navy-900/60 p-3 text-xs text-slate-400">
              <p><span className="text-slate-500">Location:</span> {detail.locationName}</p>
              <p><span className="text-slate-500">Reported by:</span> {detail.reporterName ?? 'Anonymous'}</p>
              <p><span className="text-slate-500">Reported:</span> {new Date(detail.createdAt).toLocaleString()}</p>
              {detail.resolvedAt && <p><span className="text-slate-500">Resolved:</span> {new Date(detail.resolvedAt).toLocaleString()}</p>}
              {detail.adminNote && <p className="mt-1"><span className="text-slate-500">Control room note:</span> {detail.adminNote}</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
