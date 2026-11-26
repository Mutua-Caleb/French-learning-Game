import { progressStore } from '../engine/progressStore.js';
import { audioEngine } from '../engine/audioEngine.js';

const PRONOUN_LABELS = ['je / j’', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];

function renderStars(count) {
  let html = '';
  for (let i = 1; i <= 3; i += 1) {
    html += `<span class="${i <= count ? 'earned' : ''}">★</span>`;
  }
  return html;
}

/**
 * Build a focused, high-impact 10-prompt "Essential Mix" lesson for any of the 20 verbs:
 *   - All 6 Présent forms
 *   - Core Passé composé (je)
 *   - Core Imparfait (je)
 *   - Core Futur simple (je)
 *   - Real-life Preply example sentence
 */
export function buildVerbEssentialLesson(verb) {
  const vid = verb.id;
  const items = [];

  verb.conjugations.present.forEach((fr, idx) => {
    items.push({
      id: `v_${vid}_pr_${idx}`,
      en: `${verb.enForms.present[idx]} (${verb.infinitive})`,
      fr,
      type: 'phrase',
      tag: `${verb.infinitive} · Présent`,
      hint: idx === 0 ? verb.tip : `Present tense of ${verb.infinitive} (${verb.en}).`,
    });
  });

  items.push({
    id: `v_${vid}_pc_0`,
    en: `${verb.enForms.passe_compose_je} (${verb.infinitive} · past)`,
    fr: verb.conjugations.passe_compose[0],
    type: 'phrase',
    tag: `${verb.infinitive} · Passé composé`,
    hint: `Uses '${verb.aux}' as auxiliary in passé composé.`,
  });

  items.push({
    id: `v_${vid}_imp_0`,
    en: `${verb.enForms.imparfait_je} (${verb.infinitive} · imperfect)`,
    fr: verb.conjugations.imparfait[0],
    type: 'phrase',
    tag: `${verb.infinitive} · Imparfait`,
    hint: `Ongoing or habitual past tense of ${verb.infinitive}.`,
  });

  items.push({
    id: `v_${vid}_fut_0`,
    en: `${verb.enForms.futur_je} (${verb.infinitive} · future)`,
    fr: verb.conjugations.futur[0],
    type: 'phrase',
    tag: `${verb.infinitive} · Futur simple`,
    hint: `Simple future tense of ${verb.infinitive}.`,
  });

  if (verb.example) {
    items.push({
      id: verb.example.id,
      en: verb.example.en,
      fr: verb.example.fr,
      type: 'sentence',
      tag: `${verb.infinitive} · ${verb.example.tense}`,
      hint: `Real-life sentence using ${verb.infinitive}.`,
    });
  }

  return {
    id: `verb-${vid}`,
    number: `#${verb.rank}`,
    title: `Verb: ${verb.infinitive} (${verb.en})`,
    frenchTitle: `${verb.infinitive} — Essential 4-Tense Mix`,
    pages: 'Preply Top 20 Verbs',
    sourceSection: 'verbs',
    verbMeta: verb,
    items,
  };
}

export function buildIrregularSprintLesson(verbsData) {
  const pool = [];
  const seen = new Set();
  for (const track of verbsData.tracks) {
    for (const item of track.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        pool.push(item);
      }
    }
  }
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    id: `custom-verb-sprint-${Date.now()}`,
    number: 'Verb Sprint',
    title: '20 Essential Verbs Mixed Sprint',
    frenchTitle: 'Entraînement rapide — Les 20 verbes clés',
    pages: 'Preply Top 20',
    sourceSection: 'verbs',
    items: pool.slice(0, 12),
  };
}

export function renderVerbsView(container, verbsData, { onStartLesson }) {
  let selectedVerbId = verbsData.verbs[0].id;
  let filterGroup = 'all';
  let searchQuery = '';

  function render() {
    const tracks = verbsData.tracks;
    const trackIds = tracks.map((t) => t.id);
    const verbLessonIds = verbsData.verbs.map((v) => `verb-${v.id}`);

    const completedTracks = trackIds.filter((id) => progressStore.getLessonBestStars(id) > 0).length;
    const masteredVerbs = verbLessonIds.filter((id) => progressStore.getLessonBestStars(id) > 0).length;
    const trackStars = trackIds.reduce((sum, id) => sum + progressStore.getLessonBestStars(id), 0);
    const maxTrackStars = trackIds.length * 3;
    const trackPct = Math.round((trackStars / Math.max(1, maxTrackStars)) * 100);

    const nextTrack =
      tracks.find((t) => progressStore.getLessonBestStars(t.id) === 0) || tracks[0];

    const q = searchQuery.trim().toLowerCase();
    const filteredVerbs = verbsData.verbs.filter((v) => {
      if (filterGroup !== 'all' && v.group !== filterGroup) return false;
      if (!q) return true;
      return (
        v.infinitive.toLowerCase().includes(q) ||
        v.en.toLowerCase().includes(q) ||
        v.tip.toLowerCase().includes(q)
      );
    });

    const activeVerb =
      verbsData.verbs.find((v) => v.id === selectedVerbId) || filteredVerbs[0] || verbsData.verbs[0];

    const tracksHtml = tracks
      .map((track) => {
        const prog = progressStore.getLessonProgress(track.id);
        const bestStars = progressStore.getLessonBestStars(track.id);
        const bestWpm = Math.max(
          prog.guided?.wpm || 0,
          prog.translate?.wpm || 0,
          prog.dictation?.wpm || 0
        );

        return `
          <article class="lesson-card" data-track-id="${track.id}">
            <div>
              <div class="lesson-card-top">
                <span class="lesson-num" style="background:var(--teal-100); color:var(--teal-600);">Track ${track.number}</span>
                <span class="lesson-stars-inline" aria-label="${bestStars} out of 3 stars">${renderStars(bestStars)}</span>
              </div>
              <h3 class="lesson-title">${track.title}</h3>
              <div class="lesson-french-sub" style="color:var(--teal-600);">${track.frenchTitle}</div>
              <p class="lesson-desc">${track.description}</p>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px;">
              <div class="lesson-meta-row">
                <span>${track.items.length} prompts</span>
                <span>·</span>
                <span>${track.focus}</span>
                ${bestWpm > 0 ? `<span>· <strong>${bestWpm} WPM</strong></span>` : ''}
              </div>

              <div class="lesson-mode-badges">
                <span class="mode-mini ${prog.guided?.stars ? 'is-cleared' : ''}">${prog.guided?.stars ? '✓ ' : ''}Guided</span>
                <span class="mode-mini ${prog.translate?.stars ? 'is-cleared' : ''}">${prog.translate?.stars ? '✓ ' : ''}Translate</span>
                <span class="mode-mini ${prog.dictation?.stars ? 'is-cleared' : ''}">${prog.dictation?.stars ? '✓ ' : ''}Dictation</span>
              </div>

              <div class="lesson-card-actions">
                <button type="button" class="btn btn-primary btn-sm" data-start-track="${track.id}" data-start-mode="guided">Practice</button>
                <button type="button" class="btn btn-secondary btn-sm" data-start-track="${track.id}" data-start-mode="translate">Translate</button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    const conjRowsHtml = PRONOUN_LABELS.map((pronoun, idx) => {
      const pr = activeVerb.conjugations.present[idx];
      const pc = activeVerb.conjugations.passe_compose[idx];
      const imp = activeVerb.conjugations.imparfait[idx];
      const fut = activeVerb.conjugations.futur[idx];

      const playBtn = (audioId, text) =>
        `<button type="button" class="mini-play-btn" data-verb-audio="${audioId}" data-verb-text="${text.replace(/"/g, '&quot;')}" title="Listen: ${text.replace(/"/g, '&quot;')}" aria-label="Listen ${text.replace(/"/g, '&quot;')}">▶</button>`;

      return `
        <tr>
          <td class="conj-pronoun">${pronoun}</td>
          <td class="conj-present"><span class="conj-play-cell">${playBtn(`v_${activeVerb.id}_pr_${idx}`, pr)}<span>${pr}</span></span></td>
          <td>${idx === 0 ? `<span class="conj-play-cell">${playBtn(`v_${activeVerb.id}_pc_0`, pc)}<span>${pc}</span></span>` : pc}</td>
          <td>${idx === 0 ? `<span class="conj-play-cell">${playBtn(`v_${activeVerb.id}_imp_0`, imp)}<span>${imp}</span></span>` : imp}</td>
          <td>${idx === 0 ? `<span class="conj-play-cell">${playBtn(`v_${activeVerb.id}_fut_0`, fut)}<span>${fut}</span></span>` : fut}</td>
        </tr>
      `;
    }).join('');

    const verbChipsHtml = filteredVerbs
      .map((v) => {
        const stars = progressStore.getLessonBestStars(`verb-${v.id}`);
        const isSel = v.id === activeVerb.id;
        return `
          <button type="button" class="verb-chip-card ${isSel ? 'is-selected' : ''}" data-pick-verb="${v.id}">
            <div class="verb-chip-top">
              <span class="verb-chip-inf">${v.rank}. ${v.infinitive}</span>
              <span class="verb-chip-stars" aria-label="${stars} stars">${renderStars(stars)}</span>
            </div>
            <span class="verb-chip-en">${v.en}</span>
            <div class="verb-chip-meta">
              <span class="${v.group === 'irregular' ? 'verb-tag-irr' : 'verb-tag-reg'}">
                ${v.group === 'irregular' ? 'Irregular' : 'Regular -ER'}
              </span>
              ${v.aux === 'être' ? '<span class="pill-badge neutral" style="font-size:10.5px; padding:1px 6px;">aux: être</span>' : ''}
            </div>
          </button>
        `;
      })
      .join('');

    const hacksHtml = verbsData.memoryHacks
      .map(
        (h) => `
          <article class="hack-card">
            <h3>${h.title}</h3>
            <p>${h.body}</p>
          </article>
        `
      )
      .join('');

    container.innerHTML = `
      <section class="verbs-hero">
        <div>
          <div class="hero-eyebrow">Essential French Conjugation · Top 20 Verbs</div>
          <h1>Master the Most Important French Verbs Step by Step</h1>
          <p>
            Instead of memorizing 480 conjugations all at once, these <strong>6 guided typing tracks</strong>
            teach you the highest-impact forms first — starting with the Big 4 irregulars and the -ER blueprint,
            then unlocking past, imperfect, future, and real-life sentences.
          </p>
          <div class="hero-actions">
            <button type="button" class="btn btn-primary" id="verbs-start-next">
              <span>▶ Start Track ${nextTrack.number}: ${nextTrack.title}</span>
            </button>
            <button type="button" class="btn btn-secondary" id="verbs-sprint-btn">
              <span>⚡ Quick Verbs Sprint (12 Prompts)</span>
            </button>
          </div>
        </div>

        <aside class="hero-progress-panel" aria-label="Verb Mastery Overview">
          <div class="hero-panel-top">
            <span class="hero-panel-title">Verb Tracks Progress</span>
            <span class="hero-panel-pct" style="color:var(--teal-600);">${trackPct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${trackPct}%; background:linear-gradient(90deg, var(--teal-500) 0%, #2dd4bf 100%);"></div>
          </div>
          <div class="hero-mini-stats">
            <div class="hero-mini-stat">
              <div class="hero-mini-val">${completedTracks}/${tracks.length}</div>
              <div class="hero-mini-lbl">Core Tracks</div>
            </div>
            <div class="hero-mini-stat">
              <div class="hero-mini-val">${masteredVerbs}/20</div>
              <div class="hero-mini-lbl">Verbs Drilled</div>
            </div>
            <div class="hero-mini-stat">
              <div class="hero-mini-val">${trackStars}/${maxTrackStars}</div>
              <div class="hero-mini-lbl">Track Stars ★</div>
            </div>
          </div>
        </aside>
      </section>

      <section class="chapter-section" aria-labelledby="verb-tracks-heading">
        <div class="chapter-header">
          <div class="chapter-title-row">
            <div class="chapter-num-circle" style="background:var(--teal-500);">V</div>
            <div>
              <h2 class="chapter-heading" id="verb-tracks-heading">Guided Core Tracks — Most Important Parts First</h2>
              <p class="chapter-sub">Follow Tracks V1 → V6 in order to build automatic verb conjugation fluency through typing &amp; Parisian French audio.</p>
            </div>
          </div>
          <span class="pill-badge teal">6 Curated Tracks</span>
        </div>
        <div class="lessons-grid">${tracksHtml}</div>
      </section>

      <section class="verb-explorer-section" aria-labelledby="verb-explorer-heading">
        <div class="chapter-header">
          <div>
            <h2 class="chapter-heading" id="verb-explorer-heading">Interactive 20-Verb Explorer &amp; Conjugation Lab</h2>
            <p class="chapter-sub">Pick any verb below to study its 4 core tenses, hear native pronunciation, or launch a focused 10-prompt typing drill.</p>
          </div>
        </div>

        <article class="verb-spotlight" aria-label="Selected Verb Conjugation">
          <div class="verb-spotlight-head">
            <div>
              <div class="verb-spotlight-title-row">
                <span class="verb-rank-badge">#${activeVerb.rank} of 20</span>
                <h3 class="verb-spotlight-name">${activeVerb.infinitive}</h3>
                <span class="verb-spotlight-en">— ${activeVerb.en}</span>
                <span class="${activeVerb.group === 'irregular' ? 'verb-tag-irr' : 'verb-tag-reg'}" style="font-size:12px;">
                  ${activeVerb.group === 'irregular' ? 'Irregular' : 'Regular -ER'}
                </span>
                <span class="pill-badge neutral">Past aux: ${activeVerb.aux}</span>
              </div>
            </div>

            <div class="verb-spotlight-actions">
              <button type="button" class="btn btn-primary btn-sm" id="spot-practice-guided">
                Practice Essential Mix (10)
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="spot-practice-translate">
                Translate Recall (EN → FR)
              </button>
            </div>
          </div>

          <div class="verb-tip-banner">
            <strong>💡 Key Rule:</strong> ${activeVerb.tip}
          </div>

          <div class="conj-table-wrap">
            <table class="conj-table">
              <thead>
                <tr>
                  <th>Pronoun</th>
                  <th>Présent <span class="tense-sub">Present (priority)</span></th>
                  <th>Passé composé <span class="tense-sub">Completed past</span></th>
                  <th>Imparfait <span class="tense-sub">Ongoing / habit</span></th>
                  <th>Futur simple <span class="tense-sub">Future</span></th>
                </tr>
              </thead>
              <tbody>
                ${conjRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="verb-example-bar">
            <div>
              <div style="font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; color:var(--teal-600); margin-bottom:2px;">
                Everyday Example · ${activeVerb.example.tense}
              </div>
              <div class="verb-example-fr">${activeVerb.example.fr}</div>
              <div class="verb-example-en">${activeVerb.example.en}</div>
            </div>
            <div class="phrase-play-group">
              <button type="button" class="icon-play-btn" id="spot-play-ex" title="Listen in Parisian French">▶</button>
              <button type="button" class="audio-btn-slow" id="spot-play-ex-slow" title="Listen slowly (0.75×)">0.75×</button>
            </div>
          </div>
        </article>

        <div class="verb-explorer-toolbar">
          <div class="search-box">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.8"/><path d="M13.5 13.5 17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <input
              type="search"
              id="verb-search-input"
              placeholder="Filter verbs (e.g. aller, prendre, want, must)..."
              value="${searchQuery.replace(/"/g, '&quot;')}"
            />
          </div>
          <div class="filter-pills">
            <button type="button" class="toggle-pill ${filterGroup === 'all' ? 'is-on' : ''}" data-vfilter="all">All 20</button>
            <button type="button" class="toggle-pill ${filterGroup === 'irregular' ? 'is-on' : ''}" data-vfilter="irregular">Top Irregulars (11)</button>
            <button type="button" class="toggle-pill ${filterGroup === 'regular-er' ? 'is-on' : ''}" data-vfilter="regular-er">Regular -ER (9)</button>
          </div>
        </div>

        <div class="verb-chips-grid">
          ${verbChipsHtml || '<p style="color:var(--ink-muted);">No matching verbs found.</p>'}
        </div>
      </section>

      <section aria-label="Verb Conjugation Memory Hacks">
        <div class="chapter-header" style="margin-bottom:12px;">
          <h2 class="chapter-heading" style="font-size:18px;">4 Fast Rules to Remember Conjugations</h2>
        </div>
        <div class="hacks-grid">${hacksHtml}</div>
      </section>
    `;

    // Bind events
    container.querySelector('#verbs-start-next')?.addEventListener('click', () => {
      onStartLesson({ ...nextTrack, sourceSection: 'verbs' }, progressStore.getPrefs().practiceMode || 'guided');
    });

    container.querySelector('#verbs-sprint-btn')?.addEventListener('click', () => {
      onStartLesson(buildIrregularSprintLesson(verbsData), 'translate');
    });

    container.querySelectorAll('[data-start-track]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const track = tracks.find((t) => t.id === btn.dataset.startTrack);
        if (track) {
          onStartLesson({ ...track, sourceSection: 'verbs' }, btn.dataset.startMode);
        }
      });
    });

    container.querySelector('#spot-practice-guided')?.addEventListener('click', () => {
      onStartLesson(buildVerbEssentialLesson(activeVerb), 'guided');
    });

    container.querySelector('#spot-practice-translate')?.addEventListener('click', () => {
      onStartLesson(buildVerbEssentialLesson(activeVerb), 'translate');
    });

    container.querySelector('#spot-play-ex')?.addEventListener('click', () => {
      audioEngine.play(activeVerb.example, { voice: progressStore.getPrefs().voice, slow: false });
    });

    container.querySelector('#spot-play-ex-slow')?.addEventListener('click', () => {
      audioEngine.play(activeVerb.example, { voice: progressStore.getPrefs().voice, slow: true });
    });

    container.querySelectorAll('[data-verb-audio]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audioEngine.play(
          { id: btn.dataset.verbAudio, fr: btn.dataset.verbText },
          { voice: progressStore.getPrefs().voice, slow: false }
        );
      });
    });

    container.querySelectorAll('[data-pick-verb]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedVerbId = btn.dataset.pickVerb;
        render();
        container.querySelector('.verb-spotlight')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    container.querySelectorAll('[data-vfilter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterGroup = btn.dataset.vfilter;
        render();
      });
    });

    container.querySelector('#verb-search-input')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
      const refreshed = container.querySelector('#verb-search-input');
      if (refreshed) {
        refreshed.focus();
        refreshed.setSelectionRange(searchQuery.length, searchQuery.length);
      }
    });
  }

  render();
}
