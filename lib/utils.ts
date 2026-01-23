import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency with locale support
 * @param amount - Amount to format
 * @param locale - Locale code (default: 'vi')
 * @param currency - Currency code (default: 'VND')
 */
export function formatCurrency(
  amount: number,
  locale: string = 'vi',
  currency: string = 'VND'
): string {
  const localeMap: Record<string, string> = {
    vi: 'vi-VN',
    en: 'en-US'
  }

  return new Intl.NumberFormat(localeMap[locale] || 'vi-VN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date with locale support
 * @param date - Date to format
 * @param locale - Locale code (default: 'vi')
 * @param options - Intl.DateTimeFormat options
 */
export function formatDate(
  date: Date | string,
  locale: string = 'vi',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const localeMap: Record<string, string> = {
    vi: 'vi-VN',
    en: 'en-US'
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  }

  return new Intl.DateTimeFormat(localeMap[locale] || 'vi-VN', defaultOptions).format(d)
}

/**
 * Format phone number to Vietnam format (+84)
 * @param phone - Phone number (with or without country code)
 */
export function formatPhoneVN(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // If starts with 84, keep it
  if (digits.startsWith('84')) {
    return `+${digits}`
  }

  // If starts with 0, replace with +84
  if (digits.startsWith('0')) {
    return `+84${digits.substring(1)}`
  }

  // Otherwise, add +84
  return `+84${digits}`
}

/**
 * Format phone number based on locale
 * @param phone - Phone number
 * @param locale - Locale code
 */
export function formatPhone(phone: string, locale: string = 'vi'): string {
  if (locale === 'vi') {
    return formatPhoneVN(phone)
  }

  // For other locales, return as-is for now
  return phone
}

/**
 * Format number with thousands separator
 * @param value - Number to format
 * @param locale - Locale code (default: 'vi')
 */
export function formatNumber(value: number, locale: string = 'vi'): string {
  const localeMap: Record<string, string> = {
    vi: 'vi-VN',
    en: 'en-US'
  }

  return new Intl.NumberFormat(localeMap[locale] || 'vi-VN').format(value)
}
