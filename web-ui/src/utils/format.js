export function showDateTime(val) {
  if (!val) return "-";
  const date = new Date(val);
  if (isNaN(date.getTime())) return String(val);

  const now = new Date();
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  
  if (y === now.getFullYear()) {
    return `${d}.${m} ${hh}:${mm}`;
  }
  return `${d}.${m}.${y} ${hh}:${mm}`;
}
