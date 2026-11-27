import './styles/design-system.css';
import './styles/typing-stage.css';
import './styles/keyboard.css';
import './styles/curriculum.css';
import './styles/verbs.css';
import './styles/paragraphs.css';

import curriculum from './data/curriculum.json';
import verbsData from './data/verbs.json';
import paragraphsData from './data/paragraphs.json';
import { progressStore } from './engine/progressStore.js';
import { soundEffects } from './engine/soundEffects.js';
import { renderCurriculumView } from './components/curriculumView.js';
import { renderVerbsView } from './components/verbsView.js';
import { renderParagraphsView } from './components/paragraphsView.js';
import { renderPhrasebookView } from './components/phrasebookView.js';
import { createStageController } from './components/stageView.js';

const mainEl = document.getElementById('main-content');
const navTabs = document.querySelectorAll('.nav-tab');
const allCurriculumLessons = curriculum.chapters.flatMap((ch) => ch.lessons);
const allVerbTracks = verbsData.tracks.map((t) => ({ ...t, sourceSection: 'verbs' }));
const allParagraphs = paragraphsData.paragraphs.map((p) => ({
  ...p,
  sourceSection: 'paragraphs',
  pages: p.sourceLabel,
}));
const allTrackedIds = [
  ...allCurriculumLessons.map((l) => l.id),
  ...allVerbTracks.map((t) => t.id),
  ...verbsData.verbs.map((v) => `verb-${v.id}`),
  ...allParagraphs.map((p) => p.id),
];

let activeView = 'lessons';
let currentLesson =
  allCurriculumLessons.find((l) => l.id === progressStore.state.lastLessonId) ||
  allVerbTracks.find((t) => t.id === progressStore.state.lastLessonId) ||
  allParagraphs.find((p) => p.id === progressStore.state.lastLessonId) ||
  allCurriculumLessons[0];

soundEffects.setEnabled(progressStore.getPrefs().keySounds);

function refreshHeaderStats() {
  const summary = progressStore.getSummary(allTrackedIds);
  const streakEl = document.getElementById('hdr-streak');
  const starsEl = document.getElementById('hdr-stars');
  const wpmEl = document.getElementById('hdr-best-wpm');

  if (streakEl) streakEl.textContent = String(summary.streak);
  if (starsEl) starsEl.textContent = String(summary.earnedStars);
  if (wpmEl) wpmEl.textContent = String(summary.bestWpm);
}

const stageController = createStageController(mainEl, {
  curriculum,
  verbsData,
  paragraphsData,
  onBackToLessons: () => switchView('lessons'),
  onBackToVerbs: () => switchView('verbs'),
  onBackToParagraphs: () => switchView('paragraphs'),
  onOpenLesson: (lessonOrId, mode) => {
    if (typeof lessonOrId === 'object' && lessonOrId !== null) {
      openLessonObject(lessonOrId, mode);
    } else {
      openLesson(lessonOrId, mode);
    }
  },
  onStatsUpdated: () => refreshHeaderStats(),
});

function setActiveTab(viewName) {
  navTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.view === viewName);
  });
}

function buildDailySprintLesson() {
  const pool = [];
  const seen = new Set();
  for (const lesson of allCurriculumLessons) {
    for (const item of lesson.items) {
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
    id: `custom-sprint-${Date.now()}`,
    number: 'Sprint',
    title: 'Mixed Typing Sprint',
    frenchTitle: 'Entraînement mixte — Chapitres 2–6',
    pages: 'pp. 9–64',
    items: pool.slice(0, 12),
  };
}

function openLessonObject(lessonObj, mode) {
  currentLesson = lessonObj;
  activeView = 'stage';
  setActiveTab('stage');
  stageController.start(lessonObj, mode || progressStore.getPrefs().practiceMode || 'guided');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openLesson(lessonId, mode) {
  const found =
    allCurriculumLessons.find((l) => l.id === lessonId) ||
    allVerbTracks.find((t) => t.id === lessonId) ||
    allParagraphs.find((p) => p.id === lessonId) ||
    allCurriculumLessons[0];
  openLessonObject(found, mode);
}

function startDailySprint() {
  openLessonObject(buildDailySprintLesson(), 'translate');
}

function switchView(viewName) {
  if (viewName !== 'stage') {
    stageController.stop();
  }
  activeView = viewName;
  setActiveTab(viewName);

  if (viewName === 'lessons') {
    renderCurriculumView(mainEl, curriculum, {
      onSelectLesson: (lessonId, mode) => openLesson(lessonId, mode),
      onStartDailySprint: () => startDailySprint(),
    });
  } else if (viewName === 'verbs') {
    renderVerbsView(mainEl, verbsData, {
      onStartLesson: (lessonObj, mode) => openLessonObject(lessonObj, mode),
    });
  } else if (viewName === 'paragraphs') {
    renderParagraphsView(mainEl, paragraphsData, {
      onStartParagraph: (paraObj, mode) => openLessonObject(paraObj, mode),
    });
  } else if (viewName === 'stage') {
    stageController.start(currentLesson, progressStore.getPrefs().practiceMode || 'guided');
  } else if (viewName === 'phrasebook') {
    renderPhrasebookView(mainEl, curriculum);
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

navTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    switchView(tab.dataset.view);
  });
});

document.getElementById('brand-home-btn')?.addEventListener('click', () => {
  switchView('lessons');
});

window.addEventListener('keydown', (e) => {
  if (activeView === 'stage') {
    stageController.handleKeyDown(e);
  }
});

// Initialize app
refreshHeaderStats();
switchView('lessons');
