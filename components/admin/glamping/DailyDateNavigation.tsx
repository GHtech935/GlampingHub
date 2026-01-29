"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DailyDateNavigationProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  todayCount?: number;
  tomorrowCount?: number;
  locale?: string;
}

export function DailyDateNavigation({
  selectedDate,
  onDateChange,
  todayCount,
  tomorrowCount,
  locale = "en",
}: DailyDateNavigationProps) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const isToday = selectedDate === today;
  const isTomorrow = selectedDate === tomorrow;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const todayLabel = locale === "vi" ? "Hôm nay" : "Today";
  const tomorrowLabel = locale === "vi" ? "Ngày mai" : "Tomorrow";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Today button */}
      <Button
        variant={isToday ? "default" : "outline"}
        size="sm"
        onClick={() => onDateChange(today)}
        className="h-9"
      >
        {todayLabel}
        {todayCount !== undefined && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-white/20">
            ({todayCount})
          </span>
        )}
      </Button>

      {/* Tomorrow button */}
      <Button
        variant={isTomorrow ? "default" : "outline"}
        size="sm"
        onClick={() => onDateChange(tomorrow)}
        className="h-9"
      >
        {tomorrowLabel}
        {tomorrowCount !== undefined && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-white/20">
            ({tomorrowCount})
          </span>
        )}
      </Button>

      <div className="flex items-center gap-1">
        {/* Prev day */}
        <Button variant="outline" size="icon" onClick={handlePrevDay} className="h-9 w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Date picker */}
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-9 w-[160px] text-sm"
        />

        {/* Next day */}
        <Button variant="outline" size="icon" onClick={handleNextDay} className="h-9 w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
