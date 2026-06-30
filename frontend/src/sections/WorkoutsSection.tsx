import { DataTable } from "../components/DataTable";
import type { WorkoutRow } from "../types";
import { fmtDurSecs, fmtNum } from "../utils";

export function WorkoutsSection({ data }: { data: WorkoutRow[] }) {
  const headers = ["Date", "Workout", "Duration", "Volume (kg)", "Exercises"];
  const rows = data.map((r) => [
    r.workout_date,
    r.workout_name,
    fmtDurSecs(r.duration_sec),
    fmtNum(r.total_volume_kg, 1),
    String(r.exercise_count),
  ]);

  return (
    <section id="workouts">
      <h2>Workouts</h2>
      <DataTable headers={headers} rows={rows} />
    </section>
  );
}
