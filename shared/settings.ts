export const DEFAULT_MAX_NEW_CARDS_PER_DAY = 3;
export const MIN_NEW_CARDS_PER_DAY = 0;
export const MAX_NEW_CARDS_PER_DAY = 100;

export const DEFAULT_DAY_START_HOUR = 0;
export const MIN_DAY_START_HOUR = 0;
export const MAX_DAY_START_HOUR = 23;

export type RatingHotkeyKey = 'again' | 'hard' | 'good' | 'easy';
export type RatingHotkeys = Record<RatingHotkeyKey, string>;
export const DEFAULT_RATING_HOTKEYS: RatingHotkeys = {
  again: '1',
  hard: '2',
  good: '3',
  easy: '4',
};

export type Theme = 'light' | 'dark';
export const DEFAULT_THEME: Theme = 'dark';
