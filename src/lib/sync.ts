import { create } from "zustand";
import type Dexie from "dexie";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { db, getMeta, setMeta } from "./db";
import { supabase } from "./supabase";
import type { Session, Tag } from "./types";
import { pickSettings, useSettings } from "@/features/settings/store";

/**
 * Offline-first sync. Every local write marks its row `dirty`; syncNow() pushes
 * dirty rows, then pulls everything the server changed since the last pull
 * (by the server-assigned `synced_at` cursor). Conflicts: newest `updated_at` wins.
 */

type TableName = "tags" | "sessions";
type Row = Tag | Session;

interface SyncStatus {
  state: "local" | "idle" | "syncing" | "error";
  lastSyncedAt: string | null;
  error: string | null;
}

export const useSyncStatus = create<SyncStatus>(() => ({
  state: supabase ? "idle" : "local",
  lastSyncedAt: null,
  error: null,
}));

function toLocal(remote: Record<string, unknown>): Row {
  const { user_id: _u, synced_at: _s, ...rest } = remote;
  return { ...rest, dirty: 0 } as unknown as Row;
}

async function merge(table: TableName, rows: Record<string, unknown>[]): Promise<void> {
  const t = db[table] as unknown as Dexie.Table<Row, string>;
  await db.transaction("rw", t, async () => {
    for (const remote of rows) {
      const incoming = toLocal(remote);
      const local = await t.get(incoming.id);
      if (!local || !local.dirty || local.updated_at <= incoming.updated_at) await t.put(incoming);
    }
  });
}

async function push(table: TableName): Promise<void> {
  const t = db[table] as unknown as Dexie.Table<Row, string>;
  const rows = await t.where("dirty").equals(1).toArray();
  if (!rows.length) return;
  const payload = rows.map(({ dirty: _d, ...r }) => r);
  const { error } = await supabase!.from(table).upsert(payload);
  if (error) throw error;
  await db.transaction("rw", t, async () => {
    for (const r of rows) {
      const cur = await t.get(r.id);
      // Only clear the flag if the row wasn't edited again while we were pushing.
      if (cur && cur.updated_at === r.updated_at) await t.update(r.id, { dirty: 0 } as Partial<Row>);
    }
  });
}

async function pull(table: TableName): Promise<void> {
  const key = `pulled:${table}`;
  let cursor = (await getMeta(key)) ?? "1970-01-01T00:00:00Z";
  for (;;) {
    const { data, error } = await supabase!
      .from(table)
      .select("*")
      .gt("synced_at", cursor)
      .order("synced_at")
      .limit(1000);
    if (error) throw error;
    if (!data.length) break;
    await merge(table, data);
    cursor = data[data.length - 1].synced_at as string;
    await setMeta(key, cursor);
    if (data.length < 1000) break;
  }
}

async function syncSettings(): Promise<void> {
  const local = pickSettings(useSettings.getState());
  const { data, error } = await supabase!.from("settings").select("data, updated_at").maybeSingle();
  if (error) throw error;
  if (data && data.updated_at > local.updatedAt) {
    useSettings.getState().hydrate({ ...data.data, updatedAt: data.updated_at });
  } else if (!data || local.updatedAt > data.updated_at) {
    const { error: e } = await supabase!.from("settings").upsert({ data: local, updated_at: local.updatedAt });
    if (e) throw e;
  }
}

let inflight: Promise<void> | null = null;
let pending: ReturnType<typeof setTimeout> | null = null;

export function syncNow(): Promise<void> {
  if (!supabase) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase!.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !navigator.onLine) return;
    useSyncStatus.setState({ state: "syncing" });
    try {
      if ((await getMeta("userId")) !== userId) {
        // Different account than last time: pull everything again.
        await db.meta.where("key").startsWith("pulled:").delete();
        await setMeta("userId", userId);
      }
      await push("tags");
      await push("sessions");
      await pull("tags");
      await pull("sessions");
      await syncSettings();
      useSyncStatus.setState({ state: "idle", lastSyncedAt: new Date().toISOString(), error: null });
    } catch (e) {
      useSyncStatus.setState({ state: "error", error: e instanceof Error ? e.message : String(e) });
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function scheduleSync(delayMs = 1500): void {
  if (!supabase) return;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    void syncNow();
  }, delayMs);
}

/** Starts background sync: on load, reconnect, focus, and live server changes. */
export function startSync(userId: string): () => void {
  if (!supabase) return () => {};
  void syncNow();
  const onWake = () => document.visibilityState === "visible" && scheduleSync(0);
  const onOnline = () => scheduleSync(0);
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("online", onOnline);
  const channel: RealtimeChannel = supabase.channel(`user:${userId}`);
  for (const table of ["tags", "sessions"] as const) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
      (p) => p.new && "id" in p.new && void merge(table, [p.new]),
    );
  }
  channel.on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => scheduleSync(0));
  channel.subscribe();
  const unsubSettings = useSettings.subscribe((s, prev) => {
    if (s.updatedAt !== prev.updatedAt) scheduleSync();
  });
  return () => {
    document.removeEventListener("visibilitychange", onWake);
    window.removeEventListener("online", onOnline);
    unsubSettings();
    void supabase!.removeChannel(channel);
  };
}
