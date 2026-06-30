import { Flame, Dumbbell } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { StatCard, StatCards } from "../components/Chip";
import { SectionHeader } from "../components/SectionHeader";
import type { View } from "../App";
import type { DashboardStats, MacrosRow } from "../types";
import { fmtDate, fmtNum, isWeekend } from "../utils";

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
      { name: "Calories", type: "line", yAxisIndex: 1, data: rows.map((r) => r.consumed_calories), color: C.blue, smooth: true, symbol: "circle", symbolSize: 5 },
    ],
  };

  return <EChart option={option} />;
}

type Props = {
  data: MacrosRow[];
  view: View;
  onViewChange: (v: View) => void;
  stats: DashboardStats["macros"];
};

export function MacrosSection({ data, view, onViewChange, stats }: Props) {
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
    <section>
      <SectionHeader title="Nutrition & Macros" view={view} onViewChange={onViewChange} />
      <StatCards>
        <StatCard
          title="Avg Calories"
          value={stats.avgConsumedCalories !== null ? stats.avgConsumedCalories.toLocaleString() : "—"}
          unit={stats.avgConsumedCalories !== null ? "kcal" : undefined}
          icon={<Flame size={20} />}
          iconColor="#f97316"
        />
        <StatCard
          title="Avg Protein"
          value={stats.avgConsumedProteinG !== null ? String(stats.avgConsumedProteinG) : "—"}
          unit={stats.avgConsumedProteinG !== null ? "g" : undefined}
          icon={<Dumbbell size={20} />}
          iconColor="#2563eb"
        />
      </StatCards>
      {view === "table" ? (
        <DataTable headers={headers} rows={rows} rowClassNames={data.map((r) => isWeekend(r.entry_date) ? "row-weekend" : undefined)} />
      ) : (
        <MacrosChart data={data} />
      )}
    </section>
  );
}
