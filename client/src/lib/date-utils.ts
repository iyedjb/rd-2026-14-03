/**
 * Centralized date utilities to handle date parsing and normalization
 * across the application, preventing timezone-related bugs.
 */

/**
 * Safely parse dates from various formats without timezone issues.
 * Creates dates at local noon to avoid timezone shifts to previous day.
 * 
 * @param dateValue - Can be a Date, ISO string, Firestore Timestamp, or other date-like value
 * @returns Date object or null if invalid
 */
export function parseDateValue(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  try {
    let date: Date;
    
    // Handle Date objects
    if (dateValue instanceof Date) {
      date = dateValue;
    }
    // Handle Firestore Timestamp-like objects
    else if (dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    }
    // Handle ISO strings or other string formats
    else if (typeof dateValue === 'string') {
      // For ISO date strings (YYYY-MM-DD), create date at local noon to avoid timezone shifts
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [year, month, day] = dateValue.split(/[-T]/);
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
      } else {
        date = new Date(dateValue);
      }
    }
    // Try to convert whatever it is to a date
    else {
      date = new Date(dateValue);
    }
    
    // Validate and return
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Normalize date fields in an object (like a destination)
 * Converts date-like values to proper Date objects
 */
export function normalizeDateFields<T extends Record<string, any>>(
  obj: T,
  dateFields: (keyof T)[]
): T {
  const normalized = { ...obj };
  
  dateFields.forEach(field => {
    if (normalized[field]) {
      const parsedDate = parseDateValue(normalized[field]);
      if (parsedDate) {
        normalized[field] = parsedDate as any;
      }
    }
  });
  
  return normalized;
}
