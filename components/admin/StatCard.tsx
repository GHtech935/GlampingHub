"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "purple" | "orange" | "emerald";
}

const colorClasses: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  emerald: "bg-emerald-500",
};

export function StatCard({ title, value, icon: Icon, color = "blue" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
            <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900">{value}</p>
          </div>
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${colorClasses[color] || colorClasses.blue} flex items-center justify-center flex-shrink-0 ml-3`}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
