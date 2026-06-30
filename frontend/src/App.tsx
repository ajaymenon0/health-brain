import { useCallback, useEffect, useState } from "react";
import { BarChart2, Table } from "lucide-react";
import type { DashboardData } from "./types";

export type View = "table" | "chart";
import { SleepSection } from "./sections/SleepSection";
import { RunsSection } from "./sections/RunsSection";
import { DailyStatsSection } from "./sections/DailyStatsSection";
import { SportSection } from "./sections/SportSection";
import { MacrosSection } from "./sections/MacrosSection";
import { FoodLogSection } from "./sections/FoodLogSection";
import { WorkoutsSection } from "./sections/WorkoutsSection";

const TABS = [
  { id: "sleep", label: "Sleep" },
  { id: "runs", label: "Runs" },
  { id: "daily-stats", label: "Daily Stats" },
  { id: "sport-activities", label: "Sport / Activities" },
  { id: "macros", label: "Macros" },
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
        <h1>Health Brain</h1>
        <div className="header-meta">
          <span className="muted">Updated {data.generatedAt}</span>
          <button onClick={fetchData}>Refresh</button>
        </div>
      </header>
      <nav className="tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={activeTab === id ? "tab active" : "tab"}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="view-bar">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === "table" ? "active" : ""}`}
            onClick={() => setView("table")}
            title="Table view"
          >
            <Table size={15} />
          </button>
          <button
            className={`toggle-btn ${view === "chart" ? "active" : ""}`}
            onClick={() => setView("chart")}
            title="Chart view"
          >
            <BarChart2 size={15} />
          </button>
        </div>
      </div>
      <main>
        {activeTab === "sleep" && <SleepSection data={data.sleep} view={view} stats={data.stats.sleep} />}
        {activeTab === "runs" && <RunsSection data={data.runs} view={view} stats={data.stats.runs} />}
        {activeTab === "daily-stats" && <DailyStatsSection data={data.dailyStats} view={view} stats={data.stats.dailyStats} />}
        {activeTab === "sport-activities" && <SportSection data={data.sportActivities} view={view} />}
        {activeTab === "macros" && <MacrosSection data={data.macros} view={view} stats={data.stats.macros} />}
        {activeTab === "food-log" && <FoodLogSection data={data.foodLogs} view={view} />}
        {activeTab === "workouts" && <WorkoutsSection data={data.workouts} view={view} />}
      </main>
    </>
  );
}
