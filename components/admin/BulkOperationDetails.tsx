"use client";

import { useEffect, useState, Fragment } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";

interface Change {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
}

interface OperationDetail {
  date: string;
  changes: Change[];
}

interface OperationMetadata {
  operationId: string;
  operationType: string;
  pitchId: string;
  pitchName: string;
  changedBy: {
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
  };
  createdAt: string;
}

interface BulkOperationDetailsProps {
  operationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BulkOperationDetails({
  operationId,
  isOpen,
  onClose,
}: BulkOperationDetailsProps) {
  const t = useTranslations('admin.pricingPage.operationDetails');
  const [metadata, setMetadata] = useState<OperationMetadata | null>(null);
  const [details, setDetails] = useState<OperationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && operationId) {
      fetchDetails();
    }
  }, [isOpen, operationId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pricing/history/${operationId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch operation details");
      }

      const data = await response.json();
      setMetadata(data.metadata);
      setDetails(data.details || []);
    } catch (error) {
      console.error("Failed to fetch operation details:", error);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
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

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "boolean") {
      return value ? t('yes') : t('no');
    }
    if (typeof value === "number") {
      return value.toLocaleString("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
    // Handle string numbers (like "4000000.00" from database DECIMAL)
    if (typeof value === "string" && !isNaN(Number(value))) {
      return Number(value).toLocaleString("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : metadata ? (
          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('pitch')}</span>
                  <p className="font-medium">{metadata.pitchName}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('operationType')}</span>
                  <p className="font-medium capitalize">{metadata.operationType}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('performedBy')}</span>
                  <p className="font-medium">{metadata.changedBy.userName}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('timestamp')}</span>
                  <p className="font-medium">{formatDateTime(metadata.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Details Table */}
            <div>
              <h3 className="font-semibold mb-3">
                {t('detailsHeading', { count: details.length })}
              </h3>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        {t('date')}
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        {t('field')}
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        {t('oldValue')}
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">
                        {t('newValue')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {details.map((detail, dateIndex) => (
                      <Fragment key={dateIndex}>
                        {detail.changes.map((change, changeIndex) => (
                          <tr
                            key={`${dateIndex}-${changeIndex}`}
                            className="hover:bg-gray-50"
                          >
                            {changeIndex === 0 && (
                              <td
                                className="px-4 py-2 font-medium align-top"
                                rowSpan={detail.changes.length}
                              >
                                {formatDate(detail.date)}
                              </td>
                            )}
                            <td className="px-4 py-2">{change.fieldLabel}</td>
                            <td className="px-4 py-2 text-gray-600">
                              {formatValue(change.oldValue)}
                            </td>
                            <td className="px-4 py-2 font-medium text-blue-600">
                              {formatValue(change.newValue)}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-blue-900 mb-1">{t('summaryHeading')}</p>
                  <p className="text-sm text-blue-800">
                    {t('summaryText', { count: details.length })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {t('noDetailsFound')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
