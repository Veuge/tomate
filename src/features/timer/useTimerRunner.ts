import { useEffect } from "react";
import { formatClock } from "@/lib/dates";
import { PHASE_LABEL } from "@/lib/types";
import { useSettings } from "@/features/settings/store";
import { setAmbient, stopAmbient } from "@/features/audio/ambient";
import { useTimer } from "./store";
import { remaining } from "./engine";

/** Drives the clock, the tab title and background audio. Mount once at the app root. */
export function useTimerRunner(): void {
  useEffect(() => {
    const loop = () => {
      useTimer.getState().tick();
      const t = useTimer.getState().timer;
      document.title =
        t.status === "idle" ? "Pomodoro" : `${formatClock(remaining(t, Date.now()))} · ${PHASE_LABEL[t.phase]}`;
    };
    loop();
    const id = setInterval(loop, 250);
    document.addEventListener("visibilitychange", loop);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", loop);
    };
  }, []);

  const playing = useTimer((s) => s.timer.status === "running" && s.timer.phase === "focus");
  const { ambientSound, ambientVolume, ambientMuted } = useSettings();
  useEffect(() => {
    if (playing && !ambientMuted) setAmbient(ambientSound, ambientVolume);
    else stopAmbient();
  }, [playing, ambientSound, ambientVolume, ambientMuted]);
  useEffect(() => stopAmbient, []);
}
