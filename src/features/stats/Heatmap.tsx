import { useEffect, useMemo, useRef } from "react";
import { format, isAfter } from "date-fns";
import { cx } from "@/components/ui";
import { dayKey } from "@/lib/dates";
import { heatmapWeeks, intensity } from "@/features/sessions/stats";

const LEVEL_MIX = [0, 30, 55, 80, 100];

export function levelColor(color: string, level: number): string {
  return level === 0 ? "var(--cell)" : `color-mix(in srgb, ${color} ${LEVEL_MIX[level]}%, var(--cell))`;
}

export function Heatmap({
  byDay,
  goal,
  color,
  selected,
  onSelect,
}: {
  byDay: Map<string, number>;
  goal: number;
  color: string;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const today = new Date();
  const weeks = useMemo(() => heatmapWeeks(today, 53), [dayKey(today)]);
  const scroller = useRef<HTMLDivElement>(null);

  // Start scrolled to the current week on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <div className="flex gap-2">
      <div className="grid grid-rows-[14px_repeat(7,var(--c))] gap-[3px] text-[10px] text-muted pt-0 [--c:12px]">
        <span />
        {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
          <span key={i} className="leading-[12px]">{d}</span>
        ))}
      </div>
      <div ref={scroller} className="overflow-x-auto no-scrollbar flex-1">
        <div className="flex gap-[3px] w-max">
          {weeks.map((week, w) => {
            const first = week[0];
            const showMonth = first.getDate() <= 7;
            return (
              <div key={w} className="flex flex-col gap-[3px]">
                <span className="h-[14px] text-[10px] text-muted whitespace-nowrap leading-none">
                  {showMonth ? format(first, "MMM") : ""}
                </span>
                {week.map((day) => {
                  const key = dayKey(day);
                  const future = isAfter(day, today);
                  const count = byDay.get(key) ?? 0;
                  return (
                    <button
                      key={key}
                      disabled={future}
                      onClick={() => onSelect(key)}
                      title={`${count} session${count === 1 ? "" : "s"} · ${format(day, "EEE, MMM d")}`}
                      aria-label={`${count} sessions on ${format(day, "MMMM d, yyyy")}`}
                      className={cx(
                        "h-3 w-3 rounded-[3px] transition-transform hover:scale-125",
                        future && "opacity-0",
                        selected === key && "ring-2 ring-fg ring-offset-1 ring-offset-surface",
                      )}
                      style={{ background: levelColor(color, intensity(count, goal)) }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function HeatmapLegend({ color, goal }: { color: string; goal: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted">
      Less
      {[0, 1, 2, 3, 4].map((l) => (
        <span key={l} className="h-3 w-3 rounded-[3px]" style={{ background: levelColor(color, l) }} />
      ))}
      More
      <span className="ml-2 hidden sm:inline">· goal {goal}/day</span>
    </div>
  );
}
