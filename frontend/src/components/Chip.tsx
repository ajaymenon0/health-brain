type ChipProps = {
  title: string;
  value: string;
  sub?: string;
};

export function Chip({ title, value, sub }: ChipProps) {
  return (
    <div className="chip">
      <div className="chip-title">{title}</div>
      <div className="chip-value">{value}</div>
      {sub && <div className="chip-sub">{sub}</div>}
    </div>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="chip-row">{children}</div>;
}
