"use client";

import { StorySection as StorySectionType, StoryTimelineItem } from '@/types/about-content';
import { MultilingualInput } from '../MultilingualInput';
import { IconPicker } from '../IconPicker';
import { ColorPicker } from '../ColorPicker';
import { DynamicListManager } from '../DynamicListManager';
import { AboutSectionCard } from '../AboutSectionCard';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { BookOpen } from 'lucide-react';

interface StorySectionProps {
  data: StorySectionType;
  onChange: (data: StorySectionType) => void;
}

/**
 * Form component for Story section
 * Includes heading and dynamic timeline list (with year or icon display)
 */
export function StorySection({ data, onChange }: StorySectionProps) {
  const handleAddTimeline = () => {
    const newItem: StoryTimelineItem = {
      id: `timeline-${Date.now()}`,
      type: 'year',
      displayValue: '2024',
      title: { vi: '', en: '' },
      description: { vi: '', en: '' },
      color: 'emerald'
    };

    onChange({
      ...data,
      timeline: [...data.timeline, newItem]
    });
  };

  return (
    <AboutSectionCard
      title="Story Timeline"
      description="Câu chuyện phát triển của CampingHub"
      icon={<BookOpen className="w-5 h-5" />}
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

        {/* Timeline List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Timeline Items</h3>

          <DynamicListManager
            items={data.timeline}
            onChange={(timeline) => onChange({ ...data, timeline })}
            onAdd={handleAddTimeline}
            addButtonLabel="Thêm timeline item"
            emptyText="Chưa có timeline item nào. Click button trên để thêm."
            itemLabel={(item) => item.title.vi || item.title.en || 'Chưa có tiêu đề'}
            renderItem={(item, index, updateItem) => (
              <div className="space-y-4">
                {/* Type Selection */}
                <div className="space-y-2">
                  <Label>Loại hiển thị</Label>
                  <RadioGroup
                    value={item.type}
                    onValueChange={(type: 'year' | 'icon') => updateItem({ ...item, type })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="year" id={`${item.id}-year`} />
                      <Label htmlFor={`${item.id}-year`} className="cursor-pointer">
                        Năm (hiển thị text năm trong vòng tròn)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="icon" id={`${item.id}-icon`} />
                      <Label htmlFor={`${item.id}-icon`} className="cursor-pointer">
                        Icon (hiển thị icon trong vòng tròn)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Display Value */}
                {item.type === 'year' ? (
                  <div className="space-y-2">
                    <Label>Năm hiển thị</Label>
                    <Input
                      value={item.displayValue}
                      onChange={(e) => updateItem({ ...item, displayValue: e.target.value })}
                      placeholder="vd: 2024"
                    />
                  </div>
                ) : (
                  <IconPicker
                    label="Icon hiển thị"
                    value={item.displayValue}
                    onChange={(displayValue) => updateItem({ ...item, displayValue })}
                    required
                  />
                )}

                <MultilingualInput
                  label="Tiêu đề"
                  value={item.title}
                  onChange={(title) => updateItem({ ...item, title })}
                  type="text"
                  required
                />

                <MultilingualInput
                  label="Mô tả"
                  value={item.description}
                  onChange={(description) => updateItem({ ...item, description })}
                  type="textarea"
                  rows={3}
                  required
                />

                <ColorPicker
                  label="Màu sắc"
                  value={item.color}
                  onChange={(color) => updateItem({ ...item, color })}
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
