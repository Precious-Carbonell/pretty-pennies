import type { Account, CalendarEvent, Category, LedgerData } from "./types";

export const LEDGER_VERSION = 3;

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Coquette palette accents used for account cards — buttery yellows only.
export const ACCENTS = ["#F6C445", "#F7D774", "#FBE29A", "#FDEBB0", "#FFF3CC", "#F2B705"];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: uid("acct"), name: "Union Bank", color: "#F6C445", emoji: "icon:bank", createdAt: Date.now() },
  { id: uid("acct"), name: "ATM", color: "#F7D774", emoji: "icon:card", createdAt: Date.now() + 1 },
  { id: uid("acct"), name: "GCash", color: "#FBE29A", emoji: "icon:mobile", createdAt: Date.now() + 2 },
  { id: uid("acct"), name: "Cash", color: "#FDEBB0", emoji: "icon:wallet", createdAt: Date.now() + 3 },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Income
  { id: uid("cat"), name: "Salary", type: "income", emoji: "💌" },
  { id: uid("cat"), name: "Allowance", type: "income", emoji: "🌷" },
  { id: uid("cat"), name: "Bonus", type: "income", emoji: "✨" },
  { id: uid("cat"), name: "Other Income", type: "income", emoji: "🫧" },
  // Expense
  { id: uid("cat"), name: "Housing & Utilities", type: "expense", emoji: "🏠" },
  { id: uid("cat"), name: "Groceries & Essentials", type: "expense", emoji: "🧺" },
  { id: uid("cat"), name: "Transportation", type: "expense", emoji: "🚌" },
  { id: uid("cat"), name: "Dining & Socializing", type: "expense", emoji: "🍽️" },
  { id: uid("cat"), name: "Personal Care", type: "expense", emoji: "💅" },
  { id: uid("cat"), name: "Nomnom", type: "expense", emoji: "🍓" },
];

export const DEFAULT_EVENTS: CalendarEvent[] = [
  {
    id: uid("evt"),
    title: "Payday",
    kind: "monthly-days",
    monthDays: [10, 25],
    isPayday: true,
    color: "#F2B705",
    emoji: "🎀",
    createdAt: Date.now(),
  },
];

export function emptyLedger(): LedgerData {
  return {
    version: LEDGER_VERSION,
    transactions: [],
    accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a })),
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    dayNotes: [],
    events: DEFAULT_EVENTS.map((e) => ({ ...e })),
  };
}
