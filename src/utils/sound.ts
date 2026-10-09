/**
 * Notification sound player utility for Daktar Serial.
 * Provides both Web Audio API synthesized chime (zero latency, zero network dependency)
 * and audio file fallback (/notification.wav or /notification.mp3).
 * Respects user preferences and ensures smooth playback across browsers and mobile web.
 */

const STORAGE_SOUND_KEY = 'daktar_sound_enabled';

// Global AudioContext singleton to reuse and unlock on user gesture
let audioCtx: AudioContext | null = null;
let soundEnabledCache: boolean | null = null;

/**
 * Checks whether notification sound is currently enabled (defaults to true).
 */
export function isSoundEnabled(): boolean {
  if (soundEnabledCache !== null) {
    return soundEnabledCache;
  }
  if (typeof window === 'undefined') {
    return true;
  }
  const saved = localStorage.getItem(STORAGE_SOUND_KEY);
  soundEnabledCache = saved === null ? true : saved === 'true';
  return soundEnabledCache;
}

/**
 * Toggles or explicitly sets sound preference.
 */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabledCache = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_SOUND_KEY, enabled ? 'true' : 'false');
  }
}

/**
 * Unlocks Web Audio API context during a user interaction (click/touch),
 * preventing browser autoplay policy blocks.
 */
export function unlockAudioContext(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (err) {
    // Ignore unsupported context
  }
}

/**
 * Synthesizes a pleasant medical alert 2-note glass chime (880Hz -> 1318.5Hz / E6)
 * using the Web Audio API. This works instantly without waiting for an asset download.
 */
function playWebAudioChime(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        resolve(false);
        return;
      }

      if (!audioCtx) {
        audioCtx = new AudioContextClass();
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => playChimeNodes(audioCtx!, resolve)).catch(() => resolve(false));
      } else {
        playChimeNodes(audioCtx, resolve);
      }
    } catch {
      resolve(false);
    }
  });
}

function playChimeNodes(ctx: AudioContext, resolve: (ok: boolean) => void) {
  try {
    const now = ctx.currentTime;

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.65, now);
    masterGain.connect(ctx.destination);

    // Note 1: A5 (880Hz) pleasant soft attack bell
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // Note 2: E6 (1318.5Hz) bright high ping starting slightly after
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.7, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.66);

    // Note 3: Subtle harmonic overtone (2637Hz) for clarity
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(2637, now + 0.14);
    gain3.gain.setValueAtTime(0.001, now + 0.14);
    gain3.gain.exponentialRampToValueAtTime(0.18, now + 0.16);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc3.connect(gain3);
    gain3.connect(masterGain);
    osc3.start(now + 0.14);
    osc3.stop(now + 0.51);

    setTimeout(() => resolve(true), 650);
  } catch {
    resolve(false);
  }
}

/**
 * Fallback audio file player using HTMLAudioElement.
 */
function playAudioFileFallback(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.75;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => resolve(true))
          .catch(() => {
            // Try wav fallback
            try {
              const audioWav = new Audio('/notification.wav');
              audioWav.volume = 0.75;
              audioWav.play().then(() => resolve(true)).catch(() => resolve(false));
            } catch {
              resolve(false);
            }
          });
      } else {
        resolve(true);
      }
    } catch {
      resolve(false);
    }
  });
}

/**
 * Plays the notification sound alert.
 * 1. Checks if sound is enabled in user settings.
 * 2. Attempts Web Audio synthesized chime (crystal clear, instant).
 * 3. Falls back to audio file if Web Audio is blocked or unavailable.
 * 4. Triggers subtle haptic vibration on supported devices.
 */
export async function playNotificationSound(): Promise<boolean> {
  if (!isSoundEnabled()) {
    return false;
  }

  // Haptic feedback if on mobile
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 80, 150]);
    } catch {
      // Ignore vibration error
    }
  }

  // Try Web Audio chime first
  const webAudioSuccess = await playWebAudioChime();
  if (webAudioSuccess) {
    return true;
  }

  // Try file fallback
  return playAudioFileFallback();
}
