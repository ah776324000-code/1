// Web Audio API Synthesizer for tactical domino click-clacks and soundscapes

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.06);
}

export function playPlaceSound(isDouble = false) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Let's model a hollow wooden tiles clash!
  // It has a swift impact, high frequency snap, followed by a resonant body thump.
  const now = ctx.currentTime;

  // Impact oscillator
  const oscImpact = ctx.createOscillator();
  const gainImpact = ctx.createGain();
  oscImpact.type = 'sine';
  oscImpact.frequency.setValueAtTime(isDouble ? 180 : 250, now);
  oscImpact.frequency.exponentialRampToValueAtTime(50, now + 0.06);

  gainImpact.gain.setValueAtTime(isDouble ? 0.4 : 0.3, now);
  gainImpact.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  // Wooden click resonance
  const oscClick = ctx.createOscillator();
  const gainClick = ctx.createGain();
  oscClick.type = 'triangle';
  oscClick.frequency.setValueAtTime(isDouble ? 800 : 1200, now);
  oscClick.frequency.exponentialRampToValueAtTime(400, now + 0.03);

  gainClick.gain.setValueAtTime(0.12, now);
  gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  // Bandpass noise snap to make it sound organic
  try {
    const bufferSize = ctx.sampleRate * 0.05; // 50ms buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isDouble ? 1500 : 2500;
    filter.Q.value = 4.0;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  } catch (e) {
    // Fallback if buffer creation fails
  }

  oscImpact.connect(gainImpact);
  gainImpact.connect(ctx.destination);

  oscClick.connect(gainClick);
  gainClick.connect(ctx.destination);

  oscImpact.start(now);
  oscImpact.stop(now + 0.08);

  oscClick.start(now);
  oscClick.stop(now + 0.05);
}

export function playPassSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.linearRampToValueAtTime(240, now + 0.25);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}

export function playWinRoundSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.1);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.1);
    osc.stop(now + idx * 0.1 + 0.45);
  });
}

export function playWinGameSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Majestic brass-chime progression
  const chords = [
    [261.63, 329.63, 392.00], // C4, E4, G4
    [293.66, 349.23, 440.00], // D4, F4, A4
    [329.63, 392.00, 523.25], // E4, G4, C5
  ];

  chords.forEach((frequencies, chordIdx) => {
    const chordTime = now + chordIdx * 0.35;
    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chordTime);

      gain.gain.setValueAtTime(0, chordTime);
      gain.gain.linearRampToValueAtTime(0.1, chordTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(chordTime);
      osc.stop(chordTime + 0.82);
    });
  });
}
