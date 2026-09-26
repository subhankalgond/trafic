import { useCallback, useEffect, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { Card, LoadingSkeleton, ErrorState, Button, Select, Badge } from '../../components/ui';
import { signalService, SignalRow } from '../../services/services';
import { ApiRequestError } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const STATE_TONE = { green: 'green', yellow: 'yellow', red: 'red' } as const;
const MODES = ['normal', 'traffic_management', 'emergency', 'manual'];

export default function SignalsPage() {
  const toast = useToast();
  const [signals, setSignals] = useState<SignalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    signalService
      .list()
      .then((d) => setSignals(d.signals))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const currentMode = signals?.[0]?.mode ?? 'normal';

  const setMode = async (mode: string) => {
    try {
      await signalService.setMode(mode);
      toast('success', `Signal mode set to ${mode.replace(/_/g, ' ')}.`);
      load();
    } catch (err) {
      toast('error', (err as ApiRequestError).message);
    }
  };

  const manual = async (s: SignalRow, state: string) => {
    setBusy(s.id);
    try {
      await signalService.manual({ direction: s.direction, state, seconds: 30 });
      toast('success', `${s.intersection} ${s.direction} set to ${state.toUpperCase()} for 30s.`);
      load();
    } catch (err) {
      toast('error', (err as ApiRequestError).message);
    } finally {
      setBusy(null);
    }
  };

  const grouped = (signals ?? []).reduce<Record<string, SignalRow[]>>((acc, s) => {
    (acc[s.intersection] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Signal control</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manual overrides switch the intersection to manual mode until restored.
          </p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
        </Button>
      </div>

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 font-bold text-white">
          <Radio className="h-5 w-5 text-sky-400" aria-hidden /> Intersection mode
          <Badge tone="blue">{currentMode.replace(/_/g, ' ')}</Badge>
        </p>
        <div className="w-64">
          <Select
            aria-label="Signal mode"
            value={currentMode}
            onChange={(e) => setMode(e.target.value)}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
            ))}
          </Select>
        </div>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : signals === null ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(grouped).map(([intersection, rows]) => (
            <Card key={intersection}>
              <h2 className="mb-3 font-bold text-white">{intersection}</h2>
              <ul className="space-y-2">
                {rows.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-navy-900/50 px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="w-6 text-sm font-bold text-slate-200">{s.direction}</span>
                      <Badge tone={STATE_TONE[s.state] ?? 'gray'}>{s.state.toUpperCase()}</Badge>
                      {s.remainingSeconds > 0 && (
                        <span className="text-xs text-slate-500">{s.remainingSeconds}s</span>
                      )}
                    </span>
                    <span className="flex gap-1">
                      {(['green', 'yellow', 'red'] as const).map((st) => (
                        <Button
                          key={st}
                          variant="ghost"
                          loading={busy === s.id && st === s.state}
                          disabled={busy === s.id}
                          aria-label={`Set ${s.direction} to ${st}`}
                          onClick={() => manual(s, st)}
                        >
                          <span
                            className="inline-block h-4 w-4 rounded-full"
                            style={{ backgroundColor: st === 'green' ? '#22C55E' : st === 'yellow' ? '#FACC15' : '#EF4444' }}
                            aria-hidden
                          />
                        </Button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-slate-500">No signals registered in the database.</p>
          )}
        </div>
      )}
    </div>
  );
}
