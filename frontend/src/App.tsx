import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "./types";
import { SleepSection } from "./sections/SleepSection";
import { RunsSection } from "./sections/RunsSection";
import { DailyStatsSection } from "./sections/DailyStatsSection";
import { SportSection } from "./sections/SportSection";
import { MacrosSection } from "./sections/MacrosSection";
import { FoodLogSection } from "./sections/FoodLogSection";
import { WorkoutsSection } from "./sections/WorkoutsSection";

const NAV_LINKS = [
  ["#sleep", "Sleep"],
  ["#runs", "Runs"],
  ["#daily-stats", "Daily Stats"],
  ["#sport-activities", "Sport / Activities"],
  ["#macros", "Macros"],
  ["#food-log", "Food Log"],
  ["#workouts", "Workouts"],
] as const;

export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/data")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json() as Promise<DashboardData>;
      })
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="state-page">Loading…</div>;
  if (error ?? !data)
    return <div className="state-page error">Error: {error ?? "No data"}</div>;

  return (
    <>
      <header>
        <h1>Health Dashboard</h1>
        <div className="header-meta">
          <span className="muted">Updated {data.generatedAt}</span>
          <button onClick={fetchData}>Refresh</button>
        </div>
      </header>
      <nav>
        {NAV_LINKS.map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <main>
        <SleepSection data={data.sleep} />
        <RunsSection data={data.runs} />
        <DailyStatsSection data={data.dailyStats} />
        <SportSection data={data.sportActivities} />
        <MacrosSection data={data.macros} />
        <FoodLogSection data={data.foodLogs} />
        <WorkoutsSection data={data.workouts} />
      </main>
    </>
  );
}
