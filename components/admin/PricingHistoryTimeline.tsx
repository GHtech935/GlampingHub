"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { BulkOperationDetails } from "./BulkOperationDetails";
import { RevertConfirmDialog } from "./RevertConfirmDialog";

interface HistoryEntry {
  bulkOperationId: string;
  operationType: string;
  changedBy: {
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
  };
  dateRange: {
    from: string;
    to: string;
  };
  affectedDatesCount: number;
  fieldsChanged: string[];
  createdAt: string;
}

interface PricingHistoryTimelineProps {
  pitchId: string;
  userRole?: string | null;
  onRevertSuccess?: () => void;
}

export function PricingHistoryTimeline({
  pitchId,
  userRole,
  onRevertSuccess,
}: PricingHistoryTimelineProps) {
  const t = useTranslations('admin.pricingPage.history');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [revertingOperationId, setRevertingOperationId] = useState<string | null>(null);

  useEffect(() => {
    if (pitchId) {
      fetchHistory();
    }
  }, [pitchId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pricing/${pitchId}/history`);

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error("Failed to fetch pricing history:", error);
      toast.error(t('errorLoadingHistory'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (operationId: string) => {
    try {
      const response = await fetch("/api/admin/pricing/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to revert");
      }

      const result = await response.json();
      toast.success(t('revertSuccess', { count: result.revertedCount }));

      // Refresh history
      fetchHistory();

      // Notify parent to refresh pricing data
      if (onRevertSuccess) {
        onRevertSuccess();
      }
    } catch (error: any) {
      console.error("Failed to revert operation:", error);
      toast.error(error.message || t('revertError'));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFieldLabel = (field: string): string => {
    const labelKey = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase()).replace(/^([a-z])/, (g) => g.toLowerCase());
    const fieldLabels: { [key: string]: string } = {
      pricePerNight: t('fieldLabels.pricePerNight'),
      minStayNights: t('fieldLabels.minStayNights'),
      extraPersonChildPrice: t('fieldLabels.extraPersonChildPrice'),
      extraPersonAdultPrice: t('fieldLabels.extraPersonAdultPrice'),
      minAdvanceDays: t('fieldLabels.minAdvanceDays'),
      maxAdvanceDays: t('fieldLabels.maxAdvanceDays'),
      priceType: t('fieldLabels.priceType'),
    };
    return fieldLabels[labelKey] || field;
  };

  const getOperationTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      create: t('operationTypes.create'),
      update: t('operationTypes.update'),
      revert: t('operationTypes.revert'),
    };
    return labels[type] || type;
  };

  const getOperationTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      revert: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          {t('noHistoryHeading')}
        </h3>
        <p className="text-gray-500">
          {t('noHistoryDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* History entries */}
        <div className="space-y-6">
          {history.map((entry) => (
            <div key={entry.bulkOperationId} className="relative pl-10">
              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-1 w-8 h-8 rounded-full border-4 border-white ${
                  entry.operationType === "revert"
                    ? "bg-orange-500"
                    : entry.operationType === "create"
                    ? "bg-green-500"
                    : "bg-blue-500"
                }`}
              ></div>

              {/* Content card */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                {/* Desktop: 2 rows, Mobile: stacked */}
                <div className="space-y-2">
                  {/* Row 1: Badge + Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${getOperationTypeColor(
                          entry.operationType
                        )}`}
                      >
                        {getOperationTypeLabel(entry.operationType)}
                      </span>
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: User */}
                  <div className="text-sm text-gray-600">
                    {t('by')} <span className="font-medium">{entry.changedBy.userName}</span>
                  </div>

                  {/* Row 3: Date range + Days */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">{t('dateRange')}</span>{" "}
                      <span className="font-medium">
                        {formatDate(entry.dateRange.from)} - {formatDate(entry.dateRange.to)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">{t('numberOfDays')}</span>{" "}
                      <span className="font-medium">{entry.affectedDatesCount} ngày</span>
                    </div>
                  </div>

                  {/* Row 4: Changed fields */}
                  {entry.fieldsChanged.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm text-gray-500 whitespace-nowrap">{t('changedFields')}</span>
                      <div className="flex flex-wrap gap-1">
                        {entry.fieldsChanged.map((field) => (
                          <span
                            key={field}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {getFieldLabel(field)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 5: Buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setSelectedOperationId(entry.bulkOperationId)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                    >
                      {t('viewDetails')}
                    </button>
                    {entry.operationType !== "revert" && userRole !== 'owner' && (
                      <button
                        onClick={() => setRevertingOperationId(entry.bulkOperationId)}
                        className="px-3 py-1.5 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
                      >
                        {t('revert')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Modal */}
      {selectedOperationId && (
        <BulkOperationDetails
          operationId={selectedOperationId}
          isOpen={!!selectedOperationId}
          onClose={() => setSelectedOperationId(null)}
        />
      )}

      {/* Revert Confirm Dialog */}
      {revertingOperationId && (
        <RevertConfirmDialog
          operationId={revertingOperationId}
          isOpen={!!revertingOperationId}
          onClose={() => setRevertingOperationId(null)}
          onConfirm={() => {
            handleRevert(revertingOperationId);
            setRevertingOperationId(null);
          }}
        />
      )}
    </div>
  );
}
