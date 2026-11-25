import './styles/design-system.css';
import './styles/typing-stage.css';
import './styles/keyboard.css';
import './styles/curriculum.css';

import curriculum from './data/curriculum.json';
import { progressStore } from './engine/progressStore.js';
import { soundEffects } from './engine/soundEffects.js';
import { renderCurriculumView } from './components/curriculumView.js';
import { renderPhrasebookView } from './components/phrasebookView.js';
import { createStageController } from './components/stageView.js';

const mainEl = document.getElementById('main-content');
const navTabs = document.querySelectorAll('.nav-tab');
const allLessons = curriculum.chapters.flatMap((ch) => ch.lessons);

let activeView = 'lessons';
let currentLesson = allLessons.find((l) => l.id === progressStore.state.lastLessonId) || allLessons[0];

soundEffects.setEnabled(progressStore.getPrefs().keySounds);

function refreshHeaderStats() {
  const summary = progressStore.getSummary(allLessons.map((l) => l.id));
  const streakEl = document.getElementById('hdr-streak');
  const starsEl = document.getElementById('hdr-stars');
  const wpmEl = document.getElementById('hdr-best-wpm');

  if (streakEl) streakEl.textContent = String(summary.streak);
  if (starsEl) starsEl.textContent = String(summary.earnedStars);
  if (wpmEl) wpmEl.textContent = String(summary.bestWpm);
}

const stageController = createStageController(mainEl, {
  curriculum,
  onBackToLessons: () => switchView('lessons'),
  onOpenLesson: (lessonId, mode) => openLesson(lessonId, mode),
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
  for (const lesson of allLessons) {
    for (const item of lesson.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        pool.push(item);
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return {
    id: `custom-sprint-${Date.now()}`,
    number: 'Sprint',
    title: 'Mixed Typing Sprint',
    frenchTitle: 'Entraînement mixte — Chapitres 2 & 3',
    pages: 'pp. 9–32',
    items: pool.slice(0, 12),
  };
}

function openLesson(lessonId, mode) {
  const found = allLessons.find((l) => l.id === lessonId) || allLessons[0];
  currentLesson = found;
  activeView = 'stage';
  setActiveTab('stage');
  stageController.start(found, mode || progressStore.getPrefs().practiceMode || 'guided');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startDailySprint() {
  const sprintLesson = buildDailySprintLesson();
  currentLesson = sprintLesson;
  activeView = 'stage';
  setActiveTab('stage');
  stageController.start(sprintLesson, 'translate');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
