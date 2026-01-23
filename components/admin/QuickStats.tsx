import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Award,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface QuickStat {
  label: string;
  value: string;
  icon: "trending" | "alert" | "message" | "award";
  href?: string;
  variant?: "default" | "warning" | "success";
}

const iconMap = {
  trending: TrendingUp,
  alert: AlertCircle,
  message: MessageSquare,
  award: Award,
};

const colorMap = {
  default: "bg-blue-50 text-blue-600",
  warning: "bg-orange-50 text-orange-600",
  success: "bg-green-50 text-green-600",
};

interface QuickStatsProps {
  stats: QuickStat[];
}

export function QuickStats({ stats }: QuickStatsProps) {
  const t = useTranslations('admin');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('quickStats')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat, index) => {
            const Icon = iconMap[stat.icon];
            const colorClass = colorMap[stat.variant || "default"];

            return (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
                {stat.href && (
                  <Link href={stat.href}>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
