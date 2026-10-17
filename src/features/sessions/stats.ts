import { addDays, startOfWeek, subWeeks } from 'date-fns';
import { dayKey } from '@/lib/dates';
import type { Session } from '@/lib/types';

/** Sessions that count toward stats: completed, not deleted, focus. */
export function countable(sessions: Session[], tagId: string | null = null): Session[] {
  return sessions.filter(
    (s) => s.kind === 'focus' && s.completed && !s.deleted && (tagId === null || s.tag_id === tagId)
  );
}

export function countByDay(sessions: Session[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(s.started_at);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

/** Columns of 7 days (Mon→Sun), oldest first, ending with the week containing `today`. */
export function heatmapWeeks(today: Date, weeks = 53): Date[][] {
  const first = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 1 });
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
}

/** 0 = empty, 1–4 = increasing intensity relative to the daily goal. */
export function intensity(count: number, goal: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  const ratio = count / Math.max(1, goal);
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 1) return 3;
  return 4;
}

/** Consecutive days with at least one session, ending today (or yesterday if today is empty). */
export function currentStreak(byDay: Map<string, number>, today: Date): number {
  let day = today;
  if (!byDay.get(dayKey(day))) day = addDays(day, -1);
  let n = 0;
  while (byDay.get(dayKey(day))) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export interface TagTotal {
  tagId: string | null;
  count: number;
  minutes: number;
}

export function tagBreakdown(sessions: Session[], since: Date | null): TagTotal[] {
  const totals = new Map<string | null, TagTotal>();
  for (const s of countable(sessions)) {
    if (since && new Date(s.started_at) < since) continue;
    const t = totals.get(s.tag_id) ?? { tagId: s.tag_id, count: 0, minutes: 0 };
    t.count++;
    t.minutes += s.actual_seconds / 60;
    totals.set(s.tag_id, t);
  }
  return [...totals.values()].sort((a, b) => b.count - a.count);
}
