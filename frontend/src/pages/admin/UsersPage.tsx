import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import {
  Card, LoadingSkeleton, ErrorState, EmptyState, SearchBar, Button, Badge, ConfirmDialog,
} from '../../components/ui';
import { adminService } from '../../services/services';
import { ApiRequestError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
}

const ROLE_TONE = { admin: 'red', operator: 'blue', user: 'gray' } as const;

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    adminService
      .users({ search: search || undefined, page: pagination.page })
      .then((d) => {
        setUsers(d.users);
        setPagination(d.pagination);
      })
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pagination.page]);

  useEffect(load, [load]);

  const setStatus = async (u: AdminUser, status: 'active' | 'suspended') => {
    setBusyId(u.id);
    try {
      await adminService.setUserStatus(u.id, status);
      toast('success', `${u.name} is now ${status}.`);
      setUsers((list) => list?.map((x) => (x.id === u.id ? { ...x, status } : x)) ?? null);
    } catch (err) {
      toast('error', (err as ApiRequestError).message);
    } finally {
      setBusyId(null);
    }
  };

  const setRole = async (role: 'user' | 'operator' | 'admin') => {
    if (!roleTarget) return;
    try {
      await adminService.setUserRole(roleTarget.id, role);
      toast('success', `${roleTarget.name} is now ${role}.`);
      setUsers((list) => list?.map((x) => (x.id === roleTarget.id ? { ...x, role } : x)) ?? null);
    } catch (err) {
      toast('error', (err as ApiRequestError).message);
    } finally {
      setRoleTarget(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-white">Users</h1>
      <p className="mt-1 text-sm text-slate-400">Manage accounts, roles and access.</p>

      <div className="mb-4 mt-4 max-w-md">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          placeholder="Search by name or email…"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : users === null ? (
        <LoadingSkeleton rows={6} />
      ) : users.length === 0 ? (
        <EmptyState title="No users" message="No accounts match your search." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-700/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{u.name}{u.id === me?.id && <span className="ml-2 text-xs text-sky-300">(you)</span>}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.phone || 'Not provided'}</td>
                  <td className="px-4 py-3">
                    <button
                      className="focus-visible:outline-none"
                      onClick={() => setRoleTarget(u)}
                      aria-label={`Change role for ${u.name}`}
                      disabled={u.id === me?.id}
                    >
                      <Badge tone={ROLE_TONE[u.role as keyof typeof ROLE_TONE] ?? 'gray'}>
                        {u.role.toUpperCase()}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {u.id !== me?.id && (
                        u.status === 'active' ? (
                          <Button variant="ghost" loading={busyId === u.id} aria-label={`Suspend ${u.name}`} onClick={() => setStatus(u, 'suspended')}>
                            <ShieldOff className="h-4 w-4 text-red-400" aria-hidden />
                          </Button>
                        ) : (
                          <Button variant="ghost" loading={busyId === u.id} aria-label={`Reactivate ${u.name}`} onClick={() => setStatus(u, 'active')}>
                            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden />
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm text-slate-400">
              <span>Page {pagination.page} of {totalPages} · {pagination.total} users</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={pagination.page >= totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={roleTarget !== null}
        title="Change role"
        message={`Change the role for ${roleTarget?.name ?? ''}? The new role takes effect at their next login.`}
        confirmLabel="Make admin"
        danger
        onConfirm={() => setRole('admin')}
        onCancel={() => setRoleTarget(null)}
      />
    </div>
  );
}
