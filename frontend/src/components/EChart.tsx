import { useEffect, useRef } from "react";
import * as echarts from "echarts";

// Shared chart constants used across all sections
export const C = {
  blue:   "#2563eb",
  sky:    "#0ea5e9",
  indigo: "#4338ca",
  purple: "#7c3aed",
  violet: "#a78bfa",
  teal:   "#14b8a6",
  green:  "#22c55e",
  amber:  "#f59e0b",
  orange: "#f97316",
  red:    "#ef4444",
  gray:   "#9ca3af",
  slate:  "#64748b",
  navy:   "#1e40af",
};

export const TOOLTIP: echarts.TooltipComponentOption = {
  trigger: "axis",
  backgroundColor: "#fff",
  borderColor: "#e0e0e0",
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: "#1a1a1a", fontSize: 12 },
};

export const LEGEND: echarts.LegendComponentOption = {
  bottom: 4,
  textStyle: { fontSize: 11, color: "#6b7280" },
  itemWidth: 10,
  itemHeight: 10,
};

export const GRID: echarts.GridComponentOption = {
  left: "2%",
  right: "3%",
  top: 16,
  bottom: 52,
  containLabel: true,
};

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: Record<string, any>;
  height?: number;
};

export function EChart({ option, height = 320 }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current, null, { renderer: "svg" });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <div
      className="chart-wrap"
      style={{ height }}
      ref={elRef}
    />
  );
}
