import { TypingSession, isAccentedFrenchChar } from '../engine/typingEngine.js';
import { audioEngine } from '../engine/audioEngine.js';
import { soundEffects } from '../engine/soundEffects.js';
import { progressStore } from '../engine/progressStore.js';
import {
  renderAccentBarHTML,
  renderKeyboardHTML,
  updateKeyboardHighlights,
  flashKeyOnBoard,
  charToKeyInfo,
} from './keyboardView.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTypingTrackHTML(session) {
  const text = session.targetText;
  const isMaskedMode = session.mode !== 'guided';

  // Group characters into non-breaking word chunks separated by spaces so words never split mid-word across lines
  const tokens = [];
  let currentWord = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === ' ') {
      if (currentWord.length > 0) {
        tokens.push({ type: 'word', chars: currentWord });
        currentWord = [];
      }
      tokens.push({ type: 'space', index: i, ch: ' ' });
    } else {
      currentWord.push({ index: i, ch });
    }
  }
  if (currentWord.length > 0) {
    tokens.push({ type: 'word', chars: currentWord });
  }

  const renderCell = (index, ch) => {
    const isSpace = ch === ' ';
    const isTyped = index < session.cursor;
    const isActive = index === session.cursor && !session.itemCompleted;
    const isHinted = session.hintedIndices.has(index);
    const isAutoAccent = session.autoAccentedIndices.has(index);
    const isPunct = !isSpace && /^[?!.,;:'"-]$/.test(ch);

    const classes = ['char-cell'];
    if (isSpace) classes.push('is-space');

    if (isTyped) {
      classes.push('is-correct');
      if (isAutoAccent) classes.push('is-auto-accent');
    } else if (isActive) {
      classes.push('is-active');
      if (session.lastErrorAtCursor) classes.push('is-wrong');
      if (isMaskedMode && !isSpace && !isPunct) {
        classes.push('is-masked-slot');
        if (isHinted) classes.push('is-hinted');
      }
    } else {
      classes.push('is-pending');
      if (isMaskedMode && !isSpace && !isPunct) {
        classes.push('is-masked-slot');
        if (isHinted) classes.push('is-hinted');
      }
    }

    const displayChar = isSpace ? '&nbsp;' : escapeHtml(ch);
    return `<span class="${classes.join(' ')}" data-idx="${index}">${displayChar}</span>`;
  };

  return tokens
    .map((tok) => {
      if (tok.type === 'space') {
        return renderCell(tok.index, tok.ch);
      }
      const inner = tok.chars.map((c) => renderCell(c.index, c.ch)).join('');
      return `<span class="word-chunk">${inner}</span>`;
    })
    .join('');
}

function getRelevantGrammar(lesson, curriculum) {
  const id = lesson.id || '';
  if (id.includes('ch2-l3') || id.includes('ch3-l3')) {
    return curriculum.grammarGuides.find((g) => g.id === 'articles') || curriculum.grammarGuides[0];
  }
  if (id.includes('ch2-l4') || id.includes('ch2-l5')) {
    return curriculum.grammarGuides.find((g) => g.id === 'avoir-etre') || curriculum.grammarGuides[0];
  }
  if (id.includes('ch3-l2') || id.includes('ch3-l4')) {
    return curriculum.grammarGuides.find((g) => g.id === 'er-verbs') || curriculum.grammarGuides[0];
  }
  return curriculum.grammarGuides.find((g) => g.id === 'possession') || curriculum.grammarGuides[0];
}

export function createStageController(container, { curriculum, onBackToLessons, onOpenLesson, onStatsUpdated }) {
  let session = null;
  let advanceTimer = null;
  let wpmTimer = null;
  let showGrammarDrawer = false;
  let feedbackState = { text: '', kind: '' };
  let unsubAudio = null;

  function clearTimers() {
    if (advanceTimer) {
      window.clearTimeout(advanceTimer);
      advanceTimer = null;
    }
    if (wpmTimer) {
      window.clearInterval(wpmTimer);
      wpmTimer = null;
    }
  }

  function playCurrentItem(slow = false) {
    if (!session?.currentItem) return;
    audioEngine.play(session.currentItem, {
      voice: progressStore.getPrefs().voice,
      slow,
    });
  }

  function triggerAutoPlayOnItemStart() {
    const prefs = progressStore.getPrefs();
    if (!prefs.autoPlayAudio || !session?.currentItem) return;
    // In Guided & Dictation, play immediately so you hear native French while typing.
    // In Translate mode, wait until completion (or user clicks Listen) so recall stays active!
    if (session.mode === 'guided' || session.mode === 'dictation') {
      playCurrentItem(false);
    }
  }

  function updateTelemetryDOM() {
    if (!session) return;
    const wpmEl = container.querySelector('#st-wpm');
    const accEl = container.querySelector('#st-acc');
    const comboEl = container.querySelector('#st-combo');
    const countEl = container.querySelector('#st-count');
    const fillEl = container.querySelector('#st-progress-fill');

    if (wpmEl) wpmEl.textContent = String(session.getWpm());
    if (accEl) accEl.textContent = `${session.getAccuracy()}%`;
    if (comboEl) comboEl.textContent = `×${session.combo}`;

    const completedCount = session.itemIndex + (session.itemCompleted ? 1 : 0);
    if (countEl) countEl.textContent = `${completedCount} / ${session.items.length}`;
    if (fillEl) {
      const pct = Math.round((completedCount / Math.max(1, session.items.length)) * 100);
      fillEl.style.width = `${pct}%`;
    }
  }

  function updateFeedbackDOM() {
    const el = container.querySelector('#st-feedback');
    if (!el) return;
    el.className = `feedback-line ${feedbackState.kind ? `is-${feedbackState.kind}` : ''}`;
    el.textContent = feedbackState.text;
  }

  function refreshTrackAndKeyboard() {
    if (!session) return;
    const trackEl = container.querySelector('#st-typing-track');
    if (trackEl) {
      trackEl.innerHTML = buildTypingTrackHTML(session);
    }
    const shellEl = container.querySelector('#st-track-shell');
    if (shellEl) {
      shellEl.classList.toggle('is-done', session.itemCompleted);
    }
    const cardEl = container.querySelector('#st-typing-card');
    if (cardEl) {
      cardEl.classList.toggle('is-completed', session.itemCompleted);
    }

    const showGuide = session.mode === 'guided' || session.hintedIndices.has(session.cursor);
    updateKeyboardHighlights(container, {
      expectedChar: session.itemCompleted ? null : session.expectedChar,
      showGuide,
    });

    updateTelemetryDOM();
    updateFeedbackDOM();
  }

  function advanceToNext() {
    clearTimers();
    if (!session) return;

    const hasNext = session.advanceItem();
    if (!hasNext) {
      finishLesson();
      return;
    }

    feedbackState = { text: defaultFeedbackMessage(), kind: '' };
    renderActiveStage();
    audioEngine.preload(session.items.slice(session.itemIndex, session.itemIndex + 6), progressStore.getPrefs().voice);
    triggerAutoPlayOnItemStart();
  }

  function finishLesson() {
    clearTimers();
    soundEffects.playLessonComplete();
    const summary = session.getSummary();

    progressStore.recordCompletion({
      lessonId: session.lesson.id,
      mode: session.mode,
      wpm: summary.wpm,
      accuracy: summary.accuracy,
      stars: summary.stars,
      itemsCount: summary.itemsCount,
    });
    onStatsUpdated();
    renderSummary(summary);
  }

  function defaultFeedbackMessage() {
    if (!session) return '';
    if (session.mode === 'guided') {
      return progressStore.getPrefs().accentMode === 'smart'
        ? 'Start typing the French phrase above — Smart Accents auto-fills é, è, ç, à for smooth flow.'
        : "Strict Accents active — use the Accent Bar or shortcuts ('e → é, `e → è, ^e → ê, ,c → ç).";
    }
    if (session.mode === 'translate') {
      return 'Type the French translation from memory. Press Tab for a letter hint or Ctrl+Space to hear it.';
    }
    return 'Listen closely to the native French voice and type what you hear. Press Ctrl+Space to replay.';
  }

  function processTypedCharacter(ch, physicalCode = null) {
    if (!session || session.lessonCompleted) return;
    if (session.itemCompleted) return;

    const result = session.handleInput(ch);
    if (result.status === 'ignored') return;

    if (result.status === 'deadkey') {
      feedbackState = { text: result.message, kind: 'accent-tip' };
      updateFeedbackDOM();
      return;
    }

    const codeToFlash = physicalCode || charToKeyInfo(ch).code;

    if (result.status === 'hit' || result.status === 'item_complete') {
      soundEffects.playKeyClick();
      flashKeyOnBoard(container, codeToFlash, true);

      if (result.usedSmartAccent) {
        feedbackState = {
          text: `Smart Accent filled "${result.expectedChar}" — notice the accent mark!`,
          kind: 'accent-tip',
        };
      } else if (result.status === 'item_complete') {
        feedbackState = {
          text: `Très bien ! "${result.item.fr}" — press Enter or wait a beat...`,
          kind: 'success',
        };
      } else {
        feedbackState = { text: defaultFeedbackMessage(), kind: '' };
      }

      refreshTrackAndKeyboard();

      if (result.status === 'item_complete') {
        soundEffects.playItemComplete();

        // In Translate mode, reward completion by playing the lifelike French pronunciation!
        if (session.mode === 'translate' && progressStore.getPrefs().autoPlayAudio) {
          playCurrentItem(false);
        }
        // In Dictation mode, reveal the English meaning on completion
        if (session.mode === 'dictation') {
          session.revealEnglishInDictation = true;
          const enEl = container.querySelector('#st-prompt-english');
          if (enEl) {
            enEl.classList.remove('is-masked');
            enEl.textContent = session.currentItem.en;
          }
        }

        const delayMs = session.mode === 'translate' ? 1450 : 750;
        advanceTimer = window.setTimeout(() => {
          advanceToNext();
        }, delayMs);
      }
      return;
    }

    if (result.status === 'miss') {
      soundEffects.playError();
      flashKeyOnBoard(container, codeToFlash, false);

      const shellEl = container.querySelector('#st-track-shell');
      if (shellEl) {
        shellEl.classList.remove('has-error');
        void shellEl.offsetWidth;
        shellEl.classList.add('has-error');
      }

      if (result.needsAccentHint) {
        feedbackState = {
          text: `Almost! "${result.expectedChar}" needs its French accent — click it below or switch to Smart Accents.`,
          kind: 'accent-tip',
        };
      } else if (result.autoRevealed) {
        feedbackState = {
          text: `Hint revealed: next letter is "${result.expectedChar === ' ' ? 'Space' : result.expectedChar}".`,
          kind: 'error',
        };
      } else if (session.mode === 'guided') {
        feedbackState = {
          text: `Expected "${result.expectedChar === ' ' ? 'Space' : result.expectedChar}"${
            isAccentedFrenchChar(result.expectedChar) ? ' (accented letter)' : ''
          }.`,
          kind: 'error',
        };
      } else {
        feedbackState = {
          text: 'Not quite — try again, or press Tab for a letter hint.',
          kind: 'error',
        };
      }

      refreshTrackAndKeyboard();
    }
  }

  function renderSummary(summary) {
    const allLessons = curriculum.chapters.flatMap((c) => c.lessons);
    const curIdx = allLessons.findIndex((l) => l.id === summary.lesson.id);
    const nextLesson = curIdx >= 0 && curIdx + 1 < allLessons.length ? allLessons[curIdx + 1] : null;
    const nextMode =
      summary.mode === 'guided' ? 'translate' : summary.mode === 'translate' ? 'dictation' : null;

    const missedHtml =
      summary.missedItems.length > 0
        ? `
          <div class="missed-box">
            <h3>Tricky Words &amp; Sentences to Review (${summary.missedItems.length})</h3>
            <div class="missed-list">
              ${summary.missedItems
                .map(
                  (m) => `
                    <div class="missed-row">
                      <div>
                        <div class="missed-fr">${escapeHtml(m.fr)}</div>
                        <div class="missed-en">${escapeHtml(m.en)}</div>
                      </div>
                      <button type="button" class="icon-play-btn" data-replay-missed="${m.id}" title="Hear pronunciation">▶</button>
                    </div>
                  `
                )
                .join('')}
            </div>
          </div>
        `
        : '';

    container.innerHTML = `
      <section class="summary-card" aria-label="Lesson Complete">
        <div class="summary-stars" aria-label="${summary.stars} out of 3 stars">
          ${[1, 2, 3]
            .map((n) => `<span class="summary-star ${n <= summary.stars ? 'is-earned' : ''}">★</span>`)
            .join('')}
        </div>
        <h1 class="summary-title">Magnifique ! Lesson Complete</h1>
        <p class="summary-sub">
          ${escapeHtml(summary.lesson.title)} · <strong>${summary.mode.toUpperCase()}</strong> mode
        </p>

        <div class="summary-grid">
          <div class="summary-metric">
            <div class="summary-metric-val" style="color:var(--blue-600);">${summary.wpm}</div>
            <div class="summary-metric-lbl">WPM Speed</div>
          </div>
          <div class="summary-metric">
            <div class="summary-metric-val" style="color:var(--green-600);">${summary.accuracy}%</div>
            <div class="summary-metric-lbl">Accuracy</div>
          </div>
          <div class="summary-metric">
            <div class="summary-metric-val" style="color:var(--amber-600);">×${summary.maxCombo}</div>
            <div class="summary-metric-lbl">Best Streak</div>
          </div>
          <div class="summary-metric">
            <div class="summary-metric-val">${summary.itemsCount}</div>
            <div class="summary-metric-lbl">Prompts</div>
          </div>
        </div>

        ${missedHtml}

        <div class="summary-actions">
          ${
            nextMode
              ? `<button type="button" class="btn btn-primary" id="sum-next-mode">
                  Level Up → Try ${nextMode === 'translate' ? 'Translate Mode' : 'Dictation Mode'}
                </button>`
              : ''
          }
          ${
            nextLesson
              ? `<button type="button" class="btn ${nextMode ? 'btn-success' : 'btn-primary'}" id="sum-next-lesson">
                  Next Lesson (${nextLesson.number}) →
                </button>`
              : ''
          }
          ${
            summary.missedItems.length > 0
              ? `<button type="button" class="btn btn-secondary" id="sum-drill-missed">
                  Drill ${summary.missedItems.length} Missed Items
                </button>`
              : ''
          }
          <button type="button" class="btn btn-secondary" id="sum-retry">Practice Again</button>
          <button type="button" class="btn btn-ghost" id="sum-back">All Lessons</button>
        </div>
      </section>
    `;

    container.querySelectorAll('[data-replay-missed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = summary.missedItems.find((i) => i.id === btn.dataset.replayMissed);
        if (item) audioEngine.play(item, { voice: progressStore.getPrefs().voice });
      });
    });

    container.querySelector('#sum-next-mode')?.addEventListener('click', () => {
      start(summary.lesson, nextMode);
    });

    container.querySelector('#sum-next-lesson')?.addEventListener('click', () => {
      if (nextLesson) onOpenLesson(nextLesson.id, 'guided');
    });

    container.querySelector('#sum-drill-missed')?.addEventListener('click', () => {
      start(
        {
          id: `custom-missed-${Date.now()}`,
          number: 'Review',
          title: `Missed Items — ${summary.lesson.title}`,
          frenchTitle: 'Révision ciblée',
          pages: summary.lesson.pages,
          items: summary.missedItems,
        },
        summary.mode
      );
    });

    container.querySelector('#sum-retry')?.addEventListener('click', () => {
      start(summary.lesson, summary.mode);
    });

    container.querySelector('#sum-back')?.addEventListener('click', () => {
      onBackToLessons();
    });
  }

  function renderActiveStage() {
    if (!session || !session.currentItem) return;
    const item = session.currentItem;
    const prefs = progressStore.getPrefs();
    const completedCount = session.itemIndex + (session.itemCompleted ? 1 : 0);
    const pct = Math.round((completedCount / Math.max(1, session.items.length)) * 100);
    const showGuide = session.mode === 'guided' || session.hintedIndices.has(session.cursor);
    const grammar = getRelevantGrammar(session.lesson, curriculum);

    const englishMasked = session.mode === 'dictation' && !session.revealEnglishInDictation;

    container.innerHTML = `
      <div class="stage-wrap">
        <div class="stage-header">
          <div class="stage-title-group">
            <button type="button" class="btn btn-secondary btn-sm" id="st-back-btn">← Lessons</button>
            <div>
              <h1 class="stage-lesson-title">Lesson ${escapeHtml(session.lesson.number)}: ${escapeHtml(session.lesson.title)}</h1>
              <div class="stage-lesson-meta">${escapeHtml(session.lesson.frenchTitle || '')} · PDF ${escapeHtml(session.lesson.pages || '')}</div>
            </div>
          </div>

          <div class="mode-switcher" role="tablist" aria-label="Practice Mode">
            <button type="button" role="tab" class="mode-btn ${session.mode === 'guided' ? 'is-active' : ''}" data-mode="guided">
              <span>Guided</span>
              <span class="mode-btn-tag">Learn</span>
            </button>
            <button type="button" role="tab" class="mode-btn ${session.mode === 'translate' ? 'is-active' : ''}" data-mode="translate">
              <span>Translate</span>
              <span class="mode-btn-tag">EN → FR</span>
            </button>
            <button type="button" role="tab" class="mode-btn ${session.mode === 'dictation' ? 'is-active' : ''}" data-mode="dictation">
              <span>Dictation</span>
              <span class="mode-btn-tag">Listen</span>
            </button>
          </div>
        </div>

        <div class="telemetry-bar">
          <div class="telemetry-metrics">
            <div class="metric-item">
              <span class="metric-label">Speed</span>
              <span class="metric-val is-blue" id="st-wpm">${session.getWpm()}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Accuracy</span>
              <span class="metric-val is-good" id="st-acc">${session.getAccuracy()}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Streak</span>
              <span class="metric-val is-combo" id="st-combo">×${session.combo}</span>
            </div>
          </div>

          <div class="progress-inline">
            <div class="progress-inline-head">
              <span>Lesson Progress</span>
              <span id="st-count">${completedCount} / ${session.items.length}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" id="st-progress-fill" style="width:${pct}%;"></div>
            </div>
          </div>

          <div class="stage-controls">
            <button type="button" class="toggle-pill is-on" id="ctl-voice" title="Switch native French speaker">
              🎙 ${prefs.voice === 'remy' ? 'Rémy' : 'Vivienne'}
            </button>
            <button
              type="button"
              class="toggle-pill ${prefs.accentMode === 'smart' ? 'is-on' : ''}"
              id="ctl-accents"
              title="Smart Accents auto-inserts French accents from base letters; Strict requires exact accents"
            >
              é ${prefs.accentMode === 'smart' ? 'Smart Accents' : 'Strict Accents'}
            </button>
            <button type="button" class="toggle-pill ${showGrammarDrawer ? 'is-on' : ''}" id="ctl-grammar" title="Toggle quick grammar sheet">
              📖 Grammar
            </button>
            <button type="button" class="toggle-pill ${prefs.showKeyboard ? 'is-on' : ''}" id="ctl-keyboard" title="Show or hide visual keyboard">
              ⌨ Keys
            </button>
            <button type="button" class="toggle-pill ${prefs.keySounds ? 'is-on' : ''}" id="ctl-sfx" title="Toggle tactile typing clicks">
              ${prefs.keySounds ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        ${
          showGrammarDrawer && grammar
            ? `
              <aside class="grammar-drawer" aria-label="Quick Grammar Reference">
                <div class="grammar-drawer-head">
                  <h3>${escapeHtml(grammar.title)} (${escapeHtml(grammar.pages)})</h3>
                  <button type="button" class="btn btn-ghost btn-sm" id="ctl-close-grammar">Hide ✕</button>
                </div>
                <p style="margin:0 0 10px; font-size:13px; color:var(--ink-secondary);">${escapeHtml(grammar.summary)}</p>
                <table class="grammar-table">
                  <thead><tr>${grammar.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
                  <tbody>${grammar.rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
              </aside>
            `
            : ''
        }

        <section class="typing-card is-focused" id="st-typing-card" tabindex="0">
          <div class="typing-card-top">
            <div class="card-badges">
              <span class="pill-badge">${escapeHtml(item.tag)}</span>
              <span class="pill-badge neutral">${item.type === 'sentence' ? 'Sentence' : item.type === 'phrase' ? 'Phrase' : 'Vocabulary'}</span>
            </div>

            <div class="audio-controls">
              <button
                type="button"
                class="audio-btn ${audioEngine.activeItemId === item.id ? 'is-playing' : ''}"
                id="st-play-audio"
                title="Listen in native French (Ctrl+Space)"
              >
                <span class="eq-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                <span>Listen (${prefs.voice === 'remy' ? 'Rémy' : 'Vivienne'})</span>
              </button>
              <button
                type="button"
                class="audio-btn-slow"
                id="st-play-slow"
                title="Slow clear French pronunciation (Ctrl+S)"
              >0.75× Slow</button>
            </div>
          </div>

          <div class="prompt-area">
            <div class="prompt-kicker">
              ${
                session.mode === 'dictation'
                  ? 'Listen to the French audio and type what you hear'
                  : 'Type in French'
              }
            </div>
            <p class="prompt-english ${englishMasked ? 'is-masked' : ''}" id="st-prompt-english">
              ${
                englishMasked
                  ? '🎧 Listening challenge — type what you hear'
                  : escapeHtml(item.en)
              }
            </p>
            ${
              item.hint && !englishMasked
                ? `<p class="prompt-hint">💡 ${escapeHtml(item.hint)}</p>`
                : ''
            }
          </div>

          <div class="typing-track-shell" id="st-track-shell">
            <div class="typing-track" id="st-typing-track" aria-live="polite">
              ${buildTypingTrackHTML(session)}
            </div>
            <input
              type="text"
              class="mobile-input-proxy"
              id="st-mobile-input"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              aria-label="Type the French word or sentence"
            />
          </div>

          <div class="typing-card-footer">
            <div class="feedback-line ${feedbackState.kind ? `is-${feedbackState.kind}` : ''}" id="st-feedback">
              ${escapeHtml(feedbackState.text)}
            </div>
            <div class="stage-action-links">
              ${
                session.mode !== 'guided'
                  ? `<button type="button" class="btn btn-secondary btn-sm" id="st-hint-btn" title="Reveal next letter (Tab)">Hint <span class="kbd-hint">Tab</span></button>
                     <button type="button" class="btn btn-ghost btn-sm" id="st-peek-word-btn" title="Reveal current word (Shift+Tab)">Reveal Word</button>`
                  : ''
              }
              ${
                englishMasked
                  ? `<button type="button" class="btn btn-ghost btn-sm" id="st-show-en-btn">Show English</button>`
                  : ''
              }
              <button type="button" class="btn btn-ghost btn-sm" id="st-skip-btn" title="Move to next item">Skip →</button>
            </div>
          </div>
        </section>

        ${renderAccentBarHTML(session.expectedChar, showGuide)}

        ${
          prefs.showKeyboard
            ? renderKeyboardHTML({
                showFingerZones: prefs.showFingerZones,
                expectedChar: session.expectedChar,
                showGuide,
              })
            : ''
        }
      </div>
    `;

    bindStageEvents();
  }

  function bindStageEvents() {
    container.querySelector('#st-back-btn')?.addEventListener('click', () => {
      stop();
      onBackToLessons();
    });

    container.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.mode;
        progressStore.updatePref('practiceMode', nextMode);
        start(session.lesson, nextMode);
      });
    });

    container.querySelector('#ctl-voice')?.addEventListener('click', () => {
      const next = progressStore.getPrefs().voice === 'remy' ? 'vivienne' : 'remy';
      progressStore.updatePref('voice', next);
      renderActiveStage();
      playCurrentItem(false);
    });

    container.querySelector('#ctl-accents')?.addEventListener('click', () => {
      const next = progressStore.getPrefs().accentMode === 'smart' ? 'strict' : 'smart';
      progressStore.updatePref('accentMode', next);
      session.setAccentMode(next);
      feedbackState = { text: defaultFeedbackMessage(), kind: '' };
      renderActiveStage();
    });

    container.querySelector('#ctl-grammar')?.addEventListener('click', () => {
      showGrammarDrawer = !showGrammarDrawer;
      renderActiveStage();
    });

    container.querySelector('#ctl-close-grammar')?.addEventListener('click', () => {
      showGrammarDrawer = false;
      renderActiveStage();
    });

    container.querySelector('#ctl-keyboard')?.addEventListener('click', () => {
      const next = !progressStore.getPrefs().showKeyboard;
      progressStore.updatePref('showKeyboard', next);
      renderActiveStage();
    });

    container.querySelector('#ctl-sfx')?.addEventListener('click', () => {
      const next = !progressStore.getPrefs().keySounds;
      progressStore.updatePref('keySounds', next);
      soundEffects.setEnabled(next);
      renderActiveStage();
    });

    container.querySelector('#st-play-audio')?.addEventListener('click', () => playCurrentItem(false));
    container.querySelector('#st-play-slow')?.addEventListener('click', () => playCurrentItem(true));

    container.querySelector('#st-hint-btn')?.addEventListener('click', () => {
      session.revealHintChar();
      feedbackState = { text: 'Letter hint shown!', kind: 'accent-tip' };
      refreshTrackAndKeyboard();
    });

    container.querySelector('#st-peek-word-btn')?.addEventListener('click', () => {
      session.revealCurrentWord();
      feedbackState = { text: 'Word revealed — type it out to lock it in!', kind: 'accent-tip' };
      refreshTrackAndKeyboard();
    });

    container.querySelector('#st-show-en-btn')?.addEventListener('click', () => {
      session.revealEnglishInDictation = true;
      renderActiveStage();
    });

    container.querySelector('#st-skip-btn')?.addEventListener('click', () => {
      if (session.currentItem) {
        session.missedItemsMap.set(session.currentItem.id, session.currentItem);
      }
      advanceToNext();
    });

    container.querySelectorAll('[data-accent-char]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        processTypedCharacter(btn.dataset.accentChar);
      });
    });

    const shell = container.querySelector('#st-track-shell');
    const mobileInput = container.querySelector('#st-mobile-input');
    shell?.addEventListener('click', () => {
      mobileInput?.focus();
    });

    mobileInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val) {
        for (const ch of val) {
          processTypedCharacter(ch);
        }
        e.target.value = '';
      }
    });
  }

  function handleKeyDown(e) {
    if (!session || session.lessonCompleted) return;
    // Ignore typing when user is typing in another input outside our hidden mobile proxy
    const tag = document.activeElement?.tagName;
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && document.activeElement?.id !== 'st-mobile-input') {
      return;
    }

    // Audio shortcuts
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      playCurrentItem(false);
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      playCurrentItem(true);
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (session.mode !== 'guided' && !session.itemCompleted) {
        if (e.shiftKey) {
          session.revealCurrentWord();
          feedbackState = { text: 'Word revealed — type it out!', kind: 'accent-tip' };
        } else {
          session.revealHintChar();
          feedbackState = { text: 'Letter hint revealed!', kind: 'accent-tip' };
        }
        refreshTrackAndKeyboard();
      }
      return;
    }

    if (e.key === 'Enter' && session.itemCompleted) {
      e.preventDefault();
      advanceToNext();
      return;
    }

    if (e.key === ' ' || e.key.length === 1) {
      e.preventDefault();
      processTypedCharacter(e.key, e.code);
    }
  }

  function start(lesson, mode) {
    clearTimers();
    audioEngine.stop();

    const prefs = progressStore.getPrefs();
    soundEffects.setEnabled(prefs.keySounds);
    progressStore.setLastLesson(lesson.id);

    session = new TypingSession(lesson, {
      mode: mode || prefs.practiceMode || 'guided',
      accentMode: prefs.accentMode || 'smart',
    });

    feedbackState = { text: defaultFeedbackMessage(), kind: '' };

    if (!unsubAudio) {
      unsubAudio = audioEngine.onStateChange(({ isPlaying, itemId }) => {
        const btn = container.querySelector('#st-play-audio');
        if (btn && session?.currentItem) {
          btn.classList.toggle('is-playing', isPlaying && itemId === session.currentItem.id);
        }
      });
    }

    renderActiveStage();
    audioEngine.preload(lesson.items, prefs.voice);
    triggerAutoPlayOnItemStart();

    wpmTimer = window.setInterval(() => {
      if (session && session.startedAt && !session.lessonCompleted) {
        updateTelemetryDOM();
      }
    }, 600);
  }

  function stop() {
    clearTimers();
    audioEngine.stop();
  }

  function hasActiveSession() {
    return Boolean(session && !session.lessonCompleted);
  }

  return {
    start,
    stop,
    handleKeyDown,
    hasActiveSession,
  };
}
