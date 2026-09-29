import type { LedgerData, Transaction } from "@/domain/types";
import { useMemo, useState } from "react";
import { fmtDateShort, fmtMoney, signedMoney, todayISO } from "@/lib/format";
import {
  accountName,
  computeBalances,
  computeTotals,
  filterTransactions,
  type Filters,
  type Period,
  type TypeFilter,
} from "@/lib/selectors";
import { Icon, type IconName } from "./Icon";
import { accountIcon } from "@/lib/icons";
import { customRange, monthRange, txInRange, yearRange } from "@/lib/reports";
import { MiniCalendar } from "./MiniCalendar";
import sanrioGif from "@/assets/sanriogif.gif";
import headImg from "@/assets/head.png";
import { nextPayday } from "@/lib/calendar";

interface Props {
  data: LedgerData;
  filters: Filters;
  onFilters: (f: Filters) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

type CardScope = "all" | "month" | "year" | "custom";

const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

const TYPES: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expense" },
  { key: "transfer", label: "Transfers" },
];

const PERIOD_SUB: Record<Period, string> = {
  all: "everything you've logged",
  today: "just today",
  week: "this week so far",
  month: "this month so far",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function yearChoices(data: { transactions: { date: string }[] }): number[] {
  const set = new Set<number>();
  set.add(new Date().getFullYear());
  data.transactions.forEach((t) => {
    const y = Number(t.date.slice(0, 4));
    if (!isNaN(y)) set.add(y);
  });
  return Array.from(set).sort((a, b) => b - a);
}

export function Dashboard({ data, filters, onFilters, onEdit, onDelete }: Props) {
  const list = filterTransactions(data, filters);
  const balances = computeBalances(data);
  const usedCategories = Array.from(new Set(data.categories.map((c) => c.name)));

  // Independent filter just for the summary cards (separate from the list below).
  const now = new Date();
  const [cardScope, setCardScope] = useState<CardScope>("month");
  const [cardMonth, setCardMonth] = useState(now.getMonth());
  const [cardYear, setCardYear] = useState(now.getFullYear());
  const [cardStart, setCardStart] = useState(todayISO().slice(0, 8) + "01");
  const [cardEnd, setCardEnd] = useState(todayISO());

  const { cardList, cardLabel } = useMemo(() => {
    if (cardScope === "all") return { cardList: data.transactions, cardLabel: "all time" };
    const range =
      cardScope === "month"
        ? monthRange(cardYear, cardMonth)
        : cardScope === "year"
          ? yearRange(cardYear)
          : customRange(cardStart, cardEnd);
    return { cardList: txInRange(data, range), cardLabel: range.label };
  }, [data, cardScope, cardMonth, cardYear, cardStart, cardEnd]);

  const totals = computeTotals(data, cardList);

  // Payday countdown (drives the heart widget)
  const paydayInfo = useMemo(() => nextPayday(data.events ?? [], 40), [data.events]);

  // Pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  // Reset to page 1 whenever the filtered list changes
  const listKey = list.length + filters.period + filters.type + filters.account + filters.category + filters.search;
  useMemo(() => { setPage(1); }, [listKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const paginated = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title"><Icon name="book" /> Dashboard</h1>
          <div className="page-sub">{PERIOD_SUB[filters.period]}</div>
        </div>
        <span className="pill"><span className="dot" /> saved on this device</span>
      </div>

      {/* two-column layout: main content left, mini calendar right */}
      <div className="dash-layout">
        <div className="dash-main">
          <div className="card-filter">
            <span className="card-filter-label">Summary for</span>
            <div className="seg">
              {(["all", "month", "year", "custom"] as CardScope[]).map((s) => (
                <button key={s} className={cardScope === s ? "active" : ""} onClick={() => setCardScope(s)}>
                  {s === "all" ? "All time" : s === "month" ? "Month" : s === "year" ? "Year" : "Custom"}
                </button>
              ))}
            </div>
            {cardScope === "month" && (
              <>
                <select className="control" value={cardMonth} onChange={(e) => setCardMonth(Number(e.target.value))}>
                  {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="control" value={cardYear} onChange={(e) => setCardYear(Number(e.target.value))}>
                  {yearChoices(data).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            {cardScope === "year" && (
              <select className="control" value={cardYear} onChange={(e) => setCardYear(Number(e.target.value))}>
                {yearChoices(data).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {cardScope === "custom" && (
              <>
                <input className="control" type="date" value={cardStart} onChange={(e) => setCardStart(e.target.value)} />
                <span className="card-filter-label">to</span>
                <input className="control" type="date" value={cardEnd} onChange={(e) => setCardEnd(e.target.value)} />
              </>
            )}
            <span className="card-filter-range">{cardLabel}</span>
          </div>

          {/* summary cards — flat, small, 4-column */}
          <div className="dash-summary-cards">
            <div className="summary-card">
              <div className="sc-label"><Icon name="heart" size={13} /> Net this period</div>
              <div className={"sc-value " + (totals.net < 0 ? "neg" : "pos")}>{signedMoney(totals.net)}</div>
            </div>
            <div className="summary-card">
              <div className="sc-label"><Icon name="arrow-down" size={13} /> Money in</div>
              <div className="sc-value pos">{fmtMoney(totals.income)}</div>
            </div>
            <div className="summary-card">
              <div className="sc-label"><Icon name="arrow-up" size={13} /> Money out</div>
              <div className="sc-value neg">{fmtMoney(totals.expense)}</div>
            </div>
            <div className="summary-card">
              <div className="sc-label"><Icon name="wallet" size={13} /> Total balance</div>
              <div className="sc-value">{fmtMoney(totals.total)}</div>
            </div>
          </div>

          {/* account cards — bigger, yellow tinted grid */}
          <div className="dash-acct-grid">
            {data.accounts.map((a) => (
              <div key={a.id} className="dash-acct-card" style={{ background: a.color + "44" }}>
                <div className="dac-top">
                  <span className="dac-icon"><Icon name={accountIcon(a)} size={16} /></span>
                  <span className="dac-name">{a.name}</span>
                </div>
                <div className={"dac-bal" + (balances[a.id] < 0 ? " neg" : "")}>{fmtMoney(balances[a.id] || 0)}</div>
              </div>
            ))}
          </div>

          {/* transaction filters + list */}
          <div className="filters">
            <div className="seg">
              {PERIODS.map((p) => (
                <button key={p.key} className={filters.period === p.key ? "active" : ""} onClick={() => onFilters({ ...filters, period: p.key })}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="seg">
              {TYPES.map((t) => (
                <button key={t.key} className={filters.type === t.key ? "active" : ""} onClick={() => onFilters({ ...filters, type: t.key })}>
                  {t.label}
                </button>
              ))}
            </div>
            <select className="control" value={filters.account} onChange={(e) => onFilters({ ...filters, account: e.target.value })}>
              <option value="all">All accounts</option>
              {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="control" value={filters.category} onChange={(e) => onFilters({ ...filters, category: e.target.value })}>
              <option value="all">All categories</option>
              {usedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="control" type="text" placeholder="search notes…" value={filters.search} onChange={(e) => onFilters({ ...filters, search: e.target.value })} />
          </div>

          <div className="list-head">
            <h2>Entries</h2>
            <div className="list-total">{list.length} {list.length === 1 ? "entry" : "entries"}</div>
          </div>

          {list.length === 0 ? (
            <div className="empty">
              <div className="big">Nothing here yet</div>
              Tap a button on the left to log your first pretty penny.
            </div>
          ) : (
            <>
              <div className="ledger">
                {paginated.map((t) => (
                  <TxRow key={t.id} tx={t} data={data} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    ‹
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push("…");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={"ellipsis-" + i} className="page-ellipsis">…</span>
                      ) : (
                        <button
                          key={p}
                          className={"page-btn" + (p === page ? " active" : "")}
                          onClick={() => setPage(p as number)}
                          aria-label={`Page ${p}`}
                          aria-current={p === page ? "page" : undefined}
                        >
                          {p}
                        </button>
                      )
                    )}

                  <button
                    className="page-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                  >
                    ›
                  </button>

                  <span className="page-info">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, list.length)} of {list.length}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* right: mini calendar + sanrio gif card + savings progress */}
        <aside className="dash-cal-panel">
          <MiniCalendar events={data.events ?? []} dayNotes={data.dayNotes ?? []} />
          <div className="dash-gif-card">
            <img src={sanrioGif} alt="" className="dash-gif" aria-hidden="true" />
          </div>
          <SavingsProgress total={totals.total} goal={100000} />
        </aside>
      </div>

      {/* payday heart countdown — fixed lower-right */}
      {paydayInfo !== null && (
        <PaydayHeart days={paydayInfo.daysUntil} />
      )}
    </section>
  );
}

function TxRow({
  tx,
  data,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  data: LedgerData;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}) {
  const icon: IconName =
    tx.type === "transfer" ? "transfer" : tx.type === "income" ? "arrow-down" : "arrow-up";

  let meta: string;
  let amount: string;
  if (tx.type === "income") {
    meta = accountName(data.accounts, tx.account);
    amount = "+ " + fmtMoney(tx.amount);
  } else if (tx.type === "expense") {
    meta = accountName(data.accounts, tx.account);
    amount = "− " + fmtMoney(tx.amount);
  } else {
    meta = `${accountName(data.accounts, tx.fromAccount)} → ${accountName(data.accounts, tx.toAccount)}`;
    amount = fmtMoney(tx.amount);
  }

  const title = tx.description || tx.category || (tx.type === "transfer" ? "Transfer" : "");

  return (
    <div className="tx">
      <span className={"avatar " + tx.type}><Icon name={icon} /></span>
      <div className="body">
        <div className="title">{title}</div>
        <div className="meta">
          <span>{fmtDateShort(tx.date)}</span>
          <span>·</span>
          <span>{meta}</span>
          {tx.category && tx.type !== "transfer" && <span>· {tx.category}</span>}
        </div>
      </div>
      <div className={"amount " + tx.type}>{amount}</div>
      <div className="tx-actions">
        <button className="icon-btn edit" title="Edit" aria-label="Edit" onClick={() => onEdit(tx)}>
          <Icon name="pencil" />
        </button>
        <button className="icon-btn delete" title="Delete" aria-label="Delete" onClick={() => onDelete(tx)}>
          <Icon name="trash" />
        </button>
      </div>
    </div>
  );
}

function SavingsProgress({ total, goal }: { total: number; goal: number }) {
  const pct = Math.min(100, Math.max(0, (total / goal) * 100));
  const display = Math.round(pct);

  return (
    <div className="savings-card">
      <div className="savings-labels">
        <span className="savings-title">savings goal 🎀</span>
        <span className="savings-pct">{display}%</span>
      </div>
      <div className="savings-bar-wrap">
        <div className="savings-bar-fill" style={{ width: `${pct}%` }}>
          <img
            src={headImg}
            alt=""
            aria-hidden="true"
            className="savings-head"
          />
        </div>
      </div>
      <div className="savings-amounts">
        <span className="savings-cur">{fmtMoney(Math.max(0, total))}</span>
        <span className="savings-goal">of {fmtMoney(goal)}</span>
      </div>
    </div>
  );
}

function PaydayHeart({ days }: { days: number }) {
  const isToday = days === 0;
  const isTomorrow = days === 1;

  const topLabel = isToday ? "it's" : isTomorrow ? "only" : `${days}`;
  const midLabel = isToday ? "payday!" : isTomorrow ? "1 day" : days === 1 ? "day" : "days";
  const botLabel = isToday ? "🎀" : isTomorrow ? "to go!" : "til payday";

  return (
    <div className="payday-heart-wrap" aria-label={`${days} days until payday`}>
      {/* floating sparkles */}
      <span className="ph-spark s1">✦</span>
      <span className="ph-spark s2">✦</span>
      <span className="ph-spark s3">·</span>

      <div className="payday-heart">
        <div className="ph-inner">
          <span className="ph-top">{topLabel}</span>
          <span className="ph-mid">{midLabel}</span>
          <span className="ph-bot">{botLabel}</span>
        </div>
      </div>
    </div>
  );
}
