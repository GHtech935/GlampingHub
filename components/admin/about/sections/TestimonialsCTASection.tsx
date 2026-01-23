"use client";

import {
  TestimonialsSection,
  CTASection,
  Testimonial
} from '@/types/about-content';
import { MultilingualInput } from '../MultilingualInput';
import { IconPicker } from '../IconPicker';
import { ColorPicker } from '../ColorPicker';
import { DynamicListManager } from '../DynamicListManager';
import { AboutSectionCard } from '../AboutSectionCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send } from 'lucide-react';

interface TestimonialsCTASectionProps {
  testimonials: TestimonialsSection;
  cta: CTASection;
  onTestimonialsChange: (data: TestimonialsSection) => void;
  onCTAChange: (data: CTASection) => void;
}

/**
 * Form component for Testimonials & CTA sections
 * Includes testimonials list and CTA section
 */
export function TestimonialsCTASection({
  testimonials,
  cta,
  onTestimonialsChange,
  onCTAChange
}: TestimonialsCTASectionProps) {
  const handleAddTestimonial = () => {
    const newTestimonial: Testimonial = {
      id: `testimonial-${Date.now()}`,
      customerName: { vi: '', en: '' },
      location: { vi: '', en: '' },
      quote: { vi: '', en: '' },
      initials: '',
      color: 'emerald'
    };

    onTestimonialsChange({
      ...testimonials,
      items: [...testimonials.items, newTestimonial]
    });
  };

  return (
    <div className="space-y-8">
      {/* Testimonials Section */}
      <AboutSectionCard
        title="Testimonials"
        description="Đánh giá từ khách hàng"
        icon={<MessageSquare className="w-5 h-5" />}
      >
        <div className="space-y-6">
          {/* Heading */}
          <MultilingualInput
            label="Heading"
            value={testimonials.heading}
            onChange={(heading) => onTestimonialsChange({ ...testimonials, heading })}
            type="text"
            required
          />

          {/* Description */}
          <MultilingualInput
            label="Description"
            value={testimonials.description}
            onChange={(description) => onTestimonialsChange({ ...testimonials, description })}
            type="textarea"
            rows={2}
            required
          />

          {/* Testimonials List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Testimonials (Đánh giá)</h3>

            <DynamicListManager
              items={testimonials.items}
              onChange={(items) => onTestimonialsChange({ ...testimonials, items })}
              onAdd={handleAddTestimonial}
              addButtonLabel="Thêm testimonial mới"
              emptyText="Chưa có testimonial nào. Click button trên để thêm."
              itemLabel={(item) => item.customerName.vi || item.customerName.en || 'Chưa có tên'}
              renderItem={(item, index, updateItem) => (
                <div className="space-y-4">
                  <MultilingualInput
                    label="Tên khách hàng"
                    value={item.customerName}
                    onChange={(customerName) => updateItem({ ...item, customerName })}
                    type="text"
                    required
                  />

                  <MultilingualInput
                    label="Địa điểm"
                    value={item.location}
                    onChange={(location) => updateItem({ ...item, location })}
                    type="text"
                    required
                  />

                  <MultilingualInput
                    label="Nội dung đánh giá"
                    value={item.quote}
                    onChange={(quote) => updateItem({ ...item, quote })}
                    type="textarea"
                    rows={4}
                    required
                  />

                  <div className="space-y-2">
                    <Label>Initials (2 ký tự, vd: NA, TH)</Label>
                    <Input
                      value={item.initials}
                      onChange={(e) => updateItem({ ...item, initials: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="VD: NA"
                      maxLength={2}
                      className="w-24"
                    />
                  </div>

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

      {/* CTA Section */}
      <AboutSectionCard
        title="Call to Action (CTA)"
        description="Lời kêu gọi hành động cuối trang"
        icon={<Send className="w-5 h-5" />}
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
                  value={cta.badge.icon}
                  onChange={(icon) =>
                    onCTAChange({
                      ...cta,
                      badge: { ...cta.badge, icon }
                    })
                  }
                  required
                />
              </div>

              {/* Text - 10 columns */}
              <div className="col-span-10">
                <MultilingualInput
                  label="Text"
                  value={cta.badge.text}
                  onChange={(text) =>
                    onCTAChange({
                      ...cta,
                      badge: { ...cta.badge, text }
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
            value={cta.heading}
            onChange={(heading) => onCTAChange({ ...cta, heading })}
            type="text"
            required
          />

          {/* Description */}
          <MultilingualInput
            label="Description"
            value={cta.description}
            onChange={(description) => onCTAChange({ ...cta, description })}
            type="textarea"
            rows={2}
            required
          />

          {/* Buttons */}
          <MultilingualInput
            label="Primary Button Text"
            value={cta.primaryButton}
            onChange={(primaryButton) => onCTAChange({ ...cta, primaryButton })}
            type="text"
            required
          />

          <MultilingualInput
            label="Secondary Button Text"
            value={cta.secondaryButton}
            onChange={(secondaryButton) => onCTAChange({ ...cta, secondaryButton })}
            type="text"
            required
          />

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Lưu ý:</strong> Button links (/search, /register) được hardcode trong frontend và không thể thay đổi từ đây.
            </p>
          </div>
        </div>
      </AboutSectionCard>
    </div>
  );
}
