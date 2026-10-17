import { useState } from 'react';
import { syncNow, type SyncOutcome } from '@/lib/sync';
import { showToast, updateToast, type Toast } from '@/components/Toast';
import { pickSettings, useSettings, type Settings } from './store';

/**
 * Local, unsaved edits on top of the saved settings. Only fields the user touched are
 * kept, so values that change underneath (e.g. synced from another device) still show
 * through and aren't overwritten on save.
 */
export function useSettingsDraft() {
  const saved = useSettings();
  const [edits, setEdits] = useState<Partial<Settings>>({});

  const changed = (Object.keys(edits) as (keyof Settings)[]).filter((k) => edits[k] !== saved[k]);

  return {
    value: { ...pickSettings(saved), ...edits } as Settings,
    dirty: changed.length > 0,
    set: (patch: Partial<Settings>) => setEdits((e) => ({ ...e, ...patch })),
    discard: () => setEdits({}),
    /** Applies the edits on this device, then syncs once and reports the result. */
    save: async () => {
      saved.update(Object.fromEntries(changed.map((k) => [k, edits[k]])) as Partial<Settings>);
      setEdits({});
      const id = showToast({ kind: 'pending', text: 'Saving settings…' });
      updateToast(id, saveMessage(await syncNow()));
    },
  };
}

function saveMessage(outcome: SyncOutcome): Omit<Toast, 'id'> {
  switch (outcome.status) {
    case 'synced':
      return { kind: 'success', text: 'Settings saved and synced' };
    case 'error':
      return {
        kind: 'error',
        text: 'Saved on this device, but syncing failed',
        detail: `${outcome.message}. Tap the sync badge to retry.`,
      };
    case 'skipped':
      return outcome.reason === 'offline'
        ? { kind: 'info', text: 'Saved on this device', detail: "They'll sync when you're back online." }
        : { kind: 'success', text: 'Settings saved' };
  }
}
