/**
 * Lifelike French Audio Engine
 * Plays studio-quality neural French MP3s pre-generated with Microsoft Multilingual Neural voices:
 *   - vivienne: fr-FR-VivienneMultilingualNeural (warm Parisian female)
 *   - remy:     fr-FR-RemyMultilingualNeural     (warm Parisian male)
 *
 * Preloads upcoming lesson clips for instant zero-latency playback, supports 1.0x and 0.75x
 * clear slow playback, and falls back gracefully to high-quality browser French voices if
 * a custom item has not been pre-generated yet.
 */

class FrenchAudioEngine {
  constructor() {
    this.cache = new Map();
    this.activeAudio = null;
    this.activeItemId = null;
    this.listeners = new Set();
  }

  onStateChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(isPlaying, itemId = null) {
    this.activeItemId = isPlaying ? itemId : null;
    for (const fn of this.listeners) {
      fn({ isPlaying, itemId: this.activeItemId });
    }
  }

  getUrl(itemId, voice = 'vivienne') {
    const safeVoice = voice === 'remy' ? 'remy' : 'vivienne';
    return `./audio/${safeVoice}/${itemId}.mp3`;
  }

  preload(items, voice = 'vivienne') {
    if (!Array.isArray(items)) return;
    items.slice(0, 8).forEach((item) => {
      if (!item?.id) return;
      const key = `${voice}:${item.id}`;
      if (!this.cache.has(key)) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = this.getUrl(item.id, voice);
        this.cache.set(key, audio);
      }
    });
  }

  stop() {
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {
        // ignore audio reset issues
      }
      this.activeAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.emit(false, null);
  }

  async play(item, { voice = 'vivienne', slow = false } = {}) {
    if (!item) return;
    this.stop();

    const key = `${voice}:${item.id}`;
    let audio = this.cache.get(key);
    if (!audio) {
      audio = new Audio(this.getUrl(item.id, voice));
      audio.preload = 'auto';
      this.cache.set(key, audio);
    }

    audio.currentTime = 0;
    audio.playbackRate = slow ? 0.76 : 1.0;
    if ('preservesPitch' in audio) {
      audio.preservesPitch = true;
    }

    this.activeAudio = audio;
    this.emit(true, item.id);

    const cleanup = () => {
      if (this.activeAudio === audio) {
        this.activeAudio = null;
        this.emit(false, null);
      }
    };

    audio.onended = cleanup;
    audio.onerror = () => {
      cleanup();
      this.fallbackSpeak(item.fr, slow);
    };

    try {
      await audio.play();
    } catch {
      // Autoplay may be blocked before first user gesture; keep UI calm without erroring
      cleanup();
    }
  }

  fallbackSpeak(text, slow = false) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = slow ? 0.72 : 0.96;
    const voices = window.speechSynthesis.getVoices();
    const french =
      voices.find((v) => /fr[-_]?FR/i.test(v.lang) && /natural|neural|google|amelie|thomas|audrey/i.test(v.name)) ||
      voices.find((v) => /^fr/i.test(v.lang));
    if (french) utter.voice = french;
    utter.onend = () => this.emit(false, null);
    this.emit(true, 'fallback');
    window.speechSynthesis.speak(utter);
  }
}

export const audioEngine = new FrenchAudioEngine();
