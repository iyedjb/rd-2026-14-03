import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function toTitleCase(text: string): string {
  if (!text) return text;
  return text
    .split('\n')
    .map(line => 
      line
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join('\n');
}

/**
 * Convert a Date to YYYY-MM-DD string without timezone shifting
 * Uses UTC methods to prevent dates from shifting back/forward due to timezone offsets
 */
export function dateToLocalDateString(date: Date | string | null | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') return date;
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD date string as local time (not UTC)
 * This prevents timezone shifts when creating Date objects from input fields
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Split YYYY-MM-DD
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create date in local timezone
  return new Date(year, month - 1, day);
}

/**
 * Calculate age correctly accounting for whether birthday has occurred in the reference year
 * @param birthDate The birth date
 * @param referenceDate Optional date to calculate age as of (defaults to today)
 */
export function calculateAge(birthDate: Date | string | null | undefined, referenceDate?: Date): number {
  if (!birthDate) return 0;
  
  let birthDateObj: Date;
  if (typeof birthDate === 'string') {
    birthDateObj = parseLocalDate(birthDate.split('T')[0]);
  } else {
    birthDateObj = birthDate instanceof Date ? birthDate : new Date(birthDate);
  }
  
  const dateToUse = referenceDate || new Date();
  let age = dateToUse.getFullYear() - birthDateObj.getFullYear();
  
  // Check if birthday has occurred this year
  const m = dateToUse.getMonth() - birthDateObj.getMonth();
  if (m < 0 || (m === 0 && dateToUse.getDate() < birthDateObj.getDate())) {
    age--;
  }
  
  // Add 1 year per user request
  return age + 1;
}
