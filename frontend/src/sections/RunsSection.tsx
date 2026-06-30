import { MapPin } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { StatCard, StatCards } from "../components/Chip";
import { SectionHeader } from "../components/SectionHeader";
import type { View } from "../App";
import type { DashboardStats, RunRow } from "../types";
import { fmtDate, fmtDurSecs, fmtNum, fmtPace, isWeekend } from "../utils";

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
      { type: "value", name: "min/km", nameTextStyle: { color: C.orange, fontSize: 11 }, axisLabel: { fontSize: 11, color: C.orange }, inverse: true },
    ],
    series: [
      { name: "Distance", type: "bar", data: distances, color: C.blue, barMaxWidth: 40, borderRadius: [3, 3, 0, 0] },
      { name: "Pace", type: "line", yAxisIndex: 1, data: paces, color: C.orange, smooth: true, symbol: "circle", symbolSize: 5 },
    ],
  };

  return <EChart option={option} />;
}

type Props = {
  data: RunRow[];
  view: View;
  onViewChange: (v: View) => void;
  stats: DashboardStats["runs"];
};

export function RunsSection({ data, view, onViewChange, stats }: Props) {
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
    <section>
      <SectionHeader title="Run Performance" view={view} onViewChange={onViewChange} />
      <StatCards>
        <StatCard
          title="Distance This Week"
          value={String(stats.distanceThisWeekKm)}
          unit="km"
          icon={<MapPin size={20} />}
          iconColor="#2563eb"
        />
        <StatCard
          title="Distance This Month"
          value={String(stats.distanceThisMonthKm)}
          unit="km"
          icon={<MapPin size={20} />}
          iconColor="#7c3aed"
        />
        <StatCard
          title="Distance This Year"
          value={String(stats.distanceThisYearKm)}
          unit="km"
          icon={<MapPin size={20} />}
          iconColor="#0ea5e9"
        />
      </StatCards>
      {view === "table" ? (
        <DataTable headers={headers} rows={rows} rowClassNames={data.map((r) => isWeekend(r.run_date) ? "row-weekend" : undefined)} />
      ) : (
        <RunsChart data={data} />
      )}
    </section>
  );
}
