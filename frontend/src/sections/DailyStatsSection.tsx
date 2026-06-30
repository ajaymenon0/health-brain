import { DataTable } from "../components/DataTable";
import type { DailyStatsRow } from "../types";

export function DailyStatsSection({ data }: { data: DailyStatsRow[] }) {
  const headers = ["Date", "Steps", "Calories Burned", "Resting BPM", "High BPM", "Body Battery"];
  const rows = data.map((r) => [
    r.entry_date,
    r.steps.toLocaleString(),
    String(r.calories_burned),
    String(r.resting_bpm),
    String(r.high_bpm),
    `+${r.body_battery_gained} / −${r.body_battery_drained}`,
  ]);

  return (
    <section id="daily-stats">
      <h2>Daily Stats</h2>
      <DataTable headers={headers} rows={rows} />
    </section>
  );
}
