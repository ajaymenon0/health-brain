import {
  Activity,
  ArrowDown,
  ArrowUp,
  Dot,
  Flame,
  Footprints,
  Moon,
  Scale,
  Timer,
} from "lucide-react";
import { StatCard, StatCards } from "../components/Chip";
import { SectionHeader } from "../components/SectionHeader";
import type { DashboardStats } from "../types";
import { fmtDurMins, fmtNum } from "../utils";

type Props = {
  stats: DashboardStats["home"];
};

function compareDirection(current: number | null, previous: number | null) {
  if (current === null || previous === null) {
    return {
      icon: <Dot size={16} />,
      label: "No previous comparison",
      className: "delta-neutral",
    };
  }

  if (current > previous) {
    return {
      icon: <ArrowUp size={16} />,
      label: `Up from ${fmtNum(previous, 1)}`,
      className: "delta-up",
    };
  }

  if (current < previous) {
    return {
      icon: <ArrowDown size={16} />,
      label: `Down from ${fmtNum(previous, 1)}`,
      className: "delta-down",
    };
  }

  return {
    icon: <Dot size={16} />,
    label: `Same as ${fmtNum(previous, 1)}`,
    className: "delta-neutral",
  };
}

function deltaRow(current: number | null, previous: number | null, suffix = "") {
  const delta = compareDirection(current, previous);

  if (current === null) {
    return "No current-week data";
  }

  return (
    <span className={`delta-row ${delta.className}`}>
      {delta.icon}
      <span>
        {delta.label}
        {suffix}
      </span>
    </span>
  );
}

export function HomeSection({ stats }: Props) {
  return (
    <section>
      <SectionHeader
        label="Weekly Snapshot"
        title="Home"
        view="table"
        onViewChange={() => {}}
      />
      <StatCards>
        <StatCard
          title="Sleep Duration"
          value={
            stats.avgSleepThisWeek !== null
              ? fmtDurMins(stats.avgSleepThisWeek)
              : "—"
          }
          sub={deltaRow(stats.avgSleepThisWeek, stats.avgSleepPreviousWeek)}
          icon={<Moon size={20} />}
          iconColor="#2563eb"
        />
        <StatCard
          title="Steps"
          value={
            stats.avgStepsThisWeek !== null
              ? stats.avgStepsThisWeek.toLocaleString()
              : "—"
          }
          sub={deltaRow(stats.avgStepsThisWeek, stats.avgStepsPreviousWeek)}
          icon={<Footprints size={20} />}
          iconColor="#0ea5e9"
        />
        <StatCard
          title="Current Weight"
          value={
            stats.avgWeightThisWeek !== null
              ? fmtNum(stats.avgWeightThisWeek, 1)
              : "—"
          }
          unit={stats.avgWeightThisWeek !== null ? "kg" : undefined}
          sub={deltaRow(stats.avgWeightThisWeek, stats.avgWeightPreviousWeek)}
          icon={<Scale size={20} />}
          iconColor="#7c3aed"
        />
        <StatCard
          title="Run Distance"
          value={fmtNum(stats.runDistanceThisWeekKm, 2)}
          unit="km"
          sub={deltaRow(
            stats.runDistanceThisWeekKm,
            stats.runDistancePreviousWeekKm,
          )}
          icon={<Timer size={20} />}
          iconColor="#2563eb"
        />
        <StatCard
          title="Consumed Calories"
          value={
            stats.avgCaloriesThisWeek !== null
              ? stats.avgCaloriesThisWeek.toLocaleString()
              : "—"
          }
          unit={stats.avgCaloriesThisWeek !== null ? "kcal" : undefined}
          sub={deltaRow(
            stats.avgCaloriesThisWeek,
            stats.avgCaloriesPreviousWeek,
          )}
          icon={<Flame size={20} />}
          iconColor="#f97316"
        />
        <StatCard
          title="Protein"
          value={
            stats.avgProteinThisWeek !== null
              ? fmtNum(stats.avgProteinThisWeek, 1)
              : "—"
          }
          unit={stats.avgProteinThisWeek !== null ? "g" : undefined}
          sub={deltaRow(stats.avgProteinThisWeek, stats.avgProteinPreviousWeek)}
          icon={<Activity size={20} />}
          iconColor="#15803d"
        />
      </StatCards>
    </section>
  );
}
