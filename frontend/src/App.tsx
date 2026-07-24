import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { DashboardData } from "./types";
import { SleepSection } from "./sections/SleepSection";
import { RunsSection } from "./sections/RunsSection";
import { DailyStatsSection } from "./sections/DailyStatsSection";
import { SportSection } from "./sections/SportSection";
import { MacrosSection } from "./sections/MacrosSection";
import { WeightSection } from "./sections/WeightSection";
import { FoodLogSection } from "./sections/FoodLogSection";
import { WorkoutsSection } from "./sections/WorkoutsSection";

export type View = "table" | "chart";
export type Period = "10" | "30" | "90" | "year" | "all";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "10", label: "10 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "year", label: "1 year" },
  { value: "all", label: "All" },
];

const TABS = [
  { id: "sleep", label: "Sleep" },
  { id: "runs", label: "Runs" },
  { id: "daily-stats", label: "Daily Stats" },
  { id: "sport-activities", label: "Sport / Activities" },
  { id: "macros", label: "Macros" },
  { id: "weight", label: "Weight" },
  { id: "food-log", label: "Food Log" },
  { id: "workouts", label: "Workouts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("sleep");
  const [view, setView] = useState<View>("table");
  const [period, setPeriod] = useState<Period>("10");

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/data?period=${period}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json() as Promise<DashboardData>;
      })
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="state-page">Loading…</div>;
  if (error ?? !data)
    return <div className="state-page error">Error: {error ?? "No data"}</div>;

  return (
    <>
      <header>
        <span className="header-logo">Health Brain</span>
        <nav className="header-tabs">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              className={`header-tab${activeTab === id ? " active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-sync">
          <div className="sync-info">
            <span className="sync-label">Last Sync</span>
            <span className="sync-date">{data.generatedAt}</span>
          </div>
          <select
            className="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="refresh-btn" onClick={fetchData} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <main>
        {activeTab === "sleep" && (
          <SleepSection data={data.sleep} view={view} onViewChange={setView} stats={data.stats.sleep} />
        )}
        {activeTab === "runs" && (
          <RunsSection data={data.runs} view={view} onViewChange={setView} stats={data.stats.runs} />
        )}
        {activeTab === "daily-stats" && (
          <DailyStatsSection data={data.dailyStats} view={view} onViewChange={setView} stats={data.stats.dailyStats} />
        )}
        {activeTab === "sport-activities" && (
          <SportSection data={data.sportActivities} view={view} onViewChange={setView} />
        )}
        {activeTab === "macros" && (
          <MacrosSection data={data.macros} view={view} onViewChange={setView} stats={data.stats.macros} />
        )}
        {activeTab === "weight" && (
          <WeightSection data={data.weights} view={view} onViewChange={setView} />
        )}
        {activeTab === "food-log" && (
          <FoodLogSection data={data.foodLogs} view={view} onViewChange={setView} />
        )}
        {activeTab === "workouts" && (
          <WorkoutsSection data={data.workouts} view={view} onViewChange={setView} />
        )}
      </main>

      <nav className="mobile-bottom-nav">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={`mobile-tab${activeTab === id ? " active" : ""}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
