import { useMemo, useState } from 'react';
import { startOfDay, subDays } from 'date-fns';
import { Card, SectionTitle, Segmented } from '@/components/ui';
import { formatMinutes } from '@/lib/dates';
import type { Session, Tag } from '@/lib/types';
import { tagBreakdown } from '@/features/sessions/stats';
import { TagIcon } from '@/features/tags/palette';

type Range = '7' | '30' | '365' | 'all';

export function TagBreakdown({ sessions, tags }: { sessions: Session[]; tags: Tag[] }) {
  const [range, setRange] = useState<Range>('30');
  const rows = useMemo(() => {
    const since = range === 'all' ? null : startOfDay(subDays(new Date(), Number(range) - 1));
    return tagBreakdown(sessions, since);
  }, [sessions, range]);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const byId = new Map(tags.map((t) => [t.id, t]));

  return (
    <Card>
      <SectionTitle>By tag</SectionTitle>
      <Segmented<Range>
        value={range}
        onChange={setRange}
        className="w-full mb-4"
        options={[
          { value: '7', label: '7 days' },
          { value: '30', label: '30 days' },
          { value: '365', label: 'Year' },
          { value: 'all', label: 'All' },
        ]}
      />
      {rows.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">No completed sessions in this range.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const tag = r.tagId ? byId.get(r.tagId) : undefined;
            const color = tag?.color ?? '#9b9ba4';
            return (
              <li key={r.tagId ?? 'none'} className="flex items-center gap-3">
                <span
                  className="grid place-items-center h-9 w-9 shrink-0 rounded-xl"
                  style={{ background: `${color}22`, color }}
                >
                  <TagIcon name={tag?.icon ?? 'circle'} size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{tag?.name ?? (r.tagId ? 'Deleted tag' : 'No tag')}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      <span className="text-fg font-medium">{r.count}</span> · {formatMinutes(r.minutes)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-cell overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(r.count / max) * 100}%`, background: color }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
