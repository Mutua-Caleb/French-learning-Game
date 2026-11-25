import { audioEngine } from '../engine/audioEngine.js';
import { progressStore } from '../engine/progressStore.js';

export function renderPhrasebookView(container, curriculum) {
  const allEntries = [];
  const seen = new Set();
  for (const ch of curriculum.chapters) {
    for (const lesson of ch.lessons) {
      for (const item of lesson.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          allEntries.push({
            ...item,
            chapterId: ch.id,
            chapterNum: ch.number,
            lessonNumber: lesson.number,
          });
        }
      }
    }
  }

  let searchQuery = '';
  let filterChapter = 'all';

  function render() {
    const voice = progressStore.getPrefs().voice || 'denise';
    const q = searchQuery.trim().toLowerCase();
    const filtered = allEntries.filter((e) => {
      if (filterChapter !== 'all' && e.chapterId !== filterChapter) return false;
      if (!q) return true;
      return (
        e.fr.toLowerCase().includes(q) ||
        e.en.toLowerCase().includes(q) ||
        e.tag.toLowerCase().includes(q)
      );
    });

    const grammarHtml = curriculum.grammarGuides
      .map(
        (g) => `
          <article class="grammar-card">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px;">
              <h3>${g.title}</h3>
              <span class="pill-badge neutral">${g.pages}</span>
            </div>
            <p>${g.summary}</p>
            <table class="grammar-table">
              <thead>
                <tr>${g.headers.map((h) => `<th>${h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${g.rows
                  .map((r) => `<tr>${r.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
                  .join('')}
              </tbody>
            </table>
          </article>
        `
      )
      .join('');

    const cardsHtml = filtered
      .map(
        (item) => `
          <div class="phrase-card">
            <div>
              <div class="phrase-fr">${item.fr}</div>
              <div class="phrase-en">${item.en}</div>
              <div class="phrase-hint">${item.tag} · Lesson ${item.lessonNumber}${item.hint ? ` — ${item.hint}` : ''}</div>
            </div>
            <div class="phrase-play-group">
              <button
                type="button"
                class="icon-play-btn"
                data-play-id="${item.id}"
                data-slow="false"
                title="Listen (${voice === 'henri' ? 'Henri' : 'Denise'})"
                aria-label="Play ${item.fr}"
              >▶</button>
              <button
                type="button"
                class="audio-btn-slow"
                data-play-id="${item.id}"
                data-slow="true"
                title="Listen slowly (0.75×)"
              >0.75×</button>
            </div>
          </div>
        `
      )
      .join('');

    container.innerHTML = `
      <div style="margin-bottom:20px; display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div>
          <h1 style="margin:0 0 4px; font-size:28px; font-weight:800; letter-spacing:-0.025em;">
            Audio Phrasebook &amp; Grammar Reference
          </h1>
          <p style="margin:0; color:var(--ink-secondary); font-size:14.5px;">
            Every key table, word, and sentence from <strong>French 1-9-32.pdf</strong> with studio-quality native Parisian French pronunciation.
          </p>
        </div>
        <button type="button" class="toggle-pill is-on" id="pb-voice-toggle">
          🎙 Voice: ${voice === 'henri' ? 'Henri (Male)' : 'Denise (Female)'}
        </button>
      </div>

      <section aria-label="Grammar Reference Tables">
        <div class="grammar-grid">${grammarHtml}</div>
      </section>

      <section aria-label="Searchable Audio Phrasebook">
        <div class="phrasebook-toolbar">
          <div class="search-box">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.8"/><path d="M13.5 13.5 17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <input
              type="search"
              id="pb-search-input"
              placeholder="Search French or English words, sentences, verbs..."
              value="${searchQuery.replace(/"/g, '&quot;')}"
            />
          </div>
          <div class="filter-pills">
            <button type="button" class="toggle-pill ${filterChapter === 'all' ? 'is-on' : ''}" data-filter-ch="all">All (${allEntries.length})</button>
            <button type="button" class="toggle-pill ${filterChapter === 'ch2' ? 'is-on' : ''}" data-filter-ch="ch2">Ch. 2: Classroom</button>
            <button type="button" class="toggle-pill ${filterChapter === 'ch3' ? 'is-on' : ''}" data-filter-ch="ch3">Ch. 3: Chez nous</button>
          </div>
        </div>

        <div class="phrase-grid">
          ${cardsHtml || '<p style="color:var(--ink-muted);">No matching phrases found.</p>'}
        </div>
      </section>
    `;

    const searchInput = container.querySelector('#pb-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
      const refreshed = container.querySelector('#pb-search-input');
      if (refreshed) {
        refreshed.focus();
        refreshed.setSelectionRange(searchQuery.length, searchQuery.length);
      }
    });

    container.querySelector('#pb-voice-toggle')?.addEventListener('click', () => {
      const next = progressStore.getPrefs().voice === 'henri' ? 'denise' : 'henri';
      progressStore.updatePref('voice', next);
      render();
    });

    container.querySelectorAll('[data-filter-ch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterChapter = btn.dataset.filterCh;
        render();
      });
    });

    container.querySelectorAll('[data-play-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = allEntries.find((e) => e.id === btn.dataset.playId);
        if (item) {
          audioEngine.play(item, {
            voice: progressStore.getPrefs().voice,
            slow: btn.dataset.slow === 'true',
          });
        }
      });
    });
  }

  render();
}
