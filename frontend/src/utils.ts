export function fmtDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  const d = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function fmtDurMins(mins: number): string {
  const roundedMins = Math.round(mins);
  const h = Math.floor(roundedMins / 60);
  const m = roundedMins % 60;
  return `${h}h ${m}m`;
}

export function fmtDurSecs(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export function fmtNum(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export function isWeekend(isoDate: string): boolean {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y!, mo! - 1, d!)).getUTCDay();
  return dow === 0 || dow === 6;
}
