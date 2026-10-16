import Dexie, { type EntityTable } from 'dexie';
import type { Session, Tag } from './types';

interface Meta {
  key: string;
  value: string;
}

export const db = new Dexie('pomodoro') as Dexie & {
  tags: EntityTable<Tag, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  meta: EntityTable<Meta, 'key'>;
};

db.version(1).stores({
  tags: 'id, dirty, updated_at',
  sessions: 'id, started_at, tag_id, dirty',
  meta: 'key',
});

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.meta.get(key))?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}
