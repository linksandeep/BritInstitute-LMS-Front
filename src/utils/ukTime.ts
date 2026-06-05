export const UK_TIME_ZONE = 'Europe/London';
export const UK_LOCALE = 'en-GB';

const getDateTimeParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat(UK_LOCALE, {
    timeZone: UK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === '24' ? '00' : values.hour;

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour,
    minute: values.minute,
    second: values.second,
  };
};

const getTimeZoneOffsetMs = (date: Date) => {
  const parts = getDateTimeParts(date);
  const zonedTime = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return zonedTime - date.getTime();
};

export const parseUkDateTimeInput = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return new Date(value);

  const [, year, month, day, hour, minute] = match;
  const utcGuess = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
  const firstPass = new Date(utcGuess.getTime() - getTimeZoneOffsetMs(utcGuess));
  return new Date(utcGuess.getTime() - getTimeZoneOffsetMs(firstPass));
};

export const parseUkDateInput = (value: string): Date => parseUkDateTimeInput(`${value}T00:00`);

export const toUkDateTimeInputValue = (value: string | Date): string => {
  const parts = getDateTimeParts(new Date(value));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const toUkDateInputValue = (value: string | Date = new Date()): string => {
  const parts = getDateTimeParts(new Date(value));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const formatUkDateTime = (
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string =>
  new Date(value).toLocaleString(UK_LOCALE, {
    timeZone: UK_TIME_ZONE,
    hour12: true,
    ...options,
  });

export const formatUkDate = (
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string =>
  new Date(value).toLocaleDateString(UK_LOCALE, {
    timeZone: UK_TIME_ZONE,
    ...options,
  });

export const formatUkTime = (
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string =>
  new Date(value).toLocaleTimeString(UK_LOCALE, {
    timeZone: UK_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
