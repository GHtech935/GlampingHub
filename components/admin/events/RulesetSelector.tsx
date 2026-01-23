'use client';

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface RulesetSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  onViewRules?: () => void;
}

export default function RulesetSelector({
  value,
  onChange,
  onViewRules
}: RulesetSelectorProps) {
  const t = useTranslations('events.new');

  return (
    <div className="space-y-2">
      <Label>{t('rules')}</Label>
      <Select value={value || 'default'} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">{t('default')}</SelectItem>
        </SelectContent>
      </Select>
      {onViewRules && (
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-blue-600"
          onClick={onViewRules}
        >
          {t('viewRules')}
        </Button>
      )}
    </div>
  );
}
