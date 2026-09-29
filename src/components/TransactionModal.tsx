import { useEffect, useState, type FormEvent } from "react";
import type { LedgerData, NewTransaction, Transaction, TransactionType } from "@/domain/types";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from "@/domain/defaults";
import { todayISO } from "@/lib/format";
import { useToast } from "./Toast";

interface Props {
  data: LedgerData;
  initialType: TransactionType;
  editing: Transaction | null;
  onClose: () => void;
  onSave: (input: NewTransaction) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TITLES: Record<TransactionType, string> = {
  income: "Add income",
  expense: "Add expense",
  transfer: "Move money",
};

export function TransactionModal({ data, initialType, editing, onClose, onSave, onDelete }: Props) {
  const toast = useToast();
  const [type, setType] = useState<TransactionType>(editing?.type ?? initialType);
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const initialAccounts = data.accounts.length > 0 ? data.accounts : DEFAULT_ACCOUNTS;
  const [account, setAccount] = useState(editing?.account ?? initialAccounts[0]?.id ?? "");
  const [fromAccount, setFromAccount] = useState(editing?.fromAccount ?? initialAccounts[0]?.id ?? "");
  const [toAccount, setToAccount] = useState(
    editing?.toAccount ?? initialAccounts[1]?.id ?? initialAccounts[0]?.id ?? "",
  );
  const [description, setDescription] = useState(editing?.description ?? "");
  const [busy, setBusy] = useState(false);

  const isEdit = Boolean(editing);

  // Always show options: fall back to the built-in defaults when the stored
  // diary has no accounts/categories of its own.
  const accountOptions = data.accounts.length > 0 ? data.accounts : DEFAULT_ACCOUNTS;
  const allCategories = data.categories.length > 0 ? data.categories : DEFAULT_CATEGORIES;
  const catOptions = allCategories.filter((c) => c.type === (type === "transfer" ? "expense" : type));

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date || isNaN(amt) || amt <= 0) {
      toast("Enter a valid date and amount.");
      return;
    }

    let input: NewTransaction;
    if (type === "transfer") {
      if (fromAccount === toAccount) {
        toast("Pick two different accounts.");
        return;
      }
      input = { type, date, amount: amt, description, fromAccount, toAccount };
    } else {
      if (!category.trim()) {
        toast("Choose a category.");
        return;
      }
      input = { type, date, amount: amt, description, category: category.trim(), account };
    }

    setBusy(true);
    try {
      await onSave(input);
      toast(isEdit ? "Updated" : "Saved");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirm("Delete this entry?")) return;
    await onDelete(editing.id);
    toast("Deleted.");
    onClose();
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit}>
        <h3>{isEdit ? "Edit entry" : TITLES[type]}</h3>

        {!isEdit && (
          <div className="type-switch">
            {(["income", "expense", "transfer"] as TransactionType[]).map((t) => (
              <button
                type="button"
                key={t}
                className={type === t ? "active" : ""}
                onClick={() => setType(t)}
              >
                {t === "income" ? "Income" : t === "expense" ? "Expense" : "Transfer"}
              </button>
            ))}
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="field">
            <label>Amount (₱)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
        </div>

        {type === "transfer" ? (
          <div className="field-row">
            <div className="field">
              <label>From</label>
              <select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)}>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>To</label>
              <select value={toAccount} onChange={(e) => setToAccount(e.target.value)}>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Choose…</option>
                {catOptions.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Account</label>
              <select value={account} onChange={(e) => setAccount(e.target.value)}>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="field">
          <label>Note (optional)</label>
          <input
            type="text"
            placeholder="e.g. bubble tea with friends"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {isEdit && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
