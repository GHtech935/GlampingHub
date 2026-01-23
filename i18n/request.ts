import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'vi';

export default getRequestConfig(async ({ locale }) => {
  // Fallback to default if locale is not valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Asia/Ho_Chi_Minh',
    now: new Date()
  };
});
