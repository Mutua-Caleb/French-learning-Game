/**
 * French Typing-to-Learn Engine
 *
 * Supports 3 learning modes:
 *   - 'guided':    Full French ghost text shown (Typing.com rhythm & spelling muscle memory)
 *   - 'translate': English shown, French hidden behind letter slots (active recall)
 *   - 'dictation': Native French audio plays, both French & English masked (listening immersion)
 *
 * Accent Ergonomics:
 *   - 'smart':  Typing the base letter (e.g. 'e' for 'é' or 'c' for 'ç') smoothly accepts
 *               and inserts the proper accented French letter with a soft golden accent cue.
 *               Typing the exact accented letter also works!
 *   - 'strict': Requires exact accented characters via French keyboard, on-screen Accent Bar,
 *               or dead-key combos ('e → é, `e → è, ^e → ê, ,c → ç, `a → à, `u → ù, ^o → ô, ^i → î).
 */

const DIACRITIC_BASE_MAP = {
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  É: 'E', È: 'E', Ê: 'E', Ë: 'E',
  à: 'a', â: 'a', ä: 'a',
  À: 'A', Â: 'A', Ä: 'A',
  ç: 'c', Ç: 'C',
  ù: 'u', û: 'u', ü: 'u',
  Ù: 'U', Û: 'U', Ü: 'U',
  î: 'i', ï: 'i', Î: 'I', Ï: 'I',
  ô: 'o', ö: 'o', Ô: 'O', Ö: 'O',
  '’': "'",
};

const DEAD_KEY_COMBOS = {
  "'": { e: 'é', E: 'É' },
  '`': { e: 'è', E: 'È', a: 'à', A: 'À', u: 'ù', U: 'Ù' },
  '^': { e: 'ê', E: 'Ê', a: 'â', A: 'Â', i: 'î', I: 'Î', o: 'ô', O: 'Ô', u: 'û', U: 'Û' },
  ',': { c: 'ç', C: 'Ç' },
};

export function stripAccent(ch) {
  return DIACRITIC_BASE_MAP[ch] || ch;
}

export function isAccentedFrenchChar(ch) {
  return Object.prototype.hasOwnProperty.call(DIACRITIC_BASE_MAP, ch) && ch !== '’';
}

export class TypingSession {
  constructor(lesson, { mode = 'guided', accentMode = 'smart' } = {}) {
    this.lesson = lesson;
    this.items = lesson.items || [];
    this.mode = mode;
    this.accentMode = accentMode;

    this.itemIndex = 0;
    this.cursor = 0;
    this.startedAt = null;
    this.endedAt = null;

    this.correctChars = 0;
    this.totalKeystrokes = 0;
    this.combo = 0;
    this.maxCombo = 0;

    this.itemErrors = 0;
    this.consecutiveMissesAtCursor = 0;
    this.lastErrorAtCursor = false;
    this.autoAccentedIndices = new Set();
    this.hintedIndices = new Set();
    this.revealEnglishInDictation = false;
    this.pendingDeadKey = null;

    this.missedItemsMap = new Map();
    this.itemCompleted = false;
    this.lessonCompleted = false;
  }

  get currentItem() {
    return this.items[this.itemIndex] || null;
  }

  get targetText() {
    return this.currentItem ? this.currentItem.fr : '';
  }

  get expectedChar() {
    return this.targetText[this.cursor] || null;
  }

  setMode(mode) {
    this.mode = mode;
    this.revealEnglishInDictation = false;
    this.hintedIndices.clear();
  }

  setAccentMode(accentMode) {
    this.accentMode = accentMode;
    this.pendingDeadKey = null;
  }

  getWpm() {
    if (!this.startedAt || this.correctChars === 0) return 0;
    const end = this.endedAt || Date.now();
    const minutes = Math.max((end - this.startedAt) / 60000, 0.04);
    return Math.round(this.correctChars / 5 / minutes);
  }

  getAccuracy() {
    if (this.totalKeystrokes === 0) return 100;
    return Math.max(0, Math.min(100, Math.round((this.correctChars / this.totalKeystrokes) * 100)));
  }

  computeStars() {
    const acc = this.getAccuracy();
    const wpm = this.getWpm();
    if (acc >= 94 && wpm >= 18) return 3;
    if (acc >= 85) return 2;
    return 1;
  }

  revealHintChar() {
    if (this.itemCompleted || this.lessonCompleted) return false;
    this.hintedIndices.add(this.cursor);
    return true;
  }

  revealCurrentWord() {
    if (this.itemCompleted || this.lessonCompleted) return false;
    const text = this.targetText;
    let i = this.cursor;
    while (i < text.length && text[i] !== ' ') {
      this.hintedIndices.add(i);
      i += 1;
    }
    return true;
  }

  handleInput(rawKey) {
    if (this.lessonCompleted || this.itemCompleted || !this.currentItem) {
      return { status: 'ignored' };
    }

    const expected = this.expectedChar;
    if (!expected) return { status: 'ignored' };

    // Dead-key composition in Strict Accent mode when the expected char is accented
    if (this.accentMode === 'strict') {
      if (this.pendingDeadKey) {
        const comboTable = DEAD_KEY_COMBOS[this.pendingDeadKey];
        const composed = comboTable?.[rawKey];
        this.pendingDeadKey = null;
        if (composed) {
          rawKey = composed;
        }
      } else if (
        DEAD_KEY_COMBOS[rawKey] &&
        expected !== rawKey &&
        isAccentedFrenchChar(expected)
      ) {
        this.pendingDeadKey = rawKey;
        return {
          status: 'deadkey',
          deadKey: rawKey,
          message: `Accent ready (${rawKey}) — now press the letter to accent.`,
        };
      }
    }

    if (!this.startedAt) {
      this.startedAt = Date.now();
    }

    this.totalKeystrokes += 1;

    // Normalize typographic apostrophes
    const normalizedInput = rawKey === '’' ? "'" : rawKey;
    const normalizedExpected = expected === '’' ? "'" : expected;

    let isMatch = normalizedInput === normalizedExpected;
    let usedSmartAccent = false;

    if (!isMatch && this.accentMode === 'smart') {
      const strippedExp = stripAccent(normalizedExpected);
      if (
        isAccentedFrenchChar(normalizedExpected) &&
        normalizedInput === strippedExp
      ) {
        isMatch = true;
        usedSmartAccent = true;
      }
    }

    if (isMatch) {
      this.correctChars += 1;
      this.combo += 1;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.lastErrorAtCursor = false;
      this.consecutiveMissesAtCursor = 0;

      if (usedSmartAccent) {
        this.autoAccentedIndices.add(this.cursor);
      }

      this.cursor += 1;

      // Did we finish this word/sentence?
      if (this.cursor >= this.targetText.length) {
        this.itemCompleted = true;
        if (this.itemErrors > 0) {
          this.missedItemsMap.set(this.currentItem.id, this.currentItem);
        }
        return {
          status: 'item_complete',
          usedSmartAccent,
          expectedChar: expected,
          item: this.currentItem,
        };
      }

      return {
        status: 'hit',
        usedSmartAccent,
        expectedChar: expected,
      };
    }

    // Wrong key
    this.combo = 0;
    this.itemErrors += 1;
    this.consecutiveMissesAtCursor += 1;
    this.lastErrorAtCursor = true;

    // Gentle nudge: in Translate/Dictation mode, after 2 misses on the same letter, reveal it so flow isn't blocked
    let autoRevealed = false;
    if (this.mode !== 'guided' && this.consecutiveMissesAtCursor >= 2) {
      this.hintedIndices.add(this.cursor);
      autoRevealed = true;
    }

    return {
      status: 'miss',
      expectedChar: expected,
      typedChar: rawKey,
      autoRevealed,
      needsAccentHint:
        this.accentMode === 'strict' &&
        isAccentedFrenchChar(expected) &&
        stripAccent(expected) === rawKey,
    };
  }

  advanceItem() {
    if (this.itemIndex + 1 >= this.items.length) {
      this.lessonCompleted = true;
      this.endedAt = Date.now();
      return false;
    }

    this.itemIndex += 1;
    this.cursor = 0;
    this.itemErrors = 0;
    this.consecutiveMissesAtCursor = 0;
    this.lastErrorAtCursor = false;
    this.autoAccentedIndices.clear();
    this.hintedIndices.clear();
    this.revealEnglishInDictation = false;
    this.pendingDeadKey = null;
    this.itemCompleted = false;
    return true;
  }

  getSummary() {
    return {
      lesson: this.lesson,
      mode: this.mode,
      wpm: this.getWpm(),
      accuracy: this.getAccuracy(),
      stars: this.computeStars(),
      maxCombo: this.maxCombo,
      itemsCount: this.items.length,
      missedItems: Array.from(this.missedItemsMap.values()),
    };
  }
}
