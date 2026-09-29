import { fmtMoney } from "@/lib/format";
import type { Slice } from "@/lib/reports";

interface Props {
  slices: Slice[];
  /** Palette to cycle through for the segments. */
  colors?: string[];
  size?: number;
}

const DEFAULT_COLORS = ["#F2B705", "#F6C445", "#F7D774", "#E0A800", "#FBE29A", "#C99700", "#FDEBB0", "#B59410"];

// A donut chart with a labeled legend. Good for category / account breakdowns.
export function DonutChart({ slices, colors = DEFAULT_COLORS, size = 190 }: Props) {
  const total = slices.reduce((a, s) => a + s.value, 0);

  if (total <= 0) {
    return <div className="chart-empty">No spending in this range.</div>;
  }

  const r = size / 2;
  const stroke = size * 0.22;
  const radius = r - stroke / 2;
  const circ = 2 * Math.PI * radius;

  let offset = 0;
  const segments = slices.map((s, i) => {
    const frac = s.value / total;
    const seg = {
      color: colors[i % colors.length],
      dash: frac * circ,
      gap: circ - frac * circ,
      offset: -offset * circ,
      pct: frac * 100,
    };
    offset += frac;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="donut-svg" role="img">
        <g transform={`rotate(-90 ${r} ${r})`}>
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={r}
              cy={r}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={seg.offset}
            />
          ))}
        </g>
        <text x={r} y={r - 4} textAnchor="middle" className="donut-total-label">Total</text>
        <text x={r} y={r + 16} textAnchor="middle" className="donut-total">{compact(total)}</text>
      </svg>

      <div className="donut-legend">
        {slices.map((s, i) => (
          <div className="donut-legend-row" key={s.label}>
            <span className="legend-dot" style={{ background: colors[i % colors.length] }} />
            <span className="dl-name" title={s.label}>{s.label}</span>
            <span className="dl-val">{fmtMoney(s.value)}</span>
            <span className="dl-pct">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function compact(v: number): string {
  if (v >= 1000) return "₱" + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k";
  return "₱" + Math.round(v);
}
