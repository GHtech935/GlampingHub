/**
 * Centralized days-of-week mapping constants.
 * Database stores days as integers (0=Sunday, 6=Saturday), following JavaScript's Date.getDay() convention.
 */

export type DayName = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

/** All day names ordered by their numeric value (0=Sunday) */
export const DAY_NAMES: DayName[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** All day names starting from Monday (for UI display) */
export const DAY_NAMES_FROM_MONDAY: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** Convert day number (0-6) to day name */
export const NUMBER_TO_DAY_NAME: Record<number, DayName> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/** Convert day name to day number (0-6) */
export const DAY_NAME_TO_NUMBER: Record<DayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Convert a day number to a day name, with fallback */
export function dayNumberToName(num: number): DayName {
  return NUMBER_TO_DAY_NAME[num] ?? 'sunday';
}

/** Convert a day name to a day number, with fallback */
export function dayNameToNumber(name: string): number {
  return DAY_NAME_TO_NUMBER[name.toLowerCase() as DayName] ?? 0;
}
