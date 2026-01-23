"use client";

import { useEffect, useRef } from "react";

interface ZoneMapProps {
  latitude: number;
  longitude: number;
  zoneId: string;
}

export function ZoneMap({ latitude, longitude, zoneId }: ZoneMapProps) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Load Leaflet dynamically
    let map: any = null;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      // Import Leaflet CSS
      // @ts-ignore - CSS import for Leaflet
      await import("leaflet/dist/leaflet.css");

      // Fix default marker icon issue with webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!containerRef.current) return;

      // Clean up existing map if any
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Create new map
      map = L.map(containerRef.current).setView([latitude, longitude], 13);
      mapRef.current = map;

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Add marker
      L.marker([latitude, longitude]).addTo(map);
    };

    initMap();

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, zoneId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: "300px" }}
    />
  );
}
