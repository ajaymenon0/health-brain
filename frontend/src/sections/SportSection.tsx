import { DataTable } from "../components/DataTable";
import type { SportActivityRow } from "../types";
import { fmtDurSecs, fmtNum } from "../utils";

export function SportSection({ data }: { data: SportActivityRow[] }) {
  const headers = ["Date", "Duration", "Avg HR", "Max HR", "Calories", "Aerobic TE", "Intensity"];
  const rows = data.map((r) => [
    r.activity_date,
    fmtDurSecs(r.total_time_sec),
    String(r.avg_heart_rate_bpm),
    String(r.max_heart_rate_bpm),
    String(r.total_calories),
    fmtNum(r.aerobic_training_effect),
    `${r.total_intensity_minutes} min`,
  ]);

  return (
    <section id="sport-activities">
      <h2>Sport / Activities</h2>
      <DataTable headers={headers} rows={rows} />
    </section>
  );
}
