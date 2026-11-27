import { progressStore } from '../engine/progressStore.js';

function renderStars(count) {
  let html = '';
  for (let i = 1; i <= 3; i += 1) {
    html += `<span class="${i <= count ? 'earned' : ''}">★</span>`;
  }
  return html;
}

export function renderCurriculumView(container, curriculum, { onSelectLesson, onStartDailySprint }) {
  const allLessons = curriculum.chapters.flatMap((ch) => ch.lessons);
  const summary = progressStore.getSummary(allLessons.map((l) => l.id));
  const continueLesson =
    allLessons.find((l) => l.id === summary.lastLessonId) || allLessons[0];
  const completionPct = Math.round((summary.earnedStars / Math.max(1, summary.maxStars)) * 100);

  const chaptersHtml = curriculum.chapters
    .map((chapter) => {
      const cardsHtml = chapter.lessons
        .map((lesson) => {
          const prog = progressStore.getLessonProgress(lesson.id);
          const bestStars = progressStore.getLessonBestStars(lesson.id);
          const bestWpm = Math.max(
            prog.guided?.wpm || 0,
            prog.translate?.wpm || 0,
            prog.dictation?.wpm || 0
          );

          return `
            <article class="lesson-card" data-lesson-id="${lesson.id}">
              <div>
                <div class="lesson-card-top">
                  <span class="lesson-num">Lesson ${lesson.number}</span>
                  <span class="lesson-stars-inline" aria-label="${bestStars} out of 3 stars">${renderStars(bestStars)}</span>
                </div>
                <h3 class="lesson-title">${lesson.title}</h3>
                <div class="lesson-french-sub">${lesson.frenchTitle}</div>
                <p class="lesson-desc">${lesson.description}</p>
              </div>

              <div style="display:flex; flex-direction:column; gap:10px;">
                <div class="lesson-meta-row">
                  <span>${lesson.items.length} prompts</span>
                  <span>·</span>
                  <span>${lesson.focus}</span>
                  <span>·</span>
                  <span>${lesson.pages}</span>
                  ${bestWpm > 0 ? `<span>· <strong>${bestWpm} WPM</strong></span>` : ''}
                </div>

                <div class="lesson-mode-badges">
                  <span class="mode-mini ${prog.guided?.stars ? 'is-cleared' : ''}">
                    ${prog.guided?.stars ? '✓ ' : ''}Guided
                  </span>
                  <span class="mode-mini ${prog.translate?.stars ? 'is-cleared' : ''}">
                    ${prog.translate?.stars ? '✓ ' : ''}Translate
                  </span>
                  <span class="mode-mini ${prog.dictation?.stars ? 'is-cleared' : ''}">
                    ${prog.dictation?.stars ? '✓ ' : ''}Dictation
                  </span>
                </div>

                <div class="lesson-card-actions">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    data-start-lesson="${lesson.id}"
                    data-start-mode="guided"
                  >Practice</button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    data-start-lesson="${lesson.id}"
                    data-start-mode="translate"
                    title="See English, type French from memory"
                  >Translate</button>
                </div>
              </div>
            </article>
          `;
        })
        .join('');

      return `
        <section class="chapter-section" aria-labelledby="chapter-title-${chapter.id}">
          <div class="chapter-header">
            <div class="chapter-title-row">
              <div class="chapter-num-circle" style="background:${chapter.accentColor};">${chapter.number}</div>
              <div>
                <h2 class="chapter-heading" id="chapter-title-${chapter.id}">
                  Chapitre ${chapter.number}: ${chapter.title}
                  <span style="font-weight:600; color:var(--ink-muted); font-size:17px;">— ${chapter.englishTitle}</span>
                </h2>
                <p class="chapter-sub">${chapter.description}</p>
              </div>
            </div>
            <span class="pill-badge neutral">PDF ${chapter.pages}</span>
          </div>
          <div class="lessons-grid">${cardsHtml}</div>
        </section>
      `;
    })
    .join('');

  container.innerHTML = `
    <section class="hero-banner">
      <div>
        <div class="hero-eyebrow">French 1 Curriculum · Chapters 2–6 (pp. 9–64)</div>
        <h1>Learn French by Typing Every Word &amp; Sentence</h1>
        <p>
          Build real French recall, spelling, accents, and pronunciation at the same time.
          Start in <strong>Guided</strong> typing flow, graduate to <strong>English → French Recall</strong>,
          and train your ear with lifelike native Parisian French voices.
        </p>
        <div class="hero-actions">
          <button type="button" class="btn btn-primary" id="hero-continue-btn">
            <span>▶ Continue Lesson ${continueLesson.number}: ${continueLesson.title}</span>
          </button>
          <button type="button" class="btn btn-secondary" id="hero-sprint-btn">
            <span>⚡ Mixed Typing Sprint (12 Prompts)</span>
          </button>
        </div>
      </div>

      <aside class="hero-progress-panel" aria-label="Course Mastery Overview">
        <div class="hero-panel-top">
          <span class="hero-panel-title">Course Mastery</span>
          <span class="hero-panel-pct">${completionPct}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${completionPct}%;"></div>
        </div>
        <div class="hero-mini-stats">
          <div class="hero-mini-stat">
            <div class="hero-mini-val">${summary.completedLessons}/${summary.totalLessons}</div>
            <div class="hero-mini-lbl">Lessons</div>
          </div>
          <div class="hero-mini-stat">
            <div class="hero-mini-val">${summary.earnedStars}/${summary.maxStars}</div>
            <div class="hero-mini-lbl">Stars ★</div>
          </div>
          <div class="hero-mini-stat">
            <div class="hero-mini-val">${summary.totalItemsTyped}</div>
            <div class="hero-mini-lbl">Phrases Typed</div>
          </div>
        </div>
      </aside>
    </section>

    ${chaptersHtml}
  `;

  container.querySelector('#hero-continue-btn')?.addEventListener('click', () => {
    onSelectLesson(continueLesson.id, progressStore.getPrefs().practiceMode || 'guided');
  });

  container.querySelector('#hero-sprint-btn')?.addEventListener('click', () => {
    onStartDailySprint();
  });

  container.querySelectorAll('[data-start-lesson]').forEach((btn) => {
    btn.addEventListener('click', () => {
      onSelectLesson(btn.dataset.startLesson, btn.dataset.startMode);
    });
  });
}
