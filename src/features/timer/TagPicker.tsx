import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { Sheet, cx } from "@/components/ui";
import { TagIcon } from "@/features/tags/palette";
import { useTags } from "@/features/sessions/hooks";

export function TagPicker({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const tags = useTags().filter((t) => !t.archived);
  const pick = (id: string | null) => {
    onChange(id);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Choose a tag">
      <div className="flex flex-col gap-1">
        <Row selected={value === null} onClick={() => pick(null)} color="var(--muted)" icon="circle" name="No tag" />
        {tags.map((t) => (
          <Row key={t.id} selected={value === t.id} onClick={() => pick(t.id)} color={t.color} icon={t.icon} name={t.name} />
        ))}
        <Link
          to="/tags?new=1"
          onClick={onClose}
          className="mt-2 flex items-center gap-3 rounded-xl px-3 h-11 text-sm text-muted hover:text-fg hover:bg-surface-2"
        >
          <Plus size={18} /> New tag
        </Link>
      </div>
    </Sheet>
  );
}

function Row(p: { selected: boolean; onClick: () => void; color: string; icon: string; name: string }) {
  return (
    <button
      onClick={p.onClick}
      className={cx("flex items-center gap-3 rounded-xl px-3 h-11 text-sm text-left", p.selected ? "bg-surface-2" : "hover:bg-surface-2")}
    >
      <span className="grid place-items-center h-7 w-7 rounded-lg" style={{ background: `${p.color}22`, color: p.color }}>
        <TagIcon name={p.icon} size={16} />
      </span>
      <span className="flex-1 truncate">{p.name}</span>
      {p.selected && <Check size={18} className="text-muted" />}
    </button>
  );
}
