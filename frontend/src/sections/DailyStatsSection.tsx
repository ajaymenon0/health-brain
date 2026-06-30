import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { Chip, ChipRow } from "../components/Chip";
import type { View } from "../App";
import type { DailyStatsRow, DashboardStats } from "../types";
import { fmtDate } from "../utils";

function DailyStatsChart({ data }: { data: DailyStatsRow[] }) {
  const rows = [...data].reverse();
  const dates = rows.map((r) => fmtDate(r.entry_date));

  const option = {
    tooltip: {
      ...TOOLTIP,
      formatter: (params: any[]) => {
        const date = params[0]?.axisValueLabel ?? "";
        const lines = params.map((p: any) => {
          if (p.seriesName === "Steps") return `${p.marker}Steps: <b>${p.value.toLocaleString()}</b>`;
          return `${p.marker}${p.seriesName}: <b>${p.value}</b>`;
        });
        return [date, ...lines].join("<br/>");
      },
    },
    legend: LEGEND,
    grid: GRID,
    xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: "value", name: "steps", nameTextStyle: { color: C.blue, fontSize: 11 }, axisLabel: { fontSize: 11 } },
      { type: "value", name: "kcal", nameTextStyle: { color: C.orange, fontSize: 11 }, axisLabel: { fontSize: 11, color: C.orange } },
    ],
    series: [
      { name: "Steps", type: "bar", data: rows.map((r) => r.steps), color: C.blue, barMaxWidth: 40, borderRadius: [3, 3, 0, 0] },
      { name: "Calories Burned", type: "line", yAxisIndex: 1, data: rows.map((r) => r.calories_burned), color: C.orange, smooth: true, symbol: "circle", symbolSize: 5 },
    ],
  };

  return <EChart option={option} />;
}

export function DailyStatsSection({ data, view, stats }: { data: DailyStatsRow[]; view: View; stats: DashboardStats["dailyStats"] }) {
  const headers = ["Date", "Steps", "Calories Burned", "Resting BPM", "High BPM", "Body Battery"];
  const rows = data.map((r) => [
    fmtDate(r.entry_date),
    r.steps.toLocaleString(),
    String(r.calories_burned),
    String(r.resting_bpm),
    String(r.high_bpm),
    `+${r.body_battery_gained} / −${r.body_battery_drained}`,
  ]);

  return (
    <section id="daily-stats">
      <h2>Daily Stats</h2>
      <ChipRow>
        <Chip
          title="Avg Steps (All Time)"
          value={stats.avgStepsAllTime !== null ? stats.avgStepsAllTime.toLocaleString() : "—"}
        />
        <Chip
          title="Avg Steps (This Week)"
          value={stats.avgStepsThisWeek !== null ? stats.avgStepsThisWeek.toLocaleString() : "—"}
        />
      </ChipRow>
      {view === "table" ? <DataTable headers={headers} rows={rows} /> : <DailyStatsChart data={data} />}
    </section>
  );
}
