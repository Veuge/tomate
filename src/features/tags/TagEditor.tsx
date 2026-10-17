import { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Search, Trash2 } from 'lucide-react';
import { Button, Sheet, cx } from '@/components/ui';
import type { Tag } from '@/lib/types';
import { deleteTag, saveTag, setTagArchived } from '@/features/sessions/repo';
import { TAG_COLORS, TAG_ICONS, TagIcon } from './palette';

export function TagEditor({ open, tag, onClose }: { open: boolean; tag: Tag | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [icon, setIcon] = useState('circle');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(tag?.name ?? '');
    setColor(tag?.color ?? TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
    setIcon(tag?.icon ?? 'circle');
    setQuery('');
  }, [open, tag]);

  const icons = useMemo(() => Object.keys(TAG_ICONS).filter((n) => n.includes(query.trim().toLowerCase())), [query]);

  const save = async () => {
    if (!name.trim()) return;
    await saveTag({ id: tag?.id, name: name.trim(), color, icon });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={tag ? 'Edit tag' : 'New tag'}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="grid place-items-center h-12 w-12 shrink-0 rounded-2xl"
            style={{ background: `${color}22`, color }}
          >
            <TagIcon name={icon} size={24} />
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tag name"
            maxLength={40}
            className="flex-1 min-w-0 h-12 rounded-xl bg-surface-2 px-4 text-base outline-none focus:ring-2 focus:ring-line"
          />
        </div>

        <div>
          <Label>Color</Label>
          <div className="grid grid-cols-6 gap-2">
            {TAG_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={cx(
                  'aspect-square rounded-xl transition',
                  color === c && 'ring-2 ring-offset-2 ring-offset-surface'
                )}
                style={{ background: c, ['--tw-ring-color' as string]: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <Label>Icon</Label>
          <div className="relative mb-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons"
              className="w-full h-10 rounded-xl bg-surface-2 pl-9 pr-3 text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 max-h-44 overflow-y-auto">
            {icons.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setIcon(n)}
                aria-label={n}
                title={n}
                className={cx(
                  'grid place-items-center aspect-square rounded-xl transition',
                  icon === n ? 'text-white' : 'text-muted hover:bg-surface-2 hover:text-fg'
                )}
                style={icon === n ? { background: color } : undefined}
              >
                <TagIcon name={n} size={18} />
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" variant="primary" className="h-11" disabled={!name.trim()}>
          Save
        </Button>

        {tag && (
          <div className="flex gap-2 -mt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => void setTagArchived(tag.id, !tag.archived).then(onClose)}
            >
              {tag.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              {tag.archived ? 'Unarchive' : 'Archive'}
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              onClick={() => {
                if (confirm(`Delete “${tag.name}”? Its sessions stay in your history as untagged.`)) {
                  void deleteTag(tag.id).then(onClose);
                }
              }}
            >
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        )}
      </form>
    </Sheet>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">{children}</p>;
}
