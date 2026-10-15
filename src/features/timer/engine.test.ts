import { describe, expect, it } from "vitest";
import { initialState, pause, remaining, skip, start, stop, tick, type TimerConfig, type TimerState } from "./engine";

const MIN = 60_000;
const cfg: TimerConfig = {
  focusMs: 25 * MIN,
  shortMs: 5 * MIN,
  longMs: 15 * MIN,
  longBreakInterval: 4,
  autoStartFocus: true,
  autoStartBreaks: true,
};

function runToEnd(s: TimerState, now: number) {
  const started = start(s, now);
  return tick(started, cfg, started.endsAt!);
}

describe("timer engine", () => {
  it("cycles focus → short ×3 → long → focus", () => {
    let s = initialState(cfg);
    let now = 0;
    const phases: string[] = [];
    for (let i = 0; i < 9; i++) {
      phases.push(s.phase);
      const t = runToEnd(s, now);
      now = t.finished!.endedAt;
      s = t.state;
    }
    expect(phases).toEqual([
      "focus", "short_break", "focus", "short_break", "focus", "short_break", "focus", "long_break", "focus",
    ]);
  });

  it("auto-starts the next phase when enabled", () => {
    const t = runToEnd(initialState(cfg), 0);
    expect(t.finished).toMatchObject({ phase: "focus", completed: true, actualMs: 25 * MIN });
    expect(t.state.phase).toBe("short_break");
    expect(t.state.status).toBe("running");
  });

  it("waits for manual start when auto-start is off", () => {
    const manual = { ...cfg, autoStartBreaks: false };
    const s = start(initialState(manual), 0);
    const t = tick(s, manual, s.endsAt!);
    expect(t.state).toMatchObject({ phase: "short_break", status: "idle", remainingMs: 5 * MIN });
  });

  it("does not finish before the end time", () => {
    const s = start(initialState(cfg), 0);
    expect(tick(s, cfg, 25 * MIN - 1).finished).toBeNull();
  });

  it("pauses and resumes without losing time", () => {
    let s = start(initialState(cfg), 0);
    s = pause(s, 10 * MIN);
    expect(remaining(s, 99 * MIN)).toBe(15 * MIN);
    s = start(s, 20 * MIN);
    expect(s.endsAt).toBe(35 * MIN);
    const t = tick(s, cfg, 35 * MIN);
    expect(t.finished).toMatchObject({ startedAt: 0, endedAt: 35 * MIN, completed: true });
  });

  it("completes once after resuming past endsAt, without counting closed time", () => {
    const s = start(initialState(cfg), 0);
    const reopenedAt = 3 * 60 * MIN;
    const t = tick(s, cfg, reopenedAt);
    expect(t.finished?.endedAt).toBe(25 * MIN);
    expect(t.state.phase).toBe("short_break");
    expect(t.state.endsAt).toBe(reopenedAt + 5 * MIN);
    expect(tick(t.state, cfg, reopenedAt + 1).finished).toBeNull();
  });

  it("skip records a partial session and does not count toward long break", () => {
    let s = start(initialState(cfg), 0);
    const t = skip(s, cfg, 10 * MIN);
    expect(t.finished).toMatchObject({ completed: false, actualMs: 10 * MIN });
    expect(t.state).toMatchObject({ phase: "short_break", status: "idle", focusCount: 0 });
    s = initialState(cfg);
    expect(skip(s, cfg, 0).finished).toBeNull();
  });

  it("stop discards the focus session without finishing it", () => {
    // One completed focus first, so we can check the long-break count survives.
    let s = runToEnd(initialState({ ...cfg, autoStartBreaks: false }), 0).state;
    s = skip(s, cfg, 0).state; // skip the (unstarted) break → focus
    s = start(s, 0);
    s = stop(s, cfg);
    expect(s).toMatchObject({ phase: "focus", status: "idle", remainingMs: 25 * MIN, startedAt: null, focusCount: 1 });
    // Nothing is left to complete later.
    expect(tick(s, cfg, 99 * MIN).finished).toBeNull();
  });
});
