import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Car } from 'lucide-react';
import {
  Card, LoadingSkeleton, ErrorState, EmptyState, SearchBar, Button, Input, Select,
  Modal, ConfirmDialog, Badge,
} from '../../components/ui';
import { vehicleService, EmergencyVehicle } from '../../services/services';
import { ApiRequestError } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const EMPTY = {
  vehicleNumber: '',
  vehicleType: 'ambulance',
  organization: '',
  priority: 'high',
  status: 'active',
};

type FormState = {
  vehicleNumber: string;
  vehicleType: string;
  organization: string;
  priority: string;
  status: string;
};

const asVehicleBody = (f: FormState): Omit<EmergencyVehicle, 'id' | 'createdAt'> => ({
  vehicleNumber: f.vehicleNumber,
  vehicleType: f.vehicleType as EmergencyVehicle['vehicleType'],
  organization: f.organization,
  priority: f.priority as EmergencyVehicle['priority'],
  status: f.status as EmergencyVehicle['status'],
});

export default function VehiclesPage() {
  const toast = useToast();
  const [vehicles, setVehicles] = useState<EmergencyVehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyVehicle | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<EmergencyVehicle | null>(null);

  const load = useCallback(() => {
    setError(null);
    vehicleService
      .list()
      .then((d) => setVehicles(d.vehicles))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFields({});
    setModalOpen(true);
  };

  const openEdit = (v: EmergencyVehicle) => {
    setEditing(v);
    setForm({
      vehicleNumber: v.vehicleNumber,
      vehicleType: v.vehicleType,
      organization: v.organization,
      priority: v.priority,
      status: v.status,
    });
    setFields({});
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFields({});
    setSaving(true);
    try {
      if (editing) {
        const { message } = await vehicleService.update(editing.id, asVehicleBody(form));
        toast('success', message);
      } else {
        const { message } = await vehicleService.create(asVehicleBody(form));
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
      await vehicleService.remove(toDelete.id);
      toast('success', 'Vehicle removed from the registry.');
      setVehicles((vs) => vs?.filter((v) => v.id !== toDelete.id) ?? null);
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setToDelete(null);
    }
  };

  const filtered = (vehicles ?? []).filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.vehicleNumber.toLowerCase().includes(q) ||
      v.organization.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Emergency vehicles</h1>
          <p className="mt-1 text-sm text-slate-400">
            Registered vehicles eligible for signal priority. Plates are verified before priority is granted.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden /> Register vehicle
        </Button>
      </div>

      <div className="mb-4 max-w-md">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by plate or organization…" />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : vehicles === null ? (
        <LoadingSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No vehicles"
          message="Register an emergency vehicle to enable the priority pipeline."
          action={<Button onClick={openCreate}>Register vehicle</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <Card key={v.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                    <Car className="h-5 w-5 text-red-400" aria-hidden />
                  </span>
                  <div>
                    <p className="font-mono font-bold text-white">{v.vehicleNumber}</p>
                    <p className="text-xs text-slate-400">{v.organization}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" aria-label={`Edit ${v.vehicleNumber}`} onClick={() => openEdit(v)}>
                    <Pencil className="h-4 w-4 text-sky-300" aria-hidden />
                  </Button>
                  <Button variant="ghost" aria-label={`Delete ${v.vehicleNumber}`} onClick={() => setToDelete(v)}>
                    <Trash2 className="h-4 w-4 text-red-400" aria-hidden />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={v.vehicleType === 'ambulance' ? 'red' : 'blue'}>
                  {v.vehicleType.replace(/_/g, ' ')}
                </Badge>
                <Badge tone={v.priority === 'critical' ? 'red' : v.priority === 'high' ? 'orange' : 'yellow'}>
                  {v.priority} priority
                </Badge>
                <Badge tone={v.status === 'active' ? 'green' : 'gray'}>{v.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.vehicleNumber}` : 'Register vehicle'}
      >
        <form className="space-y-4" onSubmit={save} noValidate>
          <Input
            label="Plate number"
            required
            value={form.vehicleNumber}
            error={fields.vehicleNumber}
            onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))}
            placeholder="KA 05 MT 7321"
          />
          <Select
            label="Vehicle type"
            value={form.vehicleType}
            error={fields.vehicleType}
            onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
          >
            <option value="ambulance">Ambulance</option>
            <option value="patient_transport">Patient transport</option>
            <option value="emergency_medical">Emergency medical</option>
          </Select>
          <Input
            label="Organization"
            required
            value={form.organization}
            error={fields.organization}
            onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
            placeholder="City General Hospital"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </Select>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Register'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete vehicle"
        message={`Remove ${toDelete?.vehicleNumber ?? ''} from the emergency registry? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
