"use client"

import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useClientLocale } from '@/components/providers/ClientI18nProvider';

const languageNames: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
};

const languageFlags: Record<string, string> = {
  vi: '🇻🇳',
  en: '🇬🇧',
};

const locales = ['vi', 'en'] as const;

export function LanguageSwitcher() {
  const { locale, changeLocale } = useClientLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 sm:h-10 gap-2 touch-manipulation"
          aria-label="Switch language"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-flex items-center gap-1">
            <span>{languageFlags[locale]}</span>
            <span className="text-xs sm:text-sm font-medium">
              {locale.toUpperCase()}
            </span>
          </span>
          <span className="sm:hidden">{languageFlags[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px] z-[1100]">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => changeLocale(loc)}
            className={`cursor-pointer ${
              locale === loc ? 'bg-accent' : ''
            }`}
          >
            <span className="mr-2">{languageFlags[loc]}</span>
            <span className="text-sm">{languageNames[loc]}</span>
            {locale === loc && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
