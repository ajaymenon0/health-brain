import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { Chip, ChipRow } from "../components/Chip";
import type { View } from "../App";
import type { DashboardStats, RunRow } from "../types";
import { fmtDate, fmtDurSecs, fmtNum, fmtPace } from "../utils";

function RunsChart({ data }: { data: RunRow[] }) {
  const rows = [...data].reverse();
  const dates = rows.map((r) => fmtDate(r.run_date));
  const distances = rows.map((r) => +((r.total_time_sec / 3600) * r.avg_speed_kmh).toFixed(2));
  const paces = rows.map((r) => +(r.avg_pace_sec_per_km / 60).toFixed(2));

  const option = {
    tooltip: {
      ...TOOLTIP,
      formatter: (params: any[]) => {
        const date = params[0]?.axisValueLabel ?? "";
        const lines = params.map((p: any) => {
          if (p.seriesName === "Pace") {
            const secs = Math.round(p.value * 60);
            return `${p.marker}Pace: <b>${fmtPace(secs)}</b>`;
          }
          return `${p.marker}${p.seriesName}: <b>${p.value} km</b>`;
        });
        return [date, ...lines].join("<br/>");
      },
    },
    legend: LEGEND,
    grid: GRID,
    xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: "value", name: "km", nameTextStyle: { color: C.blue, fontSize: 11 }, axisLabel: { fontSize: 11 } },
      {
        type: "value",
        name: "min/km",
        nameTextStyle: { color: C.orange, fontSize: 11 },
        axisLabel: { fontSize: 11, color: C.orange },
        inverse: true,
      },
    ],
    series: [
      { name: "Distance", type: "bar", data: distances, color: C.blue, barMaxWidth: 40, borderRadius: [3, 3, 0, 0] },
      { name: "Pace", type: "line", yAxisIndex: 1, data: paces, color: C.orange, smooth: true, symbol: "circle", symbolSize: 5 },
    ],
  };

  return <EChart option={option} />;
}

export function RunsSection({ data, view, stats }: { data: RunRow[]; view: View; stats: DashboardStats["runs"] }) {
  const headers = ["Date", "Distance", "Avg Pace", "Duration", "Avg HR", "Calories", "Aerobic TE"];
  const rows = data.map((r) => {
    const distKm = ((r.total_time_sec / 3600) * r.avg_speed_kmh).toFixed(2);
    return [
      fmtDate(r.run_date),
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
      <ChipRow>
        <Chip title="This Week" value={`${stats.distanceThisWeekKm} km`} />
        <Chip title="This Month" value={`${stats.distanceThisMonthKm} km`} />
        <Chip title="This Year" value={`${stats.distanceThisYearKm} km`} />
      </ChipRow>
      {view === "table" ? <DataTable headers={headers} rows={rows} /> : <RunsChart data={data} />}
    </section>
  );
}
