import type { CSSProperties, ReactNode } from "react";

export function MetricCard({
  label,
  value,
  detail,
  index = 0,
  accent = "navy",
}: {
  label: string;
  value: ReactNode;
  detail: string;
  index?: number;
  accent?: "navy" | "orange" | "green" | "red";
}) {
  return (
    <article
      className={`metric-card accent-${accent} reveal`}
      style={{ "--delay": `${index * 70}ms` } as CSSProperties}
    >
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}
