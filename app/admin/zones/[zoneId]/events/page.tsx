"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { EventFormModal } from "@/components/admin/glamping/EventFormModal";

interface Event {
  id: string;
  name: string;
  type: 'seasonal' | 'special' | 'closure';
  start_date: string;
  end_date: string;
  recurrence: 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always';
  status: 'available' | 'unavailable';
  item_count: number;
  pricing_type: 'base_price' | 'new_price' | 'dynamic' | 'yield';
  active: boolean;
  days_of_week: number[] | null;
  dynamic_pricing?: {
    value: number;
    mode: 'percent' | 'fixed';
  };
  yield_thresholds?: Array<{ stock: number; rate_adjustment: number }>;
  item_ids?: string[];
}

export default function EventsPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const router = useRouter();
  const t = useTranslations("admin.glamping.events");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Redirect to dashboard if "all" zones selected (not supported on this page)
  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/dashboard");
    }
  }, [zoneId, router]);

  useEffect(() => {
    if (zoneId !== "all") {
      fetchEvents();
    }
  }, [zoneId]); // Re-fetch when zone changes

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/events?zone_id=${zoneId}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast({
        title: t("messages.error"),
        description: t("messages.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/glamping/events/${eventId}`);
      const data = await response.json();
      setEditingEvent(data.event);
    } catch (error) {
      console.error('Failed to fetch event:', error);
      toast({
        title: t("messages.error"),
        description: t("messages.loadFailed"),
        variant: "destructive",
      });
    }
  };


  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesType = typeFilter === "all" || event.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getTypeBadge = (type: string) => {
    const typeKey = type as 'seasonal' | 'special' | 'closure';
    const label = t(`type.${typeKey}`, { defaultValue: type });

    switch (type) {
      case 'seasonal':
        return <Badge variant="success">{label}</Badge>;
      case 'special':
        return <Badge className="bg-purple-100 text-purple-800">{label}</Badge>;
      case 'closure':
        return <Badge variant="destructive">{label}</Badge>;
      default:
        return <Badge variant="outline">{label}</Badge>;
    }
  };

  const getRecurrenceLabel = (recurrence: string) => {
    const recurrenceKey = recurrence as 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always';
    return t(`recurrence.${recurrenceKey}`, { defaultValue: recurrence });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
      </div>

      {/* Top Controls Bar */}
      <div className="flex items-center gap-3">
        {/* Primary Action */}
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("addNew")}
        </Button>

        {/* Filters */}
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.dateFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allDates")}</SelectItem>
            <SelectItem value="upcoming">{t("filters.upcoming")}</SelectItem>
            <SelectItem value="active">{t("filters.active")}</SelectItem>
            <SelectItem value="past">{t("filters.past")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allStatus")}</SelectItem>
            <SelectItem value="available">{t("status.available")}</SelectItem>
            <SelectItem value="unavailable">{t("status.unavailable")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.typeFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
            <SelectItem value="seasonal">{t("type.seasonal")}</SelectItem>
            <SelectItem value="special">{t("type.special")}</SelectItem>
            <SelectItem value="closure">{t("type.closure")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.applyTo")}</TableHead>
              <TableHead>{t("table.startDate")}</TableHead>
              <TableHead>{t("table.endDate")}</TableHead>
              <TableHead>{t("table.recurrence")}</TableHead>
              <TableHead>{t("table.pricing")}</TableHead>
              <TableHead>{t("table.type")}</TableHead>
              <TableHead>{t("table.rules")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  {t("loading")}
                </TableCell>
              </TableRow>
            ) : filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  {t("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event, index) => (
                <TableRow key={event.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell className="text-gray-600">
                    {event.item_count > 0 ? t("itemsCount", { count: event.item_count }) : '–'}
                  </TableCell>
                  <TableCell className="text-gray-600">{formatDate(event.start_date)}</TableCell>
                  <TableCell className="text-gray-600">{formatDate(event.end_date)}</TableCell>
                  <TableCell className="text-gray-600">{getRecurrenceLabel(event.recurrence)}</TableCell>
                  <TableCell className="text-gray-600">{event.pricing_type || '–'}</TableCell>
                  <TableCell>{getTypeBadge(event.type)}</TableCell>
                  <TableCell className="text-gray-600">{t("default")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(event.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Event Modal */}
      <EventFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchEvents}
        zoneId={zoneId}
      />

      {/* Edit Event Modal */}
      <EventFormModal
        open={!!editingEvent}
        onOpenChange={(open) => !open && setEditingEvent(null)}
        onSuccess={fetchEvents}
        zoneId={zoneId}
        event={editingEvent || undefined}
      />
    </div>
  );
}
