// ---------------------------------------------------------------------------
// Domain types — the vocabulary of Pretty Pennies.
// Kept framework-agnostic so the same shapes flow through the repository,
// the store, and the UI without translation.
// ---------------------------------------------------------------------------

export type TransactionType = "income" | "expense" | "transfer";

/** A single money movement. Transfers move between two accounts; income and
 *  expense touch a single account and carry a category. */
export interface Transaction {
  id: string;
  type: TransactionType;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  amount: number;
  description: string;
  /** Present for income / expense. */
  category?: string;
  /** Present for income / expense. */
  account?: string;
  /** Present for transfers. */
  fromAccount?: string;
  /** Present for transfers. */
  toAccount?: string;
  /** Epoch millis, used for stable ordering within a day. */
  createdAt: number;
  updatedAt: number;
}

/** Data needed to create a transaction (id/timestamps are assigned by the repo). */
export type NewTransaction = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

export interface Account {
  id: string;
  name: string;
  /** A soft accent color for the card, chosen from the coquette palette. */
  color: string;
  /** Emoji shown on the account chip. */
  emoji: string;
  createdAt: number;
}

export type NewAccount = Omit<Account, "id" | "createdAt">;

export interface Category {
  id: string;
  name: string;
  type: Exclude<TransactionType, "transfer">;
  emoji: string;
}

/** A free-form note pinned to a single day. */
export interface DayNote {
  id: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  text: string;
  createdAt: number;
}

export type NewDayNote = Omit<DayNote, "id" | "createdAt">;

export type RecurrenceKind =
  | "monthly-days" // repeats on specific days of the month, e.g. 10th & 25th
  | "weekly" // repeats on a weekday (0=Sun..6=Sat)
  | "yearly" // repeats on a month+day each year
  | "once"; // a single dated event

/** A repeating (or one-off) event shown on the calendar and in Upcoming. */
export interface CalendarEvent {
  id: string;
  title: string;
  kind: RecurrenceKind;
  /** For "monthly-days": days of the month it lands on (1..31). */
  monthDays?: number[];
  /** For "weekly": weekday 0..6 (Sun..Sat). */
  weekday?: number;
  /** For "yearly": month 0..11. */
  month?: number;
  /** For "yearly" and "once": day of month. */
  day?: number;
  /** For "once": full ISO date. */
  date?: string;
  /** Whether this is a payday (drives motivational messages + accent). */
  isPayday?: boolean;
  /** Accent color for the dot / pill. */
  color: string;
  emoji: string;
  createdAt: number;
}

export type NewCalendarEvent = Omit<CalendarEvent, "id" | "createdAt">;

/** The full snapshot the app persists — one document per user, on-device. */
export interface LedgerData {
  version: number;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  dayNotes: DayNote[];
  events: CalendarEvent[];
}

/** Backup file shape for export / import. */
export interface BackupFile {
  app: "pretty-pennies";
  version: number;
  exportedAt: string;
  data: LedgerData;
}
