import { fmtMoney } from "@/lib/format";

export interface BarGroup {
  label: string;
  income: number;
  expense: number;
}

interface Props {
  data: BarGroup[];
  incomeColor?: string;
  expenseColor?: string;
  height?: number;
}

// Grouped income/expense bars per period, drawn as SVG.
export function BarChart({
  data,
  incomeColor = "#9a8300",
  expenseColor = "#e0a800",
  height = 220,
}: Props) {
  const width = 720;
  const padL = 52;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i);

  const n = data.length || 1;
  const slot = innerW / n;
  const barW = Math.min(18, (slot - 6) / 2);
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const labelEvery = Math.ceil(n / 12);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" preserveAspectRatio="xMidYMid meet">
        {tickVals.map((tv, i) => (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={y(tv)} y2={y(tv)} className="chart-grid" />
            <text x={padL - 8} y={y(tv) + 4} className="chart-axis" textAnchor="end">{shortMoney(tv)}</text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = padL + i * slot + slot / 2;
          const baseY = padT + innerH;
          return (
            <g key={i}>
              <rect x={cx - barW - 1} y={y(d.income)} width={barW} height={baseY - y(d.income)} rx={3} fill={incomeColor}>
                <title>{`${d.label} income: ${fmtMoney(d.income)}`}</title>
              </rect>
              <rect x={cx + 1} y={y(d.expense)} width={barW} height={baseY - y(d.expense)} rx={3} fill={expenseColor}>
                <title>{`${d.label} expense: ${fmtMoney(d.expense)}`}</title>
              </rect>
              {i % labelEvery === 0 && (
                <text x={cx} y={height - 8} className="chart-axis" textAnchor="middle">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-dot" style={{ background: incomeColor }} /> Income</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: expenseColor }} /> Expense</span>
      </div>
    </div>
  );
}

function shortMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return "₱" + Math.round(abs / 1000) + "k";
  return "₱" + Math.round(abs);
}
