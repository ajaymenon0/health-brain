import { DataTable } from "../components/DataTable";
import type { MacrosRow } from "../types";
import { fmtNum } from "../utils";

export function MacrosSection({ data }: { data: MacrosRow[] }) {
  const headers = ["Date", "Calories", "Goal", "Protein (g)", "Carbs (g)", "Fats (g)", "Fibre (g)"];
  const rows = data.map((r) => [
    r.entry_date,
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
      <DataTable headers={headers} rows={rows} />
    </section>
  );
}
