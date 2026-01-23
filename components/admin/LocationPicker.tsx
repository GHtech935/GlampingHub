"use client";

import { useState, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

interface LocationPickerProps {
  value: {
    address: string;
    city: string;
    province: string;
    latitude: number | null;
    longitude: number | null;
  };
  onChange: (location: {
    address: string;
    city: string;
    province: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const t = useTranslations('admin.locationPicker');
  const [leaflet, setLeaflet] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Load Leaflet on client side only
  useEffect(() => {
    import("leaflet").then((L) => {
      setLeaflet(L);

      // Fix default marker icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leaflet || !mapContainerRef.current || mapRef.current) return;

    const center: [number, number] = value.latitude && value.longitude
      ? [value.latitude, value.longitude]
      : [11.940419, 108.438313]; // Default: Đà Lạt

    const map = leaflet.map(mapContainerRef.current, {
      attributionControl: false,
    }).setView(center, 15);

    leaflet.control.attribution({ prefix: false }).addTo(map);

    mapRef.current = map;

    // Add tile layer
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (mapboxToken) {
      leaflet.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
        {
          attribution: '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          tileSize: 512,
          zoomOffset: -1,
        }
      ).addTo(map);
    } else {
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
    }

    // Add marker at center position (not draggable)
    const marker = leaflet
      .marker(center, { draggable: false })
      .addTo(map);

    markerRef.current = marker;
  }, [leaflet]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker position when coordinates change
  useEffect(() => {
    if (!leaflet || !mapRef.current) return;

    if (value.latitude && value.longitude) {
      const newLatLng: [number, number] = [value.latitude, value.longitude];

      if (markerRef.current) {
        // Update existing marker position
        markerRef.current.setLatLng(newLatLng);
      } else {
        // Create new marker (not draggable)
        const marker = leaflet
          .marker(newLatLng, { draggable: false })
          .addTo(mapRef.current);

        markerRef.current = marker;
      }

      // Center map on marker
      mapRef.current.setView(newLatLng, 15);
    }
  }, [leaflet, value.latitude, value.longitude]);


  if (!leaflet) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-md">
          <p className="text-gray-500">{t('loadingMap')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address Input */}
      <div className="space-y-2">
        <Label htmlFor="address">{t('address')}</Label>
        <Input
          id="address"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder={t('addressPlaceholder')}
          autoComplete="off"
        />
      </div>

      {/* City & Province - Manual Input */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">{t('city')}</Label>
          <Input
            id="city"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder={t('cityPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="province">{t('province')}</Label>
          <Input
            id="province"
            value={value.province}
            onChange={(e) => onChange({ ...value, province: e.target.value })}
            placeholder={t('provincePlaceholder')}
          />
        </div>
      </div>

      {/* Coordinates (Manual Input) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">{t('latitude')}</Label>
          <Input
            id="latitude"
            type="number"
            step="0.000001"
            value={value.latitude || ""}
            onChange={(e) => {
              const lat = parseFloat(e.target.value);
              if (!isNaN(lat) && lat >= -90 && lat <= 90) {
                onChange({ ...value, latitude: lat });
              } else if (e.target.value === "") {
                onChange({ ...value, latitude: null });
              }
            }}
            placeholder={t('latitudePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">{t('longitude')}</Label>
          <Input
            id="longitude"
            type="number"
            step="0.000001"
            value={value.longitude || ""}
            onChange={(e) => {
              const lng = parseFloat(e.target.value);
              if (!isNaN(lng) && lng >= -180 && lng <= 180) {
                onChange({ ...value, longitude: lng });
              } else if (e.target.value === "") {
                onChange({ ...value, longitude: null });
              }
            }}
            placeholder={t('longitudePlaceholder')}
          />
        </div>
      </div>

      {/* Interactive Map */}
      <div className="space-y-2">
        <Label>{t('mapLocation')}</Label>
        <p className="text-sm text-gray-500">
          {t('mapHelper')}
        </p>
        <div className="border rounded-md overflow-hidden h-[400px]">
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {/* Helper text */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800 font-semibold">
          {t('guideTitle')}
        </p>
        <ol className="text-xs text-yellow-700 mt-2 space-y-1 ml-4 list-decimal">
          <li>{t('guideStep1')} <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Maps</a></li>
          <li>{t('guideStep2')}</li>
          <li>{t('guideStep3')}</li>
          <li>{t('guideStep4')}</li>
          <li>{t('guideStep5')}</li>
          <li>{t('guideStep6')}</li>
        </ol>
        <p className="text-xs text-yellow-600 mt-3 italic">
          {t('guideNote')}
        </p>
      </div>
    </div>
  );
}
