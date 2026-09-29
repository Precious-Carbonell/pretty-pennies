export const CURRENCY = "₱";

export function fmtMoney(n: number): string {
  const v = Number(n) || 0;
  return (
    CURRENCY +
    v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export function signedMoney(n: number): string {
  const v = Number(n) || 0;
  const sign = v < 0 ? "−" : "";
  return sign + fmtMoney(Math.abs(v));
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric" });
}

export function fmtMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short" });
}
