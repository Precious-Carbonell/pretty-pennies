// ---------------------------------------------------------------------------
// LedgerRepository — the single gateway between the app and stored data.
//
// Nothing in the UI touches storage directly; it all goes through this
// repository. That keeps the storage engine swappable (today: encrypted
// IndexedDB on this device; tomorrow: whatever you like) and keeps all the
// privacy rules in one place.
//
// Privacy model:
//   • On first run the user sets a PIN. We derive an AES key from it and store
//     only an encrypted blob — never the PIN, never plaintext.
//   • `unlock(pin)` must succeed before any data can be read or written.
//   • A "verifier" blob lets us tell a wrong PIN from a corrupt vault.
// ---------------------------------------------------------------------------

import type {
  Account,
  CalendarEvent,
  Category,
  DayNote,
  LedgerData,
  NewAccount,
  NewCalendarEvent,
  NewDayNote,
  NewTransaction,
  Transaction,
} from "@/domain/types";
import { emptyLedger, LEDGER_VERSION, uid } from "@/domain/defaults";
import { decryptJSON, encryptJSON, type EncryptedBlob } from "./crypto";
import { idbDelete, idbGet, idbSet } from "./idb";

const VAULT_KEY = "ledger.vault";
const VERIFIER_KEY = "ledger.verifier";
const META_KEY = "ledger.meta";

interface VaultMeta {
  hasPin: boolean;
  createdAt: number;
}

const VERIFIER_TOKEN = "pretty-pennies-ok";

export class LockedError extends Error {
  constructor() {
    super("Repository is locked. Call unlock(pin) first.");
    this.name = "LockedError";
  }
}

export class LedgerRepository {
  private pin: string | null = null;
  private cache: LedgerData | null = null;

  /** Whether a vault (and therefore a PIN) has ever been created on this device. */
  async isInitialized(): Promise<boolean> {
    const meta = await idbGet<VaultMeta>(META_KEY);
    return Boolean(meta?.hasPin);
  }

  get isUnlocked(): boolean {
    return this.pin !== null && this.cache !== null;
  }

  /** Create the vault for the first time with a chosen PIN. */
  async initialize(pin: string): Promise<LedgerData> {
    const data = emptyLedger();
    this.pin = pin;
    this.cache = data;
    await this.persist();
    await idbSet(VERIFIER_KEY, await encryptJSON(pin, VERIFIER_TOKEN));
    const meta: VaultMeta = { hasPin: true, createdAt: Date.now() };
    await idbSet(META_KEY, meta);
    return this.snapshot();
  }

  /** Try to unlock with a PIN. Returns true on success, false on wrong PIN. */
  async unlock(pin: string): Promise<boolean> {
    const verifier = await idbGet<EncryptedBlob>(VERIFIER_KEY);
    if (!verifier) return false;
    try {
      const token = await decryptJSON<string>(pin, verifier);
      if (token !== VERIFIER_TOKEN) return false;
    } catch {
      return false; // wrong PIN => AES-GCM auth fails
    }
    const blob = await idbGet<EncryptedBlob>(VAULT_KEY);
    const data = blob ? await decryptJSON<LedgerData>(pin, blob) : emptyLedger();
    this.pin = pin;
    this.cache = migrate(data);
    // Persist the repaired data so id fixes stick on disk.
    await this.persist();
    return true;
  }

  /** Wipe everything on disk (vault, verifier, meta) and forget the key.
   *  After this the app is back to first-run "setup" state. */
  async reset(): Promise<void> {
    await idbDelete(VAULT_KEY);
    await idbDelete(VERIFIER_KEY);
    await idbDelete(META_KEY);
    this.pin = null;
    this.cache = null;
  }

  /** Forget the in-memory key/data. The encrypted vault stays on disk. */
  lock(): void {
    this.pin = null;
    this.cache = null;
  }

  /** Change the PIN, re-encrypting the vault under the new key. */
  async changePin(currentPin: string, nextPin: string): Promise<boolean> {
    const ok = await this.unlock(currentPin);
    if (!ok) return false;
    this.pin = nextPin;
    await this.persist();
    await idbSet(VERIFIER_KEY, await encryptJSON(nextPin, VERIFIER_TOKEN));
    return true;
  }

  // --- Reads ---------------------------------------------------------------

  snapshot(): LedgerData {
    this.assertUnlocked();
    return structuredClone(this.cache!);
  }

  // --- Transactions --------------------------------------------------------

  async addTransaction(input: NewTransaction): Promise<Transaction> {
    this.assertUnlocked();
    const now = Date.now();
    const tx: Transaction = { ...input, id: uid("tx"), createdAt: now, updatedAt: now };
    this.cache!.transactions.unshift(tx);
    await this.persist();
    return tx;
  }

  async updateTransaction(id: string, patch: NewTransaction): Promise<void> {
    this.assertUnlocked();
    const list = this.cache!.transactions;
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...patch, id, updatedAt: Date.now() };
    await this.persist();
  }

  async deleteTransaction(id: string): Promise<void> {
    this.assertUnlocked();
    this.cache!.transactions = this.cache!.transactions.filter((t) => t.id !== id);
    await this.persist();
  }

  async importTransactions(items: NewTransaction[]): Promise<number> {
    this.assertUnlocked();
    const now = Date.now();
    let added = 0;
    for (const input of items) {
      const tx: Transaction = { ...input, id: uid("tx"), createdAt: now + added, updatedAt: now + added };
      this.cache!.transactions.unshift(tx);
      added++;
    }
    await this.persist();
    return added;
  }

  // --- Accounts ------------------------------------------------------------

  async addAccount(input: NewAccount): Promise<Account> {
    this.assertUnlocked();
    const account: Account = { ...input, id: uid("acct"), createdAt: Date.now() };
    this.cache!.accounts.push(account);
    await this.persist();
    return account;
  }

  async updateAccount(id: string, patch: Partial<NewAccount>): Promise<void> {
    this.assertUnlocked();
    const list = this.cache!.accounts;
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...patch };
    await this.persist();
  }

  async deleteAccount(id: string): Promise<void> {
    this.assertUnlocked();
    this.cache!.accounts = this.cache!.accounts.filter((a) => a.id !== id);
    await this.persist();
  }

  // --- Categories ----------------------------------------------------------

  async addCategory(cat: Omit<Category, "id">): Promise<Category> {
    this.assertUnlocked();
    const created: Category = { ...cat, id: uid("cat") };
    this.cache!.categories.push(created);
    await this.persist();
    return created;
  }

  async deleteCategory(id: string): Promise<void> {
    this.assertUnlocked();
    this.cache!.categories = this.cache!.categories.filter((c) => c.id !== id);
    await this.persist();
  }

  // --- Day notes -----------------------------------------------------------

  async addDayNote(input: NewDayNote): Promise<DayNote> {
    this.assertUnlocked();
    const note: DayNote = { ...input, id: uid("note"), createdAt: Date.now() };
    this.cache!.dayNotes.push(note);
    await this.persist();
    return note;
  }

  async updateDayNote(id: string, text: string): Promise<void> {
    this.assertUnlocked();
    const list = this.cache!.dayNotes;
    const idx = list.findIndex((n) => n.id === id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], text };
    await this.persist();
  }

  async deleteDayNote(id: string): Promise<void> {
    this.assertUnlocked();
    this.cache!.dayNotes = this.cache!.dayNotes.filter((n) => n.id !== id);
    await this.persist();
  }

  // --- Calendar events -----------------------------------------------------

  async addEvent(input: NewCalendarEvent): Promise<CalendarEvent> {
    this.assertUnlocked();
    const evt: CalendarEvent = { ...input, id: uid("evt"), createdAt: Date.now() };
    this.cache!.events.push(evt);
    await this.persist();
    return evt;
  }

  async deleteEvent(id: string): Promise<void> {
    this.assertUnlocked();
    this.cache!.events = this.cache!.events.filter((e) => e.id !== id);
    await this.persist();
  }

  // --- Backup --------------------------------------------------------------

  /** Replace the whole ledger (used by restore-from-backup). */
  async replaceAll(data: LedgerData): Promise<void> {
    this.assertUnlocked();
    this.cache = migrate(data);
    await this.persist();
  }

  // --- Internals -----------------------------------------------------------

  private assertUnlocked(): void {
    if (!this.isUnlocked) throw new LockedError();
  }

  private async persist(): Promise<void> {
    const blob = await encryptJSON(this.pin!, this.cache);
    await idbSet(VAULT_KEY, blob);
  }
}

function migrate(data: LedgerData): LedgerData {
  const seen = new Set<string>();
  const transactions = (Array.isArray(data.transactions) ? data.transactions : []).map((t, i) => {
    // Guarantee every transaction has a UNIQUE id. Missing or duplicate ids are
    // what caused "delete one" to wipe several rows, so we repair them here.
    let id = typeof t.id === "string" && t.id.length > 0 ? t.id : "";
    if (!id || seen.has(id)) id = uid("tx");
    seen.add(id);
    return {
      ...t,
      id,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now() - i,
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : Date.now() - i,
    };
  });

  const next: LedgerData = {
    version: LEDGER_VERSION,
    transactions,
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    dayNotes: Array.isArray(data.dayNotes) ? data.dayNotes : [],
    events: Array.isArray(data.events) ? data.events : [],
  };
  return next;
}

// A single shared instance the whole app talks to.
export const repository = new LedgerRepository();
