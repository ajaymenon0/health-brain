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
  selectedWeekStart: string;
  onWeekChange: (weekStart: string) => void;
};

type WeekOption = {
  value: string;
  label: string;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfCurrentWeekISO(): string {
  const date = new Date();
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  date.setUTCHours(0, 0, 0, 0);
  return isoDate(date);
}

function shiftISODate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(`${shiftISODate(weekStart, 6)}T00:00:00Z`);

  const startMonth = start.toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  const endMonth = end.toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });

  const startDay = start.toLocaleDateString("en-GB", {
    day: "numeric",
    timeZone: "UTC",
  });
  const endDay = end.toLocaleDateString("en-GB", {
    day: "numeric",
    timeZone: "UTC",
  });

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }

  return `${startMonth} ${startDay} - ${endDay} ${endMonth}`;
}

function buildWeekOptions(): WeekOption[] {
  const currentWeekStart = startOfCurrentWeekISO();

  return Array.from({ length: 10 }, (_, index) => {
    const weekStart = shiftISODate(currentWeekStart, index * -7);
    return {
      value: weekStart,
      label: formatWeekLabel(weekStart),
    };
  });
}

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
      label: fmtNum(current - previous, 1),
      className: "delta-up",
    };
  }

  if (current < previous) {
    return {
      icon: <ArrowDown size={16} />,
      label: fmtNum(previous - current, 1),
      className: "delta-down",
    };
  }

  return {
    icon: <Dot size={16} />,
    label: `Same as ${fmtNum(previous, 1)}`,
    className: "delta-neutral",
  };
}

function deltaRow(
  current: number | null,
  previous: number | null,
  suffix = "",
  formatDelta?: (delta: number) => string,
) {
  const delta = compareDirection(current, previous);

  if (current === null) {
    return "No current-week data";
  }

  const formattedLabel =
    current !== null && previous !== null && formatDelta
      ? formatDelta(Math.abs(current - previous))
      : delta.label;

  return (
    <span className={`delta-row ${delta.className}`}>
      {delta.icon}
      <span>
        {formattedLabel}
        {suffix}
      </span>
    </span>
  );
}

export function HomeSection({
  stats,
  selectedWeekStart,
  onWeekChange,
}: Props) {
  const weekOptions = buildWeekOptions();

  return (
    <section>
      <SectionHeader
        label="Weekly Snapshot"
        title="Home"
        rightSlot={
          <select
            className="period-select"
            value={selectedWeekStart}
            onChange={(e) => onWeekChange(e.target.value)}
          >
            {weekOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
      />
      <StatCards>
        <StatCard
          title="Sleep Duration"
          value={
            stats.avgSleepThisWeek !== null
              ? fmtDurMins(stats.avgSleepThisWeek)
              : "—"
          }
          sub={deltaRow(
            stats.avgSleepThisWeek,
            stats.avgSleepPreviousWeek,
            "",
            (delta) => fmtDurMins(Math.round(delta)),
          )}
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
