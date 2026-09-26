import { useCallback, useEffect, useState } from 'react';
import { Trash2, Eye } from 'lucide-react';
import {
  Card, LoadingSkeleton, ErrorState, EmptyState, SearchBar, Button, Select,
  Modal, ConfirmDialog,
} from '../../components/ui';
import { SeverityBadge, StatusBadge } from '../../components/TrafficLegend';
import { incidentService, Incident } from '../../services/services';
import { ApiRequestError } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const STATUSES = ['reported', 'under_review', 'verified', 'active', 'resolved'];

export default function AdminIncidentsPage() {
  const toast = useToast();
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState<Incident | null>(null);
  const [nextStatus, setNextStatus] = useState('under_review');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Incident | null>(null);

  const load = useCallback(() => {
    setError(null);
    incidentService
      .list()
      .then((d) => setIncidents(d.incidents))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const filtered = (incidents ?? []).filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.incidentId.toLowerCase().includes(q) ||
      i.locationName.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q)
    );
  });

  const openDetail = (i: Incident) => {
    setDetail(i);
    setNextStatus(i.status === 'resolved' ? 'resolved' : 'under_review');
    setNote('');
  };

  const saveStatus = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const { data, message } = await incidentService.updateStatus(detail.id, {
        status: nextStatus,
        note: note.trim() || undefined,
      });
      toast('success', message);
      setIncidents((list) =>
        list?.map((i) => (i.id === detail.id ? { ...i, ...data.incident } : i)) ?? null
      );
      setDetail(null);
    } catch (err) {
      toast('error', (err as ApiRequestError).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await incidentService.remove(toDelete.id);
      toast('success', 'Incident deleted.');
      setIncidents((list) => list?.filter((i) => i.id !== toDelete.id) ?? null);
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-white">Incident management</h1>
      <p className="mt-1 text-sm text-slate-400">Review citizen reports and manage incident status.</p>

      <div className="mb-4 mt-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-md">
          <SearchBar value={search} onChange={setSearch} placeholder="Search incidents…" />
        </div>
        <div className="w-48">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : incidents === null ? (
        <LoadingSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No incidents" message="Reports matching your filters will appear here." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-700/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reported</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-xs text-sky-300">{i.incidentId}</td>
                  <td className="px-4 py-3 font-medium text-white">{i.locationName}</td>
                  <td className="px-4 py-3 text-slate-400">{i.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3"><SeverityBadge severity={i.severity} /></td>
                  <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(i.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" aria-label={`Review ${i.incidentId}`} onClick={() => openDetail(i)}>
                        <Eye className="h-4 w-4 text-sky-300" aria-hidden />
                      </Button>
                      <Button variant="ghost" aria-label={`Delete ${i.incidentId}`} onClick={() => setToDelete(i)}>
                        <Trash2 className="h-4 w-4 text-red-400" aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail ? `Review ${detail.incidentId}` : ''} wide>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={detail.status} />
              <SeverityBadge severity={detail.severity} />
            </div>
            <div>
              <p className="font-semibold text-white">{detail.locationName}</p>
              <p className="mt-1 text-sm text-slate-300">{detail.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                Reported by {detail.reporterName ?? 'anonymous'} · {new Date(detail.createdAt).toLocaleString()}
              </p>
            </div>
            {detail.imageUrl && (
              <img src={detail.imageUrl} alt="Incident" className="max-h-64 w-full rounded-lg border border-white/10 object-cover" />
            )}
            <Select label="Set status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </Select>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Operator note (optional)</span>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400"
                placeholder="Visible to the reporter"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDetail(null)}>Cancel</Button>
              <Button onClick={saveStatus} loading={saving}>Update incident</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete incident"
        message={`Delete ${toDelete?.incidentId ?? ''}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
