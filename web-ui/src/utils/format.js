export function showDateTime(val) {
  if (!val) return "-";
  const date = new Date(val);
  if (isNaN(date.getTime())) return String(val);

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  // If Time is < 30 mins from now, display "xxx mins ago"
  if (diffMins >= 0 && diffMins < 30) {
    if (diffMins === 0) return "Just now";
    return `${diffMins} mins ago`;
  }

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  let datePart = "";
  if (isToday) {
    datePart = "Today";
  } else if (isYesterday) {
    datePart = "Yesterday";
  } else {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    datePart = `${d}/${m}/${y}`;
  }

  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  
  return `${datePart} ${hh}:${mm}`;
}
