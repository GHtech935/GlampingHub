"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, FileSpreadsheet, FileText, Download, RefreshCcw, ChefHat } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useAdminLocale } from '@/components/providers/AdminI18nProvider';
import { format } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { exportToExcel, exportToPDF, exportToCSV, formatCurrencyForExport } from '@/lib/export-utils';

interface KitchenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  campsites: any[];
}

interface KitchenReportData {
  details: Array<{
    productName: string;
    productNameI18n: { vi: string; en: string };
    categoryName: { vi: string; en: string } | null;
    quantity: number;
    unitPrice: number;
    bookingCode: string;
    checkInDate: string;
    customerName: string;
    phone: string;
  }>;
  summary: Array<{
    productName: string;
    productNameI18n: { vi: string; en: string };
    totalQuantity: number;
    bookingCount: number;
  }>;
}

export function KitchenReportModal({ isOpen, onClose, campsites }: KitchenReportModalProps) {
  const t = useTranslations('admin.kitchenReportModal');
  const { locale } = useAdminLocale();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<KitchenReportData | null>(null);
  const [selectedCampsite, setSelectedCampsite] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const dateLocale = locale === 'vi' ? vi : enUS;

  // Fetch kitchen report data
  const fetchData = async () => {
    if (!selectedCampsite) {
      toast.error(t('selectCampsiteFirst'));
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('date', format(selectedDate, 'yyyy-MM-dd'));
      params.append('campsiteId', selectedCampsite);

      const response = await fetch(`/api/admin/products/kitchen-report?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        if (result.data.details.length === 0) {
          toast(t('noOrdersFound'), { icon: 'ℹ️' });
        }
      } else {
        toast.error(result.error || t('failedToLoadData'));
      }
    } catch (error) {
      console.error('Error fetching kitchen report:', error);
      toast.error(t('failedToLoadData'));
    } finally {
      setLoading(false);
    }
  };

  // Export handlers
  const handleExportPDF = async () => {
    if (!data || data.summary.length === 0) {
      toast.error(t('noData'));
      return;
    }

    const exportData = data.summary.map((item, index) => ({
      rank: index + 1,
      productName: locale === 'vi'
        ? (item.productNameI18n?.vi || item.productName)
        : (item.productNameI18n?.en || item.productName),
      totalQuantity: item.totalQuantity,
      bookingCount: item.bookingCount,
    }));

    const columns = [
      { header: '#', key: 'rank' },
      { header: t('productName'), key: 'productName' },
      { header: t('totalQuantity'), key: 'totalQuantity' },
      { header: t('bookings'), key: 'bookingCount' },
    ];

    await exportToPDF(exportData, columns, {
      title: t('title'),
      subtitle: format(selectedDate, 'dd/MM/yyyy', { locale: dateLocale }),
      filename: `kitchen-report-${format(selectedDate, 'yyyy-MM-dd')}`,
    });

    toast.success(t('pdfDownloadSuccess'));
  };

  const handleExportExcel = async () => {
    if (!data || data.details.length === 0) {
      toast.error(t('noData'));
      return;
    }

    const exportData = data.details.map((item, index) => ({
      rank: index + 1,
      productName: locale === 'vi'
        ? (item.productNameI18n?.vi || item.productName)
        : (item.productNameI18n?.en || item.productName),
      quantity: item.quantity,
      bookingCode: item.bookingCode,
      customerName: item.customerName,
      phone: item.phone || '',
    }));

    const columns = [
      { header: '#', key: 'rank', width: 6 },
      { header: t('productName'), key: 'productName', width: 30 },
      { header: t('quantity'), key: 'quantity', width: 12 },
      { header: t('bookingCode'), key: 'bookingCode', width: 15 },
      { header: t('customerName'), key: 'customerName', width: 25 },
      { header: t('phone'), key: 'phone', width: 15 },
    ];

    await exportToExcel(exportData, columns, {
      title: t('title'),
      subtitle: format(selectedDate, 'dd/MM/yyyy', { locale: dateLocale }),
      filename: `kitchen-report-details-${format(selectedDate, 'yyyy-MM-dd')}`,
    });

    toast.success(t('excelDownloadSuccess'));
  };

  const handleExportCSV = async () => {
    if (!data || data.summary.length === 0) {
      toast.error(t('noData'));
      return;
    }

    const exportData = data.summary.map((item, index) => ({
      rank: index + 1,
      productName: locale === 'vi'
        ? (item.productNameI18n?.vi || item.productName)
        : (item.productNameI18n?.en || item.productName),
      totalQuantity: item.totalQuantity,
      bookingCount: item.bookingCount,
    }));

    const columns = [
      { header: '#', key: 'rank' },
      { header: t('productName'), key: 'productName' },
      { header: t('totalQuantity'), key: 'totalQuantity' },
      { header: t('bookings'), key: 'bookingCount' },
    ];

    exportToCSV(exportData, columns, {
      title: t('title'),
      filename: `kitchen-report-${format(selectedDate, 'yyyy-MM-dd')}`,
    });

    toast.success(t('csvDownloadSuccess'));
  };

  // Reset when closing
  const handleClose = () => {
    setData(null);
    setSelectedCampsite('');
    setSelectedDate(new Date());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-orange-600" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">{t('selectCampsite')}</label>
              <Select value={selectedCampsite} onValueChange={setSelectedCampsite}>
                <SelectTrigger>
                  <SelectValue placeholder={t('chooseCampsite')} />
                </SelectTrigger>
                <SelectContent>
                  {campsites.map((campsite) => (
                    <SelectItem key={campsite.id} value={campsite.id}>
                      {typeof campsite.name === 'object'
                        ? campsite.name[locale] || campsite.name['vi']
                        : campsite.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">{t('selectDate')}</label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(selectedDate, 'dd/MM/yyyy', { locale: dateLocale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100000]" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setDatePickerOpen(false);
                      }
                    }}
                    locale={dateLocale}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={fetchData} disabled={!selectedCampsite}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              {t('loadReport')}
            </Button>
          </div>

          {/* Export Buttons */}
          {data && data.summary.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                {t('exportPdf')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('exportExcel')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                {t('exportCsv')}
              </Button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCcw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">{t('loading')}</span>
            </div>
          )}

          {/* Summary Table */}
          {!loading && data && data.summary.length > 0 && (
            <div className="border rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">{t('orderSummary')}</h3>
                <p className="text-sm text-gray-600">{t('totalItems')}: {data.summary.length}</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('productName')}</TableHead>
                    <TableHead className="text-right">{t('totalQuantity')}</TableHead>
                    <TableHead className="text-right">{t('bookings')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.summary.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {locale === 'vi'
                          ? (item.productNameI18n?.vi || item.productName)
                          : (item.productNameI18n?.en || item.productName)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {item.totalQuantity}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {item.bookingCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* No Data */}
          {!loading && data && data.summary.length === 0 && (
            <div className="text-center py-12">
              <ChefHat className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">{t('noOrdersForDate')}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
