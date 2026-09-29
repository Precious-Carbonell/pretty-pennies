import { useMemo, useState } from "react";
import type { LedgerData } from "@/domain/types";
import { fmtMoney, signedMoney, todayISO } from "@/lib/format";
import { Icon } from "./Icon";
import { BarChart } from "./charts/BarChart";
import { LineChart } from "./charts/LineChart";
import { DonutChart } from "./charts/DonutChart";
import {
  availableYears,
  computeStats,
  customRange,
  expenseByAccount,
  expenseByCategory,
  monthRange,
  periodSeries,
  txInRange,
  yearRange,
  type RangeMode,
} from "@/lib/reports";

interface Props {
  data: LedgerData;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function Reports({ data }: Props) {
  const now = new Date();
  const years = availableYears(data);

  const [mode, setMode] = useState<RangeMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [customStart, setCustomStart] = useState(todayISO().slice(0, 8) + "01");
  const [customEnd, setCustomEnd] = useState(todayISO());

  const range = useMemo(() => {
    if (mode === "month") return monthRange(year, month);
    if (mode === "year") return yearRange(year);
    return customRange(customStart, customEnd);
  }, [mode, year, month, customStart, customEnd]);

  const list = useMemo(() => txInRange(data, range), [data, range]);
  const stats = useMemo(() => computeStats(list, range), [list, range]);
  const series = useMemo(() => periodSeries(list, range), [list, range]);
  const byCategory = useMemo(() => expenseByCategory(list), [list]);
  const byAccount = useMemo(() => expenseByAccount(list, data.accounts), [list, data.accounts]);

  const barData = series.map((p) => ({ label: p.label, income: p.income, expense: p.expense }));

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title"><Icon name="star" /> Reports</h1>
          <div className="page-sub">{range.label}</div>
        </div>
      </div>

      {/* Range picker */}
      <div className="range-bar">
        <div className="seg">
          {(["month", "year", "custom"] as RangeMode[]).map((m) => (
            <button key={m} className={mode === m ? "active" : ""} onClick={() => setMode(m)}>
              {m === "month" ? "Month" : m === "year" ? "Year" : "Custom"}
            </button>
          ))}
        </div>

        {mode === "month" && (
          <div className="range-fields">
            <select className="control" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select className="control" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {mode === "year" && (
          <div className="range-fields">
            <select className="control" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {mode === "custom" && (
          <div className="range-fields">
            <label>From</label>
            <input className="control" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <label>To</label>
            <input className="control" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="cards">
        <div className="card in">
          <div className="label"><Icon name="arrow-down" /> Money in</div>
          <div className="value pos">{fmtMoney(stats.income)}</div>
        </div>
        <div className="card out">
          <div className="label"><Icon name="arrow-up" /> Money out</div>
          <div className="value neg">{fmtMoney(stats.expense)}</div>
        </div>
        <div className="card total">
          <div className="label"><Icon name="heart" /> Net</div>
          <div className={"value " + (stats.net < 0 ? "neg" : "pos")}>{signedMoney(stats.net)}</div>
        </div>
        <div className="card save">
          <div className="label"><Icon name="wallet" /> Avg spend / day</div>
          <div className="value">{fmtMoney(stats.avgExpensePerDay)}</div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="big">No entries in this range</div>
          Try a different month, year, or custom range.
        </div>
      ) : (
        <div className="report-grid">
          <div className="report-card wide">
            <h3>Income vs expense</h3>
            <BarChart data={barData} />
          </div>

          <div className="report-card wide">
            <h3>Net over time</h3>
            <LineChart
              labels={series.map((p) => p.label)}
              series={[{ name: "Net", color: "#E0A800", values: series.map((p) => p.net), fill: true }]}
            />
          </div>

          <div className="report-card">
            <h3>Spending by category</h3>
            <DonutChart slices={byCategory} />
          </div>

          <div className="report-card">
            <h3>Spending by account</h3>
            <DonutChart slices={byAccount} />
          </div>

          {stats.topCategory && (
            <div className="report-card wide">
              <h3>Highlights</h3>
              <div className="highlights">
                <div className="hl">
                  <div className="hl-label">Top spending category</div>
                  <div className="hl-value">{stats.topCategory.name}</div>
                  <div className="hl-sub">{fmtMoney(stats.topCategory.amount)}</div>
                </div>
                <div className="hl">
                  <div className="hl-label">Entries logged</div>
                  <div className="hl-value">{stats.count}</div>
                  <div className="hl-sub">in {range.label}</div>
                </div>
                <div className="hl">
                  <div className="hl-label">Savings rate</div>
                  <div className="hl-value">
                    {stats.income > 0 ? Math.round((stats.net / stats.income) * 100) : 0}%
                  </div>
                  <div className="hl-sub">of money in kept</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
