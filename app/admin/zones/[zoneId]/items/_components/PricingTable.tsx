"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  calculateEventPrice,
  isEventPriceEditable,
  EventPricingConfig
} from "@/lib/glamping-event-pricing";

interface Parameter {
  id: string;
  name: string;
  color_code: string;
  min_quantity?: number;
  max_quantity?: number;
  display_order?: number;
}

interface GroupPricing {
  min: number;
  max: number;
  price: number;
}

interface EventPricingData {
  inventory: { amount: number };
  parameters: Record<string, {
    amount: number;
    groups: GroupPricing[];
  }>;
  groupPricing?: Record<string, GroupPricing[]>;
}

interface ItemEvent {
  id: string;
  name: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  pricing_type: string;
  status: string;
  recurrence?: string;
  dynamic_pricing_value?: number | null;
  dynamic_pricing_mode?: 'percent' | 'fixed' | null;
  yield_thresholds?: Array<{ stock: number; rate_adjustment: number }> | null;
}

interface PricingTableProps {
  parameters: Parameter[];
  groupPricing: Record<string, GroupPricing[]>;
  basePrices: Record<string, number>;
  inventoryBasePrice?: number;
  events: ItemEvent[];
  eventPricing: Record<string, EventPricingData>;
  onEventPricingChange: (eventId: string, data: EventPricingData) => void;
  pricingRate: string;
}

export function PricingTable({
  parameters,
  groupPricing,
  basePrices,
  inventoryBasePrice = 0,
  events,
  eventPricing,
  onEventPricingChange,
  pricingRate,
}: PricingTableProps) {
  const t = useTranslations("admin.pricingTable");

  // Filter to only show parameters that have base prices set
  const activeParameters = parameters.filter(param =>
    basePrices[param.id] !== undefined && basePrices[param.id] !== null
  );

  // Check if inventory column should be shown
  const showInventoryColumn = inventoryBasePrice > 0 ||
    (groupPricing.inventory && groupPricing.inventory.length > 0);
  // Handle price change for event
  const handleEventPriceChange = (
    eventId: string,
    parameterId: string | 'inventory',
    groupIndex: number | null,
    value: number
  ) => {
    const currentData = eventPricing[eventId] || {
      inventory: { amount: 0 },
      parameters: {},
      groupPricing: {}
    };

    if (parameterId === 'inventory') {
      if (groupIndex === null) {
        // Base inventory price
        onEventPricingChange(eventId, {
          ...currentData,
          inventory: { amount: value }
        });
      } else {
        // Inventory group pricing
        const groups = [...(currentData.groupPricing?.inventory || [])];

        // Create group if it doesn't exist, using base groupPricing structure
        if (groups[groupIndex]) {
          // Update existing group
          groups[groupIndex] = { ...groups[groupIndex], price: value };
        } else {
          // Create new group with min/max from base groupPricing
          const baseGroup = groupPricing.inventory?.[groupIndex];
          if (baseGroup) {
            groups[groupIndex] = {
              min: baseGroup.min,
              max: baseGroup.max,
              price: value
            };
          }
        }

        // CRITICAL FIX: Filter out undefined entries to avoid sparse arrays
        const filteredGroups = groups.filter(g => g !== undefined && g !== null);

        onEventPricingChange(eventId, {
          ...currentData,
          groupPricing: {
            ...currentData.groupPricing,
            inventory: filteredGroups
          }
        });
      }
    } else {
      // Parameter pricing
      if (groupIndex === null) {
        // Base parameter price
        const params = { ...currentData.parameters };
        params[parameterId] = {
          amount: value,
          groups: params[parameterId]?.groups || []
        };
        onEventPricingChange(eventId, {
          ...currentData,
          parameters: params
        });
      } else {
        // Parameter group pricing
        const params = { ...currentData.parameters };
        if (!params[parameterId]) {
          params[parameterId] = { amount: 0, groups: [] };
        }
        const groups = [...params[parameterId].groups];

        // Create group if it doesn't exist, using base groupPricing structure
        if (groups[groupIndex]) {
          // Update existing group
          groups[groupIndex] = { ...groups[groupIndex], price: value };
        } else {
          // Create new group with min/max from base groupPricing
          const baseGroup = groupPricing[parameterId]?.[groupIndex];
          if (baseGroup) {
            groups[groupIndex] = {
              min: baseGroup.min,
              max: baseGroup.max,
              price: value
            };
          }
        }

        // CRITICAL FIX: Filter out undefined entries to avoid sparse arrays
        const filteredGroups = groups.filter(g => g !== undefined && g !== null);

        params[parameterId] = {
          ...params[parameterId],
          groups: filteredGroups
        };
        onEventPricingChange(eventId, {
          ...currentData,
          parameters: params
        });
      }
    }
  };

  // Get event price value
  const getEventPrice = (
    eventId: string,
    parameterId: string | 'inventory',
    groupIndex: number | null
  ): number => {
    const eventData = eventPricing[eventId];
    if (!eventData) return 0;

    if (parameterId === 'inventory') {
      if (groupIndex === null) {
        return eventData.inventory?.amount || 0;
      } else {
        return eventData.groupPricing?.inventory?.[groupIndex]?.price || 0;
      }
    } else {
      if (groupIndex === null) {
        return eventData.parameters?.[parameterId]?.amount || 0;
      } else {
        return eventData.parameters?.[parameterId]?.groups?.[groupIndex]?.price || 0;
      }
    }
  };

  /**
   * Get the display price for an event cell
   * - For new_price: returns the stored price (editable)
   * - For base_price: returns the base price (read-only)
   * - For dynamic: calculates based on formula (read-only)
   * - For yield: calculates based on stock thresholds (read-only)
   */
  const getDisplayPrice = (
    event: ItemEvent,
    parameterId: string | 'inventory',
    groupIndex: number | null
  ): number => {
    const pricingType = event.pricing_type as 'base_price' | 'new_price' | 'dynamic' | 'yield';

    // Get base price for this parameter/group
    let basePrice = 0;
    if (parameterId === 'inventory') {
      if (groupIndex === null) {
        basePrice = inventoryBasePrice;
      } else {
        const inventoryGroups = groupPricing['inventory'] || [];
        basePrice = inventoryGroups[groupIndex]?.price || 0;
      }
    } else {
      if (groupIndex === null) {
        basePrice = basePrices[parameterId] || 0;
      } else {
        const paramGroups = groupPricing[parameterId] || [];
        basePrice = paramGroups[groupIndex]?.price || 0;
      }
    }

    // Calculate based on pricing type
    if (pricingType === 'new_price') {
      // For new_price, return the stored event price (manual input)
      return getEventPrice(event.id, parameterId, groupIndex);
    } else if (pricingType === 'base_price') {
      // For base_price, just return the base price
      return basePrice;
    } else if (pricingType === 'dynamic') {
      // Calculate dynamic pricing
      const eventConfig: EventPricingConfig = {
        pricing_type: 'dynamic',
        dynamic_pricing_value: event.dynamic_pricing_value,
        dynamic_pricing_mode: event.dynamic_pricing_mode,
      };
      return calculateEventPrice(basePrice, eventConfig);
    } else if (pricingType === 'yield') {
      // Calculate yield pricing
      // TODO: Get actual remaining stock - for now using placeholder
      const eventConfig: EventPricingConfig = {
        pricing_type: 'yield',
        yield_thresholds: event.yield_thresholds,
      };
      // Using 999 as placeholder for high stock (no yield adjustment)
      // In production, this should come from inventory system
      return calculateEventPrice(basePrice, eventConfig, { remainingStock: 999 });
    }

    return 0;
  };

  // Show message if no parameters have base prices set
  if (activeParameters.length === 0) {
    return (
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">{t("title")}</h3>
        <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
          <p className="text-sm">{t("noParametersWithBasePrices")}</p>
          <p className="text-xs mt-1">{t("setBasePrices")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">{t("title")}</h3>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 p-3 text-left font-semibold text-sm sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                {t("eventPricePoint")}
              </th>

              {/* Inventory column - only show if inventory pricing exists */}
              {showInventoryColumn && (
                <th
                  className="border border-gray-300 p-2 text-center text-xs min-w-[150px]"
                  style={{ backgroundColor: '#F5F5DC' }}
                >
                  <div>{t("tentAccommodation")}</div>
                  <div>{t("inventory")}</div>
                </th>
              )}

              {/* Parameter columns (base + groups) */}
              {activeParameters
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map(param => {
                  const paramGroups = groupPricing[param.id] || [];
                  return (
                    <React.Fragment key={param.id}>
                      {/* Base parameter column */}
                      <th
                        className="border border-gray-300 p-2 text-center text-xs min-w-[150px]"
                        style={{ backgroundColor: `${param.color_code}20` }}
                      >
                        <div className="font-semibold">{param.name}</div>
                        <div className="text-gray-600 font-normal">{t("base")}</div>
                      </th>

                      {/* Group columns */}
                      {paramGroups.map((group, idx) => (
                        <th
                          key={idx}
                          className="border border-gray-300 p-2 text-center text-xs min-w-[150px]"
                          style={{ backgroundColor: `${param.color_code}20` }}
                        >
                          <div className="font-semibold">{param.name}</div>
                          <div className="text-gray-600 font-normal">
                            {t("qtyRange", { min: group.min, max: group.max })}
                          </div>
                        </th>
                      ))}
                    </React.Fragment>
                  );
                })}
            </tr>
          </thead>

          <tbody>
            {/* Base Price Row */}
            <tr className="bg-gray-100">
              <td className="border border-gray-300 p-3 font-semibold text-sm sticky left-0 bg-gray-100 z-10">
                {t("basePrice")}
              </td>

              {/* Inventory base price - only show if inventory pricing exists */}
              {showInventoryColumn && (
                <td className="border border-gray-300 p-2">
                  <input
                    type="text"
                    value={inventoryBasePrice.toLocaleString('vi-VN')}
                    disabled
                    className="w-full px-2 py-1 text-center bg-gray-200 text-gray-600 rounded text-sm"
                  />
                </td>
              )}

              {/* Parameter base prices and groups */}
              {activeParameters
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map(param => {
                  const paramGroups = groupPricing[param.id] || [];
                  return (
                    <React.Fragment key={param.id}>
                      {/* Base parameter price */}
                      <td className="border border-gray-300 p-2">
                        <input
                          type="text"
                          value={(basePrices[param.id] || 0).toLocaleString('vi-VN')}
                          disabled
                          className="w-full px-2 py-1 text-center bg-gray-200 text-gray-600 rounded text-sm"
                        />
                      </td>

                      {/* Group prices */}
                      {paramGroups.map((group, idx) => (
                        <td key={idx} className="border border-gray-300 p-2">
                          <input
                            type="text"
                            value={group.price.toLocaleString('vi-VN')}
                            disabled
                            className="w-full px-2 py-1 text-center bg-gray-200 text-gray-600 rounded text-sm"
                          />
                        </td>
                      ))}
                    </React.Fragment>
                  );
                })}
            </tr>

            {/* Event Rows */}
            {events.map(event => {
              const isEditable = isEventPriceEditable(event.pricing_type as any);
              const pricingTypeBadge = {
                'base_price': { label: 'Base', color: 'bg-gray-100 text-gray-700' },
                'new_price': { label: 'Custom', color: 'bg-blue-100 text-blue-700' },
                'dynamic': { label: 'Dynamic', color: 'bg-purple-100 text-purple-700' },
                'yield': { label: 'Yield', color: 'bg-green-100 text-green-700' },
              }[event.pricing_type] || { label: event.pricing_type, color: 'bg-gray-100 text-gray-700' };

              return (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-3 sticky left-0 bg-white z-10">
                    <div className="text-sm font-medium">{event.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {event.type === 'seasonal' && t("eventTypes.seasonal")}
                        {event.type === 'special' && t("eventTypes.specialPricing")}
                        {event.type === 'closure' && t("eventTypes.closureDates")}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${pricingTypeBadge.color}`}>
                        {pricingTypeBadge.label}
                      </span>
                    </div>
                  </td>

                  {/* Inventory price for event - only show if inventory pricing exists */}
                  {showInventoryColumn && (
                    <td className="border border-gray-300 p-2">
                      {isEditable ? (
                        <CurrencyInput
                          value={getEventPrice(event.id, 'inventory', null)}
                          onValueChange={(val) => handleEventPriceChange(event.id, 'inventory', null, val || 0)}
                          className="text-sm bg-white"
                        />
                      ) : (
                        <input
                          type="text"
                          value={getDisplayPrice(event, 'inventory', null).toLocaleString('vi-VN')}
                          disabled
                          className="w-full px-2 py-1 text-center bg-gray-100 text-gray-600 rounded text-sm cursor-not-allowed"
                          title={`Price calculated automatically (${event.pricing_type})`}
                        />
                      )}
                    </td>
                  )}

                  {/* Parameter prices for event */}
                  {activeParameters
                    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                    .map(param => {
                      const paramGroups = groupPricing[param.id] || [];
                      return (
                        <React.Fragment key={param.id}>
                          {/* Base parameter price */}
                          <td className="border border-gray-300 p-2">
                            {isEditable ? (
                              <CurrencyInput
                                value={getEventPrice(event.id, param.id, null)}
                                onValueChange={(val) => handleEventPriceChange(event.id, param.id, null, val || 0)}
                                className="text-sm bg-white"
                              />
                            ) : (
                              <input
                                type="text"
                                value={getDisplayPrice(event, param.id, null).toLocaleString('vi-VN')}
                                disabled
                                className="w-full px-2 py-1 text-center bg-gray-100 text-gray-600 rounded text-sm cursor-not-allowed"
                                title={`Price calculated automatically (${event.pricing_type})`}
                              />
                            )}
                          </td>

                          {/* Group prices */}
                          {paramGroups.map((group, idx) => (
                            <td key={idx} className="border border-gray-300 p-2">
                              {isEditable ? (
                                <CurrencyInput
                                  value={getEventPrice(event.id, param.id, idx)}
                                  onValueChange={(val) => handleEventPriceChange(event.id, param.id, idx, val || 0)}
                                  className="text-sm bg-white"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={getDisplayPrice(event, param.id, idx).toLocaleString('vi-VN')}
                                  disabled
                                  className="w-full px-2 py-1 text-center bg-gray-100 text-gray-600 rounded text-sm cursor-not-allowed"
                                  title={`Price calculated automatically (${event.pricing_type})`}
                                />
                              )}
                            </td>
                          ))}
                        </React.Fragment>
                      );
                    })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
