import { BarChart2, Table } from "lucide-react";
import type { View } from "../App";

type Props = {
  label?: string;
  title: string;
  view: View;
  onViewChange: (v: View) => void;
};

export function SectionHeader({ label = "Health Metrics", title, view, onViewChange }: Props) {
  return (
    <div className="section-head">
      <div>
        <p className="section-eyebrow">{label}</p>
        <h1 className="section-title">{title}</h1>
      </div>
      <div className="view-toggle">
        <button
          className={`toggle-btn${view === "table" ? " active" : ""}`}
          onClick={() => onViewChange("table")}
        >
          <Table size={13} />
          Table
        </button>
        <button
          className={`toggle-btn${view === "chart" ? " active" : ""}`}
          onClick={() => onViewChange("chart")}
        >
          <BarChart2 size={13} />
          Chart
        </button>
      </div>
    </div>
  );
}
