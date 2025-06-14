/**
 * Function to normalize a given date to midnight local time.
 * This ensures consistent date comparisons by removing time-specific values.
 *
 * @param {Date | string} date - The date to be normalized. Can be a Date object or a string representing a date.
 * @returns {Date} - A new Date object with the time set to midnight (00:00:00).
 */
export const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date); // Create a new Date object from the input
  normalized.setHours(0, 0, 0, 0); // Set the time to midnight (00:00:00) for consistent date comparisons
  return normalized; // Return the normalized Date object
};

/**
 * Function to normalize a given date to midnight UTC time.
 * This ensures consistent comparisons with UTC-based timestamps such as those returned by Date.UTC().
 *
 * @param {Date | string} date - The date to be normalized. Can be a Date object or a date string.
 * @returns {number} - The timestamp in milliseconds representing midnight (00:00:00) UTC of the provided date.
 */
export const normalizeDateUTC = (date: Date | string): number => {
  const d = new Date(date); // Convert the input to a Date object
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); // Return the UTC timestamp at midnight
};

/**
 * Function to calculate the date one year from a given base date, subtracting one day.
 *
 * This function is useful for setting a valid date range, ensuring that the calculated
 * date is exactly one year from the given date, minus one day to exclude the last day.
 *
 * @param {Date} today - The base date from which to calculate. This should be a valid JavaScript `Date` object.
 * @returns {Date} - The calculated date that is one year from the base date, minus one day.
 */
export const getOneYearFromToday = (today: Date): Date => {
  const oneYearFromToday = new Date(today); // Create a new Date object based on the provided date
  oneYearFromToday.setFullYear(today.getFullYear() + 1); // Increment the year by 1
  oneYearFromToday.setDate(oneYearFromToday.getDate() - 1); // Subtract 1 day to exclude the very last day

  return oneYearFromToday; // Return the calculated date
};

export const getOneYearFromTodayUTC = (today: Date): number => {
  const oneYear = new Date(Date.UTC(today.getUTCFullYear() + 1, today.getUTCMonth(), today.getUTCDate()));
  oneYear.setUTCDate(oneYear.getUTCDate() - 1); // Subtract 1 day from UTC
  return oneYear.getTime(); // return UTC timestamp
};
