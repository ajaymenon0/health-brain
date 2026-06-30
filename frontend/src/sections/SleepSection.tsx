import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { Chip, ChipRow } from "../components/Chip";
import type { View } from "../App";
import type { DashboardStats, SleepRow } from "../types";
import { fmtDate, fmtDurMins } from "../utils";

function SleepChart({ data }: { data: SleepRow[] }) {
  const rows = [...data].reverse();
  const dates = rows.map((r) => fmtDate(r.sleep_date));

  const option = {
    tooltip: {
      ...TOOLTIP,
      formatter: (params: any[]) => {
        const date = params[0]?.axisValueLabel ?? "";
        const lines = params.map((p: any) => {
          const unit = p.seriesName === "Resting HR" ? " bpm" : " min";
          return `${p.marker}${p.seriesName}: <b>${p.value}${unit}</b>`;
        });
        return [date, ...lines].join("<br/>");
      },
    },
    legend: LEGEND,
    grid: GRID,
    xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: "value", name: "min", nameTextStyle: { color: C.slate, fontSize: 11 }, axisLabel: { fontSize: 11 } },
      { type: "value", name: "bpm", nameTextStyle: { color: C.red, fontSize: 11 }, axisLabel: { fontSize: 11, color: C.red } },
    ],
    series: [
      { name: "Deep", type: "bar", stack: "sleep", data: rows.map((r) => r.deep_sleep_minutes), color: C.navy, barMaxWidth: 40 },
      { name: "Light", type: "bar", stack: "sleep", data: rows.map((r) => r.light_sleep_minutes), color: C.sky, barMaxWidth: 40 },
      { name: "REM", type: "bar", stack: "sleep", data: rows.map((r) => r.rem_sleep_minutes), color: C.purple, barMaxWidth: 40 },
      { name: "Awake", type: "bar", stack: "sleep", data: rows.map((r) => r.awake_duration_minutes), color: C.gray, barMaxWidth: 40 },
      { name: "Resting HR", type: "line", yAxisIndex: 1, data: rows.map((r) => r.resting_heart_rate), color: C.red, smooth: true, symbol: "circle", symbolSize: 5 },
    ],
  };

  return <EChart option={option} />;
}

export function SleepSection({ data, view, stats }: { data: SleepRow[]; view: View; stats: DashboardStats["sleep"] }) {
  const headers = ["Date", "Duration", "Deep", "Light", "REM", "Awake", "Resting HR", "Body Battery"];
  const rows = data.map((r) => [
    fmtDate(r.sleep_date),
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
      <ChipRow>
        <Chip
          title="Avg Sleep Duration"
          value={stats.avgDurationMinutes !== null ? fmtDurMins(stats.avgDurationMinutes) : "—"}
        />
        <Chip
          title="Lowest Resting HR"
          value={stats.lowestRestingHR !== null ? `${stats.lowestRestingHR.bpm} bpm` : "—"}
          sub={stats.lowestRestingHR !== null ? fmtDate(stats.lowestRestingHR.date) : undefined}
        />
      </ChipRow>
      {view === "table" ? <DataTable headers={headers} rows={rows} /> : <SleepChart data={data} />}
    </section>
  );
}
