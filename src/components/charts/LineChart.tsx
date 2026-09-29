import { useMemo } from "react";
import { fmtMoney } from "@/lib/format";

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
  /** draw a soft fill under the line */
  fill?: boolean;
}

interface Props {
  labels: string[];
  series: LineSeries[];
  height?: number;
}

// A lightweight themed line/area chart drawn as SVG (no chart library).
export function LineChart({ labels, series, height = 220 }: Props) {
  const width = 720;
  const padL = 52;
  const padR = 14;
  const padT = 14;
  const padB = 28;

  const { min, max } = useMemo(() => {
    let mn = 0;
    let mx = 0;
    series.forEach((s) => s.values.forEach((v) => {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }));
    if (mx === 0 && mn === 0) mx = 1;
    return { min: mn, max: mx };
  }, [series]);

  const n = labels.length;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;

  // gridlines / y ticks
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) / ticks) * i);

  const zeroY = y(0);

  // sparse x labels so they don't crowd
  const labelEvery = Math.ceil(n / 8);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {tickVals.map((tv, i) => (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={y(tv)} y2={y(tv)} className="chart-grid" />
            <text x={padL - 8} y={y(tv) + 4} className="chart-axis" textAnchor="end">
              {shortMoney(tv)}
            </text>
          </g>
        ))}

        {/* zero baseline if we have negatives */}
        {min < 0 && <line x1={padL} x2={width - padR} y1={zeroY} y2={zeroY} className="chart-zero" />}

        {series.map((s) => {
          const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          const area =
            `${x(0)},${zeroY} ` + s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ") + ` ${x(n - 1)},${zeroY}`;
          return (
            <g key={s.name}>
              {s.fill && <polygon points={area} fill={s.color} opacity={0.14} />}
              <polyline points={points} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={n > 40 ? 0 : 2.6} fill={s.color}>
                  <title>{`${labels[i]}: ${fmtMoney(v)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* x labels */}
        {labels.map((lb, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={x(i)} y={height - 8} className="chart-axis" textAnchor="middle">
              {lb}
            </text>
          ) : null,
        )}
      </svg>

      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name} className="legend-item">
            <span className="legend-dot" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function shortMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return (v < 0 ? "-" : "") + "₱" + Math.round(abs / 1000) + "k";
  return "₱" + Math.round(v);
}
