import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { authService } from '../services/services';
import { ApiRequestError } from '../services/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFields({});
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { message: msg } = await authService.resetPassword(token, password);
      setMessage(msg);
      window.setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      const apiErr = err as ApiRequestError;
      setFields(apiErr.fields ?? {});
      setMessage(apiErr.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <h1 className="flex items-center gap-2 text-lg font-bold text-white">
            <ShieldCheck className="h-5 w-5 text-sky-400" aria-hidden /> Set a new password
          </h1>
          {message && (
            <p className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200" role="status">
              {message}
            </p>
          )}
          <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
            <Input
              label="Reset token"
              required
              value={token}
              error={fields.token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token from your reset link"
            />
            <Input
              label="New password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              error={fields.password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters, 1 letter + 1 number"
            />
            <Input
              label="Confirm new password"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat the new password"
            />
            <Button type="submit" loading={loading} className="w-full">
              Update password
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-400">
            <Link to="/login" className="font-medium text-sky-300 hover:text-sky-200">
              Back to login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
