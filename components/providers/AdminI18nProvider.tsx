'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useState, useEffect, createContext, useContext } from 'react';

// Create context for locale switching
interface LocaleContextType {
  locale: 'vi' | 'en';
  changeLocale: (locale: 'vi' | 'en') => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'vi',
  changeLocale: () => {},
});

export function useAdminLocale() {
  return useContext(LocaleContext);
}

export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const [messages, setMessages] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get locale from localStorage
    const savedLocale = (localStorage.getItem('admin_locale') || 'vi') as 'vi' | 'en';
    setLocale(savedLocale);

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
    localStorage.setItem('admin_locale', newLocale);

    setIsLoading(true);
    import(`@/messages/${newLocale}.json`).then((module) => {
      setMessages(module.default);
      setIsLoading(false);
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
