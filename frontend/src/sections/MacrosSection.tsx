import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { Chip, ChipRow } from "../components/Chip";
import type { View } from "../App";
import type { DashboardStats, MacrosRow } from "../types";
import { fmtDate, fmtNum } from "../utils";

function MacrosChart({ data }: { data: MacrosRow[] }) {
  const rows = [...data].reverse();
  const dates = rows.map((r) => fmtDate(r.entry_date));

  const option = {
    tooltip: TOOLTIP,
    legend: LEGEND,
    grid: GRID,
    xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: "value", name: "g", nameTextStyle: { color: C.slate, fontSize: 11 }, axisLabel: { fontSize: 11 } },
      { type: "value", name: "kcal", nameTextStyle: { color: C.blue, fontSize: 11 }, axisLabel: { fontSize: 11, color: C.blue } },
    ],
    series: [
      { name: "Protein", type: "bar", stack: "macros", data: rows.map((r) => +r.protein_consumed_g.toFixed(1)), color: C.green, barMaxWidth: 40 },
      { name: "Carbs", type: "bar", stack: "macros", data: rows.map((r) => +r.carbs_consumed_g.toFixed(1)), color: C.amber, barMaxWidth: 40 },
      { name: "Fats", type: "bar", stack: "macros", data: rows.map((r) => +r.fats_consumed_g.toFixed(1)), color: C.orange, barMaxWidth: 40 },
      {
        name: "Calories",
        type: "line",
        yAxisIndex: 1,
        data: rows.map((r) => r.consumed_calories),
        color: C.blue,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
      },
    ],
  };

  return <EChart option={option} />;
}

export function MacrosSection({ data, view, stats }: { data: MacrosRow[]; view: View; stats: DashboardStats["macros"] }) {
  const headers = ["Date", "Calories", "Goal", "Protein (g)", "Carbs (g)", "Fats (g)", "Fibre (g)"];
  const rows = data.map((r) => [
    fmtDate(r.entry_date),
    String(r.consumed_calories),
    String(r.calorie_goal),
    fmtNum(r.protein_consumed_g),
    fmtNum(r.carbs_consumed_g),
    fmtNum(r.fats_consumed_g),
    fmtNum(r.fibre_consumed_g),
  ]);

  return (
    <section id="macros">
      <h2>Macros</h2>
      <ChipRow>
        <Chip
          title="Avg Calories"
          value={stats.avgConsumedCalories !== null ? `${stats.avgConsumedCalories.toLocaleString()} kcal` : "—"}
        />
        <Chip
          title="Avg Protein"
          value={stats.avgConsumedProteinG !== null ? `${stats.avgConsumedProteinG} g` : "—"}
        />
      </ChipRow>
      {view === "table" ? <DataTable headers={headers} rows={rows} /> : <MacrosChart data={data} />}
    </section>
  );
}
