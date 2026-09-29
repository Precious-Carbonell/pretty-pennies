import { useState } from "react";
import type { LedgerData, NewAccount } from "@/domain/types";
import { ACCENTS } from "@/domain/defaults";
import { fmtMoney } from "@/lib/format";
import { computeBalances } from "@/lib/selectors";
import { Icon, type IconName } from "./Icon";
import { accountIcon, ICON_CHOICES, iconToStored } from "@/lib/icons";
import { useToast } from "./Toast";

type NewCategory = { name: string; type: "income" | "expense"; emoji: string };

interface Props {
  data: LedgerData;
  onAddAccount: (input: NewAccount) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onAddCategory: (cat: NewCategory) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export function Accounts({ data, onAddAccount, onDeleteAccount, onAddCategory, onDeleteCategory }: Props) {
  const toast = useToast();
  const balances = computeBalances(data);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<IconName>("bank");
  const [busy, setBusy] = useState(false);

  // Category manager state
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"income" | "expense">("expense");
  const [catBusy, setCatBusy] = useState(false);

  const expenseCats = data.categories.filter((c) => c.type === "expense");
  const incomeCats = data.categories.filter((c) => c.type === "income");

  function catUsage(catName: string): number {
    return data.transactions.filter((t) => t.category === catName).length;
  }

  async function handleAddCategory() {
    const trimmed = catName.trim();
    if (!trimmed) {
      toast("Give the category a name.");
      return;
    }
    const exists = data.categories.some(
      (c) => c.type === catType && c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      toast("You already have that category.");
      return;
    }
    setCatBusy(true);
    try {
      await onAddCategory({ name: trimmed, type: catType, emoji: "🎀" });
      setCatName("");
      toast("Category added");
    } finally {
      setCatBusy(false);
    }
  }

  async function handleDeleteCategory(id: string, name: string) {
    const used = catUsage(name);
    const msg =
      used > 0
        ? `"${name}" is used by ${used} entr${used === 1 ? "y" : "ies"}. Delete it anyway? Those entries keep the label but it won't be selectable anymore.`
        : `Delete "${name}"?`;
    if (!confirm(msg)) return;
    await onDeleteCategory(id);
    toast("Category deleted.");
  }

  async function handleAdd() {
    if (!name.trim()) {
      toast("Give your account a name.");
      return;
    }
    setBusy(true);
    try {
      const color = ACCENTS[data.accounts.length % ACCENTS.length];
      await onAddAccount({ name: name.trim(), emoji: iconToStored(icon), color });
      setName("");
      setIcon("bank");
      toast("Account added");
    } finally {
      setBusy(false);
    }
  }

  function countFor(id: string): number {
    return data.transactions.filter(
      (t) => t.account === id || t.fromAccount === id || t.toAccount === id,
    ).length;
  }

  async function handleDelete(id: string, accName: string) {
    const used = countFor(id);
    const msg =
      used > 0
        ? `"${accName}" has ${used} entr${used === 1 ? "y" : "ies"}. Delete the account anyway? The entries stay but will show no account.`
        : `Delete "${accName}"?`;
    if (!confirm(msg)) return;
    await onDeleteAccount(id);
    toast("Account deleted.");
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title"><Icon name="wallet" /> Accounts</h1>
          <div className="page-sub">running balance for each of your little purses</div>
        </div>
      </div>

      <div className="acct-grid" style={{ marginBottom: 28 }}>
        {data.accounts.map((a) => (
          <div key={a.id} className="acct-card" style={{ background: a.color + "40" }}>
            <div className="head">
              <span className="emoji"><Icon name={accountIcon(a)} /></span>
              <span style={{ fontWeight: 700, flex: 1 }}>{a.name}</span>
              <button
                className="icon-btn"
                title="Delete account"
                aria-label="Delete account"
                onClick={() => handleDelete(a.id, a.name)}
              >
                <Icon name="trash" />
              </button>
            </div>
            <div className="bal" style={{ color: balances[a.id] < 0 ? "var(--expense)" : undefined }}>
              {fmtMoney(balances[a.id] || 0)}
            </div>
            <div className="sub">{countFor(a.id)} entries</div>
          </div>
        ))}
      </div>

      <div className="list-head">
        <h2>Add an account</h2>
      </div>
      <div className="card" style={{ maxWidth: 520 }}>
        <div className="field">
          <label>Icon</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ICON_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setIcon(c)}
                aria-label={c}
                style={{
                  fontSize: 20,
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  border: icon === c ? "2px solid var(--yellow-400)" : "1px solid var(--line)",
                  background: icon === c ? "var(--yellow-100)" : "var(--surface-soft)",
                  color: "var(--yellow-700)",
                }}
              >
                <Icon name={c} />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Name</label>
          <input
            type="text"
            placeholder="e.g. Piggy bank"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy} onClick={handleAdd}>
          {busy ? "…" : "Add account"}
        </button>
      </div>

      <div className="list-head" style={{ marginTop: 34 }}>
        <h2>Categories</h2>
      </div>

      <div className="cat-columns">
        <div className="card">
          <div className="section-label" style={{ marginBottom: 12 }}>Expense</div>
          {expenseCats.length === 0 ? (
            <div className="cat-empty">No expense categories yet.</div>
          ) : (
            expenseCats.map((c) => (
              <div className="cat-row" key={c.id}>
                <span className="cat-name">{c.name}</span>
                <span className="cat-count">{catUsage(c.name)}</span>
                <button
                  className="icon-btn delete"
                  title="Delete category"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => handleDeleteCategory(c.id, c.name)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 12 }}>Income</div>
          {incomeCats.length === 0 ? (
            <div className="cat-empty">No income categories yet.</div>
          ) : (
            incomeCats.map((c) => (
              <div className="cat-row" key={c.id}>
                <span className="cat-name">{c.name}</span>
                <span className="cat-count">{catUsage(c.name)}</span>
                <button
                  className="icon-btn delete"
                  title="Delete category"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => handleDeleteCategory(c.id, c.name)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520, marginTop: 16 }}>
        <div className="field">
          <label>Type</label>
          <div className="type-switch" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={catType === "expense" ? "active" : ""}
              onClick={() => setCatType("expense")}
            >
              Expense
            </button>
            <button
              type="button"
              className={catType === "income" ? "active" : ""}
              onClick={() => setCatType("income")}
            >
              Income
            </button>
          </div>
        </div>
        <div className="field">
          <label>New category name</label>
          <input
            type="text"
            placeholder={catType === "expense" ? "e.g. Shopping" : "e.g. Freelance"}
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          />
        </div>
        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          disabled={catBusy}
          onClick={handleAddCategory}
        >
          {catBusy ? "…" : "Add category"}
        </button>
      </div>
    </section>
  );
}
