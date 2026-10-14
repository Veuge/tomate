import type { Phase } from "@/lib/types";

/** Pure Pomodoro state machine. All time math is timestamp based (ms since epoch). */

export interface TimerConfig {
  focusMs: number;
  shortMs: number;
  longMs: number;
  longBreakInterval: number;
  autoStartFocus: boolean;
  autoStartBreaks: boolean;
}

export interface TimerState {
  phase: Phase;
  status: "idle" | "running" | "paused";
  /** Duration of the current phase, fixed when the phase begins. */
  plannedMs: number;
  /** Remaining time while idle or paused. */
  remainingMs: number;
  /** Absolute end time while running. */
  endsAt: number | null;
  /** First time the current phase was started. */
  startedAt: number | null;
  /** Focus sessions completed since the last long break. */
  focusCount: number;
  tagId: string | null;
}

export interface FinishedPhase {
  phase: Phase;
  startedAt: number;
  endedAt: number;
  plannedMs: number;
  actualMs: number;
  completed: boolean;
  tagId: string | null;
}

export interface Transition {
  state: TimerState;
  finished: FinishedPhase | null;
}

export function durationOf(phase: Phase, cfg: TimerConfig): number {
  return phase === "focus" ? cfg.focusMs : phase === "short_break" ? cfg.shortMs : cfg.longMs;
}

export function initialState(cfg: TimerConfig, tagId: string | null = null): TimerState {
  return idleIn("focus", cfg, 0, tagId);
}

function idleIn(phase: Phase, cfg: TimerConfig, focusCount: number, tagId: string | null): TimerState {
  const plannedMs = durationOf(phase, cfg);
  return { phase, status: "idle", plannedMs, remainingMs: plannedMs, endsAt: null, startedAt: null, focusCount, tagId };
}

export function remaining(s: TimerState, now: number): number {
  return s.status === "running" && s.endsAt !== null ? Math.max(0, s.endsAt - now) : s.remainingMs;
}

export function start(s: TimerState, now: number): TimerState {
  if (s.status === "running") return s;
  return { ...s, status: "running", endsAt: now + s.remainingMs, startedAt: s.startedAt ?? now };
}

export function pause(s: TimerState, now: number): TimerState {
  if (s.status !== "running") return s;
  return { ...s, status: "paused", remainingMs: remaining(s, now), endsAt: null };
}

/** Discard progress and return to the beginning of the current phase. */
export function reset(s: TimerState, cfg: TimerConfig): TimerState {
  return idleIn(s.phase, cfg, s.focusCount, s.tagId);
}

/** Manually choose a phase (only meaningful when not running). */
export function selectPhase(s: TimerState, phase: Phase, cfg: TimerConfig): TimerState {
  return idleIn(phase, cfg, s.focusCount, s.tagId);
}

/** Re-apply config durations to an idle timer (e.g. after settings changed). */
export function applyConfig(s: TimerState, cfg: TimerConfig): TimerState {
  return s.status === "idle" ? idleIn(s.phase, cfg, s.focusCount, s.tagId) : s;
}

export function setTag(s: TimerState, tagId: string | null): TimerState {
  return { ...s, tagId };
}

function nextPhase(s: TimerState, cfg: TimerConfig, focusCompleted: boolean): { phase: Phase; focusCount: number } {
  if (s.phase !== "focus") return { phase: "focus", focusCount: s.phase === "long_break" ? 0 : s.focusCount };
  const focusCount = focusCompleted ? s.focusCount + 1 : s.focusCount;
  const interval = Math.max(1, cfg.longBreakInterval);
  const isLong = focusCompleted && focusCount > 0 && focusCount % interval === 0;
  return { phase: isLong ? "long_break" : "short_break", focusCount };
}

function advance(s: TimerState, cfg: TimerConfig, focusCompleted: boolean, now: number, allowAuto: boolean): TimerState {
  const { phase, focusCount } = nextPhase(s, cfg, focusCompleted);
  const next = idleIn(phase, cfg, focusCount, s.tagId);
  const auto = allowAuto && (phase === "focus" ? cfg.autoStartFocus : cfg.autoStartBreaks);
  // Auto-started phases begin "now", so time the app was closed is never counted.
  return auto ? start(next, now) : next;
}

/** Advance the clock. Completes the current phase if its end time has passed. */
export function tick(s: TimerState, cfg: TimerConfig, now: number): Transition {
  if (s.status !== "running" || s.endsAt === null || now < s.endsAt) return { state: s, finished: null };
  const finished: FinishedPhase = {
    phase: s.phase,
    startedAt: s.startedAt ?? s.endsAt - s.plannedMs,
    endedAt: s.endsAt,
    plannedMs: s.plannedMs,
    actualMs: s.plannedMs,
    completed: true,
    tagId: s.tagId,
  };
  return { state: advance(s, cfg, true, now, true), finished };
}

/** Skip to the next phase. A started phase is reported as not completed. */
export function skip(s: TimerState, cfg: TimerConfig, now: number): Transition {
  const left = remaining(s, now);
  const finished: FinishedPhase | null =
    s.startedAt === null
      ? null
      : {
          phase: s.phase,
          startedAt: s.startedAt,
          endedAt: now,
          plannedMs: s.plannedMs,
          actualMs: s.plannedMs - left,
          completed: false,
          tagId: s.tagId,
        };
  return { state: advance(s, cfg, false, now, false), finished };
}
