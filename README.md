# Clavier Français — Learn French Through Typing Practice

An immersive French learning game that reimagines touch-typing practice (inspired by Typing.com's crisp, bright light interface) into an active French fluency trainer — complete with **lifelike native Parisian French voices** and the full Phase 1 curriculum from `French 1-9-32.pdf` (Chapters 2 & 3, pages 9–32).

## Highlights

- **Learn French by Typing (3 Progressive Modes)**
  - **Guided (`Learn`)**: Typing.com-style character-by-character flow with ghost French text, English translation, live key highlights, and instant native French audio.
  - **Translate (`EN → FR`)**: See the English word or full sentence and type the French from memory into word-length letter slots — press `Tab` for a letter hint or `Shift+Tab` to reveal a word, and hear the native French voice reward each completed item.
  - **Dictation (`Listen`)**: Pure listening immersion — hear the natural French speaker first and type what you hear, with `0.75× Slow` clear playback anytime.
- **Studio-Quality Human-Sounding French Voices (Zero Robotic TTS)**
  - Every single one of the **176 Phase 1 French words and sentences** ships with pre-generated neural French MP3s in **two native Parisian voices**: **Vivienne** (`fr-FR-VivienneMultilingualNeural`) and **Rémy** (`fr-FR-RemyMultilingualNeural`).
  - Plays instantaneously offline with zero API keys required, supporting both `1.0×` natural speed and `0.75×` clear slow speed.
- **Typing.com-Inspired Bright Light UI & Tactile Keyboard**
  - Sunlit sky-and-paper palette, live **WPM**, **Accuracy %**, **Combo Streak**, **1–3 Star mastery ratings**, subtle tactile mechanical key sounds, and a live interactive QWERTY visual keyboard with pastel finger-zone guides.
- **Effortless French Accents on Any Keyboard**
  - **Smart Accents (default)**: Typing base letters (`e`, `a`, `c`, `u`, `i`, `o`) smoothly auto-completes the proper accented letter (`é`, `è`, `ê`, `à`, `ç`, etc.) with a golden accent cue so your typing speed never stalls.
  - **Strict Accents**: Switch on anytime to practice exact accents via the clickable **French Accent Bar** or dead-key shortcuts (`'e → é`, `` `e → è ``, `^e → ê`, `,c → ç`, `` `a → à ``, `` `u → ù ``).
- **Audio Phrasebook & Textbook Grammar Reference**
  - Searchable glossary of all 176 Phase 1 items with instant audio playback, plus interactive grammar tables (`le/la/les`, `mon/ton/son`, possession with `de/du/des`, `avoir`, `être`, and `-ER` verbs).

## Phase 1 Curriculum (`French 1-9-32.pdf`)

| Chapter | Lesson | Topic | PDF Pages |
| :--- | :--- | :--- | :--- |
| **Chapitre 2: La salle de classe** | 2.1 | Classroom Objects & People | p. 9, 14, 18 |
| | 2.2 | Classroom Instructions & Questions | pp. 10–11 |
| | 2.3 | Articles, Possessives & *De* | pp. 12–15 |
| | 2.4 | Verb *Avoir* (To Have) & Age | pp. 16–17, 21–22 |
| | 2.5 | Verb *Être* (To Be) & Where Things Are | pp. 17–20 |
| | 2.6 | Chapter 2 Mastery Challenge | pp. 9–22 |
| **Chapitre 3: Chez nous** | 3.1 | Home & French Breakfast | pp. 23–24, 27 |
| | 3.2 | First-Group (*-ER*) Verbs & Infinitives | pp. 24–28 |
| | 3.3 | House Rooms, *Mon/Ton/Son*, *Voici/Voilà* & *N'est-ce pas?* | pp. 29–32 |
| | 3.4 | Chapter 3 Exam-Style Challenge | pp. 23–32 |

## Getting Started

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
npm run preview
```

## Adding Phase 2+ Content & Generating New Audio

All lessons and grammar tables live in a single source of truth: [`src/data/curriculum.json`](src/data/curriculum.json).

Whenever you add new chapters or sentences to `src/data/curriculum.json`, run the idempotent neural voice generator to create MP3s for any new entries (existing audio files are skipped automatically):

```bash
pip install edge-tts
npm run generate-audio
```

## Keyboard Shortcuts (Typing Stage)

- `Ctrl + Space` — Replay native French audio
- `Ctrl + S` — Play at `0.75×` slow clear speed
- `Tab` — Reveal next letter hint (Translate & Dictation modes)
- `Shift + Tab` — Reveal current word
- `Enter` — Advance immediately after completing an item
