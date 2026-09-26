import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, LoadingSkeleton, ErrorState, EmptyState, SearchBar, Button, Modal } from '../components/ui';
import { SeverityBadge, StatusBadge } from '../components/TrafficLegend';
import { incidentService, Incident } from '../services/services';

export default function UserReportsPage() {
  const [reports, setReports] = useState<Incident[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Incident | null>(null);

  const load = useCallback(() => {
    setError(null);
    incidentService
      .myReports()
      .then((d) => setReports(d.reports))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const filtered = (reports ?? []).filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.incidentId.toLowerCase().includes(q) ||
      r.locationName.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">My reports</h1>
          <p className="mt-1 text-sm text-slate-400">Incidents you have submitted and their review status.</p>
        </div>
        <Link to="/report-incident">
          <Button>
            <Plus className="h-4 w-4" aria-hidden /> New report
          </Button>
        </Link>
      </div>

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by reference, location or text…" />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : reports === null ? (
        <LoadingSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No reports yet"
          message="Anything you report will appear here with its review status."
          action={
            <Link to="/report-incident">
              <Button>Report your first incident</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <Card key={r.id} className="cursor-pointer transition-colors hover:border-sky-500/30" >
              <button className="w-full text-left" onClick={() => setDetail(r)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{r.locationName}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {r.incidentId} · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{r.description}</p>
                <div className="mt-3">
                  <SeverityBadge severity={r.severity} />
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.incidentId ?? ''}>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={detail.status} />
              <SeverityBadge severity={detail.severity} />
            </div>
            <p className="font-semibold text-white">{detail.locationName}</p>
            <p className="text-slate-300">{detail.description}</p>
            <p className="text-xs text-slate-500">
              Reported {new Date(detail.createdAt).toLocaleString()}
              {detail.resolvedAt && ` · Resolved ${new Date(detail.resolvedAt).toLocaleString()}`}
            </p>
            {detail.adminNote && (
              <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sky-200">
                Operator note: {detail.adminNote}
              </p>
            )}
            {detail.imageUrl && (
              <img
                src={detail.imageUrl}
                alt="Incident"
                className="max-h-64 w-full rounded-lg border border-white/10 object-cover"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
