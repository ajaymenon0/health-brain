import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { SectionHeader } from "../components/SectionHeader";
import type { View } from "../App";
import type { WorkoutRow } from "../types";
import { fmtDate, fmtDurSecs, fmtNum, isWeekend } from "../utils";

function WorkoutsChart({ data }: { data: WorkoutRow[] }) {
  const rows = [...data].reverse();
  const dates = rows.map((r) => fmtDate(r.workout_date));

  const option = {
    tooltip: {
      ...TOOLTIP,
      formatter: (params: any[]) => {
        const idx = params[0]?.dataIndex as number;
        const row = rows[idx];
        const name = row?.workout_name ?? "";
        const lines = params.map((p: any) => {
          if (p.seriesName === "Duration") return `${p.marker}Duration: <b>${fmtDurSecs(p.value * 60)}</b>`;
          return `${p.marker}${p.seriesName}: <b>${p.value} kg</b>`;
        });
        return [dates[idx] ?? "", name ? `<i>${name}</i>` : "", ...lines].filter(Boolean).join("<br/>");
      },
    },
    legend: LEGEND,
    grid: GRID,
    xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: "value", name: "kg", nameTextStyle: { color: C.blue, fontSize: 11 }, axisLabel: { fontSize: 11 } },
      { type: "value", name: "min", nameTextStyle: { color: C.purple, fontSize: 11 }, axisLabel: { fontSize: 11, color: C.purple } },
    ],
    series: [
      { name: "Volume", type: "bar", data: rows.map((r) => +r.total_volume_kg.toFixed(1)), color: C.blue, barMaxWidth: 40, borderRadius: [3, 3, 0, 0] },
      { name: "Duration", type: "line", yAxisIndex: 1, data: rows.map((r) => +(r.duration_sec / 60).toFixed(1)), color: C.purple, smooth: true, symbol: "circle", symbolSize: 5 },
    ],
  };

  return <EChart option={option} />;
}

type Props = {
  data: WorkoutRow[];
  view: View;
  onViewChange: (v: View) => void;
};

export function WorkoutsSection({ data, view, onViewChange }: Props) {
  const headers = ["Date", "Workout", "Duration", "Volume (kg)", "Exercises"];
  const rows = data.map((r) => [
    fmtDate(r.workout_date),
    r.workout_name,
    fmtDurSecs(r.duration_sec),
    fmtNum(r.total_volume_kg, 1),
    String(r.exercise_count),
  ]);

  return (
    <section>
      <SectionHeader title="Workout Sessions" view={view} onViewChange={onViewChange} />
      {view === "table" ? (
        <DataTable headers={headers} rows={rows} rowClassNames={data.map((r) => isWeekend(r.workout_date) ? "row-weekend" : undefined)} />
      ) : (
        <WorkoutsChart data={data} />
      )}
    </section>
  );
}
