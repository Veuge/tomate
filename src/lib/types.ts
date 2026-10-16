export type Phase = 'focus' | 'short_break' | 'long_break';

export const PHASES: Phase[] = ['focus', 'short_break', 'long_break'];

export const PHASE_LABEL: Record<Phase, string> = {
  focus: 'Focus',
  short_break: 'Short break',
  long_break: 'Long break',
};

export interface Tag {
  id: string;
  name: string;
  color: string;
  icon: string;
  archived: boolean;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  /** 1 when the row has local changes not yet pushed to the server. */
  dirty: 0 | 1;
}

export interface Session {
  id: string;
  tag_id: string | null;
  kind: Phase;
  started_at: string;
  ended_at: string;
  planned_seconds: number;
  actual_seconds: number;
  completed: boolean;
  device: string;
  tz: string;
  deleted: boolean;
  updated_at: string;
  dirty: 0 | 1;
}
