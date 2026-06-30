import { DataTable } from "../components/DataTable";
import type { RunRow } from "../types";
import { fmtDurSecs, fmtNum, fmtPace } from "../utils";

export function RunsSection({ data }: { data: RunRow[] }) {
  const headers = ["Date", "Distance", "Avg Pace", "Duration", "Avg HR", "Calories", "Aerobic TE"];
  const rows = data.map((r) => {
    const distKm = ((r.total_time_sec / 3600) * r.avg_speed_kmh).toFixed(2);
    return [
      r.run_date,
      `${distKm} km`,
      fmtPace(r.avg_pace_sec_per_km),
      fmtDurSecs(r.total_time_sec),
      String(r.avg_heart_rate_bpm),
      String(r.total_calories),
      fmtNum(r.aerobic_training_effect),
    ];
  });

  return (
    <section id="runs">
      <h2>Runs</h2>
      <DataTable headers={headers} rows={rows} />
    </section>
  );
}
