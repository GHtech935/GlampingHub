"use client";

import { useState } from "react";
import { ItemAvailabilityCalendar } from "./ItemAvailabilityCalendar";
import { ItemBookingSummaryPanel } from "./ItemBookingSummaryPanel";

interface ItemParameter {
  id: string;
  name: string;
  color_code: string;
  min_quantity: number;
  max_quantity: number;
}

interface ItemBookingSectionProps {
  itemId: string;
  zoneId: string;
  zoneName: string;
  itemName: string;
  basePrice: number;
  extraAdultPrice: number;
  extraChildPrice: number;
  maxGuests: number;
  parameters: ItemParameter[];
  locale: 'vi' | 'en';
}

export function ItemBookingSection({
  itemId,
  zoneId,
  zoneName,
  itemName,
  basePrice,
  extraAdultPrice,
  extraChildPrice,
  maxGuests,
  parameters,
  locale,
}: ItemBookingSectionProps) {
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);

  const handleDateSelect = (startDate: string, endDate: string) => {
    setSelectedStart(startDate);
    setSelectedEnd(endDate);
  };

  return (
    <div className="lg:col-span-1 space-y-6">
      <ItemAvailabilityCalendar
        itemId={itemId}
        onDateSelect={handleDateSelect}
      />
      <ItemBookingSummaryPanel
        basePrice={basePrice}
        extraAdultPrice={extraAdultPrice}
        extraChildPrice={extraChildPrice}
        maxGuests={maxGuests}
        parameters={parameters}
        itemId={itemId}
        zoneId={zoneId}
        zoneName={zoneName}
        itemName={itemName}
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
        locale={locale}
      />
    </div>
  );
}
