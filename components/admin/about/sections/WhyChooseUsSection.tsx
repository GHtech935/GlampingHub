"use client";

import { WhyChooseUsSection as WhyChooseUsSectionType, WhyChooseUsCard } from '@/types/about-content';
import { MultilingualInput } from '../MultilingualInput';
import { IconPicker } from '../IconPicker';
import { ColorPicker } from '../ColorPicker';
import { DynamicListManager } from '../DynamicListManager';
import { AboutSectionCard } from '../AboutSectionCard';
import { Award } from 'lucide-react';

interface WhyChooseUsSectionProps {
  data: WhyChooseUsSectionType;
  onChange: (data: WhyChooseUsSectionType) => void;
}

/**
 * Form component for Why Choose Us section
 * Includes heading, description, and dynamic cards list
 */
export function WhyChooseUsSection({ data, onChange }: WhyChooseUsSectionProps) {
  const handleAddCard = () => {
    const newCard: WhyChooseUsCard = {
      id: `card-${Date.now()}`,
      title: { vi: '', en: '' },
      description: { vi: '', en: '' },
      icon: 'Star',
      color: 'emerald'
    };

    onChange({
      ...data,
      cards: [...data.cards, newCard]
    });
  };

  return (
    <AboutSectionCard
      title="Why Choose Us"
      description="Lý do khách hàng chọn CampingHub"
      icon={<Award className="w-5 h-5" />}
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

        {/* Description */}
        <MultilingualInput
          label="Description"
          value={data.description}
          onChange={(description) => onChange({ ...data, description })}
          type="textarea"
          rows={2}
          required
        />

        {/* Cards List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Cards (Danh sách các ưu điểm)</h3>

          <DynamicListManager
            items={data.cards}
            onChange={(cards) => onChange({ ...data, cards })}
            onAdd={handleAddCard}
            addButtonLabel="Thêm card mới"
            emptyText="Chưa có card nào. Click button trên để thêm."
            itemLabel={(card) => card.title.vi || card.title.en || 'Chưa có tiêu đề'}
            renderItem={(card, index, updateCard) => (
              <div className="space-y-4">
                <MultilingualInput
                  label="Tiêu đề"
                  value={card.title}
                  onChange={(title) => updateCard({ ...card, title })}
                  type="text"
                  required
                />

                <MultilingualInput
                  label="Mô tả"
                  value={card.description}
                  onChange={(description) => updateCard({ ...card, description })}
                  type="textarea"
                  rows={3}
                  required
                />

                <IconPicker
                  label="Icon"
                  value={card.icon}
                  onChange={(icon) => updateCard({ ...card, icon })}
                  required
                />

                <ColorPicker
                  label="Màu sắc"
                  value={card.color}
                  onChange={(color) => updateCard({ ...card, color })}
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
