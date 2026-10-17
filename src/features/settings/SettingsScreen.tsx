import { useEffect, type ReactNode } from 'react';
import { Link, useBlocker } from 'react-router-dom';
import { Bell, Coffee, Download, LogOut, Minus, Monitor, Moon, Plus, Sun } from 'lucide-react';
import { Button, Card, ConfirmDialog, SectionTitle, Segmented, Toggle } from '@/components/ui';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useSyncStatus } from '@/lib/sync';
import { playAlarm } from '@/features/audio/alarm';
import { unlockAudio } from '@/features/audio/context';
import { useAuth } from '@/features/auth/useAuth';
import { SyncBadge } from '@/features/auth/SyncBadge';
import type { AlarmSound, AmbientSound, Theme } from './store';
import { useSettingsDraft } from './useSettingsDraft';

const supportUrl = import.meta.env.VITE_SUPPORT_URL as string | undefined;

export function SettingsScreen() {
  const draft = useSettingsDraft();
  const s = draft.value;
  const { user } = useAuth();

  // In-app navigation with unsaved changes → our confirm dialog.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => draft.dirty && currentLocation.pathname !== nextLocation.pathname
  );
  // Closing/reloading the tab → the browser's own "Leave site?" prompt (its text can't be customized).
  useEffect(() => {
    if (!draft.dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [draft.dirty]);
  const lastSyncedAt = useSyncStatus((x) => x.lastSyncedAt);

  const exportJson = async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      tags: await db.tags.toArray(),
      sessions: await db.sessions.toArray(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `pomodoro-${data.exportedAt.slice(0, 10)}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <SyncBadge />
      </header>

      <section>
        <SectionTitle>Timer</SectionTitle>
        <Card className="divide-y divide-line py-1 sm:py-1">
          <Row label="Focus" hint="minutes">
            <Stepper value={s.focusMin} min={1} max={180} onChange={(v) => draft.set({ focusMin: v })} />
          </Row>
          <Row label="Short break" hint="minutes">
            <Stepper value={s.shortMin} min={1} max={60} onChange={(v) => draft.set({ shortMin: v })} />
          </Row>
          <Row label="Long break" hint="minutes">
            <Stepper value={s.longMin} min={1} max={90} onChange={(v) => draft.set({ longMin: v })} />
          </Row>
          <Row label="Long break every" hint="focus sessions">
            <Stepper
              value={s.longBreakInterval}
              min={1}
              max={12}
              onChange={(v) => draft.set({ longBreakInterval: v })}
            />
          </Row>
          <Row label="Auto-start breaks">
            <Toggle
              label="Auto-start breaks"
              checked={s.autoStartBreaks}
              onChange={(v) => draft.set({ autoStartBreaks: v })}
            />
          </Row>
          <Row label="Auto-start focus">
            <Toggle
              label="Auto-start focus"
              checked={s.autoStartFocus}
              onChange={(v) => draft.set({ autoStartFocus: v })}
            />
          </Row>
          <Row label="Daily goal" hint="sessions · heatmap scale">
            <Stepper value={s.dailyGoal} min={1} max={24} onChange={(v) => draft.set({ dailyGoal: v })} />
          </Row>
        </Card>
      </section>

      <section>
        <SectionTitle>Sound</SectionTitle>
        <Card className="divide-y divide-line py-1 sm:py-1">
          <Row label="Alarm">
            <Select<AlarmSound>
              value={s.alarmSound}
              onChange={(v) => draft.set({ alarmSound: v })}
              options={{ bell: 'Bell', digital: 'Digital', chime: 'Chime' }}
            />
          </Row>
          <Row label="Alarm volume">
            <Slider value={s.alarmVolume} onChange={(v) => draft.set({ alarmVolume: v })} />
          </Row>
          <Row label="Alarm repeats">
            <Stepper value={s.alarmRepeat} min={1} max={10} onChange={(v) => draft.set({ alarmRepeat: v })} />
          </Row>
          <Row label="Test alarm">
            <Button
              onClick={() => {
                unlockAudio();
                playAlarm(s.alarmSound, s.alarmVolume, 1);
              }}
            >
              <Bell size={16} /> Play
            </Button>
          </Row>
          <Row label="Focus background">
            <Select<AmbientSound>
              value={s.ambientSound}
              onChange={(v) => draft.set({ ambientSound: v })}
              options={{
                none: 'None',
                white: 'White noise',
                pink: 'Pink noise',
                brown: 'Brown noise',
                rain: 'Rain',
                ticking: 'Ticking',
              }}
            />
          </Row>
          {s.ambientSound !== 'none' && (
            <Row label="Background volume">
              <Slider value={s.ambientVolume} onChange={(v) => draft.set({ ambientVolume: v })} />
            </Row>
          )}
          <Row label="Notifications" hint="when the app is in the background">
            <Toggle
              label="Notifications"
              checked={s.notifications}
              onChange={(v) => {
                draft.set({ notifications: v });
                if (v && 'Notification' in window && Notification.permission === 'default')
                  void Notification.requestPermission();
              }}
            />
          </Row>
        </Card>
      </section>

      <section>
        <SectionTitle>Appearance</SectionTitle>
        <Card>
          <Segmented<Theme>
            value={s.theme}
            onChange={(v) => draft.set({ theme: v })}
            className="w-full"
            options={[
              {
                value: 'system',
                label: (
                  <span className="flex items-center gap-1.5">
                    <Monitor size={14} />
                    System
                  </span>
                ),
              },
              {
                value: 'light',
                label: (
                  <span className="flex items-center gap-1.5">
                    <Sun size={14} />
                    Light
                  </span>
                ),
              },
              {
                value: 'dark',
                label: (
                  <span className="flex items-center gap-1.5">
                    <Moon size={14} />
                    Dark
                  </span>
                ),
              },
            ]}
          />
        </Card>
      </section>

      <section>
        <SectionTitle>Account & data</SectionTitle>
        <Card className="divide-y divide-line py-1 sm:py-1">
          {supabase && (
            <Row
              label={user ? (user.email ?? 'Signed in') : 'Not signed in'}
              hint={
                user
                  ? lastSyncedAt
                    ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                    : 'Syncing…'
                  : 'Data stays on this device'
              }
            >
              {user ? (
                <Button variant="ghost" onClick={() => void supabase!.auth.signOut()}>
                  <LogOut size={16} /> Sign out
                </Button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center h-10 px-4 rounded-xl text-sm font-medium bg-fg text-bg"
                >
                  Sign in
                </Link>
              )}
            </Row>
          )}
          <Row label="Export data" hint="JSON of all tags and sessions">
            <Button onClick={() => void exportJson()}>
              <Download size={16} /> Export
            </Button>
          </Row>
          {supportUrl && (
            <Row label="Support Tomate" hint="Enjoying the app? Buy me a coffee">
              <a
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium bg-fg text-bg"
              >
                <Coffee size={16} /> Buy me a coffee
              </a>
            </Row>
          )}
          <Row label="Version">
            <span className="text-sm text-muted tabular-nums">v{__APP_VERSION__}</span>
          </Row>
        </Card>
      </section>

      {draft.dirty && (
        <>
          {/* Room so the bar never covers the last row. */}
          <div aria-hidden className="h-16" />
          <div className="fixed inset-x-0 z-30 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] md:bottom-6 md:pl-60">
            <div
              role="region"
              aria-label="Unsaved changes"
              className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-line bg-surface p-2 pl-4 shadow-xl"
            >
              <p className="flex-1 text-sm font-medium">Unsaved changes</p>
              <Button variant="ghost" onClick={draft.discard}>
                Discard
              </Button>
              <Button variant="primary" onClick={draft.save}>
                Save
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        message="You changed some settings but didn't save them. If you leave now, those changes will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 min-h-14">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1">
      <button
        onClick={() => set(value - 1)}
        aria-label="Decrease"
        className="grid place-items-center h-8 w-8 rounded-lg hover:bg-surface"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && set(Number(e.target.value))}
        className="w-10 bg-transparent text-center text-sm font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        onClick={() => set(value + 1)}
        aria-label="Increase"
        className="grid place-items-center h-8 w-8 rounded-lg hover:bg-surface"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-32 sm:w-40"
    />
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Record<T, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-10 rounded-xl bg-surface-2 px-3 text-sm font-medium outline-none"
    >
      {(Object.keys(options) as T[]).map((k) => (
        <option key={k} value={k}>
          {options[k]}
        </option>
      ))}
    </select>
  );
}
