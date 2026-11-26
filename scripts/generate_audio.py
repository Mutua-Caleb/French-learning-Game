#!/usr/bin/env python3
"""
Generate lifelike neural French MP3 audio clips for every item in src/data/curriculum.json.

Uses Microsoft's dedicated native Parisian French neural voices via edge-tts
(non-multilingual models so short words like "la table" never trigger Spanish/English auto-detection):
  - denise -> fr-FR-DeniseNeural (authentic, warm native Parisian female voice)
  - henri  -> fr-FR-HenriNeural  (authentic, warm native Parisian male voice)

Usage:
  pip install edge-tts
  python3 scripts/generate_audio.py
  python3 scripts/generate_audio.py --force   # regenerate existing files
"""

import argparse
import asyncio
import json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
CURRICULUM_PATH = ROOT / "src" / "data" / "curriculum.json"
VERBS_PATH = ROOT / "src" / "data" / "verbs.json"
PARAGRAPHS_PATH = ROOT / "src" / "data" / "paragraphs.json"
AUDIO_ROOT = ROOT / "public" / "audio"

VOICES = {
    "denise": "fr-FR-DeniseNeural",
    "henri": "fr-FR-HenriNeural",
}

CONCURRENCY = 10


async def synth_one(sem: asyncio.Semaphore, voice_key: str, voice_id: str, item_id: str, text: str, force: bool) -> str:
    out_dir = AUDIO_ROOT / voice_key
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{item_id}.mp3"

    if out_path.exists() and out_path.stat().st_size > 1000 and not force:
        return "skipped"

    async with sem:
        for attempt in range(3):
            try:
                communicate = edge_tts.Communicate(text=text, voice=voice_id, rate="+0%")
                await communicate.save(str(out_path))
                if out_path.exists() and out_path.stat().st_size > 500:
                    return "generated"
            except Exception as exc:
                if attempt == 2:
                    print(f"[ERROR] {voice_key}/{item_id}: {exc}")
                    return "failed"
                await asyncio.sleep(1.0 * (attempt + 1))
    return "failed"


def collect_items() -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    seen: set[str] = set()

    def add(item_id: str, text: str) -> None:
        if item_id not in seen:
            seen.add(item_id)
            items.append((item_id, text))

    # 1. Main textbook curriculum
    data = json.loads(CURRICULUM_PATH.read_text(encoding="utf-8"))
    for chapter in data["chapters"]:
        for lesson in chapter["lessons"]:
            for item in lesson["items"]:
                add(item["id"], item["fr"])

    # 2. Verbs trainer (tracks + all per-verb Essential Mix forms & examples)
    if VERBS_PATH.exists():
        vdata = json.loads(VERBS_PATH.read_text(encoding="utf-8"))
        for track in vdata.get("tracks", []):
            for item in track["items"]:
                add(item["id"], item["fr"])
        for verb in vdata.get("verbs", []):
            vid = verb["id"]
            for idx, form in enumerate(verb["conjugations"]["present"]):
                add(f"v_{vid}_pr_{idx}", form)
            add(f"v_{vid}_pc_0", verb["conjugations"]["passe_compose"][0])
            add(f"v_{vid}_imp_0", verb["conjugations"]["imparfait"][0])
            add(f"v_{vid}_fut_0", verb["conjugations"]["futur"][0])
            if verb.get("example"):
                add(verb["example"]["id"], verb["example"]["fr"])

    # 3. Simple French paragraphs (per-sentence + full paragraph narration)
    if PARAGRAPHS_PATH.exists():
        pdata = json.loads(PARAGRAPHS_PATH.read_text(encoding="utf-8"))
        for para in pdata.get("paragraphs", []):
            for item in para["items"]:
                add(item["id"], item["fr"])
            if para.get("fullAudioId"):
                full_text = " ".join(i["fr"] for i in para["items"])
                add(para["fullAudioId"], full_text)

    return items


async def main() -> None:
    parser = argparse.ArgumentParser(description="Generate neural French MP3 audio for Clavier Français.")
    parser.add_argument("--force", action="store_true", help="Regenerate even if MP3 already exists.")
    args = parser.parse_args()

    items = collect_items()
    print(f"Found {len(items)} unique French items across curriculum and verbs.")
    sem = asyncio.Semaphore(CONCURRENCY)

    tasks = []
    for voice_key, voice_id in VOICES.items():
        for item_id, text in items:
            tasks.append(synth_one(sem, voice_key, voice_id, item_id, text, args.force))

    results = await asyncio.gather(*tasks)
    gen = results.count("generated")
    skip = results.count("skipped")
    fail = results.count("failed")
    print(f"Done! Generated: {gen}, Skipped: {skip}, Failed: {fail}")
    if fail:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
