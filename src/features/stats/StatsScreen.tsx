import { useMemo, useState } from 'react';
import { format, parseISO, startOfWeek } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Card, SectionTitle, cx } from '@/components/ui';
import { dayKey, formatMinutes } from '@/lib/dates';
import { PHASE_LABEL } from '@/lib/types';
import { useSettings } from '@/features/settings/store';
import { useSessions, useTags } from '@/features/sessions/hooks';
import { countByDay, countable, currentStreak } from '@/features/sessions/stats';
import { deleteSession } from '@/features/sessions/repo';
import { TagIcon } from '@/features/tags/palette';
import { SyncBadge } from '@/features/auth/SyncBadge';
import { Heatmap, HeatmapLegend } from './Heatmap';
import { TagBreakdown } from './TagBreakdown';

export function StatsScreen() {
  const sessions = useSessions();
  const tags = useTags();
  const goal = useSettings((s) => s.dailyGoal);
  const [tagId, setTagId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);

  const filtered = useMemo(() => countable(sessions, tagId), [sessions, tagId]);
  const byDay = useMemo(() => countByDay(filtered), [filtered]);
  const tag = tags.find((t) => t.id === tagId);
  const color = tag?.color ?? 'var(--accent)';

  const today = dayKey(new Date());
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const todayList = filtered.filter((s) => dayKey(s.started_at) === today);
  const weekList = filtered.filter((s) => new Date(s.started_at) >= weekStart);
  const minutes = (l: typeof filtered) => l.reduce((m, s) => m + s.actual_seconds / 60, 0);

  const daySessions = useMemo(
    () =>
      day
        ? sessions.filter(
            (s) => !s.deleted && s.kind === 'focus' && dayKey(s.started_at) === day && (!tagId || s.tag_id === tagId)
          )
        : [],
    [sessions, day, tagId]
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stats</h1>
        <SyncBadge />
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Today" value={todayList.length} sub={formatMinutes(minutes(todayList))} />
        <Stat label="This week" value={weekList.length} sub={formatMinutes(minutes(weekList))} />
        <Stat label="Streak" value={currentStreak(byDay, new Date())} sub="days" />
        <Stat label="All time" value={filtered.length} sub={formatMinutes(minutes(filtered))} />
      </div>

      <Card>
        <SectionTitle right={<HeatmapLegend color={color} goal={goal} />}>Focus sessions</SectionTitle>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 mb-4">
          <Chip active={tagId === null} onClick={() => setTagId(null)} color="var(--accent)">
            All
          </Chip>
          {tags
            .filter((t) => !t.archived)
            .map((t) => (
              <Chip key={t.id} active={tagId === t.id} onClick={() => setTagId(t.id)} color={t.color}>
                <TagIcon name={t.icon} size={14} />
                {t.name}
              </Chip>
            ))}
        </div>
        <Heatmap
          byDay={byDay}
          goal={goal}
          color={color}
          selected={day}
          onSelect={(k) => setDay(k === day ? null : k)}
        />

        {day && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm font-medium mb-2">
              {format(
                parseISO(day),
                day.startsWith(String(new Date().getFullYear())) ? 'EEEE, MMMM d' : 'EEEE, MMMM d, yyyy'
              )}
            </p>
            {daySessions.length === 0 ? (
              <p className="text-sm text-muted">No focus sessions.</p>
            ) : (
              <ul className="flex flex-col">
                {daySessions.map((s) => {
                  const t = tags.find((x) => x.id === s.tag_id);
                  return (
                    <li key={s.id} className="group flex items-center gap-3 py-2 text-sm">
                      <span className="h-2 w-2 rounded-full" style={{ background: t?.color ?? 'var(--muted)' }} />
                      <span className="tabular-nums text-muted w-24 shrink-0">
                        {format(new Date(s.started_at), 'HH:mm')}–{format(new Date(s.ended_at), 'HH:mm')}
                      </span>
                      <span className="flex-1 truncate">
                        {t?.name ?? 'No tag'}
                        {!s.completed && <span className="text-muted"> · partial</span>}
                      </span>
                      <span className="tabular-nums text-muted">{formatMinutes(s.actual_seconds / 60)}</span>
                      <button
                        onClick={() =>
                          confirm(`Delete this ${PHASE_LABEL[s.kind].toLowerCase()} session?`) &&
                          void deleteSession(s.id)
                        }
                        aria-label="Delete session"
                        className="text-muted hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Card>

      <TagBreakdown sessions={sessions} tags={tags} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <Card className="p-4 sm:p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
      <p className="text-xs text-muted mt-0.5">{sub}</p>
    </Card>
  );
}

function Chip(p: { active: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={p.onClick}
      className={cx(
        'flex items-center gap-1.5 shrink-0 rounded-full px-3 h-8 text-sm font-medium border transition',
        p.active ? 'border-transparent text-fg' : 'border-line text-muted hover:text-fg'
      )}
      style={p.active ? { background: `color-mix(in srgb, ${p.color} 18%, transparent)` } : undefined}
    >
      {p.children}
    </button>
  );
}
