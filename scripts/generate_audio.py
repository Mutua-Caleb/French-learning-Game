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


async def main() -> None:
    parser = argparse.ArgumentParser(description="Generate neural French MP3 audio for Clavier Français.")
    parser.add_argument("--force", action="store_true", help="Regenerate even if MP3 already exists.")
    args = parser.parse_args()

    data = json.loads(CURRICULUM_PATH.read_text(encoding="utf-8"))
    items = []
    seen = set()
    for chapter in data["chapters"]:
        for lesson in chapter["lessons"]:
            for item in lesson["items"]:
                if item["id"] not in seen:
                    seen.add(item["id"])
                    items.append((item["id"], item["fr"]))

    print(f"Found {len(items)} unique French items across {len(data['chapters'])} chapters.")
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
