import { useMemo, useState } from "react";
import type { CalendarEvent, DayNote } from "@/domain/types";
import { eventsOn, iso, MONTH_LABELS } from "@/lib/calendar";

interface Props {
  events: CalendarEvent[];
  dayNotes: DayNote[];
}

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function MiniCalendar({ events, dayNotes }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const todayIso = iso(now);

  const noteSet = useMemo(
    () => new Set(dayNotes.map((n) => n.date)),
    [dayNotes],
  );

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const total = new Date(year, month + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // monday-first
    const cells: (string | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(iso(new Date(year, month, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="mini-cal">
      <div className="mini-cal-head">
        <button className="mini-nav" onClick={prev} aria-label="Previous month">‹</button>
        <span className="mini-cal-title">{MONTH_LABELS[month]} {year}</span>
        <button className="mini-nav" onClick={next} aria-label="Next month">›</button>
      </div>

      <div className="mini-cal-grid">
        {WEEK.map(w => (
          <div key={w} className="mini-wday">{w}</div>
        ))}
        {grid.map((d, i) => {
          if (!d) return <div key={i} className="mini-cell empty" />;
          const isToday = d === todayIso;
          const evs = eventsOn(events, new Date(d + "T00:00:00"));
          const hasNote = noteSet.has(d);
          const isPayday = evs.some(e => e.isPayday);
          return (
            <div
              key={i}
              className={
                "mini-cell" +
                (isToday ? " today" : "") +
                (isPayday ? " payday" : "")
              }
            >
              <span className="mini-num">{new Date(d + "T00:00:00").getDate()}</span>
              {(evs.length > 0 || hasNote) && (
                <span className="mini-dots">
                  {evs.slice(0, 2).map(e => (
                    <span key={e.id} className="mini-dot" style={{ background: e.color }} />
                  ))}
                  {hasNote && <span className="mini-dot note" />}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
