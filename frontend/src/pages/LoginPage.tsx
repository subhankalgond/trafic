import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Siren, LogIn } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError } from '../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFields({});
    setLoading(true);
    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
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
        <Link to="/" className="mb-6 flex items-center justify-center gap-2" aria-label="SmartFlow AI home">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15">
            <Siren className="h-6 w-6 text-sky-400" aria-hidden />
          </span>
          <span className="text-xl font-extrabold text-white">SmartFlow AI</span>
        </Link>
        <Card>
          <h1 className="flex items-center gap-2 text-lg font-bold text-white">
            <LogIn className="h-5 w-5 text-sky-400" aria-hidden /> Log in to your account
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Access live traffic, the 3D simulation and your reports.
          </p>
          {message && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
              {message}
            </p>
          )}
          <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              error={fields.email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              error={fields.password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs font-medium text-sky-300 hover:text-sky-200">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" loading={loading} className="w-full">
              Log in
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-400">
            New to SmartFlow?{' '}
            <Link to="/register" className="font-medium text-sky-300 hover:text-sky-200">
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
