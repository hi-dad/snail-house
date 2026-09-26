import { DAY_MS, HOUR_MS } from '../game/constants';

const MIN_MS = 60 * 1000;

/** Countdown text: "1d 16h", "5h 20m", "12m". Rounds up so a fresh run reads 40h. */
export function formatSafety(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / MIN_MS - 1e-6));
  const d = Math.floor(totalMin / (24 * 60));
  const h = Math.floor((totalMin % (24 * 60)) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "Streak: 47 days" (whole days survived). */
export function formatStreak(ms: number): string {
  const d = Math.floor(Math.max(0, ms) / DAY_MS); // the device clock can go backwards
  return `Streak: ${d} ${d === 1 ? 'day' : 'days'}`;
}

/** "12 strawberries" */
export const formatTokens = (n: number) => `${n} ${n === 1 ? 'strawberry' : 'strawberries'}`;

/** "47 days, 11 hours" */
export function formatSurvived(ms: number): string {
  const d = Math.floor(ms / DAY_MS);
  const h = Math.floor((ms % DAY_MS) / HOUR_MS);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (d === 0) {
    const m = Math.floor((ms % HOUR_MS) / MIN_MS);
    return h === 0 ? plural(m, 'minute') : `${plural(h, 'hour')}, ${plural(m, 'minute')}`;
  }
  return `${plural(d, 'day')}, ${plural(h, 'hour')}`;
}
