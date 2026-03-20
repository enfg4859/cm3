import type {
  CalendarId,
  Candle,
  InstrumentMeta,
  OpeningRangeMinutes,
  SessionType,
  SupportedInterval
} from '@shared/market';
import { getIntervalSeconds } from './market';

export interface SessionWindow {
  sessionKey: string;
  sessionStart: number;
  sessionEnd: number;
  isEarlyClose: boolean;
}

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

interface ZonedDateTimeParts extends LocalDateParts {
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

const zonedDateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const weekdayFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(timeZone: string) {
  const key = `datetime:${timeZone}`;
  if (!zonedDateTimeFormatterCache.has(key)) {
    zonedDateTimeFormatterCache.set(
      key,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        hourCycle: 'h23'
      })
    );
  }

  return zonedDateTimeFormatterCache.get(key)!;
}

function getWeekdayFormatter(timeZone: string) {
  const key = `weekday:${timeZone}`;
  if (!weekdayFormatterCache.has(key)) {
    weekdayFormatterCache.set(
      key,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short'
      })
    );
  }

  return weekdayFormatterCache.get(key)!;
}

function toDateKey({ year, month, day }: LocalDateParts) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateKey(dateKey: string): LocalDateParts {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
}

function addDays(localDate: LocalDateParts, days: number): LocalDateParts {
  const date = new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = getDateTimeFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const mapped = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  const zonedTimestamp = Date.UTC(
    Number(mapped.year),
    Number(mapped.month) - 1,
    Number(mapped.day),
    Number(mapped.hour),
    Number(mapped.minute),
    Number(mapped.second)
  );

  return zonedTimestamp - date.getTime();
}

function zonedTimeToUtc(
  localDate: LocalDateParts,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  const utcGuess = new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day, hour, minute, second));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  return Math.floor((utcGuess.getTime() - offset) / 1000);
}

function getZonedDateTimeParts(timestamp: number, timeZone: string): ZonedDateTimeParts {
  const formatter = getDateTimeFormatter(timeZone);
  const parts = formatter.formatToParts(new Date(timestamp * 1000));
  const mapped = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  return {
    year: Number(mapped.year),
    month: Number(mapped.month),
    day: Number(mapped.day),
    hour: Number(mapped.hour),
    minute: Number(mapped.minute),
    second: Number(mapped.second),
    weekday: weekdayMap[mapped.weekday]
  };
}

function getWeekday(localDate: LocalDateParts, timeZone: string) {
  const label = getWeekdayFormatter(timeZone).format(
    new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day, 12, 0, 0))
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  return weekdayMap[label];
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = firstOfMonth.getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  return 1 + offset + (nth - 1) * 7;
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number) {
  const lastOfMonth = new Date(Date.UTC(year, month, 0));
  const lastWeekday = lastOfMonth.getUTCDay();
  const offset = (lastWeekday - weekday + 7) % 7;
  return lastOfMonth.getUTCDate() - offset;
}

function observedFixedHoliday(year: number, month: number, day: number): LocalDateParts {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();

  if (weekday === 6) {
    return addDays({ year, month, day }, -1);
  }

  if (weekday === 0) {
    return addDays({ year, month, day }, 1);
  }

  return { year, month, day };
}

function calculateEaster(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

function getUsEquitiesHolidayKeys(year: number) {
  const newYear = toDateKey(observedFixedHoliday(year, 1, 1));
  const mlk = toDateKey({ year, month: 1, day: nthWeekdayOfMonth(year, 1, 1, 3) });
  const presidents = toDateKey({ year, month: 2, day: nthWeekdayOfMonth(year, 2, 1, 3) });
  const easter = calculateEaster(year);
  const goodFriday = toDateKey(addDays(easter, -2));
  const memorial = toDateKey({ year, month: 5, day: lastWeekdayOfMonth(year, 5, 1) });
  const juneteenth = toDateKey(observedFixedHoliday(year, 6, 19));
  const independence = toDateKey(observedFixedHoliday(year, 7, 4));
  const labor = toDateKey({ year, month: 9, day: nthWeekdayOfMonth(year, 9, 1, 1) });
  const thanksgiving = toDateKey({ year, month: 11, day: nthWeekdayOfMonth(year, 11, 4, 4) });
  const christmas = toDateKey(observedFixedHoliday(year, 12, 25));

  return new Set([
    newYear,
    mlk,
    presidents,
    goodFriday,
    memorial,
    juneteenth,
    independence,
    labor,
    thanksgiving,
    christmas
  ]);
}

function isUsEquitiesHoliday(localDate: LocalDateParts) {
  return getUsEquitiesHolidayKeys(localDate.year).has(toDateKey(localDate));
}

function isUsEquitiesEarlyClose(localDate: LocalDateParts) {
  const thanksgiving = {
    year: localDate.year,
    month: 11,
    day: nthWeekdayOfMonth(localDate.year, 11, 4, 4)
  };
  const dayAfterThanksgiving = addDays(thanksgiving, 1);
  const independenceObserved = observedFixedHoliday(localDate.year, 7, 4);
  const julyThird = { year: localDate.year, month: 7, day: 3 };
  const christmasEve = { year: localDate.year, month: 12, day: 24 };

  const weekday = getWeekday(localDate, 'America/New_York');
  if (weekday === 0 || weekday === 6 || isUsEquitiesHoliday(localDate)) {
    return false;
  }

  if (toDateKey(localDate) === toDateKey(dayAfterThanksgiving)) {
    return true;
  }

  if (toDateKey(localDate) === toDateKey(christmasEve) && !isUsEquitiesHoliday(christmasEve)) {
    return true;
  }

  if (toDateKey(independenceObserved) !== toDateKey(julyThird) && toDateKey(localDate) === toDateKey(julyThird)) {
    return true;
  }

  return false;
}

function isTradingDay(localDate: LocalDateParts, calendarId: CalendarId, timeZone: string) {
  if (calendarId === 'ALWAYS_OPEN') {
    return true;
  }

  const weekday = getWeekday(localDate, timeZone);
  if (weekday === 0 || weekday === 6) {
    return false;
  }

  return !isUsEquitiesHoliday(localDate);
}

function getUsEquitiesSessionBounds(localDate: LocalDateParts, sessionType: SessionType) {
  const isEarlyClose = isUsEquitiesEarlyClose(localDate);
  if (sessionType === 'extended') {
    return {
      startHour: 4,
      startMinute: 0,
      endHour: 20,
      endMinute: 0,
      isEarlyClose
    };
  }

  return {
    startHour: 9,
    startMinute: 30,
    endHour: isEarlyClose ? 13 : 16,
    endMinute: 0,
    isEarlyClose
  };
}

function getSessionWindowForDate(localDate: LocalDateParts, instrument: InstrumentMeta, sessionType: SessionType): SessionWindow {
  if (instrument.calendarId === 'ALWAYS_OPEN') {
    return {
      sessionKey: toDateKey(localDate),
      sessionStart: zonedTimeToUtc(localDate, 0, 0, 0, instrument.exchangeTimezone),
      sessionEnd: zonedTimeToUtc(addDays(localDate, 1), 0, 0, 0, instrument.exchangeTimezone) - 60,
      isEarlyClose: false
    };
  }

  const bounds = getUsEquitiesSessionBounds(localDate, sessionType);
  return {
    sessionKey: toDateKey(localDate),
    sessionStart: zonedTimeToUtc(localDate, bounds.startHour, bounds.startMinute, 0, instrument.exchangeTimezone),
    sessionEnd: zonedTimeToUtc(localDate, bounds.endHour, bounds.endMinute, 0, instrument.exchangeTimezone),
    isEarlyClose: bounds.isEarlyClose
  };
}

export function resolveSessionType(instrument: InstrumentMeta, requested: SessionType) {
  if (requested === 'extended' && !instrument.supportsExtendedHours) {
    return 'regular' as const;
  }

  return requested;
}

export function getLatestSessionWindow(instrument: InstrumentMeta, timestamp: number, requestedSession: SessionType): SessionWindow {
  const sessionType = resolveSessionType(instrument, requestedSession);
  const localParts = getZonedDateTimeParts(timestamp, instrument.exchangeTimezone);

  for (let offset = 0; offset < 14; offset += 1) {
    const candidateDate = addDays(localParts, -offset);
    if (!isTradingDay(candidateDate, instrument.calendarId, instrument.exchangeTimezone)) {
      continue;
    }

    const window = getSessionWindowForDate(candidateDate, instrument, sessionType);
    if (offset === 0 && timestamp < window.sessionStart) {
      continue;
    }

    return window;
  }

  return getSessionWindowForDate(localParts, instrument, sessionType);
}

export function getPreviousSessionWindow(instrument: InstrumentMeta, timestamp: number, requestedSession: SessionType) {
  const latest = getLatestSessionWindow(instrument, timestamp, requestedSession);
  return getLatestSessionWindow(instrument, latest.sessionStart - 1, requestedSession);
}

export function getSessionWindowForTimestamp(
  instrument: InstrumentMeta,
  timestamp: number,
  requestedSession: SessionType
) {
  const sessionType = resolveSessionType(instrument, requestedSession);
  const latest = getLatestSessionWindow(instrument, timestamp, sessionType);
  if (timestamp >= latest.sessionStart && timestamp <= latest.sessionEnd) {
    return latest;
  }

  return latest;
}

function alignTimestampToWindow(window: SessionWindow, timestamp: number, intervalSeconds: number) {
  const clamped = Math.min(Math.max(timestamp, window.sessionStart), window.sessionEnd);
  const offset = Math.floor((clamped - window.sessionStart) / intervalSeconds);
  return window.sessionStart + offset * intervalSeconds;
}

export function buildSessionAwareTimestamps(
  instrument: InstrumentMeta,
  interval: SupportedInterval,
  count: number,
  requestedSession: SessionType,
  referenceTimestamp = Math.floor(Date.now() / 1000)
) {
  if (count <= 0) {
    return [];
  }

  const intervalSeconds = getIntervalSeconds(interval);
  const times: number[] = [];

  if (interval === '1day') {
    let window = getLatestSessionWindow(instrument, referenceTimestamp, requestedSession);
    for (let index = 0; index < count; index += 1) {
      times.push(window.sessionEnd);
      window = getPreviousSessionWindow(instrument, window.sessionStart - 1, requestedSession);
    }
    return times.reverse();
  }

  let window = getLatestSessionWindow(instrument, referenceTimestamp, requestedSession);
  let cursor = alignTimestampToWindow(window, Math.min(referenceTimestamp, window.sessionEnd), intervalSeconds);

  for (let index = 0; index < count; index += 1) {
    times.push(cursor);
    const nextCursor = cursor - intervalSeconds;
    if (nextCursor < window.sessionStart) {
      window = getPreviousSessionWindow(instrument, window.sessionStart - 1, requestedSession);
      cursor = alignTimestampToWindow(window, window.sessionEnd, intervalSeconds);
    } else {
      cursor = nextCursor;
    }
  }

  return times.reverse();
}

export function splitCandlesBySession(
  candles: Candle[],
  instrument: InstrumentMeta,
  sessionType: SessionType
) {
  const groups = new Map<string, { session: SessionWindow; candles: Candle[] }>();

  candles.forEach((candle) => {
    const session = getSessionWindowForTimestamp(instrument, candle.time, sessionType);
    const existing = groups.get(session.sessionKey);
    if (existing) {
      existing.candles.push(candle);
      return;
    }

    groups.set(session.sessionKey, {
      session,
      candles: [candle]
    });
  });

  return [...groups.values()].sort((left, right) => left.session.sessionStart - right.session.sessionStart);
}

export function getAllowedOpeningRangeMinutes(interval: SupportedInterval, hasOneMinuteSupport: boolean) {
  if (hasOneMinuteSupport && interval !== '1h' && interval !== '1day') {
    return [5, 15, 30] as OpeningRangeMinutes[];
  }

  switch (interval) {
    case '1min':
      return [5, 15, 30];
    case '5min':
      return [15, 30];
    case '15min':
      return [15, 30];
    default:
      return [];
  }
}

export function isIntradayInterval(interval: SupportedInterval) {
  return interval !== '1day';
}
