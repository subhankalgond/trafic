import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Card, LoadingSkeleton, ErrorState, EmptyState, SearchBar, Button, Input, Select,
  Modal, ConfirmDialog, Badge,
} from '../../components/ui';
import { roadService, AdminRoad } from '../../services/services';
import { ApiRequestError } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const EMPTY = {
  name: '',
  area: '',
  city: '',
  latitude: '',
  longitude: '',
  lanes: '2',
  speedLimit: '50',
  trafficLevel: 'low',
  roadStatus: 'open',
};

type FormState = typeof EMPTY;

export default function RoadsPage() {
  const toast = useToast();
  const [roads, setRoads] = useState<AdminRoad[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRoad | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AdminRoad | null>(null);

  const load = useCallback(() => {
    setError(null);
    roadService
      .list()
      .then((d) => setRoads(d.roads))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFields({});
    setModalOpen(true);
  };

  const openEdit = (r: AdminRoad) => {
    setEditing(r);
    setForm({
      name: r.name,
      area: r.area,
      city: r.city,
      latitude: String(r.latitude),
      longitude: String(r.longitude),
      lanes: String(r.lanes),
      speedLimit: String(r.speedLimit),
      trafficLevel: r.trafficLevel,
      roadStatus: r.roadStatus,
    });
    setFields({});
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFields({});
    setSaving(true);
    const body = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      lanes: Number(form.lanes),
      speedLimit: Number(form.speedLimit),
    };
    try {
      if (editing) {
        const { message } = await roadService.update(editing.id, body);
        toast('success', message);
      } else {
        const { message } = await roadService.create(body);
        toast('success', message);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const apiErr = err as ApiRequestError;
      setFields(apiErr.fields ?? {});
      toast('error', apiErr.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await roadService.remove(toDelete.id);
      toast('success', 'Road deleted.');
      setRoads((rs) => rs?.filter((r) => r.id !== toDelete.id) ?? null);
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setToDelete(null);
    }
  };

  const filtered = (roads ?? []).filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.area.toLowerCase().includes(q) || r.city.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Roads</h1>
          <p className="mt-1 text-sm text-slate-400">Manage the monitored road network.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden /> Add road
        </Button>
      </div>

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder="Search roads…" />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : roads === null ? (
        <LoadingSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No roads" message="Add a road to start monitoring traffic." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-700/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Lanes</th>
                <th className="px-4 py-3 text-right">Speed limit</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                  <td className="px-4 py-3 text-slate-400">{r.area}</td>
                  <td className="px-4 py-3 text-slate-400">{r.city}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.trafficLevel === 'low' ? 'green' : r.trafficLevel === 'moderate' ? 'yellow' : r.trafficLevel === 'high' ? 'orange' : 'red'}>
                      {r.trafficLevel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{r.roadStatus}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.lanes}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.speedLimit} km/h</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4 text-sky-300" aria-hidden />
                      </Button>
                      <Button variant="ghost" aria-label={`Delete ${r.name}`} onClick={() => setToDelete(r)}>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add road'}
        wide
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={save} noValidate>
          <Input label="Name" required value={form.name} error={fields.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Area" required value={form.area} error={fields.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
          <Input label="City" required value={form.city} error={fields.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" required value={form.latitude} error={fields.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
            <Input label="Longitude" required value={form.longitude} error={fields.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
          </div>
          <Input label="Lanes" type="number" min={1} max={12} value={form.lanes} error={fields.lanes}
            onChange={(e) => setForm((f) => ({ ...f, lanes: e.target.value }))} />
          <Input label="Speed limit (km/h)" type="number" min={10} max={120} value={form.speedLimit} error={fields.speedLimit}
            onChange={(e) => setForm((f) => ({ ...f, speedLimit: e.target.value }))} />
          <Select label="Traffic level" value={form.trafficLevel}
            onChange={(e) => setForm((f) => ({ ...f, trafficLevel: e.target.value }))}>
            {['low', 'moderate', 'high', 'severe'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
          <Select label="Road status" value={form.roadStatus}
            onChange={(e) => setForm((f) => ({ ...f, roadStatus: e.target.value }))}>
            {['open', 'busy', 'congested', 'blocked', 'construction'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Add road'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete road"
        message={`Delete "${toDelete?.name ?? ''}" and all its traffic history? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
