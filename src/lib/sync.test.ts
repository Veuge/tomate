import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A fake Supabase client that behaves like the real one where it matters here:
 * timestamps come back in Postgres format ("…+00:00", trailing zeros dropped) and every
 * write to `settings` is echoed back as a Realtime event, like the real publication does.
 */
const server = vi.hoisted(() => {
  const state = {
    settings: null as null | { data: unknown; updated_at: string },
    calls: [] as string[],
    realtime: [] as { table: string; cb: (p: { new: unknown }) => void }[],
  };
  const pg = (iso: string) => new Date(iso).toISOString().replace(".000Z", "Z").replace("Z", "+00:00");
  const echo = (table: string, row: unknown) =>
    state.realtime.filter((h) => h.table === table).forEach((h) => queueMicrotask(() => h.cb({ new: row })));

  function from(table: string) {
    const result = () => Promise.resolve({ data: [], error: null });
    const query = {
      gt: () => query,
      order: () => query,
      limit: () => (state.calls.push(`pull ${table}`), result()),
      maybeSingle: () => (state.calls.push(`get ${table}`), Promise.resolve({ data: state.settings, error: null })),
    };
    return {
      select: () => query,
      upsert: (row: { data: unknown; updated_at: string }) => {
        state.calls.push(`upsert ${table}`);
        if (table === "settings") {
          state.settings = { data: row.data, updated_at: pg(row.updated_at) };
          echo("settings", state.settings);
        }
        return Promise.resolve({ error: null });
      },
    };
  }

  const client = {
    from,
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: "u1" } } } }) },
    channel: () => {
      const ch = {
        on: (_t: string, f: { table: string }, cb: (p: { new: unknown }) => void) => {
          state.realtime.push({ table: f.table, cb });
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => Promise.resolve(),
  };
  return { state, client, pg };
});

vi.mock("./supabase", () => ({ supabase: server.client }));

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  },
});
Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true });
Object.assign(globalThis, {
  document: { addEventListener() {}, removeEventListener() {}, visibilityState: "visible" },
  window: { addEventListener() {}, removeEventListener() {}, localStorage: globalThis.localStorage },
});

const { isNewer, startSync, syncNow } = await import("./sync");
const { useSettings } = await import("@/features/settings/store");

const settle = () => new Promise((r) => setTimeout(r, 20));
const upserts = () => server.state.calls.filter((c) => c === "upsert settings").length;

describe("isNewer", () => {
  it("compares instants, not strings", () => {
    expect(isNewer("2026-10-14T10:00:00.123Z", "2026-10-14T10:00:00.123+00:00")).toBe(false);
    expect(isNewer("2026-10-14T10:00:00.123+00:00", "2026-10-14T10:00:00.123Z")).toBe(false);
    expect(isNewer("2026-10-14T10:00:00.500Z", "2026-10-14T10:00:00+00:00")).toBe(true);
    expect(isNewer("2026-10-14T09:00:00Z", "2026-10-14T10:00:00+00:00")).toBe(false);
  });
});

describe("settings sync", () => {
  let stop: () => void;

  beforeEach(async () => {
    stop?.();
    server.state.settings = null;
    server.state.calls.length = 0;
    server.state.realtime.length = 0;
    useSettings.setState({ focusMin: 25, updatedAt: new Date(0).toISOString() });
    stop = startSync("u1");
    await settle();
    server.state.calls.length = 0;
  });

  it("uploads a saved change once, then stays quiet (no echo loop)", async () => {
    useSettings.getState().update({ focusMin: 30 });
    expect(await syncNow()).toEqual({ status: "synced" });
    await settle(); // let the Realtime echo of our own write arrive
    await settle();
    expect(upserts()).toBe(1);

    // The echo must not trigger any network traffic.
    const before = server.state.calls.length;
    await settle();
    expect(server.state.calls.length).toBe(before);

    // Later syncs see equal timestamps in different formats and don't re-upload.
    await syncNow();
    await syncNow();
    expect(upserts()).toBe(1);
    expect(useSettings.getState().focusMin).toBe(30);
  });

  it("applies another device's change from Realtime without a network sync", async () => {
    const handler = server.state.realtime.find((h) => h.table === "settings")!;
    handler.cb({ new: { data: { focusMin: 45 }, updated_at: server.pg(new Date(Date.now() + 1000).toISOString()) } });
    await settle();
    expect(useSettings.getState().focusMin).toBe(45);
    expect(server.state.calls).toEqual([]);
  });

  it("ignores an older Realtime change", async () => {
    useSettings.getState().update({ focusMin: 20 });
    const handler = server.state.realtime.find((h) => h.table === "settings")!;
    handler.cb({ new: { data: { focusMin: 99 }, updated_at: "2020-01-01T00:00:00+00:00" } });
    expect(useSettings.getState().focusMin).toBe(20);
  });

  it("a save made while a sync is running is still uploaded", async () => {
    const running = syncNow();
    useSettings.getState().update({ focusMin: 50 });
    const outcome = await syncNow(); // queued behind the running sync
    await running;
    expect(outcome).toEqual({ status: "synced" });
    expect((server.state.settings?.data as { focusMin: number }).focusMin).toBe(50);
  });
});
