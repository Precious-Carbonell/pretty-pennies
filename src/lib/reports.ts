import type { Account, LedgerData, Transaction } from "@/domain/types";
import { fmtMonth } from "./format";

// ---------------------------------------------------------------------------
// Report aggregations — pure functions over the ledger, scoped to a date range.
// ---------------------------------------------------------------------------

export type RangeMode = "month" | "year" | "custom";

export interface ReportRange {
  mode: RangeMode;
  /** inclusive ISO start (YYYY-MM-DD) */
  start: string;
  /** inclusive ISO end (YYYY-MM-DD) */
  end: string;
  /** friendly label, e.g. "May 2024" or "2024" or "May 1 – Jun 3, 2024" */
  label: string;
}

function iso(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Build a range for a given month (0-indexed) of a year. */
export function monthRange(year: number, month: number): ReportRange {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    mode: "month",
    start: iso(start),
    end: iso(end),
    label: start.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

export function yearRange(year: number): ReportRange {
  return {
    mode: "year",
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    label: String(year),
  };
}

export function customRange(start: string, end: string): ReportRange {
  // guard: keep start <= end
  const [s, e] = start <= end ? [start, end] : [end, start];
  const fmt = (x: string) =>
    new Date(x + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return { mode: "custom", start: s, end: e, label: `${fmt(s)} – ${fmt(e)}` };
}

export function inRange(dateStr: string, range: ReportRange): boolean {
  return dateStr >= range.start && dateStr <= range.end;
}

export function txInRange(data: LedgerData, range: ReportRange): Transaction[] {
  return data.transactions.filter((t) => inRange(t.date, range));
}

export interface ReportStats {
  income: number;
  expense: number;
  net: number;
  count: number;
  avgExpensePerDay: number;
  topCategory: { name: string; amount: number } | null;
}

export function computeStats(list: Transaction[], range: ReportRange): ReportStats {
  let income = 0;
  let expense = 0;
  const byCat: Record<string, number> = {};
  list.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") {
      expense += t.amount;
      const c = t.category || "Others";
      byCat[c] = (byCat[c] || 0) + t.amount;
    }
  });

  const days = Math.max(1, daysBetween(range.start, range.end));
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  return {
    income,
    expense,
    net: income - expense,
    count: list.length,
    avgExpensePerDay: expense / days,
    topCategory: top ? { name: top[0], amount: top[1] } : null,
  };
}

function daysBetween(startISO: string, endISO: string): number {
  const a = new Date(startISO + "T00:00:00").getTime();
  const b = new Date(endISO + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000) + 1;
}

export interface Slice {
  label: string;
  value: number;
}

/** Expense totals grouped by category, largest first. */
export function expenseByCategory(list: Transaction[]): Slice[] {
  const map: Record<string, number> = {};
  list.forEach((t) => {
    if (t.type === "expense") {
      const c = t.category || "Others";
      map[c] = (map[c] || 0) + t.amount;
    }
  });
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Expense totals grouped by account, largest first. */
export function expenseByAccount(list: Transaction[], accounts: Account[]): Slice[] {
  const nameOf = (id?: string) => accounts.find((a) => a.id === id)?.name ?? "—";
  const map: Record<string, number> = {};
  list.forEach((t) => {
    if (t.type === "expense" && t.account) {
      const name = nameOf(t.account);
      map[name] = (map[name] || 0) + t.amount;
    }
  });
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export interface PeriodPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

/**
 * Income/expense per sub-period within the range:
 *  - month range  -> one point per day
 *  - year range   -> one point per month
 *  - custom range -> per day if <= 62 days, else per month
 */
export function periodSeries(list: Transaction[], range: ReportRange): PeriodPoint[] {
  const span = daysBetween(range.start, range.end);
  const byMonth = range.mode === "year" || (range.mode === "custom" && span > 62);

  const buckets = new Map<string, PeriodPoint>();

  const keyFor = (dateStr: string): { key: string; label: string } => {
    const d = new Date(dateStr + "T00:00:00");
    if (byMonth) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: fmtMonth(dateStr) };
    }
    return { key: dateStr, label: String(d.getDate()) };
  };

  // Pre-seed buckets so gaps render as zero (keeps the line continuous).
  if (byMonth) {
    const s = new Date(range.start + "T00:00:00");
    const e = new Date(range.end + "T00:00:00");
    const cur = new Date(s.getFullYear(), s.getMonth(), 1);
    while (cur <= e) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, {
        label: cur.toLocaleDateString(undefined, { month: "short" }),
        income: 0,
        expense: 0,
        net: 0,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (span <= 62) {
    const cur = new Date(range.start + "T00:00:00");
    const e = new Date(range.end + "T00:00:00");
    while (cur <= e) {
      buckets.set(iso(cur), { label: String(cur.getDate()), income: 0, expense: 0, net: 0 });
      cur.setDate(cur.getDate() + 1);
    }
  }

  list.forEach((t) => {
    const { key, label } = keyFor(t.date);
    const b = buckets.get(key) ?? { label, income: 0, expense: 0, net: 0 };
    if (t.type === "income") b.income += t.amount;
    else if (t.type === "expense") b.expense += t.amount;
    b.net = b.income - b.expense;
    buckets.set(key, b);
  });

  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, v]) => v);
}

/** Distinct years that have transactions, plus the current year, descending. */
export function availableYears(data: LedgerData): number[] {
  const set = new Set<number>();
  set.add(new Date().getFullYear());
  data.transactions.forEach((t) => {
    const y = Number(t.date.slice(0, 4));
    if (!isNaN(y)) set.add(y);
  });
  return Array.from(set).sort((a, b) => b - a);
}
