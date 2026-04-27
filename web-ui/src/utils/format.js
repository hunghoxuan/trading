export function showDateTime(val) {
  if (!val) return "-";
  const date = new Date(val);
  if (isNaN(date.getTime())) return String(val);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  
  let datePart = "";
  if (targetDate.getTime() === today.getTime()) {
    datePart = "Today";
  } else if (targetDate.getTime() === yesterday.getTime()) {
    datePart = "Yesterday";
  } else if (y === now.getFullYear()) {
    datePart = `${d}.${m}`;
  } else {
    datePart = `${d}.${m}.${y}`;
  }

  return `${datePart} ${hh}:${mm}`;
}
