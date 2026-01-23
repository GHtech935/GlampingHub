'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';

// Cookie helper functions
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

// Create context for locale switching
interface LocaleContextType {
  locale: 'vi' | 'en';
  changeLocale: (locale: 'vi' | 'en') => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'vi',
  changeLocale: () => {},
});

export function useClientLocale() {
  return useContext(LocaleContext);
}

export function ClientI18nProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const [messages, setMessages] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get locale from localStorage or cookie
    const savedLocale = (localStorage.getItem('client_locale') || getCookie('NEXT_LOCALE') || 'vi') as 'vi' | 'en';
    setLocale(savedLocale);

    // Sync cookie with localStorage on initial load
    const currentCookie = getCookie('NEXT_LOCALE');
    if (currentCookie !== savedLocale) {
      setCookie('NEXT_LOCALE', savedLocale, 365);
    }

    // Load messages
    setIsLoading(true);
    import(`@/messages/${savedLocale}.json`).then((module) => {
      setMessages(module.default);
      setIsLoading(false);
    });
  }, []);

  // Function to change locale
  const changeLocale = (newLocale: 'vi' | 'en') => {
    setLocale(newLocale);
    localStorage.setItem('client_locale', newLocale);
    // Set cookie for server components (like About page)
    setCookie('NEXT_LOCALE', newLocale, 365);

    setIsLoading(true);
    import(`@/messages/${newLocale}.json`).then((module) => {
      setMessages(module.default);
      setIsLoading(false);
      // Refresh router to let server components pick up new locale from cookie
      router.refresh();
    });
  };

  if (isLoading || !messages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
      <LocaleContext.Provider value={{ locale, changeLocale }}>
        {children}
      </LocaleContext.Provider>
    </NextIntlClientProvider>
  );
}
