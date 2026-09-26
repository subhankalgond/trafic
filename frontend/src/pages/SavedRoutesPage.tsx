import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { Card, LoadingSkeleton, ErrorState, EmptyState, Button, Input, ConfirmDialog } from '../components/ui';
import { userService, SavedRoute } from '../services/services';
import { ApiRequestError } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function SavedRoutesPage() {
  const toast = useToast();
  const [routes, setRoutes] = useState<SavedRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', startLocation: '', destination: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SavedRoute | null>(null);

  const load = useCallback(() => {
    setError(null);
    userService
      .savedRoutes()
      .then((d) => setRoutes(d.routes))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFields({});
    setSaving(true);
    try {
      await userService.saveRoute(form);
      toast('success', 'Route saved.');
      setForm({ name: '', startLocation: '', destination: '' });
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
      await userService.deleteRoute(toDelete.id);
      toast('success', 'Route deleted.');
      setRoutes((rs) => rs?.filter((r) => r.id !== toDelete.id) ?? null);
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-white">Saved routes</h1>
      <p className="mt-1 text-sm text-slate-400">Your favourite journeys, saved to your account.</p>

      <Card className="mt-6">
        <h2 className="mb-4 font-bold text-white">Save a new route</h2>
        <form className="grid gap-4 sm:grid-cols-4" onSubmit={submit} noValidate>
          <Input
            label="Name"
            required
            value={form.name}
            error={fields.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Home to work"
          />
          <Input
            label="Start"
            required
            value={form.startLocation}
            error={fields.startLocation}
            onChange={(e) => setForm((f) => ({ ...f, startLocation: e.target.value }))}
            placeholder="Bhatkal"
          />
          <Input
            label="Destination"
            required
            value={form.destination}
            error={fields.destination}
            onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
            placeholder="Murudeshwar"
          />
          <div className="flex items-end">
            <Button type="submit" loading={saving} className="w-full">
              <Bookmark className="h-4 w-4" aria-hidden /> Save route
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : routes === null ? (
          <LoadingSkeleton rows={3} />
        ) : routes.length === 0 ? (
          <EmptyState title="No saved routes" message="Save a route above to see it listed here." />
        ) : (
          <ul className="space-y-3">
            {routes.map((r) => (
              <li key={r.id}>
                <Card className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{r.name}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-400">
                      {r.startLocation} → {r.destination}
                    </p>
                  </div>
                  <Button variant="ghost" aria-label={`Delete ${r.name}`} onClick={() => setToDelete(r)}>
                    <Trash2 className="h-4 w-4 text-red-400" aria-hidden />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete route"
        message={`Delete "${toDelete?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
