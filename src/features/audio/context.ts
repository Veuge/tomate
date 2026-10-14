let ctx: AudioContext | null = null;

export function audioCtx(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}

/** Must run inside a user gesture once; iOS/Safari keep audio suspended until then. */
export function unlockAudio(): void {
  const c = audioCtx();
  if (c.state === "suspended") void c.resume();
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, 22050);
  src.connect(c.destination);
  src.start(0);
}
