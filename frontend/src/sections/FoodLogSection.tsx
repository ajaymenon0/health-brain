import { DataTable } from "../components/DataTable";
import type { FoodLogRow } from "../types";

const MEAL_ORDER = ["breakfast", "lunch", "evening_snack", "dinner"] as const;

export function FoodLogSection({ data }: { data: FoodLogRow[] }) {
  const headers = ["Date", "Breakfast", "Lunch", "Evening Snack", "Dinner", "Total"];
  const rows = data.map((r) => {
    const meals = r.healthifyme_food_log_meals ?? [];
    const byName = Object.fromEntries(meals.map((m) => [m.meal_name, m.meal_calories]));
    const total = meals.reduce((sum, m) => sum + m.meal_calories, 0);
    return [
      r.entry_date,
      ...MEAL_ORDER.map((name) => (byName[name] !== undefined ? `${byName[name]} kcal` : "—")),
      `${total} kcal`,
    ];
  });

  return (
    <section id="food-log">
      <h2>Food Log</h2>
      <DataTable headers={headers} rows={rows} />
    </section>
  );
}
