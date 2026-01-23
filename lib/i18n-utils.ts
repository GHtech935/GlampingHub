/**
 * Multilingual text utilities
 * Handles extraction of localized text from JSONB fields
 */

export type MultilingualText = {
  vi: string
  en: string
}

export type Locale = 'vi' | 'en'

/**
 * Extract localized text from a multilingual field
 * @param field - The multilingual field (can be object or string for backward compatibility)
 * @param locale - The desired locale
 * @returns The localized text, with fallback logic
 */
export function getLocalizedText(
  field: MultilingualText | string | null | undefined,
  locale: Locale
): string {
  // Handle null/undefined
  if (!field) return ''

  // If it's already a string (backward compatibility), return it
  if (typeof field === 'string') return field

  // Extract from multilingual object with fallback
  const fallbackLocale: Locale = locale === 'en' ? 'vi' : 'en'

  // Try preferred locale first, then fallback, then empty string
  const text = field[locale]?.trim() || field[fallbackLocale]?.trim() || ''

  return text
}

/**
 * Check if a field is multilingual
 */
export function isMultilingualText(field: any): field is MultilingualText {
  return (
    typeof field === 'object' &&
    field !== null &&
    ('vi' in field || 'en' in field)
  )
}

/**
 * Helper to handle arrays of multilingual text
 */
export function getLocalizedArray(
  items: (MultilingualText | string)[] | null | undefined,
  locale: Locale
): string[] {
  if (!items || !Array.isArray(items)) return []
  return items.map(item => getLocalizedText(item, locale)).filter(Boolean)
}
