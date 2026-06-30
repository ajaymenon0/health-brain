import { DataTable } from "../components/DataTable";
import type { SleepRow } from "../types";
import { fmtDurMins } from "../utils";

export function SleepSection({ data }: { data: SleepRow[] }) {
  const headers = ["Date", "Duration", "Deep", "Light", "REM", "Awake", "Resting HR", "Body Battery"];
  const rows = data.map((r) => [
    r.sleep_date,
    fmtDurMins(r.sleep_duration_minutes),
    fmtDurMins(r.deep_sleep_minutes),
    fmtDurMins(r.light_sleep_minutes),
    fmtDurMins(r.rem_sleep_minutes),
    fmtDurMins(r.awake_duration_minutes),
    String(r.resting_heart_rate),
    String(r.body_battery_charge),
  ]);

  return (
    <section id="sleep">
      <h2>Sleep</h2>
      <DataTable headers={headers} rows={rows} />
    </section>
  );
}
