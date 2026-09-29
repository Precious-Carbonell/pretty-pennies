import type { TransactionType } from "@/domain/types";
import { Icon } from "./Icon";
import logoUrl from "@/assets/logo.png";

type View = "dashboard" | "calendar" | "reports" | "accounts";

interface Props {
  view: View;
  onView: (v: View) => void;
  onQuickAdd: (type: TransactionType) => void;
  onExport: () => void;
  onImport: () => void;
  onLock: () => void;
}

export function Sidebar({ view, onView, onQuickAdd, onExport, onImport, onLock }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={logoUrl} alt="Pretty Pennies" className="brand-logo" />
      </div>

      <div>
        <div className="section-label">Add something</div>
        <div className="quick-actions">
          <button className="qa-btn qa-in" onClick={() => onQuickAdd("income")}>
            <span className="icon"><Icon name="arrow-down" /></span> Add income
          </button>
          <button className="qa-btn qa-out" onClick={() => onQuickAdd("expense")}>
            <span className="icon"><Icon name="arrow-up" /></span> Add expense
          </button>
          <button className="qa-btn qa-transfer" onClick={() => onQuickAdd("transfer")}>
            <span className="icon"><Icon name="transfer" /></span> Move money
          </button>
        </div>
      </div>

      <div>
        <div className="section-label">Pages</div>
        <nav className="nav">
          <div className={"nav-item" + (view === "dashboard" ? " active" : "")} onClick={() => onView("dashboard")}>
            <span className="emoji"><Icon name="book" /></span> Dashboard
          </div>
          <div className={"nav-item" + (view === "calendar" ? " active" : "")} onClick={() => onView("calendar")}>
            <span className="emoji"><Icon name="heart" /></span> Calendar
          </div>
          <div className={"nav-item" + (view === "reports" ? " active" : "")} onClick={() => onView("reports")}>
            <span className="emoji"><Icon name="star" /></span> Reports
          </div>
          <div className={"nav-item" + (view === "accounts" ? " active" : "")} onClick={() => onView("accounts")}>
            <span className="emoji"><Icon name="wallet" /></span> Accounts
          </div>
        </nav>
      </div>

      <div>
        <div className="section-label">Your data</div>
        <div className="quick-actions">
          <button className="qa-btn qa-plain" onClick={onExport}>
            <span className="icon"><Icon name="download" /></span> Export backup
          </button>
          <button className="qa-btn qa-plain" onClick={onImport}>
            <span className="icon"><Icon name="upload" /></span> Import backup
          </button>
        </div>
      </div>

      <div className="sidebar-foot">
        <button className="lock-btn" onClick={onLock}><Icon name="lock" /> Lock diary</button>
        <div className="privacy-note">
          Encrypted &amp; stored on this device only. No cloud, no accounts.
        </div>
      </div>
    </aside>
  );
}
