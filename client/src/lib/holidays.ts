import { addDays } from "date-fns";

interface Holiday {
  date: Date;
  name: string;
  type: 'national' | 'international';
}

// Calculate Easter date using Gauss's algorithm
function calculateEaster(year: number): Date {
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
  
  return new Date(year, month - 1, day);
}

// Calculate nth weekday of a month (e.g., 2nd Sunday of May)
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  // month is 0-indexed (0=January, 1=February, etc.)
  // weekday is 0-indexed (0=Sunday, 1=Monday, etc.)
  // nth is 1-indexed (1=first, 2=second, etc.)
  
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  
  // Calculate days until the first occurrence of the target weekday
  let daysUntilWeekday = (weekday - firstWeekday + 7) % 7;
  
  // Add weeks to get to the nth occurrence
  const targetDay = 1 + daysUntilWeekday + (nth - 1) * 7;
  
  return new Date(year, month, targetDay);
}

export function getBrazilianHolidays(year: number): Holiday[] {
  const easter = calculateEaster(year);
  
  // Calculate moveable holidays that depend on weekdays
  const mothersDayBR = getNthWeekdayOfMonth(year, 4, 0, 2); // 2nd Sunday of May
  const fathersDayBR = getNthWeekdayOfMonth(year, 7, 0, 2); // 2nd Sunday of August
  
  const holidays: Holiday[] = [
    // Fixed Brazilian National Holidays
    { date: new Date(year, 0, 1), name: 'Ano Novo', type: 'national' },
    { date: new Date(year, 3, 21), name: 'Tiradentes', type: 'national' },
    { date: new Date(year, 4, 1), name: 'Dia do Trabalho', type: 'national' },
    { date: new Date(year, 8, 7), name: 'Independência do Brasil', type: 'national' },
    { date: new Date(year, 9, 12), name: 'N. Sra. Aparecida / Dia das Crianças', type: 'national' }, // Combined - same day
    { date: new Date(year, 10, 2), name: 'Finados', type: 'national' },
    { date: new Date(year, 10, 15), name: 'Proclamação da República', type: 'national' },
    { date: new Date(year, 10, 20), name: 'Consciência Negra', type: 'national' },
    { date: new Date(year, 11, 25), name: 'Natal', type: 'national' },
    
    // Moveable Brazilian Holidays (based on Easter)
    { date: addDays(easter, -47), name: 'Carnaval', type: 'national' },
    { date: addDays(easter, -2), name: 'Sexta-feira Santa', type: 'national' },
    { date: addDays(easter, 60), name: 'Corpus Christi', type: 'national' },
    
    // International Events/Holidays
    { date: new Date(year, 1, 14), name: 'Dia dos Namorados', type: 'international' },
    { date: new Date(year, 2, 8), name: 'Dia Internacional da Mulher', type: 'international' },
    { date: new Date(year, 3, 22), name: 'Dia da Terra', type: 'international' },
    { date: mothersDayBR, name: 'Dia das Mães', type: 'international' },
    { date: fathersDayBR, name: 'Dia dos Pais', type: 'international' },
    { date: new Date(year, 9, 31), name: 'Halloween', type: 'international' },
  ];
  
  return holidays;
}

export function getHolidayForDate(date: Date): Holiday | null {
  const year = date.getFullYear();
  const holidays = getBrazilianHolidays(year);
  
  return holidays.find(holiday => 
    holiday.date.getDate() === date.getDate() &&
    holiday.date.getMonth() === date.getMonth() &&
    holiday.date.getFullYear() === date.getFullYear()
  ) || null;
}
