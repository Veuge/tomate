import { describe, expect, it } from "vitest";
import type { Session } from "@/lib/types";
import { countByDay, countable, currentStreak, heatmapWeeks, intensity, tagBreakdown } from "./stats";

let n = 0;
function session(start: Date, over: Partial<Session> = {}): Session {
  return {
    id: String(n++),
    tag_id: "a",
    kind: "focus",
    started_at: start.toISOString(),
    ended_at: start.toISOString(),
    planned_seconds: 1500,
    actual_seconds: 1500,
    completed: true,
    device: "web",
    tz: "UTC",
    deleted: false,
    updated_at: start.toISOString(),
    dirty: 0,
    ...over,
  };
}

const d = (day: number, h = 10) => new Date(2026, 9, day, h);

describe("stats", () => {
  const sessions = [
    session(d(10)),
    session(d(12, 9)),
    session(d(12, 23), { tag_id: "b", actual_seconds: 3000 }),
    session(d(13)),
    session(d(13), { completed: false }),
    session(d(13), { kind: "short_break" }),
    session(d(13), { deleted: true }),
  ];

  it("counts only completed focus sessions, bucketed by local day", () => {
    const byDay = countByDay(countable(sessions));
    expect(Object.fromEntries(byDay)).toEqual({ "2026-10-10": 1, "2026-10-12": 2, "2026-10-13": 1 });
  });

  it("filters by tag", () => {
    expect(countable(sessions, "b")).toHaveLength(1);
  });

  it("computes the current streak", () => {
    const byDay = countByDay(countable(sessions));
    expect(currentStreak(byDay, d(13))).toBe(2);
    expect(currentStreak(byDay, d(14))).toBe(2);
    expect(currentStreak(byDay, d(15))).toBe(0);
  });

  it("groups totals per tag", () => {
    expect(tagBreakdown(sessions, null)).toEqual([
      { tagId: "a", count: 3, minutes: 75 },
      { tagId: "b", count: 1, minutes: 50 },
    ]);
    expect(tagBreakdown(sessions, d(13, 0))).toEqual([{ tagId: "a", count: 1, minutes: 25 }]);
  });

  it("builds Monday-first week columns ending on the current week", () => {
    const weeks = heatmapWeeks(d(13), 53);
    expect(weeks).toHaveLength(53);
    expect(weeks[0][0].getDay()).toBe(1);
    const last = weeks[52];
    expect(last.some((x) => x.toDateString() === d(13).toDateString())).toBe(true);
  });

  it("scales intensity by daily goal", () => {
    expect([0, 1, 2, 4, 8, 12].map((c) => intensity(c, 8))).toEqual([0, 1, 2, 3, 4, 4]);
  });
});
