import { Moon, Heart } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { EChart, C, TOOLTIP, LEGEND, GRID } from "../components/EChart";
import { StatCard, StatCards } from "../components/Chip";
import { SectionHeader } from "../components/SectionHeader";
import type { View } from "../App";
import type { DashboardStats, SleepRow } from "../types";
import { fmtDate, fmtDurMins, isWeekend } from "../utils";

function BatteryBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? "#2563eb" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="battery-cell">
      <span>{value}</span>
      <div className="battery-bar">
        <div className="battery-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

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

type Props = {
  data: SleepRow[];
  view: View;
  onViewChange: (v: View) => void;
  stats: DashboardStats["sleep"];
};

export function SleepSection({ data, view, onViewChange, stats }: Props) {
  const headers = ["Date", "Duration", "Deep", "Light", "REM", "Awake", "Resting HR", "Body Battery"];
  const rows = data.map((r) => [
    fmtDate(r.sleep_date),
    fmtDurMins(r.sleep_duration_minutes),
    fmtDurMins(r.deep_sleep_minutes),
    fmtDurMins(r.light_sleep_minutes),
    fmtDurMins(r.rem_sleep_minutes),
    <span className={r.awake_duration_minutes > 0 ? "cell-danger" : ""}>{fmtDurMins(r.awake_duration_minutes)}</span>,
    String(r.resting_heart_rate),
    <BatteryBar value={r.body_battery_charge} />,
  ]);

  return (
    <section>
      <SectionHeader title="Sleep Analysis" view={view} onViewChange={onViewChange} />
      <StatCards>
        <StatCard
          title="Avg Sleep Duration"
          value={stats.avgDurationMinutes !== null ? fmtDurMins(stats.avgDurationMinutes) : "—"}
          icon={<Moon size={20} />}
          iconColor="#2563eb"
        />
        <StatCard
          title="Lowest Resting HR"
          value={stats.lowestRestingHR !== null ? String(stats.lowestRestingHR.bpm) : "—"}
          unit={stats.lowestRestingHR !== null ? "bpm" : undefined}
          sub={stats.lowestRestingHR !== null ? `Observed: ${fmtDate(stats.lowestRestingHR.date)}` : undefined}
          icon={<Heart size={20} />}
          iconColor="#ef4444"
        />
      </StatCards>
      {view === "table" ? (
        <DataTable headers={headers} rows={rows} rowClassNames={data.map((r) => isWeekend(r.sleep_date) ? "row-weekend" : undefined)} />
      ) : (
        <SleepChart data={data} />
      )}
    </section>
  );
}
