import { progressStore } from '../engine/progressStore.js';
import { audioEngine } from '../engine/audioEngine.js';

function renderStars(count) {
  let html = '';
  for (let i = 1; i <= 3; i += 1) {
    html += `<span class="${i <= count ? 'earned' : ''}">★</span>`;
  }
  return html;
}

function countWords(items) {
  return items
    .map((i) => i.fr)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function renderParagraphsView(container, paragraphsData, { onStartParagraph }) {
  const paragraphs = paragraphsData.paragraphs;

  function render() {
    let completedModes = 0;
    let totalStars = 0;
    let completedParagraphs = 0;

    for (const p of paragraphs) {
      const prog = progressStore.getLessonProgress(p.id);
      if (prog.guided?.stars) completedModes += 1;
      if (prog.translate?.stars) completedModes += 1;
      if (prog.dictation?.stars) completedModes += 1;
      const best = progressStore.getLessonBestStars(p.id);
      totalStars += best;
      if (prog.guided?.stars && prog.translate?.stars && prog.dictation?.stars) {
        completedParagraphs += 1;
      }
    }

    const maxModes = paragraphs.length * 3;
    const pct = Math.round((completedModes / Math.max(1, maxModes)) * 100);

    // Pick recommended next paragraph + step in Guided -> Translate -> Dictation order
    let recPara = paragraphs[0];
    let recMode = 'guided';
    for (const p of paragraphs) {
      const prog = progressStore.getLessonProgress(p.id);
      if (!prog.guided?.stars) {
        recPara = p;
        recMode = 'guided';
        break;
      }
      if (!prog.translate?.stars) {
        recPara = p;
        recMode = 'translate';
        break;
      }
      if (!prog.dictation?.stars) {
        recPara = p;
        recMode = 'dictation';
        break;
      }
    }

    const cardsHtml = paragraphs
      .map((p) => {
        const prog = progressStore.getLessonProgress(p.id);
        const bestStars = progressStore.getLessonBestStars(p.id);
        const words = countWords(p.items);
        const fullFrench = p.items.map((i) => i.fr).join(' ');

        const gDone = Boolean(prog.guided?.stars);
        const tDone = Boolean(prog.translate?.stars);
        const dDone = Boolean(prog.dictation?.stars);

        const nextStep = !gDone ? 'guided' : !tDone ? 'translate' : !dDone ? 'dictation' : null;

        const stepBtn = (mode, stepNum, label, sub, isDone) => {
          const isNext = nextStep === mode;
          const cls = ['para-step-btn', isDone ? 'is-cleared' : '', isNext ? 'is-next-step' : '']
            .filter(Boolean)
            .join(' ');
          return `
            <button type="button" class="${cls}" data-start-para="${p.id}" data-start-mode="${mode}">
              <span>${isDone ? '✓ ' : `${stepNum}. `}${label}</span>
              <small>${sub}</small>
            </button>
          `;
        };

        return `
          <article class="paragraph-card" data-para-id="${p.id}">
            <div>
              <div class="paragraph-card-head">
                <div class="paragraph-badges">
                  <span class="lesson-num">${p.number}</span>
                  <span class="pill-badge teal">${p.tenseFocus}</span>
                  <span class="pill-badge neutral">${p.sourceLabel}</span>
                </div>
                <span class="lesson-stars-inline" aria-label="${bestStars} out of 3 stars">${renderStars(bestStars)}</span>
              </div>

              <h3 class="paragraph-title">${p.title}</h3>
              <div class="paragraph-fr-title">${p.frenchTitle}</div>
              <p class="paragraph-desc">${p.description}</p>

              <div class="paragraph-preview-box">
                <div>
                  <p class="paragraph-preview-text">“${fullFrench}”</p>
                  <div class="paragraph-preview-meta">${p.items.length} sentences · ~${words} words · Native Parisian audio</div>
                </div>
                <div class="phrase-play-group">
                  <button
                    type="button"
                    class="icon-play-btn"
                    data-play-full="${p.id}"
                    data-slow="false"
                    title="Listen to the full French paragraph"
                    aria-label="Listen to ${p.frenchTitle}"
                  >▶</button>
                  <button
                    type="button"
                    class="audio-btn-slow"
                    data-play-full="${p.id}"
                    data-slow="true"
                    title="Listen to full paragraph slowly (0.75×)"
                  >0.75×</button>
                </div>
              </div>
            </div>

            <div class="para-step-actions" aria-label="3-Step Paragraph Mastery">
              ${stepBtn('guided', 1, 'Guided', 'Learn & Type', gDone)}
              ${stepBtn('translate', 2, 'Translate', 'EN → FR', tDone)}
              ${stepBtn('dictation', 3, 'Dictation', 'Listen & Type', dDone)}
            </div>
          </article>
        `;
      })
      .join('');

    container.innerHTML = `
      <section class="paragraphs-hero">
        <div>
          <div class="hero-eyebrow">Paragraph Practice · Built From Your Chapters &amp; 20 Core Verbs</div>
          <h1>Type Complete French Paragraphs Step by Step</h1>
          <p>
            Put your classroom vocabulary, home stories, and top 20 French verbs together in short, natural
            5-sentence paragraphs. Master each story in the exact 3-step flow:
          </p>

          <div class="loop-steps" aria-label="3-Step Learning Flow">
            <span class="loop-step"><span class="loop-step-num">1</span> Guided</span>
            <span class="loop-arrow" aria-hidden="true">→</span>
            <span class="loop-step"><span class="loop-step-num">2</span> Translate</span>
            <span class="loop-arrow" aria-hidden="true">→</span>
            <span class="loop-step"><span class="loop-step-num">3</span> Dictation</span>
          </div>

          <div class="hero-actions">
            <button type="button" class="btn btn-primary" id="para-continue-btn">
              <span>▶ Continue ${recPara.number}: ${recPara.title} (${recMode.charAt(0).toUpperCase() + recMode.slice(1)})</span>
            </button>
          </div>
        </div>

        <aside class="hero-progress-panel" aria-label="Paragraph Progress Overview">
          <div class="hero-panel-top">
            <span class="hero-panel-title">3-Step Mastery</span>
            <span class="hero-panel-pct">${pct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%;"></div>
          </div>
          <div class="hero-mini-stats">
            <div class="hero-mini-stat">
              <div class="hero-mini-val">${completedModes}/${maxModes}</div>
              <div class="hero-mini-lbl">Steps Done</div>
            </div>
            <div class="hero-mini-stat">
              <div class="hero-mini-val">${completedParagraphs}/${paragraphs.length}</div>
              <div class="hero-mini-lbl">Full Mastery</div>
            </div>
            <div class="hero-mini-stat">
              <div class="hero-mini-val">${totalStars}/${paragraphs.length * 3}</div>
              <div class="hero-mini-lbl">Stars ★</div>
            </div>
          </div>
        </aside>
      </section>

      <section aria-label="French Practice Paragraphs">
        <div class="paragraphs-grid">${cardsHtml}</div>
      </section>
    `;

    container.querySelector('#para-continue-btn')?.addEventListener('click', () => {
      onStartParagraph({ ...recPara, sourceSection: 'paragraphs', pages: recPara.sourceLabel }, recMode);
    });

    container.querySelectorAll('[data-start-para]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const para = paragraphs.find((p) => p.id === btn.dataset.startPara);
        if (para) {
          onStartParagraph({ ...para, sourceSection: 'paragraphs', pages: para.sourceLabel }, btn.dataset.startMode);
        }
      });
    });

    container.querySelectorAll('[data-play-full]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const para = paragraphs.find((p) => p.id === btn.dataset.playFull);
        if (para) {
          const fullText = para.items.map((i) => i.fr).join(' ');
          audioEngine.play(
            { id: para.fullAudioId, fr: fullText },
            { voice: progressStore.getPrefs().voice, slow: btn.dataset.slow === 'true' }
          );
        }
      });
    });
  }

  render();
}
