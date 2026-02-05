"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MapPin, Grid3x3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Zone {
  id: string;
  name: { vi: string; en: string };
  city?: string;
  province?: string;
}

interface ZoneSelectorProps {
  currentZoneId: string | "all"; // "all" for aggregate view
  locale: "vi" | "en";
  variant?: "sidebar" | "header"; // Add variant prop
}

export function ZoneSelector({ currentZoneId, locale, variant = "sidebar" }: ZoneSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Pages that support viewing data for "all" zones
  // When adding a new page that should support "all" zones:
  // 1. Implement the page to handle `zoneId === "all"` (check API calls, filters, etc.)
  // 2. Test the page works correctly with "all" zones
  // 3. Add the page name to this array
  // Pages not in this list will fallback to dashboard when "all" is selected
  const ALL_ZONES_SUPPORTED_PAGES = [
    'booking-calendar',
    'bookings',
    'customer-calendar',
    'dashboard',
    // Add more pages here as they gain support for "all" zones
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch zones
        const zonesRes = await fetch("/api/admin/glamping/zones");
        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          setZones(zonesData.zones || []);
        }

        // Fetch user role
        const userRes = await fetch('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.user && userData.user.type === 'staff') {
            setUserRole(userData.user.role);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleZoneChange = (zoneId: string) => {
    // Extract page segment from current path
    // /admin/zones/[zoneId]/[page] -> page
    const pathParts = pathname.split("/");
    const zoneIndex = pathParts.indexOf("zones");

    if (zoneIndex === -1 || !pathParts[zoneIndex + 1]) {
      // Fallback if path structure is unexpected
      router.push(`/admin/zones/${zoneId}/dashboard`);
      return;
    }

    // Get the current page segment (e.g., "booking-calendar", "items", etc.)
    const currentPage = pathParts[zoneIndex + 2];

    if (zoneId === "all") {
      // Check if current page supports "all" zones
      if (currentPage && ALL_ZONES_SUPPORTED_PAGES.includes(currentPage)) {
        // Preserve the current page context
        pathParts[zoneIndex + 1] = "all";
        const newPath = pathParts.join("/");
        router.push(newPath);
      } else {
        // Fallback to dashboard for unsupported pages
        router.push("/admin/zones/all/dashboard");
      }
      return;
    }

    // For specific zones, maintain current behavior (preserve page context)
    pathParts[zoneIndex + 1] = zoneId;
    const newPath = pathParts.join("/");
    router.push(newPath);
  };

  if (loading) {
    return (
      <div className={variant === "header" ? "" : "px-4 py-3"}>
        <div className="h-10 bg-gray-200 rounded animate-pulse" style={{ width: variant === "header" ? "200px" : "100%" }} />
      </div>
    );
  }

  return (
    <div className={variant === "header" ? "" : "px-4 py-3 border-b border-gray-200"}>
      <Select value={currentZoneId} onValueChange={handleZoneChange}>
        <SelectTrigger className={variant === "header" ? "w-[200px]" : "w-full"}>
          <SelectValue placeholder="Select Zone" />
        </SelectTrigger>
        <SelectContent>
          {/* All Zones option - only for admin/sale/owner */}
          {userRole !== 'glamping_owner' && userRole !== 'operations' && (
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-4 h-4" />
                <span className="font-medium">
                  {locale === "vi" ? "Tất cả Zones" : "All Zones"}
                </span>
              </div>
            </SelectItem>
          )}

          {/* Individual zones */}
          {zones.map((zone) => (
            <SelectItem key={zone.id} value={zone.id}>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{zone.name[locale] || zone.name.vi}</span>
                {zone.city && (
                  <span className="text-xs text-gray-500">
                    ({zone.city})
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
