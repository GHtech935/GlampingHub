"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MultilingualText } from '@/lib/i18n-utils';

interface MultilingualInputProps {
  label: string;
  value: MultilingualText;
  onChange: (value: MultilingualText) => void;
  type?: 'text' | 'textarea';
  placeholder?: { vi?: string; en?: string };
  required?: boolean;
  rows?: number;
}

/**
 * Tab-based multilingual input component for Vietnamese/English content
 * Displays two tabs - one for each language
 */
export function MultilingualInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  rows = 4
}: MultilingualInputProps) {
  const InputComponent = type === 'textarea' ? Textarea : Input;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <Tabs defaultValue="vi" className="w-full">
        <TabsList className="inline-flex w-auto">
          <TabsTrigger value="vi" className="px-3 py-1.5 text-lg">
            🇻🇳
          </TabsTrigger>
          <TabsTrigger value="en" className="px-3 py-1.5 text-lg">
            🇬🇧
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vi" className="mt-3">
          <InputComponent
            value={value?.vi || ''}
            onChange={(e) => onChange({ ...value, vi: e.target.value })}
            placeholder={placeholder?.vi || ''}
            rows={type === 'textarea' ? rows : undefined}
            className="w-full"
          />
          {type === 'textarea' && (
            <p className="text-xs text-gray-500 mt-1">
              {value?.vi?.length || 0} ký tự
            </p>
          )}
        </TabsContent>

        <TabsContent value="en" className="mt-3">
          <InputComponent
            value={value?.en || ''}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            placeholder={placeholder?.en || ''}
            rows={type === 'textarea' ? rows : undefined}
            className="w-full"
          />
          {type === 'textarea' && (
            <p className="text-xs text-gray-500 mt-1">
              {value?.en?.length || 0} characters
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
