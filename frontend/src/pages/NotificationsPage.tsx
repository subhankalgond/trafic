import { useCallback, useEffect, useState } from 'react';
import { BellOff, CheckCheck, Trash2 } from 'lucide-react';
import { LoadingSkeleton, ErrorState, EmptyState, Button, Badge } from '../components/ui';
import { userService, NotificationItem } from '../services/services';
import { useToast } from '../context/ToastContext';

const TYPE_TONES: Record<string, 'blue' | 'red' | 'yellow' | 'gray'> = {
  system: 'gray',
  incident: 'yellow',
  traffic: 'blue',
  emergency: 'red',
};

export default function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    userService
      .notifications()
      .then((d) => setItems(d.notifications))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const markAll = async () => {
    try {
      await userService.markAllRead();
      setItems((list) => list?.map((n) => ({ ...n, isRead: true })) ?? null);
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  const markOne = async (id: number) => {
    try {
      await userService.markRead(id);
      setItems((list) => list?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null);
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  const remove = async (id: number) => {
    try {
      await userService.deleteNotification(id);
      setItems((list) => list?.filter((n) => n.id !== id) ?? null);
    } catch (err) {
      toast('error', (err as Error).message);
    }
  };

  const unread = items?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">
            {unread > 0 ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'You are all caught up.'}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" onClick={markAll}>
            <CheckCheck className="h-4 w-4" aria-hidden /> Mark all read
          </Button>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items === null ? (
        <LoadingSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No notifications"
          message="System updates, incident reviews and emergency alerts will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border px-4 py-3 ${
                n.isRead ? 'border-white/10 bg-navy-800/50' : 'border-sky-500/30 bg-sky-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{n.title}</p>
                    <Badge tone={TYPE_TONES[n.type] ?? 'gray'}>{n.type}</Badge>
                    {!n.isRead && <Badge tone="blue">New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!n.isRead && (
                    <Button variant="ghost" aria-label="Mark read" onClick={() => markOne(n.id)}>
                      <CheckCheck className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                  <Button variant="ghost" aria-label="Delete notification" onClick={() => remove(n.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!error && items !== null && items.length === 0 && (
        <BellOff className="hidden" aria-hidden />
      )}
    </div>
  );
}
