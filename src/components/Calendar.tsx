import { useMemo, useState } from "react";
import type { CalendarEvent, DayNote, LedgerData, NewCalendarEvent } from "@/domain/types";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import {
  daysInMonth,
  eventsOn,
  iso,
  MONTH_LABELS,
  nextPayday,
  parseISO,
  paydayMessage,
  untilLabel,
  upcomingEvents,
  WEEKDAY_LABELS,
} from "@/lib/calendar";

interface Props {
  data: LedgerData;
  onAddNote: (input: { date: string; text: string }) => Promise<void>;
  onUpdateNote: (id: string, text: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onAddEvent: (input: NewCalendarEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

// Monday-first weekday header.
const WEEK_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Calendar({ data, onAddNote, onUpdateNote, onDeleteNote, onAddEvent, onDeleteEvent }: Props) {
  const toast = useToast();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string>(iso(now));
  const [showEventForm, setShowEventForm] = useState(false);

  const todayIso = iso(now);
  const events = data.events;

  // Build the month grid (leading blanks so the 1st sits under the right weekday).
  const grid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const total = daysInMonth(viewYear, viewMonth);
    const leadRaw = first.getDay(); // 0=Sun
    const lead = (leadRaw + 6) % 7; // Monday-first
    const cells: (string | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(iso(new Date(viewYear, viewMonth, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const notesByDate = useMemo(() => {
    const m = new Map<string, DayNote[]>();
    data.dayNotes.forEach((n) => {
      const arr = m.get(n.date) ?? [];
      arr.push(n);
      m.set(n.date, arr);
    });
    return m;
  }, [data.dayNotes]);

  const upcoming = useMemo(() => upcomingEvents(events, 45), [events]);
  const payday = useMemo(() => nextPayday(events, 40), [events]);
  const message = payday ? paydayMessage(payday.daysUntil, todayIso) : null;

  function prevMonth() {
    const m = viewMonth - 1;
    if (m < 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth(m);
  }
  function nextMonth() {
    const m = viewMonth + 1;
    if (m > 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth(m);
  }
  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelected(todayIso);
  }

  const selectedDate = parseISO(selected);
  const selectedEvents = eventsOn(events, selectedDate);
  const selectedNotes = notesByDate.get(selected) ?? [];

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title"><Icon name="book" /> Calendar</h1>
          <div className="page-sub">notes, paydays &amp; little reminders</div>
        </div>
        <button className="pill" onClick={goToday} style={{ cursor: "pointer" }}>Today</button>
      </div>

      {message && (
        <div className="payday-banner">
          <span className="pb-emoji">🎀</span>
          <span className="pb-text">{message}</span>
          {payday && <span className="pb-when">{untilLabel(payday.daysUntil)}</span>}
        </div>
      )}

      <div className="cal-layout">
        <div className="cal-main">
          <div className="cal-head">
            <button className="icon-btn" aria-label="Previous month" onClick={prevMonth}>‹</button>
            <div className="cal-title">{MONTH_LABELS[viewMonth]} {viewYear}</div>
            <button className="icon-btn" aria-label="Next month" onClick={nextMonth}>›</button>
          </div>

          <div className="cal-grid cal-weekhead">
            {WEEK_HEADER.map((w) => (
              <div key={w} className="cal-weekday">{w}</div>
            ))}
          </div>

          <div className="cal-grid">
            {grid.map((dateStr, i) => {
              if (!dateStr) return <div key={i} className="cal-cell empty" />;
              const day = parseISO(dateStr).getDate();
              const evs = eventsOn(events, parseISO(dateStr));
              const hasNote = notesByDate.has(dateStr);
              const isToday = dateStr === todayIso;
              const isSel = dateStr === selected;
              return (
                <button
                  key={i}
                  className={
                    "cal-cell" +
                    (isToday ? " today" : "") +
                    (isSel ? " selected" : "") +
                    (evs.some((e) => e.isPayday) ? " payday" : "")
                  }
                  onClick={() => setSelected(dateStr)}
                >
                  <span className="cal-num">{day}</span>
                  <span className="cal-dots">
                    {evs.slice(0, 3).map((e) => (
                      <span key={e.id} className="cal-dot" style={{ background: e.color }} />
                    ))}
                    {hasNote && <span className="cal-dot note" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="cal-side">
          {/* Selected day panel */}
          <div className="cal-panel">
            <div className="cal-panel-head">
              {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>

            {selectedEvents.length > 0 && (
              <div className="cal-events">
                {selectedEvents.map((e) => (
                  <span key={e.id} className="cal-event-pill" style={{ background: e.color + "33", color: "var(--yellow-700)" }}>
                    {e.emoji} {e.title}
                  </span>
                ))}
              </div>
            )}

            <NoteEditor
              date={selected}
              notes={selectedNotes}
              onAdd={onAddNote}
              onUpdate={onUpdateNote}
              onDelete={onDeleteNote}
              toast={toast}
            />
          </div>

          {/* Upcoming */}
          <div className="cal-panel">
            <div className="cal-panel-head">Upcoming</div>
            {upcoming.length === 0 ? (
              <div className="cat-empty">Nothing coming up. Add an event below.</div>
            ) : (
              <div className="upcoming-list">
                {upcoming.map((u) => (
                  <div className="upcoming-row" key={u.event.id + u.date}>
                    <span className="up-emoji" style={{ background: u.event.color + "33" }}>{u.event.emoji}</span>
                    <div className="up-body">
                      <div className="up-title">{u.event.title}</div>
                      <div className="up-date">
                        {parseISO(u.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <span className={"up-when" + (u.daysUntil <= 1 ? " soon" : "")}>{untilLabel(u.daysUntil)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manage events */}
          <div className="cal-panel">
            <div className="cal-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Your events</span>
              <button className="chip-btn" onClick={() => setShowEventForm((s) => !s)}>
                {showEventForm ? "Close" : "+ Add"}
              </button>
            </div>

            {showEventForm && (
              <EventForm
                onCancel={() => setShowEventForm(false)}
                onSave={async (evt) => {
                  await onAddEvent(evt);
                  setShowEventForm(false);
                  toast("Event added");
                }}
              />
            )}

            <div className="event-list">
              {events.map((e) => (
                <div className="event-row" key={e.id}>
                  <span className="ev-emoji" style={{ background: e.color + "33" }}>{e.emoji}</span>
                  <div className="ev-body">
                    <div className="ev-title">{e.title}</div>
                    <div className="ev-rule">{describeEvent(e)}</div>
                  </div>
                  <button
                    className="icon-btn delete"
                    aria-label={`Delete ${e.title}`}
                    onClick={async () => {
                      if (!confirm(`Delete "${e.title}"?`)) return;
                      await onDeleteEvent(e.id);
                      toast("Event deleted.");
                    }}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function NoteEditor({
  date,
  notes,
  onAdd,
  onUpdate,
  onDelete,
  toast,
}: {
  date: string;
  notes: DayNote[];
  onAdd: (input: { date: string; text: string }) => Promise<void>;
  onUpdate: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  toast: (m: string) => void;
}) {
  const [draft, setDraft] = useState("");

  async function add() {
    const text = draft.trim();
    if (!text) return;
    await onAdd({ date, text });
    setDraft("");
    toast("Note added");
  }

  return (
    <div className="note-editor">
      {notes.map((n) => (
        <NoteRow key={n.id} note={n} onUpdate={onUpdate} onDelete={onDelete} toast={toast} />
      ))}
      <div className="note-add">
        <input
          type="text"
          className="control note-input"
          placeholder="add a note for this day…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="chip-btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}

function NoteRow({
  note,
  onUpdate,
  onDelete,
  toast,
}: {
  note: DayNote;
  onUpdate: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  toast: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);

  if (editing) {
    return (
      <div className="note-add">
        <input
          className="control note-input"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button className="chip-btn" onClick={save}>Save</button>
      </div>
    );
  }

  async function save() {
    await onUpdate(note.id, text.trim() || note.text);
    setEditing(false);
    toast("Note updated");
  }

  return (
    <div className="note-row">
      <span className="note-text">{note.text}</span>
      <div className="note-actions">
        <button className="icon-btn" aria-label="Edit note" onClick={() => setEditing(true)}><Icon name="pencil" size={14} /></button>
        <button
          className="icon-btn delete"
          aria-label="Delete note"
          onClick={async () => { await onDelete(note.id); toast("Note deleted."); }}
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  );
}

function EventForm({
  onSave,
  onCancel,
}: {
  onSave: (evt: NewCalendarEvent) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"monthly-days" | "weekly" | "yearly" | "once">("monthly-days");
  const [monthDaysText, setMonthDaysText] = useState("10, 25");
  const [weekday, setWeekday] = useState(1);
  const [onceDate, setOnceDate] = useState(iso(new Date()));
  const [isPayday, setIsPayday] = useState(false);

  async function save() {
    if (!title.trim()) return;
    const base: NewCalendarEvent = {
      title: title.trim(),
      kind,
      isPayday,
      color: isPayday ? "#F2B705" : "#F7D774",
      emoji: isPayday ? "🎀" : "🗓️",
    };
    if (kind === "monthly-days") {
      const days = monthDaysText
        .split(/[,\s]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => n >= 1 && n <= 31);
      if (days.length === 0) return;
      base.monthDays = Array.from(new Set(days));
    } else if (kind === "weekly") {
      base.weekday = weekday;
    } else if (kind === "yearly") {
      const d = parseISO(onceDate);
      base.month = d.getMonth();
      base.day = d.getDate();
    } else {
      base.date = onceDate;
    }
    await onSave(base);
  }

  return (
    <div className="event-form">
      <input className="control" placeholder="Event name (e.g. Rent due)" value={title} onChange={(e) => setTitle(e.target.value)} />

      <select className="control" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
        <option value="monthly-days">Monthly on set days</option>
        <option value="weekly">Weekly</option>
        <option value="yearly">Yearly</option>
        <option value="once">One time</option>
      </select>

      {kind === "monthly-days" && (
        <input
          className="control"
          placeholder="days e.g. 10, 25"
          value={monthDaysText}
          onChange={(e) => setMonthDaysText(e.target.value)}
        />
      )}
      {kind === "weekly" && (
        <select className="control" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
          {WEEKDAY_LABELS.map((w, i) => (
            <option key={i} value={i}>{w}</option>
          ))}
        </select>
      )}
      {(kind === "yearly" || kind === "once") && (
        <input className="control" type="date" value={onceDate} onChange={(e) => setOnceDate(e.target.value)} />
      )}

      <label className="payday-check">
        <input type="checkbox" checked={isPayday} onChange={(e) => setIsPayday(e.target.checked)} />
        This is a payday 🎀
      </label>

      <div className="event-form-actions">
        <button className="chip-btn ghost" onClick={onCancel}>Cancel</button>
        <button className="chip-btn primary" onClick={save}>Save event</button>
      </div>
    </div>
  );
}

function describeEvent(e: CalendarEvent): string {
  switch (e.kind) {
    case "monthly-days":
      return "Monthly on " + (e.monthDays ?? []).map(ordinal).join(", ");
    case "weekly":
      return "Every " + (WEEKDAY_LABELS[e.weekday ?? 0] ?? "");
    case "yearly":
      return "Yearly on " + MONTH_LABELS[e.month ?? 0] + " " + ordinal(e.day ?? 1);
    case "once":
      return e.date ? parseISO(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "One time";
    default:
      return "";
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
