import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Session, Tag } from "@/lib/types";

const EMPTY_TAGS: Tag[] = [];
const EMPTY_SESSIONS: Session[] = [];

/** All non-deleted tags (archived included), oldest first. */
export function useTags(): Tag[] {
  return (
    useLiveQuery(async () => (await db.tags.orderBy("updated_at").toArray())
      .filter((t) => !t.deleted)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))) ?? EMPTY_TAGS
  );
}

export function useSessions(): Session[] {
  return useLiveQuery(() => db.sessions.orderBy("started_at").toArray()) ?? EMPTY_SESSIONS;
}
