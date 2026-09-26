import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Copy, Check } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { authService } from '../services/services';
import { ApiRequestError } from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFields({});
    setLoading(true);
    try {
      const { data, message } = await authService.forgotPassword(email);
      setSent(message);
      setToken(data?.resetToken ?? null);
    } catch (err) {
      setFields((err as ApiRequestError).fields ?? {});
      setSent((err as ApiRequestError).message);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <h1 className="flex items-center gap-2 text-lg font-bold text-white">
            <KeyRound className="h-5 w-5 text-sky-400" aria-hidden /> Reset your password
          </h1>
          {sent && (
            <p className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200" role="status">
              {sent}
            </p>
          )}
          {token && (
            <div className="mt-3 rounded-lg border border-white/10 bg-navy-900/60 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Development reset token
              </p>
              <p className="mt-1 break-all font-mono text-xs text-slate-300">{token}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={copyToken}>
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Link
                  to={`/reset-password?token=${encodeURIComponent(token)}`}
                  className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-semibold text-navy-900 hover:bg-sky-400"
                >
                  Continue to reset
                </Link>
              </div>
            </div>
          )}
          <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
            <Input
              label="Account email"
              type="email"
              required
              autoComplete="email"
              value={email}
              error={fields.email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Button type="submit" loading={loading} className="w-full">
              Send reset token
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-400">
            Remembered it?{' '}
            <Link to="/login" className="font-medium text-sky-300 hover:text-sky-200">
              Back to login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
