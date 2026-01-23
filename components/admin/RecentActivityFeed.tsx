import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  CreditCard,
  LogIn,
  Star,
  Calendar,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Activity {
  id: string;
  type: "booking" | "payment" | "checkin" | "review" | "cancellation";
  time: string;
  description: string;
  status?: "success" | "warning" | "error";
}

const activityIcons = {
  booking: Calendar,
  payment: CreditCard,
  checkin: LogIn,
  review: Star,
  cancellation: XCircle,
};

const activityColors = {
  booking: "text-blue-600 bg-blue-50",
  payment: "text-green-600 bg-green-50",
  checkin: "text-purple-600 bg-purple-50",
  review: "text-yellow-600 bg-yellow-50",
  cancellation: "text-red-600 bg-red-50",
};

interface RecentActivityFeedProps {
  activities: Activity[];
  limit?: number;
}

export function RecentActivityFeed({ activities, limit = 10 }: RecentActivityFeedProps) {
  const displayedActivities = activities.slice(0, limit);
  const t = useTranslations('admin');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('recentActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>{t('noActivity')}</p>
            </div>
          ) : (
            displayedActivities.map((activity) => {
              const Icon = activityIcons[activity.type];
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activityColors[activity.type]
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                  {activity.status && (
                    <Badge
                      variant={
                        activity.status === "success"
                          ? "default"
                          : activity.status === "warning"
                          ? "secondary"
                          : "destructive"
                      }
                      className="flex-shrink-0"
                    >
                      {t(`activityStatus.${activity.status}`)}
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
