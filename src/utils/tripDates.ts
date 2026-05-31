import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';
const TRIP_START = new Date('2026-06-03T00:00:00.000Z');
const TRIP_DAYS = 15;

export interface DayInfo {
  dayNumber: number;
  tripDate: Date;
  dateString: string; // YYYY-MM-DD in IST
  status: 'locked' | 'active' | 'completed' | 'missed';
}

export function getTripDays(): { dayNumber: number; tripDate: Date; dateString: string }[] {
  const days = [];
  for (let i = 0; i < TRIP_DAYS; i++) {
    const tripDate = new Date(TRIP_START);
    tripDate.setUTCDate(tripDate.getUTCDate() + i);
    const dateString = getISTDateString(tripDate);
    days.push({ dayNumber: i + 1, tripDate, dateString });
  }
  return days;
}

export function getTodayISTString(): string {
  const now = new Date();
  return getISTDateString(now);
}

export function getISTDateString(date: Date): string {
  const zoned = toZonedTime(date, TIMEZONE);
  const year = zoned.getFullYear();
  const month = String(zoned.getMonth() + 1).padStart(2, '0');
  const day = String(zoned.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getActiveDayNumber(): number | null {
  const todayIST = getTodayISTString();
  const days = getTripDays();
  const activeDay = days.find(d => d.dateString === todayIST);
  return activeDay ? activeDay.dayNumber : null;
}

export function getDayDateString(dayNumber: number): string | null {
  const days = getTripDays();
  const day = days.find(d => d.dayNumber === dayNumber);
  return day ? day.dateString : null;
}

export function isDayActive(dayNumber: number): boolean {
  const todayIST = getTodayISTString();
  const dayDateString = getDayDateString(dayNumber);
  return dayDateString === todayIST;
}

export function isDayPast(dayNumber: number): boolean {
  const todayIST = getTodayISTString();
  const dayDateString = getDayDateString(dayNumber);
  if (!dayDateString) return false;
  return dayDateString < todayIST;
}

export function isDayFuture(dayNumber: number): boolean {
  const todayIST = getTodayISTString();
  const dayDateString = getDayDateString(dayNumber);
  if (!dayDateString) return false;
  return dayDateString > todayIST;
}
