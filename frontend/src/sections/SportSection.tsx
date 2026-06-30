import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { SectionHeader } from "../components/SectionHeader";
import type { View } from "../App";
import type { SportActivityRow } from "../types";
import { fmtDate, fmtDurSecs, fmtNum, isWeekend } from "../utils";

function SportChart({ data }: { data: SportActivityRow[] }) {
  const rows = [...data].reverse();
  const dates = rows.map((r) => fmtDate(r.activity_date));

  const option = {
    tooltip: TOOLTIP,
    legend: LEGEND,
    grid: GRID,
    xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: "value", name: "kcal", nameTextStyle: { color: C.teal, fontSize: 11 }, axisLabel: { fontSize: 11 } },
      { type: "value", name: "bpm", nameTextStyle: { color: C.red, fontSize: 11 }, axisLabel: { fontSize: 11, color: C.red } },
    ],
    series: [
      { name: "Calories", type: "bar", data: rows.map((r) => r.total_calories), color: C.teal, barMaxWidth: 40, borderRadius: [3, 3, 0, 0] },
      { name: "Avg HR", type: "line", yAxisIndex: 1, data: rows.map((r) => r.avg_heart_rate_bpm), color: C.red, smooth: true, symbol: "circle", symbolSize: 5 },
    ],
  };

  return <EChart option={option} />;
}

type Props = {
  data: SportActivityRow[];
  view: View;
  onViewChange: (v: View) => void;
};

export function SportSection({ data, view, onViewChange }: Props) {
  const headers = ["Date", "Duration", "Avg HR", "Max HR", "Calories", "Aerobic TE", "Intensity"];
  const rows = data.map((r) => [
    fmtDate(r.activity_date),
    fmtDurSecs(r.total_time_sec),
    String(r.avg_heart_rate_bpm),
    String(r.max_heart_rate_bpm),
    String(r.total_calories),
    fmtNum(r.aerobic_training_effect),
    `${r.total_intensity_minutes} min`,
  ]);

  return (
    <section>
      <SectionHeader title="Sport & Activities" view={view} onViewChange={onViewChange} />
      {view === "table" ? (
        <DataTable headers={headers} rows={rows} rowClassNames={data.map((r) => isWeekend(r.activity_date) ? "row-weekend" : undefined)} />
      ) : (
        <SportChart data={data} />
      )}
    </section>
  );
}
