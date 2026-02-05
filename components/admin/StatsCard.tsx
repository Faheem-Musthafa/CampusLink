"use client";

import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "cyan" | "purple" | "green" | "orange" | "red" | "blue";
  onClick?: () => void;
}

const colorMap = {
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    icon: "text-cyan-400",
    value: "text-cyan-400",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    icon: "text-purple-400",
    value: "text-purple-400",
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    icon: "text-green-400",
    value: "text-green-400",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    icon: "text-orange-400",
    value: "text-orange-400",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: "text-red-400",
    value: "text-red-400",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: "text-blue-400",
    value: "text-blue-400",
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = "cyan",
  onClick,
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`
        p-5 rounded-xl border ${colors.bg} ${colors.border}
        ${onClick ? "cursor-pointer hover:scale-[1.02] transition-transform" : ""}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
          {description && (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-1 ${
                trend.isPositive ? "text-green-400" : "text-red-400"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
  const colsClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return <div className={`grid gap-4 ${colsClass[columns]}`}>{children}</div>;
}
