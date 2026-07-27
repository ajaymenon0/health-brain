import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string;
  unit?: string;
  sub?: ReactNode;
  icon?: ReactNode;
  iconColor?: string;
};

export function StatCard({ title, value, unit, sub, icon, iconColor = "#6b7280" }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-label">{title}</span>
        {icon && (
          <span className="stat-card-icon" style={{ color: iconColor }}>
            {icon}
          </span>
        )}
      </div>
      <div className="stat-card-value">
        {value}
        {unit && <span className="stat-card-unit"> {unit}</span>}
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

export function StatCards({ children }: { children: ReactNode }) {
  return <div className="stat-cards">{children}</div>;
}

export { StatCard as Chip, StatCards as ChipRow };
