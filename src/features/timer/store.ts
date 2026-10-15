import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Phase } from "@/lib/types";
import { PHASE_LABEL } from "@/lib/types";
import { useSettings, type Settings } from "@/features/settings/store";
import { recordSession } from "@/features/sessions/repo";
import { playAlarm } from "@/features/audio/alarm";
import { unlockAudio } from "@/features/audio/context";
import * as E from "./engine";

/** Dev aid: `?speed=60` makes a minute last one second. Ignored in production builds. */
const SPEED = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get("speed")) || 1 : 1;

export function configFrom(s: Settings): E.TimerConfig {
  const min = 60_000 / SPEED;
  return {
    focusMs: s.focusMin * min,
    shortMs: s.shortMin * min,
    longMs: s.longMin * min,
    longBreakInterval: s.longBreakInterval,
    autoStartFocus: s.autoStartFocus,
    autoStartBreaks: s.autoStartBreaks,
  };
}

const cfg = () => configFrom(useSettings.getState());

interface TimerStore {
  timer: E.TimerState;
  start: () => void;
  pause: () => void;
  /** Discard the current focus session without recording it. */
  stop: () => void;
  skip: () => void;
  selectPhase: (p: Phase) => void;
  setTag: (id: string | null) => void;
  tick: () => void;
}

export const useTimer = create<TimerStore>()(
  persist(
    (set, get) => ({
      timer: E.initialState(cfg()),
      start: () => {
        unlockAudio();
        requestNotificationPermission();
        set({ timer: E.start(get().timer, Date.now()) });
      },
      pause: () => set({ timer: E.pause(get().timer, Date.now()) }),
      stop: () => set({ timer: E.stop(get().timer, cfg()) }),
      skip: () => {
        const { state, finished } = E.skip(get().timer, cfg(), Date.now());
        set({ timer: state });
        if (finished) void recordSession(finished);
      },
      selectPhase: (p) => set({ timer: E.selectPhase(get().timer, p, cfg()) }),
      setTag: (id) => set({ timer: E.setTag(get().timer, id) }),
      tick: () => {
        const { state, finished } = E.tick(get().timer, cfg(), Date.now());
        if (!finished) return;
        set({ timer: state });
        void recordSession(finished);
        onPhaseEnd(finished.phase, state.phase);
      },
    }),
    { name: "pomodoro-timer", partialize: (s) => ({ timer: s.timer }) },
  ),
);

// Keep an idle timer in step with duration changes made in Settings.
useSettings.subscribe((s, prev) => {
  if (configChanged(s, prev)) useTimer.setState({ timer: E.applyConfig(useTimer.getState().timer, configFrom(s)) });
});

function configChanged(a: Settings, b: Settings) {
  return a.focusMin !== b.focusMin || a.shortMin !== b.shortMin || a.longMin !== b.longMin;
}

function onPhaseEnd(ended: Phase, next: Phase) {
  const s = useSettings.getState();
  playAlarm(s.alarmSound, s.alarmVolume, s.alarmRepeat, ended);
  const title = ended === "focus" ? "Focus complete" : "Break over";
  notify(title, `Next: ${PHASE_LABEL[next]}`);
}

function requestNotificationPermission() {
  if (!useSettings.getState().notifications || !("Notification" in window)) return;
  if (Notification.permission === "default") void Notification.requestPermission();
}

function notify(title: string, body: string) {
  if (!useSettings.getState().notifications || !("Notification" in window)) return;
  if (Notification.permission !== "granted" || document.visibilityState === "visible") return;
  const opts = { body, icon: "/icons/icon-192.png", tag: "pomodoro", renotify: true } as NotificationOptions;
  if (navigator.serviceWorker?.controller) {
    void navigator.serviceWorker.ready.then((r) => r.showNotification(title, opts));
  } else {
    new Notification(title, opts);
  }
}
