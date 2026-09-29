import type { Account, LedgerData, Transaction } from "@/domain/types";
import { todayISO } from "./format";

export type Period = "all" | "today" | "week" | "month";
export type TypeFilter = "all" | "income" | "expense" | "transfer";

export interface Filters {
  period: Period;
  type: TypeFilter;
  account: string; // account id or "all"
  category: string; // category name or "all"
  search: string;
}

export const DEFAULT_FILTERS: Filters = {
  period: "all",
  type: "all",
  account: "all",
  category: "all",
  search: "",
};

function inPeriod(dateStr: string, period: Period): boolean {
  if (period === "all") return true;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  if (period === "today") return dateStr === todayISO();
  if (period === "week") {
    const start = new Date(now);
    const day = (start.getDay() + 6) % 7; // Monday start
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }
  if (period === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  return true;
}

export function accountName(accounts: Account[], id?: string): string {
  return accounts.find((a) => a.id === id)?.name ?? "—";
}

export function filterTransactions(data: LedgerData, f: Filters): Transaction[] {
  return data.transactions
    .filter((t) => {
      if (!inPeriod(t.date, f.period)) return false;
      if (f.type !== "all" && t.type !== f.type) return false;
      if (f.account !== "all") {
        const match = t.account === f.account || t.fromAccount === f.account || t.toAccount === f.account;
        if (!match) return false;
      }
      if (f.category !== "all" && t.category !== f.category) return false;
      if (f.search) {
        const hay = ((t.description || "") + " " + (t.category || "")).toLowerCase();
        if (!hay.includes(f.search.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
}

export function computeBalances(data: LedgerData): Record<string, number> {
  const bal: Record<string, number> = {};
  data.accounts.forEach((a) => (bal[a.id] = 0));
  data.transactions.forEach((t) => {
    if (t.type === "income" && t.account) bal[t.account] = (bal[t.account] || 0) + Number(t.amount);
    else if (t.type === "expense" && t.account) bal[t.account] = (bal[t.account] || 0) - Number(t.amount);
    else if (t.type === "transfer" && t.fromAccount && t.toAccount) {
      bal[t.fromAccount] = (bal[t.fromAccount] || 0) - Number(t.amount);
      bal[t.toAccount] = (bal[t.toAccount] || 0) + Number(t.amount);
    }
  });
  return bal;
}

export interface Totals {
  income: number;
  expense: number;
  net: number;
  total: number;
}

export function computeTotals(data: LedgerData, list: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  list.forEach((t) => {
    if (t.type === "income") income += Number(t.amount);
    else if (t.type === "expense") expense += Number(t.amount);
  });
  const balances = computeBalances(data);
  const total = Object.values(balances).reduce((a, b) => a + b, 0);
  return { income, expense, net: income - expense, total };
}
