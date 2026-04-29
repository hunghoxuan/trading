/**
 * Formats a date value into a human-readable string, respecting the user's selected timezone.
 * Uses localStorage "ui_display_timezone" as the source of truth.
 */
export function showDateTime(val) {
  if (!val) return "-";
  const date = new Date(val);
  if (isNaN(date.getTime())) return String(val);

  const tz = localStorage.getItem("ui_display_timezone") || "UTC";
  
  try {
    // Use Intl.DateTimeFormat to convert the date to the desired timezone
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = fmt.formatToParts(date);
    const getPart = (type) => parts.find(p => p.type === type)?.value;

    const d = getPart('day');
    const m = getPart('month');
    const y = getPart('year');
    const hh = getPart('hour');
    const mm = getPart('minute');

    // For relative date comparison (Today/Yesterday), we also need to get "now" in that same timezone
    const now = new Date();
    const fmtShort = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const nowParts = fmtShort.formatToParts(now);
    const todayStr = `${nowParts.find(p => p.type === 'day').value}.${nowParts.find(p => p.type === 'month').value}.${nowParts.find(p => p.type === 'year').value}`;
    
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yestParts = fmtShort.formatToParts(yesterday);
    const yesterdayStr = `${yestParts.find(p => p.type === 'day').value}.${yestParts.find(p => p.type === 'month').value}.${yestParts.find(p => p.type === 'year').value}`;

    const targetStr = `${d}.${m}.${y}`;

    let datePart = "";
    if (targetStr === todayStr) {
      datePart = "Today";
    } else if (targetStr === yesterdayStr) {
      datePart = "Yesterday";
    } else if (y === nowParts.find(p => p.type === 'year').value) {
      datePart = `${d}.${m}`;
    } else {
      datePart = `${d}.${m}.${y}`;
    }

    return `${datePart} ${hh}:${mm}`;
  } catch (err) {
    console.error("Format error with timezone:", tz, err);
    // Fallback to basic UTC if timezone is invalid
    return date.toISOString().replace('T', ' ').substring(0, 16);
  }
}

/**
 * Compares two dates to see if they fall on the same day in the user's selected timezone.
 */
export function isSameDay(aMs, bMs) {
  const tz = localStorage.getItem("ui_display_timezone") || "UTC";
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return fmt.format(new Date(aMs)) === fmt.format(new Date(bMs));
  } catch (e) {
    const a = new Date(aMs);
    const b = new Date(bMs);
    return a.getUTCDate() === b.getUTCDate() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  }
}
