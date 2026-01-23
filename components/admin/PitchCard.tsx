import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tent,
  Users,
  Car,
  Dog,
  Edit,
  Ruler,
  Truck,
  Bus,
  Layers,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { getGroupsFromTypes } from "@/components/search/PitchTypeGroupFilter";

interface PitchCardProps {
  pitch: {
    id: string;
    campsite_id?: string;
    name: any; // JSONB multilingual {vi: string, en: string}
    slug: string;
    description?: any; // JSONB multilingual
    pitch_size?: any; // JSONB multilingual
    ground_type?: any; // JSONB multilingual (deprecated)
    ground_types?: Array<{ id: string; name: { vi: string; en: string } }>; // New field from API
    suitable_for?: any; // JSONB multilingual
    max_guests: number;
    max_vehicles: number;
    max_dogs: number;
    status: string;
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
    // Additional fields for display
    pitch_types?: string[]; // Array of type names
    image_url?: string; // Main image
  };
  campsiteId: string;
  userRole?: string | null;
}

// Helper function to get icon for pitch type group
const getPitchTypeGroupIcon = (groupId: string) => {
  const iconClass = "w-5 h-5";

  switch (groupId) {
    case 'tent':
      return <Tent className={iconClass} />;
    case 'vehicle':
      return <Truck className={iconClass} />;
    case 'caravan':
      return <Bus className={iconClass} />;
    default:
      return <Tent className={iconClass} />;
  }
};

export function PitchCard({ pitch, campsiteId, userRole }: PitchCardProps) {
  const t = useTranslations('admin.pitchCard');
  const locale = useLocale() as 'vi' | 'en';

  // Extract Vietnamese name from multilingual field
  const pitchName =
    typeof pitch.name === "string"
      ? pitch.name
      : pitch.name?.vi || pitch.name?.en || t('unnamed');

  // Get pitch type groups (convert individual types to groups)
  const pitchTypeGroups = pitch.pitch_types ? getGroupsFromTypes(pitch.pitch_types) : [];

  // Format ground types from new API field
  const groundTypesDisplay = pitch.ground_types && pitch.ground_types.length > 0
    ? pitch.ground_types.map(gt => gt.name[locale] || gt.name.vi || gt.name.en).join(', ')
    : t('undefined');

  // Format pitch size
  const pitchSize =
    typeof pitch.pitch_size === "string"
      ? pitch.pitch_size
      : pitch.pitch_size?.vi || pitch.pitch_size?.en || null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
          {pitch.image_url ? (
            <img
              src={pitch.image_url}
              alt={pitchName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
              <Tent className="w-16 h-16 text-blue-300" />
            </div>
          )}

          {/* Status badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {pitch.is_featured && (
              <Badge className="bg-orange-500 hover:bg-orange-600">
                {t('featured')}
              </Badge>
            )}
            <Badge
              variant={pitch.is_active ? "default" : "secondary"}
              className={
                pitch.is_active
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-gray-500 hover:bg-gray-600"
              }
            >
              {pitch.is_active ? t('active') : t('inactive')}
            </Badge>
          </div>

          {/* Edit button */}
          {userRole !== 'owner' && (
            <div className="absolute top-3 right-3">
              <Link href={`/admin-camping/campsites/${campsiteId}/pitches/${pitch.id}/edit`}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-md"
                >
                  <Edit className="w-4 h-4 text-gray-700" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title and types */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {pitchName}
            </h3>
            {pitchTypeGroups.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {pitchTypeGroups.map((groupId) => (
                  <div
                    key={groupId}
                    className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary hover:bg-primary/20 transition-colors"
                    title={groupId}
                  >
                    {getPitchTypeGroupIcon(groupId)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Capacity info */}
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900">
                {pitch.max_guests}
              </span>
              <span className="text-xs text-gray-500">{t('guests')}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900">
                {pitch.max_vehicles}
              </span>
              <span className="text-xs text-gray-500">{t('vehicles')}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Dog className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900">
                {pitch.max_dogs}
              </span>
              <span className="text-xs text-gray-500">{t('dogs')}</span>
            </div>
          </div>

          {/* Size and ground type */}
          <div className="mb-3 space-y-1">
            {pitchSize && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Ruler className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{pitchSize}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <Layers className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-medium">{t('groundTypes')}:</span> {groundTypesDisplay}
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="border-t pt-3">
            <div className="text-xs text-gray-500">
              {t('status')}: <span className="font-medium">{pitch.status}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
