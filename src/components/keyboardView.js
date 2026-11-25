import { stripAccent } from '../engine/typingEngine.js';

export const FRENCH_ACCENTS = [
  { char: 'é', tip: "' + e" },
  { char: 'è', tip: '` + e' },
  { char: 'ê', tip: '^ + e' },
  { char: 'à', tip: '` + a' },
  { char: 'â', tip: '^ + a' },
  { char: 'ç', tip: ', + c' },
  { char: 'ù', tip: '` + u' },
  { char: 'î', tip: '^ + i' },
  { char: 'ô', tip: '^ + o' },
  { char: 'É', tip: "' + E" },
];

const KEYBOARD_ROWS = [
  [
    { code: 'Backquote', label: '`', shift: '~', zone: 'z-pinky' },
    { code: 'Digit1', label: '1', shift: '!', zone: 'z-pinky' },
    { code: 'Digit2', label: '2', shift: '@', zone: 'z-ring' },
    { code: 'Digit3', label: '3', shift: '#', zone: 'z-middle' },
    { code: 'Digit4', label: '4', shift: '$', zone: 'z-index-l' },
    { code: 'Digit5', label: '5', shift: '%', zone: 'z-index-l' },
    { code: 'Digit6', label: '6', shift: '^', zone: 'z-index-r' },
    { code: 'Digit7', label: '7', shift: '&', zone: 'z-index-r' },
    { code: 'Digit8', label: '8', shift: '*', zone: 'z-middle' },
    { code: 'Digit9', label: '9', shift: '(', zone: 'z-ring' },
    { code: 'Digit0', label: '0', shift: ')', zone: 'z-pinky' },
    { code: 'Minus', label: '-', shift: '_', zone: 'z-pinky' },
    { code: 'Equal', label: '=', shift: '+', zone: 'z-pinky' },
    { code: 'Backspace', label: '⌫', wide: 'kb-wide-md', zone: 'z-pinky' },
  ],
  [
    { code: 'Tab', label: 'Tab', wide: 'kb-wide-sm', zone: 'z-pinky' },
    { code: 'KeyQ', label: 'Q', zone: 'z-pinky' },
    { code: 'KeyW', label: 'W', zone: 'z-ring' },
    { code: 'KeyE', label: 'E', zone: 'z-middle' },
    { code: 'KeyR', label: 'R', zone: 'z-index-l' },
    { code: 'KeyT', label: 'T', zone: 'z-index-l' },
    { code: 'KeyY', label: 'Y', zone: 'z-index-r' },
    { code: 'KeyU', label: 'U', zone: 'z-index-r' },
    { code: 'KeyI', label: 'I', zone: 'z-middle' },
    { code: 'KeyO', label: 'O', zone: 'z-ring' },
    { code: 'KeyP', label: 'P', zone: 'z-pinky' },
    { code: 'BracketLeft', label: '[', shift: '{', zone: 'z-pinky' },
    { code: 'BracketRight', label: ']', shift: '}', zone: 'z-pinky' },
    { code: 'Backslash', label: '\\', shift: '|', wide: 'kb-wide-sm', zone: 'z-pinky' },
  ],
  [
    { code: 'CapsLock', label: 'Caps', wide: 'kb-wide-md', zone: 'z-pinky' },
    { code: 'KeyA', label: 'A', zone: 'z-pinky' },
    { code: 'KeyS', label: 'S', zone: 'z-ring' },
    { code: 'KeyD', label: 'D', zone: 'z-middle' },
    { code: 'KeyF', label: 'F', zone: 'z-index-l' },
    { code: 'KeyG', label: 'G', zone: 'z-index-l' },
    { code: 'KeyH', label: 'H', zone: 'z-index-r' },
    { code: 'KeyJ', label: 'J', zone: 'z-index-r' },
    { code: 'KeyK', label: 'K', zone: 'z-middle' },
    { code: 'KeyL', label: 'L', zone: 'z-ring' },
    { code: 'Semicolon', label: ';', shift: ':', zone: 'z-pinky' },
    { code: 'Quote', label: "'", shift: '"', zone: 'z-pinky' },
    { code: 'Enter', label: 'Enter', wide: 'kb-wide-md', zone: 'z-pinky' },
  ],
  [
    { code: 'ShiftLeft', label: 'Shift', wide: 'kb-wide-lg', zone: 'z-pinky' },
    { code: 'KeyZ', label: 'Z', zone: 'z-pinky' },
    { code: 'KeyX', label: 'X', zone: 'z-ring' },
    { code: 'KeyC', label: 'C', zone: 'z-middle' },
    { code: 'KeyV', label: 'V', zone: 'z-index-l' },
    { code: 'KeyB', label: 'B', zone: 'z-index-l' },
    { code: 'KeyN', label: 'N', zone: 'z-index-r' },
    { code: 'KeyM', label: 'M', zone: 'z-index-r' },
    { code: 'Comma', label: ',', shift: '<', zone: 'z-middle' },
    { code: 'Period', label: '.', shift: '>', zone: 'z-ring' },
    { code: 'Slash', label: '/', shift: '?', zone: 'z-pinky' },
    { code: 'ShiftRight', label: 'Shift', wide: 'kb-wide-lg', zone: 'z-pinky' },
  ],
  [
    { code: 'Space', label: 'SPACE', wide: 'kb-space', zone: '' },
  ],
];

// Map any character to physical QWERTY key code + whether Shift is needed
export function charToKeyInfo(ch) {
  if (!ch) return { code: null, needsShift: false };
  const base = stripAccent(ch);

  if (base === ' ') return { code: 'Space', needsShift: false };
  if (base >= 'a' && base <= 'z') return { code: `Key${base.toUpperCase()}`, needsShift: false };
  if (base >= 'A' && base <= 'Z') return { code: `Key${base}`, needsShift: true };
  if (base >= '0' && base <= '9') return { code: `Digit${base}`, needsShift: false };

  const punct = {
    "'": { code: 'Quote', needsShift: false },
    '-': { code: 'Minus', needsShift: false },
    ',': { code: 'Comma', needsShift: false },
    '.': { code: 'Period', needsShift: false },
    ';': { code: 'Semicolon', needsShift: false },
    ':': { code: 'Semicolon', needsShift: true },
    '?': { code: 'Slash', needsShift: true },
    '!': { code: 'Digit1', needsShift: true },
  };
  return punct[base] || { code: null, needsShift: false };
}

export function renderAccentBarHTML(expectedChar, showGuide) {
  const buttons = FRENCH_ACCENTS.map(({ char, tip }) => {
    const isTarget = showGuide && expectedChar === char;
    return `
      <button
        type="button"
        class="accent-key ${isTarget ? 'is-target' : ''}"
        data-accent-char="${char}"
        title="Insert ${char} (Strict shortcut: ${tip})"
      >${char}</button>
    `;
  }).join('');

  return `
    <div class="accent-bar" aria-label="French Accented Characters">
      <span class="accent-bar-label">Accents:</span>
      ${buttons}
    </div>
  `;
}

export function renderKeyboardHTML({ showFingerZones = true, expectedChar = null, showGuide = true } = {}) {
  const target = showGuide ? charToKeyInfo(expectedChar) : { code: null, needsShift: false };

  const rowsHtml = KEYBOARD_ROWS.map((row) => {
    const keysHtml = row
      .map((k) => {
        const isNext =
          target.code === k.code ||
          (target.needsShift && (k.code === 'ShiftLeft' || k.code === 'ShiftRight'));
        const classes = ['kb-key', k.wide || '', k.zone || '', isNext ? 'is-next' : '']
          .filter(Boolean)
          .join(' ');
        const sub = k.shift ? `<span class="kb-key-sub">${k.shift}</span>` : '';
        return `<div class="${classes}" data-code="${k.code}">${sub}<span>${k.label}</span></div>`;
      })
      .join('');
    return `<div class="kb-row">${keysHtml}</div>`;
  }).join('');

  return `
    <section class="keyboard-card ${showFingerZones ? 'show-zones' : ''}" aria-label="Interactive French Typing Keyboard">
      <div class="keyboard-head">
        <div class="keyboard-guide-tip">
          <span>Keep index fingers on <strong>F</strong> &amp; <strong>J</strong></span>
        </div>
        <div class="finger-legend" aria-hidden="true">
          <span class="finger-dot"><i style="background:#f3cdd3"></i>Pinky</span>
          <span class="finger-dot"><i style="background:#f4dcb0"></i>Ring</span>
          <span class="finger-dot"><i style="background:#bde8d4"></i>Middle</span>
          <span class="finger-dot"><i style="background:#c2dcfa"></i>Index L</span>
          <span class="finger-dot"><i style="background:#bae4ea"></i>Index R</span>
        </div>
      </div>
      <div class="kb-rows">${rowsHtml}</div>
    </section>
  `;
}

export function updateKeyboardHighlights(rootEl, { expectedChar, showGuide }) {
  if (!rootEl) return;
  const target = showGuide ? charToKeyInfo(expectedChar) : { code: null, needsShift: false };

  rootEl.querySelectorAll('.kb-key.is-next').forEach((el) => el.classList.remove('is-next'));
  if (target.code) {
    const nextEl = rootEl.querySelector(`.kb-key[data-code="${target.code}"]`);
    if (nextEl) nextEl.classList.add('is-next');
    if (target.needsShift) {
      rootEl.querySelectorAll('.kb-key[data-code="ShiftLeft"], .kb-key[data-code="ShiftRight"]').forEach((el) =>
        el.classList.add('is-next')
      );
    }
  }

  rootEl.querySelectorAll('.accent-key.is-target').forEach((el) => el.classList.remove('is-target'));
  if (showGuide && expectedChar) {
    const accEl = rootEl.querySelector(`.accent-key[data-accent-char="${CSS.escape(expectedChar)}"]`);
    if (accEl) accEl.classList.add('is-target');
  }
}

export function flashKeyOnBoard(rootEl, code, isHit) {
  if (!rootEl || !code) return;
  const keyEl = rootEl.querySelector(`.kb-key[data-code="${code}"]`);
  if (!keyEl) return;
  const cls = isHit ? 'is-pressed-hit' : 'is-pressed-miss';
  keyEl.classList.remove('is-pressed-hit', 'is-pressed-miss');
  void keyEl.offsetWidth;
  keyEl.classList.add(cls);
  window.setTimeout(() => keyEl.classList.remove(cls), 180);
}
