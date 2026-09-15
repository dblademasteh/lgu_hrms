export const MANILA_TZ = 'Asia/Manila';

/** Calendar date label as seen in Asia/Manila (never browser-local drift). */
export function manilaDateLabel(value) {
  return new Date(value).toLocaleDateString(undefined, { timeZone: MANILA_TZ });
}

/** HH:MM (12h) label as seen in Asia/Manila. */
export function manilaTimeLabel(value) {
  return new Date(value).toLocaleTimeString(undefined, { timeZone: MANILA_TZ, hour: '2-digit', minute: '2-digit' });
}

/** 'YYYY-MM' key for the current Asia/Manila month. */
export function manilaMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: MANILA_TZ, year: 'numeric', month: '2-digit' }).formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}`;
}