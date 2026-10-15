import { useEffect, useState } from "react";
import { ChevronDown, Pause, Play, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { ConfirmDialog, Segmented, cx } from "@/components/ui";
import { useTooltip } from "@/components/Tooltip";
import { formatClock } from "@/lib/dates";
import { PHASE_LABEL, type Phase } from "@/lib/types";
import { useSettings } from "@/features/settings/store";
import { useTags } from "@/features/sessions/hooks";
import { TagIcon } from "@/features/tags/palette";
import { remaining } from "./engine";
import { useTimer } from "./store";
import { useNow } from "./useNow";
import { Ring } from "./Ring";
import { TagPicker } from "./TagPicker";

const AMBIENT_LABEL = { none: "", white: "White noise", pink: "Pink noise", brown: "Brown noise", rain: "Rain", ticking: "Ticking" };

export function TimerScreen() {
  const { timer, start, pause, stop, skip, selectPhase, setTag } = useTimer();
  const settings = useSettings();
  const tags = useTags();
  const [picking, setPicking] = useState(false);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const now = useNow(timer.status === "running");
  const canStop = timer.phase === "focus" && timer.status !== "idle";
  useEffect(() => setConfirmingStop(false), [timer.startedAt]);

  const left = remaining(timer, now);
  const progress = timer.plannedMs ? left / timer.plannedMs : 0;
  const tag = tags.find((t) => t.id === timer.tagId) ?? null;
  const color = timer.phase === "focus" ? (tag?.color ?? "var(--accent)") : "var(--break)";
  const running = timer.status === "running";
  const interval = Math.max(1, settings.longBreakInterval);
  const done = timer.focusCount % interval;

  return (
    <div className="flex flex-col items-center gap-8 pt-2 md:pt-6">
      <div className="relative flex w-full items-center justify-between sm:justify-center gap-3">
        <Segmented<Phase>
          value={timer.phase}
          onChange={(p) => timer.status === "idle" && selectPhase(p)}
          className={cx("w-full sm:w-auto", timer.status !== "idle" && "opacity-60")}
          options={[
            { value: "focus", label: "Focus" },
            { value: "short_break", label: "Short" },
            { value: "long_break", label: "Long" },
          ]}
        />
        {settings.ambientSound !== "none" && (
          <button
            onClick={() => settings.update({ ambientMuted: !settings.ambientMuted })}
            className="flex items-center gap-2 rounded-xl px-3 h-10 text-sm text-muted hover:text-fg bg-surface-2 shrink-0 sm:absolute sm:right-0"
            aria-label={settings.ambientMuted ? "Unmute background sound" : "Mute background sound"}
          >
            {settings.ambientMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span className="hidden sm:inline">{AMBIENT_LABEL[settings.ambientSound]}</span>
          </button>
        )}
      </div>

      <Ring progress={progress} color={color}>
        <span className="text-sm font-medium text-muted mb-1">{PHASE_LABEL[timer.phase]}</span>
        <span className="text-6xl sm:text-7xl font-semibold tabular-nums tracking-tight">{formatClock(left)}</span>
        <div className="flex gap-1.5 mt-4" aria-label={`${done} of ${interval} focus sessions before long break`}>
          {Array.from({ length: interval }, (_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: i < done ? color : "var(--cell)" }}
            />
          ))}
        </div>
      </Ring>

      <button
        onClick={() => setPicking(true)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface pl-2 pr-3 h-10 text-sm font-medium hover:bg-surface-2"
      >
        <span
          className="grid place-items-center h-6 w-6 rounded-full"
          style={{ background: `${tag?.color ?? "#888888"}22`, color: tag?.color ?? "var(--muted)" }}
        >
          <TagIcon name={tag?.icon ?? "circle"} size={14} />
        </span>
        {tag?.name ?? "No tag"}
        <ChevronDown size={16} className="text-muted" />
      </button>

      <div className="flex items-center gap-6">
        {canStop ? (
          <ControlButton label="Stop" tip="Stop without saving" onClick={() => setConfirmingStop(true)}>
            <Square size={20} fill="currentColor" />
          </ControlButton>
        ) : (
          // Keeps the play button centered when there's nothing to stop.
          <span aria-hidden className="h-14 w-14" />
        )}
        <ControlButton
          label={running ? "Pause" : timer.status === "paused" ? "Resume" : "Start"}
          tip={running ? "Pause" : timer.status === "paused" ? "Resume" : `Start ${PHASE_LABEL[timer.phase].toLowerCase()}`}
          onClick={running ? pause : start}
          className="h-20 w-20 text-white shadow-lg active:scale-95"
          style={{ background: color }}
        >
          {running ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </ControlButton>
        <ControlButton
          label="Skip"
          tip={timer.phase === "focus" ? "Skip to short break" : "Skip to focus"}
          onClick={skip}
        >
          <SkipForward size={22} />
        </ControlButton>
      </div>

      <TagPicker open={picking} onClose={() => setPicking(false)} value={timer.tagId} onChange={setTag} />
      <ConfirmDialog
        // Closes by itself if the session ends (and gets saved) while the dialog is open.
        open={confirmingStop && canStop}
        title="Stop this focus session?"
        message={`Your progress (${formatClock(timer.plannedMs - left)} so far) won't be saved to your history.`}
        confirmLabel="Stop & discard"
        cancelLabel="Keep focusing"
        onCancel={() => setConfirmingStop(false)}
        onConfirm={() => {
          stop();
          setConfirmingStop(false);
        }}
      />
    </div>
  );
}

function ControlButton(p: {
  label: string;
  tip: string;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { triggerProps, tooltip } = useTooltip(p.tip);
  return (
    <span className="relative inline-flex">
      <button
        {...triggerProps}
        // Don't make screen readers say "Pause, Pause" when the tip only repeats the label.
        aria-describedby={p.tip === p.label ? undefined : triggerProps["aria-describedby"]}
        onClick={p.onClick}
        aria-label={p.label}
        style={p.style}
        className={cx(
          "grid place-items-center rounded-full transition",
          p.className ?? "h-14 w-14 bg-surface-2 text-fg hover:bg-line",
        )}
      >
        {p.children}
      </button>
      {tooltip}
    </span>
  );
}
