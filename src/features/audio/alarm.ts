import { create } from "zustand";
import type { AlarmSound } from "@/features/settings/store";
import type { Phase } from "@/lib/types";
import { audioCtx } from "./context";

/** One "ring" of each alarm, scheduled at time t into `out`. Returns its length in seconds. */
const PATTERNS: Record<AlarmSound, (c: AudioContext, out: AudioNode, t: number) => number> = {
  bell(c, out, t) {
    for (const strike of [0, 0.6]) {
      for (const [ratio, amp] of [[1, 1], [2, 0.6], [2.76, 0.4], [5.4, 0.25]] as const) {
        tone(c, out, "sine", 880 * ratio, t + strike, 1.4, amp);
      }
    }
    return 2;
  },
  digital(c, out, t) {
    for (let i = 0; i < 4; i++) tone(c, out, "square", 1050, t + i * 0.18, 0.1, 0.5, false);
    return 1.6;
  },
  chime(c, out, t) {
    [1047, 1319, 1568, 2093].forEach((f, i) => tone(c, out, "triangle", f, t + i * 0.22, 0.9, 1));
    return 2;
  },
};

function tone(
  c: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  freq: number,
  at: number,
  dur: number,
  amp: number,
  decay = true,
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(amp, at + 0.005);
  if (decay) g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  else g.gain.setValueAtTime(0, at + dur);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

interface AlarmState {
  /** Phase that just ended while the alarm rings, else null. */
  ringing: Phase | null;
  stop: () => void;
}

export const useAlarm = create<AlarmState>(() => ({ ringing: null, stop: () => {} }));

export function playAlarm(sound: AlarmSound, volume: number, repeats: number, ended: Phase | null = null): void {
  useAlarm.getState().stop();
  const c = audioCtx();
  if (c.state === "suspended") void c.resume();
  // Compressor + makeup gain keeps the alarm loud without clipping.
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 6;
  const master = c.createGain();
  master.gain.value = Math.min(1, Math.max(0, volume)) * 1.6;
  master.connect(comp).connect(c.destination);

  let t = c.currentTime + 0.05;
  for (let i = 0; i < Math.max(1, repeats); i++) t += PATTERNS[sound](c, master, t) + 0.4;

  const timeout = setTimeout(stop, (t - c.currentTime) * 1000);
  function stop() {
    clearTimeout(timeout);
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setTargetAtTime(0, c.currentTime, 0.02);
    setTimeout(() => master.disconnect(), 200);
    if (useAlarm.getState().stop === stop) useAlarm.setState({ ringing: null, stop: () => {} });
  }
  useAlarm.setState({ ringing: ended, stop });
  navigator.vibrate?.([400, 200, 400, 200, 400]);
}
