"use client";

import { CoreValuesSection as CoreValuesSectionType, CoreValue } from '@/types/about-content';
import { MultilingualInput } from '../MultilingualInput';
import { IconPicker } from '../IconPicker';
import { ColorPicker } from '../ColorPicker';
import { DynamicListManager } from '../DynamicListManager';
import { AboutSectionCard } from '../AboutSectionCard';
import { Heart } from 'lucide-react';

interface CoreValuesSectionProps {
  data: CoreValuesSectionType;
  onChange: (data: CoreValuesSectionType) => void;
}

/**
 * Form component for Core Values section
 * Includes heading and dynamic values list
 */
export function CoreValuesSection({ data, onChange }: CoreValuesSectionProps) {
  const handleAddValue = () => {
    const newValue: CoreValue = {
      id: `value-${Date.now()}`,
      title: { vi: '', en: '' },
      description: { vi: '', en: '' },
      icon: 'Heart',
      color: 'emerald'
    };

    onChange({
      ...data,
      values: [...data.values, newValue]
    });
  };

  return (
    <AboutSectionCard
      title="Core Values"
      description="Giá trị cốt lõi của CampingHub"
      icon={<Heart className="w-5 h-5" />}
    >
      <div className="space-y-6">
        {/* Heading */}
        <MultilingualInput
          label="Heading"
          value={data.heading}
          onChange={(heading) => onChange({ ...data, heading })}
          type="text"
          required
        />

        {/* Values List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Values (Các giá trị)</h3>

          <DynamicListManager
            items={data.values}
            onChange={(values) => onChange({ ...data, values })}
            onAdd={handleAddValue}
            addButtonLabel="Thêm giá trị mới"
            emptyText="Chưa có giá trị nào. Click button trên để thêm."
            itemLabel={(value) => value.title.vi || value.title.en || 'Chưa có tiêu đề'}
            renderItem={(value, index, updateValue) => (
              <div className="space-y-4">
                <MultilingualInput
                  label="Tiêu đề"
                  value={value.title}
                  onChange={(title) => updateValue({ ...value, title })}
                  type="text"
                  required
                />

                <MultilingualInput
                  label="Mô tả"
                  value={value.description}
                  onChange={(description) => updateValue({ ...value, description })}
                  type="textarea"
                  rows={3}
                  required
                />

                <IconPicker
                  label="Icon"
                  value={value.icon}
                  onChange={(icon) => updateValue({ ...value, icon })}
                  required
                />

                <ColorPicker
                  label="Màu sắc"
                  value={value.color}
                  onChange={(color) => updateValue({ ...value, color })}
                  required
                />
              </div>
            )}
          />
        </div>
      </div>
    </AboutSectionCard>
  );
}
