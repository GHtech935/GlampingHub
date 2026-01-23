"use client";

import React from "react";
import { CurrencyInput } from "@/components/ui/currency-input";

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
        if (groups[groupIndex]) {
          groups[groupIndex] = { ...groups[groupIndex], price: value };
        }
        onEventPricingChange(eventId, {
          ...currentData,
          groupPricing: {
            ...currentData.groupPricing,
            inventory: groups
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
        if (groups[groupIndex]) {
          groups[groupIndex] = { ...groups[groupIndex], price: value };
        }
        params[parameterId] = {
          ...params[parameterId],
          groups
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

  // Show message if no parameters have base prices set
  if (activeParameters.length === 0 && events.length > 0) {
    return (
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Pricing Table</h3>
        <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
          <p className="text-sm">No parameters with base prices set.</p>
          <p className="text-xs mt-1">Set base prices for parameters above to enable event-specific pricing.</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Pricing Table</h3>
        <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
          <p className="text-sm">No events attached.</p>
          <p className="text-xs mt-1">Add events above to set event-specific pricing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Pricing Table</h3>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 p-3 text-left font-semibold text-sm sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                Event / Price Point
              </th>

              {/* Inventory column - only show if inventory pricing exists */}
              {showInventoryColumn && (
                <th
                  className="border border-gray-300 p-2 text-center text-xs min-w-[150px]"
                  style={{ backgroundColor: '#F5F5DC' }}
                >
                  <div>Tent/Accommodation</div>
                  <div>Inventory</div>
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
                        <div className="text-gray-600 font-normal">Base</div>
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
                            Qty {group.min} to {group.max}
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
                Base Price
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
            {events.map(event => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-3 sticky left-0 bg-white z-10">
                  <div className="text-sm font-medium">{event.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {event.type === 'seasonal' && '🌸 Seasonal'}
                    {event.type === 'special_pricing' && '⭐ Special'}
                    {event.type === 'closure_dates' && '🚫 Closure'}
                    {event.type === 'exclusive_date_span' && '👑 Exclusive'}
                  </div>
                </td>

                {/* Inventory price for event - only show if inventory pricing exists */}
                {showInventoryColumn && (
                  <td className="border border-gray-300 p-2">
                    <CurrencyInput
                      value={getEventPrice(event.id, 'inventory', null)}
                      onValueChange={(val) => handleEventPriceChange(event.id, 'inventory', null, val || 0)}
                      className="text-sm"
                    />
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
                          <CurrencyInput
                            value={getEventPrice(event.id, param.id, null)}
                            onValueChange={(val) => handleEventPriceChange(event.id, param.id, null, val || 0)}
                            className="text-sm"
                          />
                        </td>

                        {/* Group prices */}
                        {paramGroups.map((group, idx) => (
                          <td key={idx} className="border border-gray-300 p-2">
                            <CurrencyInput
                              value={getEventPrice(event.id, param.id, idx)}
                              onValueChange={(val) => handleEventPriceChange(event.id, param.id, idx, val || 0)}
                              className="text-sm"
                            />
                          </td>
                        ))}
                      </React.Fragment>
                    );
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
