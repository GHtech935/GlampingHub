"use client";

import { CulinarySection as CulinarySectionType, FoodItem, CulinaryFeature } from '@/types/about-content';
import { MultilingualInput } from '../MultilingualInput';
import { IconPicker } from '../IconPicker';
import { DynamicListManager } from '../DynamicListManager';
import { SingleImageUpload } from '../SingleImageUpload';
import { AboutSectionCard } from '../AboutSectionCard';
import { UtensilsCrossed } from 'lucide-react';

interface CulinarySectionProps {
  data: CulinarySectionType;
  onChange: (data: CulinarySectionType) => void;
}

/**
 * Form component for Culinary section
 * Includes badge, heading, description, food items (with images), and features
 */
export function CulinarySection({ data, onChange }: CulinarySectionProps) {
  const handleAddFoodItem = () => {
    const newItem: FoodItem = {
      id: `food-${Date.now()}`,
      title: { vi: '', en: '' },
      image: { url: '', public_id: '' },
      badge: {
        icon: 'Flame',
        text: { vi: '', en: '' }
      }
    };

    onChange({
      ...data,
      foodItems: [...data.foodItems, newItem]
    });
  };

  const handleAddFeature = () => {
    const newFeature: CulinaryFeature = {
      id: `feature-${Date.now()}`,
      title: { vi: '', en: '' },
      description: { vi: '', en: '' }
    };

    onChange({
      ...data,
      features: [...data.features, newFeature]
    });
  };

  return (
    <AboutSectionCard
      title="Culinary Experience"
      description="Ẩm thực độc đáo giữa thiên nhiên"
      icon={<UtensilsCrossed className="w-5 h-5" />}
    >
      <div className="space-y-8">
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

        {/* Food Items */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Food Items (Món ăn)</h3>

          <DynamicListManager
            items={data.foodItems}
            onChange={(foodItems) => onChange({ ...data, foodItems })}
            onAdd={handleAddFoodItem}
            addButtonLabel="Thêm món ăn mới"
            emptyText="Chưa có món ăn nào. Click button trên để thêm."
            itemLabel={(item) => item.title.vi || item.title.en || 'Chưa có tên'}
            renderItem={(item, index, updateItem) => (
              <div className="space-y-4">
                <MultilingualInput
                  label="Tên món ăn"
                  value={item.title}
                  onChange={(title) => updateItem({ ...item, title })}
                  type="text"
                  required
                />

                <SingleImageUpload
                  label="Hình ảnh"
                  value={item.image.url ? item.image : null}
                  onChange={(image) =>
                    updateItem({
                      ...item,
                      image: image || { url: '', public_id: '' }
                    })
                  }
                  folder="about/food"
                  required
                />

                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-sm text-gray-700">Badge</h4>

                  <div className="grid grid-cols-12 gap-4">
                    {/* Icon - 2 columns */}
                    <div className="col-span-2">
                      <IconPicker
                        label="Icon"
                        value={item.badge.icon}
                        onChange={(icon) =>
                          updateItem({
                            ...item,
                            badge: { ...item.badge, icon }
                          })
                        }
                        required
                      />
                    </div>

                    {/* Text - 10 columns */}
                    <div className="col-span-10">
                      <MultilingualInput
                        label="Text"
                        value={item.badge.text}
                        onChange={(text) =>
                          updateItem({
                            ...item,
                            badge: { ...item.badge, text }
                          })
                        }
                        type="text"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Features (Các tính năng)</h3>

          <DynamicListManager
            items={data.features}
            onChange={(features) => onChange({ ...data, features })}
            onAdd={handleAddFeature}
            addButtonLabel="Thêm feature mới"
            emptyText="Chưa có feature nào. Click button trên để thêm."
            itemLabel={(feature) => feature.title.vi || feature.title.en || 'Chưa có tiêu đề'}
            renderItem={(feature, index, updateFeature) => (
              <div className="space-y-4">
                <MultilingualInput
                  label="Tiêu đề"
                  value={feature.title}
                  onChange={(title) => updateFeature({ ...feature, title })}
                  type="text"
                  required
                />

                <MultilingualInput
                  label="Mô tả"
                  value={feature.description}
                  onChange={(description) => updateFeature({ ...feature, description })}
                  type="textarea"
                  rows={2}
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
