import { useRef, useState } from "react";
import type { Transaction, TransactionType } from "@/domain/types";
import { emptyLedger } from "@/domain/defaults";
import { useLedger } from "@/store/useLedger";
import { DEFAULT_FILTERS, type Filters } from "@/lib/selectors";
import {
  downloadBackup,
  parseBackupFile,
  resolveImport,
  type ImportResolution,
  type StagedImport,
} from "@/lib/backup";
import { LockScreen } from "@/components/LockScreen";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { Calendar } from "@/components/Calendar";
import { Reports } from "@/components/Reports";
import { Accounts } from "@/components/Accounts";
import { TransactionModal } from "@/components/TransactionModal";
import { ImportMappingModal } from "@/components/ImportMappingModal";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icon";

type View = "dashboard" | "calendar" | "reports" | "accounts";

interface ModalState {
  open: boolean;
  type: TransactionType;
  editing: Transaction | null;
}

export function App() {
  const ledger = useLedger();
  const toast = useToast();
  const [view, setView] = useState<View>("dashboard");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [modal, setModal] = useState<ModalState>({ open: false, type: "expense", editing: null });
  const [pendingImport, setPendingImport] = useState<StagedImport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (ledger.status === "loading") {
    return (
      <div className="loading">
        <span className="bow"><Icon name="bow" /></span>
        opening your diary…
      </div>
    );
  }

  if (ledger.status === "setup" || ledger.status === "locked") {
    return (
      <LockScreen
        mode={ledger.status}
        onSetup={ledger.setup}
        onUnlock={ledger.unlock}
        onReset={ledger.reset}
      />
    );
  }

  const data = ledger.data ?? emptyLedger();

  function openAdd(type: TransactionType) {
    setModal({ open: true, type, editing: null });
  }
  function openEdit(tx: Transaction) {
    setModal({ open: true, type: tx.type, editing: tx });
  }
  function closeModal() {
    setModal((m) => ({ ...m, open: false }));
  }

  async function handleDeleteTx(tx: Transaction) {
    const label = tx.description || tx.category || "this entry";
    if (!confirm(`Delete ${label}?`)) return;
    await ledger.deleteTransaction(tx.id);
    toast("Deleted.");
  }

  function handleExport() {
    if (data.transactions.length === 0) {
      toast("Nothing to export yet.");
      return;
    }
    downloadBackup(data);
    toast("Backup downloaded");
  }

  async function handleImportFile(file: File) {
    const parsed = await parseBackupFile(file, data);
    if (!parsed.ok || !parsed.staged) {
      toast(parsed.error ?? "Couldn't read that file.");
      return;
    }
    const s = parsed.staged;
    const hasUnknowns =
      s.unknownIncomeCategories.length > 0 ||
      s.unknownExpenseCategories.length > 0 ||
      s.unknownAccounts.length > 0;

    if (hasUnknowns) {
      // Ask the user how to map the unfamiliar names before committing.
      setPendingImport(s);
      return;
    }

    // Nothing to map — everything matches. Confirm and commit.
    const skipNote = s.skipped > 0 ? `\n\nSkipping ${s.skipped} bad entry(ies): ${s.skipReasons.join(", ")}.` : "";
    if (!confirm(`Restore ${s.transactions.length} entries? This replaces what's here now.${skipNote}`)) return;
    await commitImport(s, { categories: {}, accounts: {} });
  }

  async function commitImport(s: StagedImport, resolution: ImportResolution) {
    const { data: finalData, committed, dropped } = resolveImport(s, data, resolution);
    await ledger.replaceAll(finalData);
    setPendingImport(null);
    const extra = dropped > 0 ? ` (skipped ${dropped})` : "";
    toast(`Restored ${committed} entries${extra}`);
  }

  return (
    <div className="app">
      <Sidebar
        view={view}
        onView={setView}
        onQuickAdd={openAdd}
        onExport={handleExport}
        onImport={() => fileInput.current?.click()}
        onLock={ledger.lock}
      />

      <main className="main">
        {view === "dashboard" && (
          <Dashboard
            data={data}
            filters={filters}
            onFilters={setFilters}
            onEdit={openEdit}
            onDelete={handleDeleteTx}
          />
        )}
        {view === "calendar" && (
          <Calendar
            data={data}
            onAddNote={ledger.addDayNote}
            onUpdateNote={ledger.updateDayNote}
            onDeleteNote={ledger.deleteDayNote}
            onAddEvent={ledger.addEvent}
            onDeleteEvent={ledger.deleteEvent}
          />
        )}
        {view === "reports" && <Reports data={data} />}
        {view === "accounts" && (
          <Accounts
            data={data}
            onAddAccount={ledger.addAccount}
            onDeleteAccount={ledger.deleteAccount}
            onAddCategory={ledger.addCategory}
            onDeleteCategory={ledger.deleteCategory}
          />
        )}
      </main>

      {modal.open && (
        <TransactionModal
          data={data}
          initialType={modal.type}
          editing={modal.editing}
          onClose={closeModal}
          onSave={async (input) => {
            if (modal.editing) await ledger.updateTransaction(modal.editing.id, input);
            else await ledger.addTransaction(input);
          }}
          onDelete={ledger.deleteTransaction}
        />
      )}

      {pendingImport && (
        <ImportMappingModal
          staged={pendingImport}
          current={data}
          onCancel={() => setPendingImport(null)}
          onConfirm={(resolution) => void commitImport(pendingImport, resolution)}
        />
      )}

      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleImportFile(file);
        }}
      />
    </div>
  );
}
