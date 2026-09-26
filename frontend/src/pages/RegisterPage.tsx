import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Siren, UserPlus } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError } from '../services/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFields({});
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
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
            <UserPlus className="h-5 w-5 text-sky-400" aria-hidden /> Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Report incidents, save routes and follow live traffic.
          </p>
          {message && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
              {message}
            </p>
          )}
          <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
            <Input
              label="Full name"
              required
              autoComplete="name"
              value={form.name}
              error={fields.name}
              onChange={set('name')}
              placeholder="Jane Doe"
            />
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              error={fields.email}
              onChange={set('email')}
              placeholder="you@example.com"
            />
            <Input
              label="Phone"
              type="tel"
              required
              autoComplete="tel"
              value={form.phone}
              error={fields.phone}
              onChange={set('phone')}
              placeholder="+91 9876543210"
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              error={fields.password}
              onChange={set('password')}
              placeholder="At least 8 characters, 1 letter + 1 number"
            />
            <Button type="submit" loading={loading} className="w-full">
              Create account
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-sky-300 hover:text-sky-200">
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
