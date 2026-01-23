"use client";

import { HeroSection as HeroSectionType } from '@/types/about-content';
import { MultilingualInput } from '../MultilingualInput';
import { IconPicker } from '../IconPicker';
import { AboutSectionCard } from '../AboutSectionCard';
import { Sparkles } from 'lucide-react';

interface HeroSectionProps {
  data: HeroSectionType;
  onChange: (data: HeroSectionType) => void;
}

/**
 * Form component for Hero section
 * Includes badge (icon + text), heading, and description
 */
export function HeroSection({ data, onChange }: HeroSectionProps) {
  return (
    <AboutSectionCard
      title="Hero Section"
      description="Phần đầu tiên hiển thị trên trang About"
      icon={<Sparkles className="w-5 h-5" />}
    >
      <div className="space-y-6">
        {/* Badge */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-sm text-gray-700">Badge</h3>

          <div className="grid grid-cols-12 gap-4">
            {/* Icon - 2 columns */}
            <div className="col-span-2">
              <IconPicker
                label="Icon"
                value={data.badge.icon}
                onChange={(icon) =>
                  onChange({
                    ...data,
                    badge: { ...data.badge, icon }
                  })
                }
                required
              />
            </div>

            {/* Text - 10 columns */}
            <div className="col-span-10">
              <MultilingualInput
                label="Text"
                value={data.badge.text}
                onChange={(text) =>
                  onChange({
                    ...data,
                    badge: { ...data.badge, text }
                  })
                }
                type="text"
                required
              />
            </div>
          </div>
        </div>

        {/* Heading */}
        <MultilingualInput
          label="Heading"
          value={data.heading}
          onChange={(heading) => onChange({ ...data, heading })}
          type="text"
          required
        />

        {/* Description */}
        <MultilingualInput
          label="Description"
          value={data.description}
          onChange={(description) => onChange({ ...data, description })}
          type="textarea"
          rows={3}
          required
        />
      </div>
    </AboutSectionCard>
  );
}
