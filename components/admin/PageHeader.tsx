"use client";

import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  iconColor?: "cyan" | "purple" | "green" | "orange";
}

const colorMap = {
  cyan: "bg-cyan-500/10 text-cyan-400",
  purple: "bg-purple-500/10 text-purple-400",
  green: "bg-green-500/10 text-green-400",
  orange: "bg-orange-500/10 text-orange-400",
};

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  iconColor = "cyan",
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[iconColor]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
          {description && (
            <p className="text-sm text-slate-400">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
