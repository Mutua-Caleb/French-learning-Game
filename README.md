# Clavier Français — Learn French Through Typing Practice

An immersive French learning game that reimagines touch-typing practice (inspired by Typing.com's crisp, bright light interface) into an active French fluency trainer — complete with **lifelike native Parisian French voices** and the full Phase 1 curriculum from `French 1-9-32.pdf` (Chapters 2 & 3, pages 9–32).

## Highlights

- **Learn French by Typing (3 Progressive Modes)**
  - **Guided (`Learn`)**: Typing.com-style character-by-character flow with ghost French text, English translation, live key highlights, and instant native French audio.
  - **Translate (`EN → FR`)**: See the English word or full sentence and type the French from memory into word-length letter slots — press `Tab` for a letter hint or `Shift+Tab` to reveal a word, and hear the native French voice reward each completed item.
  - **Dictation (`Listen`)**: Pure listening immersion — hear the natural French speaker first and type what you hear, with `0.75× Slow` clear playback anytime.
- **Studio-Quality Human-Sounding French Voices (Zero Robotic TTS)**
  - Every single one of the **176 Phase 1 French words and sentences** ships with pre-generated native Parisian French MP3s in **two dedicated French neural voices**: **Denise** (`fr-FR-DeniseNeural`) and **Henri** (`fr-FR-HenriNeural`).
  - Plays instantaneously offline with zero API keys required, supporting both `1.0×` natural speed and `0.75×` clear slow speed.
- **Typing.com-Inspired Bright Light UI & Tactile Keyboard**
  - Sunlit sky-and-paper palette, live **WPM**, **Accuracy %**, **Combo Streak**, **1–3 Star mastery ratings**, subtle tactile mechanical key sounds, and a live interactive QWERTY visual keyboard with pastel finger-zone guides.
- **Effortless French Accents on Any Keyboard**
  - **Smart Accents (default)**: Typing base letters (`e`, `a`, `c`, `u`, `i`, `o`) smoothly auto-completes the proper accented letter (`é`, `è`, `ê`, `à`, `ç`, etc.) with a golden accent cue so your typing speed never stalls.
  - **Strict Accents**: Switch on anytime to practice exact accents via the clickable **French Accent Bar** or dead-key shortcuts (`'e → é`, `` `e → è ``, `^e → ê`, `,c → ç`, `` `a → à ``, `` `u → ù ``).
- **Audio Phrasebook & Textbook Grammar Reference**
  - Searchable glossary of all 176 Phase 1 items with instant audio playback, plus interactive grammar tables (`le/la/les`, `mon/ton/son`, possession with `de/du/des`, `avoir`, `être`, and `-ER` verbs).

## Curriculum & Practice Sections

### Textbook Lessons (`French 1-9-32.pdf` & `French 1-32-64.pdf` · pp. 9–64)

| Chapter | Lessons | Topics | PDF Pages |
| :--- | :--- | :--- | :--- |
| **Chapitre 2: La salle de classe** | 2.1 – 2.6 | Classroom objects, commands, articles, `de`, *avoir*, *être*, prepositions | pp. 9–22 |
| **Chapitre 3: Chez nous** | 3.1 – 3.4 | Home, French breakfast, `-ER` verbs, rooms, *mon/ton/son*, *voici/voilà*, *n'est-ce pas?* | pp. 23–32 |
| **Chapitre 4: La vie quotidienne et l'heure** | 4.1 – 4.4 | Reflexive verbs (*se réveiller, se lever, se laver, s'habiller*), telling the time, numbers 13–30, *faire* & *mettre*, chores, negatives (`ne...pas`) | pp. 33–44 |
| **Chapitre 5: On va à l'école!** | 5.1 – 5.3 | *Aller* & transport, days of the week, school subjects, opinions, colours & adjective agreement | pp. 45–56 |
| **Chapitre 6: La date, les nombres, les prix** | 6.1 – 6.2 | Months, birthdays, numbers 40–1000, *il faut*, market shopping, *acheter*, *vouloir* & *pouvoir* | pp. 57–64 |

### Additional Dedicated Trainers
- **Verbs Tab**: 6 progressive core tracks + interactive 4-tense explorer (*Présent, Passé composé, Imparfait, Futur simple*) for the **20 most widely used French verbs**.
- **Paragraphs Tab**: **11 short 5-sentence French stories** (`P1`–`P11`) designed for the **1. Guided → 2. Translate → 3. Dictation** loop with full-paragraph narration.

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
