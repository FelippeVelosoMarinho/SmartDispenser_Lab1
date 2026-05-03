/**
 * Pillar Design System Utilities
 * Helper functions for component development
 */

/**
 * Conditionally join classNames together
 * @param classes - Variable number of class name arguments (strings, undefined, null, or false)
 * @returns Combined class name string
 *
 * @example
 * cn("btn", isActive && "btn-active", "btn-primary")
 * // => "btn btn-active btn-primary"
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format time according to Pillar standards (8:00 AM format)
 * @param date - Date object or time string to format
 * @returns Formatted time string with AM/PM
 *
 * @example
 * formatTime(new Date("2026-04-21T08:00:00"))
 * // => "8:00 AM"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Format dosage with proper units and non-breaking space
 * @param amount - The dosage amount (number or string)
 * @param unit - The unit (mg, tablet, puffs, IU, etc.)
 * @returns Formatted dosage string with non-breaking space
 *
 * @example
 * formatDose(500, "mg")
 * // => "500 mg" (with non-breaking space)
 *
 * formatDose(1, "tablet")
 * // => "1 tablet"
 */
export function formatDose(amount: number | string, unit: string): string {
  return `${amount}\u00A0${unit}`;
}

/**
 * Format duration in a readable way (single units preferred)
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(45)
 * // => "45 minutes"
 *
 * formatDuration(120)
 * // => "2 hours"
 *
 * formatDuration(90)
 * // => "1.5 hours"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  const hours = minutes / 60;
  if (hours % 1 === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${hours.toFixed(1)} hours`;
}

/**
 * Get relative time from now (e.g., "in 25 minutes", "2 hours ago")
 * @param date - Target date
 * @returns Relative time string
 *
 * @example
 * getRelativeTime(new Date(Date.now() + 25 * 60 * 1000))
 * // => "in 25 minutes"
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));

  if (diffMins === 0) {
    return "now";
  } else if (diffMins > 0) {
    // Future
    if (diffMins < 60) {
      return `in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
    }
    const hours = Math.round(diffMins / 60);
    return `in ${hours} hour${hours !== 1 ? "s" : ""}`;
  } else {
    // Past
    const absMins = Math.abs(diffMins);
    if (absMins < 60) {
      return `${absMins} minute${absMins !== 1 ? "s" : ""} ago`;
    }
    const hours = Math.round(absMins / 60);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
}
