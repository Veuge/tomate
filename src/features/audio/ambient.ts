import type { AmbientSound } from '@/features/settings/store';
import { audioCtx } from './context';

type Kind = Exclude<AmbientSound, 'none'>;

const buffers = new Map<Kind, AudioBuffer>();

/** Generates a seamless loop for each background sound; no audio files needed. */
function makeBuffer(c: AudioContext, kind: Kind): AudioBuffer {
  const rate = c.sampleRate;
  const len = kind === 'ticking' ? rate : rate * 6;
  const buf = c.createBuffer(1, len, rate);
  const d = buf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0,
    last = 0;
  const pink = () => {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const out = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
    return out;
  };
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    switch (kind) {
      case 'white':
        d[i] = w * 0.3;
        break;
      case 'pink':
        d[i] = pink();
        break;
      case 'brown':
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
        break;
      case 'rain':
        d[i] = pink() * 0.6;
        break;
      case 'ticking': {
        const t = i / rate;
        d[i] = t < 0.03 ? Math.sin(2 * Math.PI * 2800 * t) * Math.exp(-t * 180) * 0.8 : 0;
        break;
      }
    }
  }
  if (kind === 'rain') {
    // Sprinkle short droplets over the pink-noise bed.
    for (let k = 0; k < 6 * 60; k++) {
      const at = Math.floor(Math.random() * (len - rate * 0.03));
      const amp = 0.1 + Math.random() * 0.3;
      for (let j = 0; j < rate * 0.02; j++) d[at + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / (rate * 0.004));
    }
  }
  // Crossfade the ends so the loop has no click.
  if (kind !== 'ticking') {
    const fade = Math.floor(rate * 0.05);
    for (let i = 0; i < fade; i++) {
      const a = i / fade;
      d[i] = d[i] * a + d[len - fade + i] * (1 - a);
    }
  }
  return buf;
}

let current: { kind: Kind; src: AudioBufferSourceNode; gain: GainNode } | null = null;

export function setAmbient(kind: AmbientSound, volume: number): void {
  const c = audioCtx();
  if (kind === 'none') return stopAmbient();
  if (current?.kind === kind) {
    current.gain.gain.setTargetAtTime(volume, c.currentTime, 0.2);
    return;
  }
  stopAmbient();
  if (c.state === 'suspended') void c.resume();
  if (!buffers.has(kind)) buffers.set(kind, makeBuffer(c, kind));
  const src = c.createBufferSource();
  src.buffer = buffers.get(kind)!;
  src.loop = true;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(volume, c.currentTime, 0.4);
  let node: AudioNode = src;
  if (kind === 'rain') {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5000;
    node = src.connect(lp);
  }
  node.connect(gain).connect(c.destination);
  src.start();
  current = { kind, src, gain };
}

export function stopAmbient(): void {
  if (!current) return;
  const { src, gain } = current;
  const c = audioCtx();
  gain.gain.setTargetAtTime(0, c.currentTime, 0.3);
  src.stop(c.currentTime + 1.5);
  current = null;
}
