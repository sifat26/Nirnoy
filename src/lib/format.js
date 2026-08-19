/** Small presentation helpers shared across pages. */

/** "5m 12s" — for elapsed time on results/history. */
export function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** "04:59" — for the countdown clock while taking an exam. */
export function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Localized date-time, tolerant of null. */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Encouraging verdict for a percentage score. */
export function verdictFor(percentage) {
  if (percentage >= 80) return { label: 'Excellent!', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🏆' };
  if (percentage >= 60) return { label: 'Good Job!', color: 'text-blue-600', bg: 'bg-blue-50', icon: '👍' };
  if (percentage >= 40) return { label: 'Keep Practicing', color: 'text-amber-600', bg: 'bg-amber-50', icon: '📚' };
  return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50', icon: '💪' };
}

/** Color token for a percentage — used by badges/rings. */
export function scoreColor(percentage) {
  if (percentage >= 80) return 'emerald';
  if (percentage >= 60) return 'blue';
  if (percentage >= 40) return 'amber';
  return 'red';
}

export function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}
