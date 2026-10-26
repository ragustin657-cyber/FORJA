// iOS solo deja sonar audio creado durante un toque: el contexto se crea (o reanuda) al tocar
// "Completar serie" y después se reusa para el aviso de fin de descanso.
let contexto: AudioContext | null = null;

export function desbloquearAudio(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    contexto ??= new Ctx();
    if (contexto.state === 'suspended') void contexto.resume();
  } catch {
    contexto = null;
  }
}

export function pitido(): void {
  const ctx = contexto;
  if (ctx) {
    for (const [inicio, frecuencia] of [[0, 880], [0.25, 880], [0.5, 1320]] as const) {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.frequency.value = frecuencia;
      vol.gain.setValueAtTime(0.25, ctx.currentTime + inicio);
      vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + 0.2);
      osc.connect(vol).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.2);
    }
  }
  navigator.vibrate?.([200, 100, 200]);
}
