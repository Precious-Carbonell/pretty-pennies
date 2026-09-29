import type { Account, BackupFile, Category, LedgerData, Transaction, TransactionType } from "@/domain/types";
import { ACCENTS, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, LEDGER_VERSION, uid } from "@/domain/defaults";
import { todayISO } from "./format";

export function downloadBackup(data: LedgerData): void {
  const payload: BackupFile = {
    app: "pretty-pennies",
    version: LEDGER_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pretty-pennies-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A validated but not-yet-committed transaction (references are raw names/ids). */
export interface StagedTransaction {
  id: string;
  type: TransactionType;
  date: string;
  amount: number;
  description: string;
  createdAt: number;
  updatedAt: number;
  /** raw category name from the backup (income/expense only) */
  rawCategory?: string;
  /** raw account name/id from the backup */
  rawAccount?: string;
  rawFromAccount?: string;
  rawToAccount?: string;
}

export interface StagedImport {
  transactions: StagedTransaction[];
  skipped: number;
  skipReasons: string[];
  /** Category names in the backup that don't match any current category. */
  unknownIncomeCategories: string[];
  unknownExpenseCategories: string[];
  /** Account names in the backup that don't match any current account. */
  unknownAccounts: string[];
}

export interface ParsedBackup {
  ok: boolean;
  staged?: StagedImport;
  error?: string;
}

const TYPES: TransactionType[] = ["income", "expense", "transfer"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidType(t: unknown): t is TransactionType {
  return typeof t === "string" && (TYPES as string[]).includes(t);
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Parse and VALIDATE a backup file against the CURRENT diary.
 *  - Drops entries with a bad type / amount / date (and counts why).
 *  - Does NOT create anything. Instead it reports which category / account
 *    names in the backup don't match the current diary, so the UI can ask the
 *    user how to map them.
 */
export async function parseBackupFile(file: File, current: LedgerData): Promise<ParsedBackup> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (parsed === null || typeof parsed !== "object") {
    return { ok: false, error: "This doesn't look like a Pretty Pennies backup." };
  }

  const maybe = parsed as Partial<BackupFile> & Partial<LedgerData>;
  const data = (maybe.data ?? maybe) as Partial<LedgerData>;
  if (!data || !Array.isArray(data.transactions)) {
    return { ok: false, error: "This doesn't look like a Pretty Pennies backup." };
  }

  // Match against the current diary — or the built-in defaults if it's empty,
  // so a fresh diary's default categories/accounts count as "known".
  const effAccounts = current.accounts.length > 0 ? current.accounts : DEFAULT_ACCOUNTS;
  const effCategories = current.categories.length > 0 ? current.categories : DEFAULT_CATEGORIES;
  const knownAccounts = new Map(effAccounts.map((a) => [norm(a.name), a.name] as const));
  const knownAccountIds = new Set(effAccounts.map((a) => a.id));
  const knownIncomeCats = new Set(effCategories.filter((c) => c.type === "income").map((c) => norm(c.name)));
  const knownExpenseCats = new Set(effCategories.filter((c) => c.type === "expense").map((c) => norm(c.name)));

  const unknownAccounts = new Set<string>();
  const unknownIncomeCategories = new Set<string>();
  const unknownExpenseCategories = new Set<string>();

  const skipCounts: Record<string, number> = {};
  const note = (reason: string) => {
    skipCounts[reason] = (skipCounts[reason] || 0) + 1;
  };

  const transactions: StagedTransaction[] = [];
  let order = 0;

  const looksUnknownAccount = (ref: string | undefined): string | undefined => {
    if (!ref) return undefined;
    if (knownAccountIds.has(ref)) return undefined; // it's a valid id already
    if (knownAccounts.has(norm(ref))) return undefined; // matches by name
    return ref; // unknown -> needs mapping
  };

  for (const raw of data.transactions as unknown[]) {
    if (!raw || typeof raw !== "object") {
      note("not an entry");
      continue;
    }
    const t = raw as Partial<Transaction>;

    if (!isValidType(t.type)) {
      note("an unknown type");
      continue;
    }
    const amount = Number(t.amount);
    if (!isFinite(amount) || amount <= 0) {
      note("an invalid amount");
      continue;
    }
    const date = typeof t.date === "string" && ISO_DATE.test(t.date) ? t.date : "";
    if (!date) {
      note("a bad date");
      continue;
    }

    const staged: StagedTransaction = {
      id: typeof t.id === "string" && t.id ? t.id : uid("tx"),
      type: t.type,
      date,
      amount,
      description: typeof t.description === "string" ? t.description : "",
      createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now() + order,
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : Date.now() + order,
    };
    order++;

    if (t.type === "transfer") {
      staged.rawFromAccount = typeof t.fromAccount === "string" ? t.fromAccount : "";
      staged.rawToAccount = typeof t.toAccount === "string" ? t.toAccount : "";
      const uf = looksUnknownAccount(staged.rawFromAccount);
      const ut = looksUnknownAccount(staged.rawToAccount);
      if (uf) unknownAccounts.add(uf);
      if (ut) unknownAccounts.add(ut);
    } else {
      staged.rawAccount = typeof t.account === "string" ? t.account : "";
      const ua = looksUnknownAccount(staged.rawAccount);
      if (ua) unknownAccounts.add(ua);

      const cat = typeof t.category === "string" ? t.category.trim() : "";
      staged.rawCategory = cat;
      if (cat) {
        const known = t.type === "income" ? knownIncomeCats : knownExpenseCats;
        if (!known.has(norm(cat))) {
          (t.type === "income" ? unknownIncomeCategories : unknownExpenseCategories).add(cat);
        }
      }
    }
    transactions.push(staged);
  }

  const skipped = Object.values(skipCounts).reduce((a, b) => a + b, 0);
  if (transactions.length === 0) {
    return { ok: false, error: "No valid entries found in that file." };
  }

  return {
    ok: true,
    staged: {
      transactions,
      skipped,
      skipReasons: Object.entries(skipCounts).map(([reason, n]) => `${n} with ${reason}`),
      unknownIncomeCategories: Array.from(unknownIncomeCategories),
      unknownExpenseCategories: Array.from(unknownExpenseCategories),
      unknownAccounts: Array.from(unknownAccounts),
    },
  };
}

/** How the user chose to resolve each unknown name. Value is the TARGET name in
 *  the current diary (or a sentinel). */
export const KEEP = "__keep__"; // create/keep the imported name as-is
export const SKIP = "__skip__"; // drop entries that use this name

export interface ImportResolution {
  /** unknown category name (as-is) -> target category name | KEEP | SKIP */
  categories: Record<string, string>;
  /** unknown account name (as-is) -> target account name | KEEP | SKIP */
  accounts: Record<string, string>;
}

/**
 * Turn a staged import + the user's mapping choices into a final LedgerData,
 * merging into the CURRENT diary's accounts/categories.
 */
export function resolveImport(
  staged: StagedImport,
  current: LedgerData,
  resolution: ImportResolution,
): { data: LedgerData; committed: number; dropped: number } {
  // If the diary is empty, seed the built-in defaults so mapping targets and
  // account balances resolve to real accounts/categories.
  const baseAccounts = current.accounts.length > 0 ? current.accounts : DEFAULT_ACCOUNTS;
  const baseCategories = current.categories.length > 0 ? current.categories : DEFAULT_CATEGORIES;
  const accounts: Account[] = baseAccounts.map((a) => ({ ...a }));
  const categories: Category[] = baseCategories.map((c) => ({ ...c }));

  const accountByName = new Map(accounts.map((a) => [norm(a.name), a] as const));
  const accountById = new Map(accounts.map((a) => [a.id, a] as const));
  const catByNameType = new Map(categories.map((c) => [norm(c.name) + "|" + c.type, c] as const));

  const ensureAccountByName = (name: string): string => {
    const found = accountByName.get(norm(name));
    if (found) return found.id;
    const created: Account = {
      id: uid("acct"),
      name,
      color: ACCENTS[accounts.length % ACCENTS.length],
      emoji: "icon:wallet",
      createdAt: Date.now() + accounts.length,
    };
    accounts.push(created);
    accountByName.set(norm(created.name), created);
    accountById.set(created.id, created);
    return created.id;
  };

  const ensureCategory = (name: string, type: TransactionType): string => {
    const key = norm(name) + "|" + type;
    const found = catByNameType.get(key);
    if (found) return found.name;
    const created: Category = { id: uid("cat"), name, type: type === "income" ? "income" : "expense", emoji: "🎀" };
    categories.push(created);
    catByNameType.set(key, created);
    return created.name;
  };

  // Resolve an account reference (id or name) to a concrete account id, or null to drop.
  const resolveAccountRef = (ref: string | undefined): string | null => {
    if (!ref) return null;
    if (accountById.has(ref)) return ref;
    const byName = accountByName.get(norm(ref));
    if (byName) return byName.id;
    // unknown -> consult resolution
    const choice = resolution.accounts[ref];
    if (choice === SKIP) return null;
    if (!choice || choice === KEEP) return ensureAccountByName(ref);
    return ensureAccountByName(choice); // map to a chosen existing/target name
  };

  const resolveCategoryRef = (ref: string | undefined, type: TransactionType): string | null => {
    const t = type === "income" ? "income" : "expense";
    if (!ref) return ensureCategory("Others", t);
    const key = norm(ref) + "|" + t;
    if (catByNameType.has(key)) return catByNameType.get(key)!.name;
    const choice = resolution.categories[ref];
    if (choice === SKIP) return null;
    if (!choice || choice === KEEP) return ensureCategory(ref, t);
    return ensureCategory(choice, t);
  };

  const finalTx: Transaction[] = [];
  let dropped = 0;

  for (const s of staged.transactions) {
    if (s.type === "transfer") {
      const from = resolveAccountRef(s.rawFromAccount);
      const to = resolveAccountRef(s.rawToAccount);
      if (!from || !to) {
        dropped++;
        continue;
      }
      finalTx.push({
        id: s.id, type: "transfer", date: s.date, amount: s.amount,
        description: s.description, fromAccount: from, toAccount: to,
        createdAt: s.createdAt, updatedAt: s.updatedAt,
      });
    } else {
      const account = resolveAccountRef(s.rawAccount);
      const category = resolveCategoryRef(s.rawCategory, s.type);
      if (!account || !category) {
        dropped++;
        continue;
      }
      finalTx.push({
        id: s.id, type: s.type, date: s.date, amount: s.amount,
        description: s.description, account, category,
        createdAt: s.createdAt, updatedAt: s.updatedAt,
      });
    }
  }

  return {
    data: {
      version: LEDGER_VERSION,
      transactions: finalTx,
      accounts,
      categories,
      // Preserve the current diary's calendar; also fold in any the backup carried.
      dayNotes: current.dayNotes ?? [],
      events: current.events ?? [],
    },
    committed: finalTx.length,
    dropped,
  };
}
