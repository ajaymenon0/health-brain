import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { SectionHeader } from "../components/SectionHeader";
import type { View } from "../App";
import type { FoodLogRow } from "../types";
import { fmtDate, isWeekend } from "../utils";

const MEAL_ORDER = ["breakfast", "lunch", "evening_snack", "dinner"] as const;
const MEAL_COLORS = [C.amber, C.orange, C.violet, C.teal];
const MEAL_LABELS = ["Breakfast", "Lunch", "Evening Snack", "Dinner"];

function FoodLogChart({ data }: { data: FoodLogRow[] }) {
  const rows = [...data].reverse();
  const dates = rows.map((r) => fmtDate(r.entry_date));

  const series = MEAL_ORDER.map((meal, i) => ({
    name: MEAL_LABELS[i],
    type: "bar" as const,
    stack: "meals",
    color: MEAL_COLORS[i],
    barMaxWidth: 40,
    data: rows.map((r) => {
      const meals = r.healthifyme_food_log_meals ?? [];
      return meals.find((m) => m.meal_name === meal)?.meal_calories ?? 0;
    }),
  }));

  const option = {
    tooltip: TOOLTIP,
    legend: LEGEND,
    grid: GRID,
    xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
    yAxis: { type: "value", name: "kcal", nameTextStyle: { color: C.slate, fontSize: 11 }, axisLabel: { fontSize: 11 } },
    series,
  };

  return <EChart option={option} />;
}

type Props = {
  data: FoodLogRow[];
  view: View;
  onViewChange: (v: View) => void;
};

export function FoodLogSection({ data, view, onViewChange }: Props) {
  const headers = ["Date", "Breakfast", "Lunch", "Evening Snack", "Dinner", "Total"];
  const rows = data.map((r) => {
    const meals = r.healthifyme_food_log_meals ?? [];
    const byName = Object.fromEntries(meals.map((m) => [m.meal_name, m.meal_calories]));
    const total = meals.reduce((sum, m) => sum + m.meal_calories, 0);
    return [
      fmtDate(r.entry_date),
      ...MEAL_ORDER.map((name) => (byName[name] !== undefined ? `${byName[name]} kcal` : "—")),
      `${total} kcal`,
    ];
  });

  return (
    <section>
      <SectionHeader title="Food Log" view={view} onViewChange={onViewChange} />
      {view === "table" ? (
        <DataTable headers={headers} rows={rows} rowClassNames={data.map((r) => isWeekend(r.entry_date) ? "row-weekend" : undefined)} />
      ) : (
        <FoodLogChart data={data} />
      )}
    </section>
  );
}
