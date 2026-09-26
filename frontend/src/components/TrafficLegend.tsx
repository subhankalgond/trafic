import { Badge } from './ui';

export const TRAFFIC_COLORS = {
  low: '#22C55E',
  moderate: '#FACC15',
  high: '#F97316',
  severe: '#EF4444',
} as const;

export const TRAFFIC_LABELS = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  severe: 'Severe',
} as const;

export function TrafficLegend() {
  const items = [
    { color: TRAFFIC_COLORS.low, label: 'Low Traffic' },
    { color: TRAFFIC_COLORS.moderate, label: 'Moderate Traffic' },
    { color: TRAFFIC_COLORS.high, label: 'Heavy Traffic' },
    { color: TRAFFIC_COLORS.severe, label: 'Severe Traffic' },
    { color: '#22C55E', label: 'Emergency', pulse: true },
    { color: '#EF4444', label: 'Incident' },
    { color: '#7F1D1D', label: 'Road Closed' },
  ];
  return (
    <div className="glass rounded-xl border border-white/10 px-4 py-3" role="list" aria-label="Map legend">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Legend</p>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i.label} role="listitem" className="flex items-center gap-2 text-xs text-slate-300">
            <span
              className={`inline-block h-3 w-3 rounded-full ${i.pulse ? 'emergency-pulse' : ''}`}
              style={{ backgroundColor: i.color }}
              aria-hidden
            />
            {i.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrafficLevelBadge({ level }: { level: 'low' | 'moderate' | 'high' | 'severe' }) {
  const tone = level === 'low' ? 'green' : level === 'moderate' ? 'yellow' : level === 'high' ? 'orange' : 'red';
  return <Badge tone={tone}>{TRAFFIC_LABELS[level]}</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone =
    severity === 'critical' ? 'red' : severity === 'high' ? 'orange' : severity === 'medium' ? 'yellow' : 'green';
  return <Badge tone={tone}>{severity.toUpperCase()}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'gray'> = {
    reported: 'gray',
    under_review: 'yellow',
    verified: 'blue',
    active: 'orange',
    resolved: 'green',
    cleared: 'green',
    priority: 'red',
  };
  return <Badge tone={map[status] ?? 'gray'}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
}
