import { db } from "@/lib/db";
import { uuid } from "@/lib/uuid";
import type { Session, Tag } from "@/lib/types";
import { scheduleSync } from "@/lib/sync";
import type { FinishedPhase } from "@/features/timer/engine";

const now = () => new Date().toISOString();

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Mac/.test(ua)) return "macos";
  if (/Windows/.test(ua)) return "windows";
  return "web";
}

export async function recordSession(f: FinishedPhase): Promise<void> {
  // Ignore accidental taps: partial sessions under a minute aren't worth keeping.
  if (!f.completed && f.actualMs < 60_000) return;
  const row: Session = {
    id: uuid(),
    tag_id: f.tagId,
    kind: f.phase,
    started_at: new Date(f.startedAt).toISOString(),
    ended_at: new Date(f.endedAt).toISOString(),
    planned_seconds: Math.round(f.plannedMs / 1000),
    actual_seconds: Math.round(f.actualMs / 1000),
    completed: f.completed,
    device: deviceName(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    deleted: false,
    updated_at: now(),
    dirty: 1,
  };
  await db.sessions.put(row);
  scheduleSync();
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.update(id, { deleted: true, updated_at: now(), dirty: 1 });
  scheduleSync();
}

export async function saveTag({ id, ...fields }: Pick<Tag, "name" | "color" | "icon"> & { id?: string }): Promise<string> {
  const ts = now();
  const existing = id ? await db.tags.get(id) : undefined;
  const row: Tag = existing
    ? { ...existing, ...fields, updated_at: ts, dirty: 1 }
    : { ...fields, id: uuid(), archived: false, deleted: false, created_at: ts, updated_at: ts, dirty: 1 };
  await db.tags.put(row);
  scheduleSync();
  return row.id;
}

export async function setTagArchived(id: string, archived: boolean): Promise<void> {
  await db.tags.update(id, { archived, updated_at: now(), dirty: 1 });
  scheduleSync();
}

export async function deleteTag(id: string): Promise<void> {
  await db.tags.update(id, { deleted: true, updated_at: now(), dirty: 1 });
  scheduleSync();
}
