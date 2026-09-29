import type { CalendarEvent } from "@/domain/types";

// ---------------------------------------------------------------------------
// Calendar logic — expand recurring events into concrete dates, find what's
// upcoming, and pick a playful message before payday. All pure functions.
// ---------------------------------------------------------------------------

export function iso(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function parseISO(s: string): Date {
  return new Date(s + "T00:00:00");
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole days from today (>=0 future, 0 = today). Negative for past. */
export function daysUntil(dateStr: string): number {
  const target = parseISO(dateStr).getTime();
  const today = startOfToday().getTime();
  return Math.round((target - today) / 86400000);
}

/** Does a recurring event land on this specific date? */
export function eventOccursOn(evt: CalendarEvent, d: Date): boolean {
  switch (evt.kind) {
    case "monthly-days": {
      const dim = daysInMonth(d.getFullYear(), d.getMonth());
      const dom = d.getDate();
      return (evt.monthDays ?? []).some((day) => {
        // If a chosen day exceeds this month's length, land it on the last day.
        const landed = Math.min(day, dim);
        return landed === dom;
      });
    }
    case "weekly":
      return evt.weekday === d.getDay();
    case "yearly":
      return evt.month === d.getMonth() && evt.day === d.getDate();
    case "once":
      return evt.date === iso(d);
    default:
      return false;
  }
}

/** All events that occur on a given date. */
export function eventsOn(events: CalendarEvent[], d: Date): CalendarEvent[] {
  return events.filter((e) => eventOccursOn(e, d));
}

export interface Upcoming {
  event: CalendarEvent;
  date: string;
  daysUntil: number;
}

/** The next occurrence of each event within `horizonDays`, soonest first. */
export function upcomingEvents(events: CalendarEvent[], horizonDays = 45): Upcoming[] {
  const out: Upcoming[] = [];
  const today = startOfToday();
  for (const evt of events) {
    for (let i = 0; i <= horizonDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      if (eventOccursOn(evt, d)) {
        out.push({ event: evt, date: iso(d), daysUntil: i });
        break; // only the next occurrence per event
      }
    }
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Next payday occurrence (across all payday events), or null. */
export function nextPayday(events: CalendarEvent[], horizonDays = 40): Upcoming | null {
  const paydays = upcomingEvents(events.filter((e) => e.isPayday), horizonDays);
  return paydays[0] ?? null;
}

// --- Motivational messages (original copy) ---------------------------------
// Shown in the run-up to payday. Keyed loosely by how close payday is.

const FAR_MESSAGES = [
  "Payday's on the horizon — future you is already grateful.",
  "Slow week for the wallet? Same. Hang in there, cutie.",
  "Budget now, brunch later. You've got this.",
  "Every peso you keep today is a little gift to tomorrow.",
];

const SOON_MESSAGES = [
  "Payday is almost here — keep the snacks reasonable till then.",
  "Nearly there! Your bank account can smell the incoming coins.",
  "A few more sleeps until payday. Ramen mode, activate.",
  "So close to payday you can practically hear the ka-ching.",
];

const EVE_MESSAGES = [
  "Payday is TOMORROW. Do a little happy dance.",
  "One more sleep until the coins arrive. Stay strong tonight.",
  "Tomorrow the wallet gets its glow-up. Hold the line!",
];

const PAYDAY_MESSAGES = [
  "It's payday! Pay yourself first, then treat yourself a little.",
  "Coins have landed. Save some, spend some, smile lots.",
  "Payday glow activated. Be nice to future you and stash a bit.",
];

/** Pick a stable-but-varied message for the day based on days-until-payday. */
export function paydayMessage(daysToPayday: number | null, seedDate: string): string | null {
  if (daysToPayday === null || daysToPayday < 0 || daysToPayday > 6) return null;
  let pool: string[];
  if (daysToPayday === 0) pool = PAYDAY_MESSAGES;
  else if (daysToPayday === 1) pool = EVE_MESSAGES;
  else if (daysToPayday <= 3) pool = SOON_MESSAGES;
  else pool = FAR_MESSAGES;
  // Deterministic per day so it doesn't flicker on re-render.
  const seed = hashString(seedDate + ":" + daysToPayday);
  return pool[seed % pool.length];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Human phrasing for days-until, e.g. "Today", "Tomorrow", "in 5 days". */
export function untilLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}
