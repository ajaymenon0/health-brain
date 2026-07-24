import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { SectionHeader } from "../components/SectionHeader";
import type { View } from "../App";
import type { WeightRow } from "../types";
import { fmtDate, fmtNum, isWeekend } from "../utils";

function WeightChart({ data }: { data: WeightRow[] }) {
  const rows = [...data].reverse();
  const dates = rows.map((r) => fmtDate(r.entry_date));

  const option = {
    tooltip: TOOLTIP,
    legend: LEGEND,
    grid: GRID,
    xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
    yAxis: [
      {
        type: "value",
        name: "kg",
        nameTextStyle: { color: C.teal, fontSize: 11 },
        axisLabel: { fontSize: 11 },
      },
      {
        type: "value",
        name: "%",
        nameTextStyle: { color: C.orange, fontSize: 11 },
        axisLabel: { fontSize: 11, color: C.orange },
      },
    ],
    series: [
      {
        name: "Weight",
        type: "line",
        data: rows.map((r) => r.weight_kg),
        color: C.teal,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
      },
      {
        name: "Body Fat",
        type: "line",
        yAxisIndex: 1,
        data: rows.map((r) => r.body_fat_percent),
        color: C.orange,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
      },
    ],
  };

  return <EChart option={option} />;
}

type Props = {
  data: WeightRow[];
  view: View;
  onViewChange: (v: View) => void;
};

export function WeightSection({ data, view, onViewChange }: Props) {
  const headers = [
    "Date",
    "Weight",
    "Status",
    "Body Fat",
    "Muscle Mass",
    "BMI",
    "Hydration",
    "Visceral Fat",
    "Health Score",
  ];

  const rows = data.map((r) => [
    fmtDate(r.entry_date),
    `${fmtNum(r.weight_kg, 1)} kg`,
    r.weight_status ?? "—",
    `${fmtNum(r.body_fat_percent, 2)} %`,
    `${fmtNum(r.muscle_mass_percent, 2)} %`,
    fmtNum(r.bmi, 2),
    `${fmtNum(r.body_hydration_percent, 2)} %`,
    `${fmtNum(r.visceral_fat_percent, 2)} %`,
    fmtNum(r.health_score, 2),
  ]);

  return (
    <section>
      <SectionHeader title="Weight & Body Composition" view={view} onViewChange={onViewChange} />
      {view === "table" ? (
        <DataTable
          headers={headers}
          rows={rows}
          rowClassNames={data.map((r) =>
            isWeekend(r.entry_date) ? "row-weekend" : undefined,
          )}
        />
      ) : (
        <WeightChart data={data} />
      )}
    </section>
  );
}
