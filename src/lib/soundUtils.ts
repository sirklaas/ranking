/**
 * Shared cinematic sound effects for game reveals (Top 3, Top 10, etc.)
 */

/* ──────── Cinematic Riser Sound during Results Reveal ──────── */
export function playRiserSound(customDuration?: number) {
  if (typeof window === 'undefined') return;
  try {
    const anyWin = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || anyWin.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = customDuration ?? 2.4; // Matches the 2.4s reveal duration

    // Master volume envelope (exponential swell)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.01, now);
    masterGain.gain.exponentialRampToValueAtTime(0.35, now + duration * 0.88);
    masterGain.gain.linearRampToValueAtTime(0.01, now + duration + 0.3);
    masterGain.connect(ctx.destination);

    // Resonant sweep filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(5, now);
    filter.frequency.setValueAtTime(110, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + duration);
    filter.connect(masterGain);

    // Oscillator 1: Sawtooth tension sweep (70Hz -> 480Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(70, now);
    osc1.frequency.exponentialRampToValueAtTime(480, now + duration);
    osc1.connect(filter);
    osc1.start(now);
    osc1.stop(now + duration + 0.3);

    // Oscillator 2: Sub-bass warmth sweep (55Hz -> 240Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(55, now);
    osc2.frequency.exponentialRampToValueAtTime(240, now + duration);
    osc2.connect(filter);
    osc2.start(now);
    osc2.stop(now + duration + 0.3);

    // Climax impact hit at duration when reveal completes
    const impactTime = now + duration;
    const impactOsc = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impactOsc.type = 'sine';
    impactOsc.frequency.setValueAtTime(140, impactTime);
    impactOsc.frequency.exponentialRampToValueAtTime(45, impactTime + 0.5);
    impactGain.gain.setValueAtTime(0.4, impactTime);
    impactGain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.6);
    impactOsc.connect(impactGain);
    impactGain.connect(ctx.destination);
    impactOsc.start(impactTime);
    impactOsc.stop(impactTime + 0.65);

    // ✨ TJING ✨ (Crisp bell chime + audio sample triggered right at impactTime!)
    // 1. Audio sample trigger
    setTimeout(() => {
      try {
        const audio = new Audio('/sfx/tjing.wav');
        audio.volume = 0.9;
        audio.play().catch(() => {});
      } catch {}
    }, duration * 1000);

    // 2. Synthesized bell harmonics (pure crystal chime)
    const bellFrequencies = [2093, 2637, 3136, 4186];
    bellFrequencies.forEach((freq, idx) => {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(freq, impactTime);

      const bellVol = 0.16 / (idx + 1);
      bGain.gain.setValueAtTime(bellVol, impactTime);
      bGain.gain.exponentialRampToValueAtTime(0.0001, impactTime + 1.8);

      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(impactTime);
      bOsc.stop(impactTime + 1.85);
    });
  } catch (err) {
    console.warn('[SoundUtils] playRiserSound prevented:', err);
  }
}
