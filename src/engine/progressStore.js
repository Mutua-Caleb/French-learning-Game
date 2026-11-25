/**
 * Progress & Preferences Store (localStorage)
 * Tracks per-lesson per-mode stars, best WPM, accuracy, daily streak, and user settings.
 */

const STORAGE_KEY = 'clavier_francais_state_v1';

const DEFAULT_STATE = {
  prefs: {
    voice: 'vivienne', // 'vivienne' | 'remy'
    accentMode: 'smart', // 'smart' | 'strict'
    practiceMode: 'guided', // 'guided' | 'translate' | 'dictation'
    showKeyboard: true,
    showFingerZones: true,
    keySounds: true,
    autoPlayAudio: true,
  },
  streak: {
    count: 0,
    lastDate: null,
  },
  lastLessonId: 'ch2-l1',
  bestWpm: 0,
  totalItemsTyped: 0,
  lessons: {
    // [lessonId]: { guided: { stars, wpm, acc }, translate: {...}, dictation: {...} }
  },
};

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayKey() {
  const dt = new Date();
  dt.setDate(dt.getDate() - 1);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

class ProgressStore {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_STATE),
        ...parsed,
        prefs: { ...DEFAULT_STATE.prefs, ...(parsed.prefs || {}) },
        streak: { ...DEFAULT_STATE.streak, ...(parsed.streak || {}) },
        lessons: parsed.lessons || {},
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore storage quota issues
    }
  }

  getPrefs() {
    return this.state.prefs;
  }

  updatePref(key, value) {
    this.state.prefs[key] = value;
    this.save();
  }

  setLastLesson(lessonId) {
    if (lessonId && !lessonId.startsWith('custom-')) {
      this.state.lastLessonId = lessonId;
      this.save();
    }
  }

  recordCompletion({ lessonId, mode, wpm, accuracy, stars, itemsCount }) {
    const today = todayKey();
    if (this.state.streak.lastDate !== today) {
      if (this.state.streak.lastDate === yesterdayKey()) {
        this.state.streak.count += 1;
      } else {
        this.state.streak.count = 1;
      }
      this.state.streak.lastDate = today;
    }

    if (wpm > this.state.bestWpm) {
      this.state.bestWpm = wpm;
    }
    this.state.totalItemsTyped += itemsCount;

    if (lessonId && !lessonId.startsWith('custom-')) {
      if (!this.state.lessons[lessonId]) {
        this.state.lessons[lessonId] = {};
      }
      const prev = this.state.lessons[lessonId][mode] || { stars: 0, wpm: 0, acc: 0 };
      this.state.lessons[lessonId][mode] = {
        stars: Math.max(prev.stars, stars),
        wpm: Math.max(prev.wpm, wpm),
        acc: Math.max(prev.acc, accuracy),
      };
      this.state.lastLessonId = lessonId;
    }

    this.save();
  }

  getLessonProgress(lessonId) {
    return this.state.lessons[lessonId] || {};
  }

  getLessonBestStars(lessonId) {
    const p = this.getLessonProgress(lessonId);
    return Math.max(p.guided?.stars || 0, p.translate?.stars || 0, p.dictation?.stars || 0);
  }

  getSummary(allLessonIds) {
    let earnedStars = 0;
    let completedLessons = 0;
    for (const id of allLessonIds) {
      const s = this.getLessonBestStars(id);
      earnedStars += s;
      if (s > 0) completedLessons += 1;
    }
    return {
      streak: this.state.streak.count,
      bestWpm: this.state.bestWpm,
      earnedStars,
      maxStars: allLessonIds.length * 3,
      completedLessons,
      totalLessons: allLessonIds.length,
      totalItemsTyped: this.state.totalItemsTyped,
      lastLessonId: this.state.lastLessonId,
    };
  }
}

export const progressStore = new ProgressStore();
