import { useState } from "react";
import type { LedgerData } from "@/domain/types";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from "@/domain/defaults";
import { KEEP, SKIP, type ImportResolution, type StagedImport } from "@/lib/backup";

interface Props {
  staged: StagedImport;
  current: LedgerData;
  onCancel: () => void;
  onConfirm: (resolution: ImportResolution) => void;
}

/**
 * When a backup references categories/accounts the current diary doesn't have,
 * this modal lets the user map each one to an existing option (or keep it as a
 * new one, or skip the entries that use it).
 */
export function ImportMappingModal({ staged, current, onCancel, onConfirm }: Props) {
  // Fall back to the built-in defaults when the diary has none yet, so there
  // are always real categories/accounts to map into.
  const cats = current.categories.length > 0 ? current.categories : DEFAULT_CATEGORIES;
  const accts = current.accounts.length > 0 ? current.accounts : DEFAULT_ACCOUNTS;

  const incomeCats = cats.filter((c) => c.type === "income").map((c) => c.name);
  const expenseCats = cats.filter((c) => c.type === "expense").map((c) => c.name);
  const accountNames = accts.map((a) => a.name);

  // Default every unknown to the first existing option if there is one, else KEEP.
  const [catMap, setCatMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    staged.unknownIncomeCategories.forEach((n) => (m[n] = incomeCats[0] ?? KEEP));
    staged.unknownExpenseCategories.forEach((n) => (m[n] = expenseCats[0] ?? KEEP));
    return m;
  });
  const [acctMap, setAcctMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    staged.unknownAccounts.forEach((n) => (m[n] = accountNames[0] ?? KEEP));
    return m;
  });

  function confirm() {
    onConfirm({ categories: catMap, accounts: acctMap });
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <h3>Match your imported items</h3>
        <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: -8, marginBottom: 16 }}>
          Some things in this backup aren't in your diary yet. Pick where each one should go.
        </p>

        {staged.unknownExpenseCategories.length > 0 && (
          <MapSection
            label="Expense categories"
            names={staged.unknownExpenseCategories}
            options={expenseCats}
            map={catMap}
            onChange={(name, val) => setCatMap((m) => ({ ...m, [name]: val }))}
          />
        )}

        {staged.unknownIncomeCategories.length > 0 && (
          <MapSection
            label="Income categories"
            names={staged.unknownIncomeCategories}
            options={incomeCats}
            map={catMap}
            onChange={(name, val) => setCatMap((m) => ({ ...m, [name]: val }))}
          />
        )}

        {staged.unknownAccounts.length > 0 && (
          <MapSection
            label="Accounts"
            names={staged.unknownAccounts}
            options={accountNames}
            map={acctMap}
            onChange={(name, val) => setAcctMap((m) => ({ ...m, [name]: val }))}
          />
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={confirm}>Import</button>
        </div>
      </div>
    </div>
  );
}

function MapSection({
  label,
  names,
  options,
  map,
  onChange,
}: {
  label: string;
  names: string[];
  options: string[];
  map: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="section-label" style={{ marginBottom: 10 }}>{label}</div>
      {names.map((name) => (
        <div className="map-row" key={name}>
          <span className="map-from" title={name}>{name}</span>
          <span className="map-arrow">→</span>
          <select
            className="map-select"
            value={map[name]}
            onChange={(e) => onChange(name, e.target.value)}
          >
            {options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
            <option value={KEEP}>➕ Keep as new "{name}"</option>
            <option value={SKIP}>🗑 Skip these entries</option>
          </select>
        </div>
      ))}
    </div>
  );
}
