"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Edit, MapPin, CalendarDays, CheckCircle, Star } from "lucide-react";
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
import { StatCard, StatCardGrid } from "@/components/admin/StatCard";

interface Event {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  recurrence: string;
  status: string;
  item_count: number;
  pricing_type: string;
  zone_id: string;
  zone_name: string;
}

export default function AllZonesEventsPage() {
  const router = useRouter();
  const t = useTranslations("admin.glamping.events");
  const tc = useTranslations("admin.glamping.common");
  const ts = useTranslations("admin.glamping.allZonesStats");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchZones();
    fetchEvents();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await fetch("/api/admin/glamping/zones");
      const data = await response.json();
      if (data.zones) {
        setZones(data.zones.map((z: any) => ({ id: z.id, name: z.name.vi })));
      }
    } catch (error) {
      console.error("Failed to fetch zones:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/admin/glamping/events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(search.toLowerCase()) ||
      event.zone_name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesType = typeFilter === "all" || event.type === typeFilter;
    const matchesZone = zoneFilter === "all" || event.zone_id === zoneFilter;

    return matchesSearch && matchesStatus && matchesType && matchesZone;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("allTitle")}</h1>
          <p className="text-gray-600 mt-1">{t("allSubtitle")}</p>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <StatCardGrid>
          <StatCard
            title={ts("totalEvents")}
            value={events.length}
            icon={CalendarDays}
            color="blue"
          />
          <StatCard
            title={ts("active")}
            value={events.filter((e) => e.status === "active").length}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title={ts("special")}
            value={events.filter((e) => e.type === "special").length}
            icon={Star}
            color="purple"
          />
          <StatCard
            title={ts("zones")}
            value={new Set(events.map((e) => e.zone_id)).size}
            icon={MapPin}
            color="orange"
          />
        </StatCardGrid>
      )}

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("filters.statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allStatus")}</SelectItem>
            <SelectItem value="active">{t("status.active")}</SelectItem>
            <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("filters.typeFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
            <SelectItem value="special">{t("type.special")}</SelectItem>
            <SelectItem value="seasonal">{t("type.seasonal")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("zoneLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allZones")}</SelectItem>
            {zones.map((zone) => (
              <SelectItem key={zone.id} value={zone.id}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("zoneColumn")}</TableHead>
              <TableHead>{t("table.type")}</TableHead>
              <TableHead>{t("table.dates")}</TableHead>
              <TableHead>{t("table.recurrence")}</TableHead>
              <TableHead>{t("table.items")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-gray-500">{t("noResults")}</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{event.zone_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`type.${event.type}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{formatDate(event.start_date)}</div>
                    <div className="text-gray-500">{formatDate(event.end_date)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`recurrence.${event.recurrence}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{event.item_count || 0}</TableCell>
                  <TableCell>
                    <Badge variant={event.status === "active" ? "default" : "secondary"}>
                      {t(`status.${event.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/admin/zones/${event.zone_id}/events/${event.id}/edit`
                        )
                      }
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
    </div>
  );
}
