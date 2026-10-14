import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "system" | "light" | "dark";
export type AlarmSound = "bell" | "digital" | "chime";
export type AmbientSound = "none" | "white" | "pink" | "brown" | "rain" | "ticking";

export interface Settings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  longBreakInterval: number;
  autoStartFocus: boolean;
  autoStartBreaks: boolean;
  alarmSound: AlarmSound;
  alarmVolume: number;
  alarmRepeat: number;
  ambientSound: AmbientSound;
  ambientVolume: number;
  ambientMuted: boolean;
  notifications: boolean;
  theme: Theme;
  dailyGoal: number;
  updatedAt: string;
}

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longBreakInterval: 4,
  autoStartFocus: false,
  autoStartBreaks: true,
  alarmSound: "bell",
  alarmVolume: 1,
  alarmRepeat: 3,
  ambientSound: "none",
  ambientVolume: 0.4,
  ambientMuted: false,
  notifications: true,
  theme: "system",
  dailyGoal: 8,
  updatedAt: new Date(0).toISOString(),
};

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
  /** Replace with remote settings (does not bump updatedAt). */
  hydrate: (s: Partial<Settings>) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set({ ...patch, updatedAt: new Date().toISOString() }),
      hydrate: (s) => set({ ...DEFAULT_SETTINGS, ...s }),
    }),
    { name: "pomodoro-settings" },
  ),
);

export function pickSettings(s: SettingsStore): Settings {
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_SETTINGS)) out[k] = s[k as keyof Settings];
  return out as unknown as Settings;
}
