import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { Button, Card, SectionTitle } from '@/components/ui';
import type { Tag } from '@/lib/types';
import { formatMinutes } from '@/lib/dates';
import { useSessions, useTags } from '@/features/sessions/hooks';
import { tagBreakdown } from '@/features/sessions/stats';
import { TagIcon } from './palette';
import { TagEditor } from './TagEditor';

export function TagsScreen() {
  const tags = useTags();
  const sessions = useSessions();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Tag | null>(null);
  const creating = params.get('new') === '1';
  const totals = useMemo(() => new Map(tagBreakdown(sessions, null).map((t) => [t.tagId, t])), [sessions]);

  const active = tags.filter((t) => !t.archived);
  const archived = tags.filter((t) => t.archived);

  const close = () => {
    setEditing(null);
    if (creating) setParams({}, { replace: true });
  };

  const list = (items: Tag[]) => (
    <Card className="p-1.5 sm:p-1.5">
      {items.map((t) => {
        const total = totals.get(t.id);
        return (
          <button
            key={t.id}
            onClick={() => setEditing(t)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-2"
          >
            <span
              className="grid place-items-center h-10 w-10 rounded-xl"
              style={{ background: `${t.color}22`, color: t.color }}
            >
              <TagIcon name={t.icon} size={20} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate font-medium">{t.name}</span>
              <span className="block text-xs text-muted">
                {total ? `${total.count} sessions · ${formatMinutes(total.minutes)}` : 'No sessions yet'}
              </span>
            </span>
            <ChevronRight size={18} className="text-muted" />
          </button>
        );
      })}
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tags</h1>
        <Button variant="primary" onClick={() => setParams({ new: '1' })}>
          <Plus size={16} /> New tag
        </Button>
      </header>

      {active.length ? (
        list(active)
      ) : (
        <Card className="text-center py-10">
          <p className="font-medium">No tags yet</p>
          <p className="text-sm text-muted mt-1">Tags group your focus sessions — e.g. Work, Study, Reading.</p>
        </Card>
      )}

      {archived.length > 0 && (
        <section>
          <SectionTitle>Archived</SectionTitle>
          <div className="opacity-70">{list(archived)}</div>
        </section>
      )}

      <TagEditor open={creating || editing !== null} tag={editing} onClose={close} />
    </div>
  );
}
