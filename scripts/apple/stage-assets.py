#!/usr/bin/env python3
"""Put in the app bundle exactly what the app asks for, and nothing else.

The studio's texture directory is 76 MB of content-addressed PNGs shared by every
figure and every garment that was ever built. A figure uses three of them and a
garment three more, so bundling the directory would carry seventy-odd megabytes of
other people's clothes into an app that shows two people.

So this reads the GLBs the app ships, follows their image URIs, and stages only
those files. It is the native side of `scripts/aws/fetch-assets.sh`: that brings
the studio's assets down, this decides which of them get on the plane.

    python3 scripts/apple/stage-assets.py

Writes apple/Assets, which is gitignored — the models are not in git either.
Re-run it after rebuilding the characters or changing what the app loads.
"""

import json
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STUDIO = ROOT / 'public/models/avatars/studio'
STAGE = ROOT / 'apple/Assets'

# What the app loads. Both bodies, and for each the garments it opens wearing —
# the rest of the wardrobe follows when the app can change clothes.
BODIES = ['studio-woman', 'studio-man']


def images(glb: Path) -> list[str]:
    """The image URIs a GLB refers to, without unpacking the whole file."""
    raw = glb.read_bytes()
    if len(raw) < 20 or struct.unpack_from('<I', raw, 0)[0] != 0x46546C67:
        raise SystemExit(f'{glb} is not a GLB')
    length, kind = struct.unpack_from('<II', raw, 12)
    if kind != 0x4E4F534A:
        raise SystemExit(f'{glb} does not start with a JSON chunk')
    document = json.loads(raw[20:20 + length])
    return [image['uri'] for image in document.get('images', []) if 'uri' in image]


def stage_usd(source: Path, destination: Path) -> int:
    """A USDZ carries its own textures, so it travels alone."""
    return stage(source, destination)


def stage(source: Path, destination: Path) -> int:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    return source.stat().st_size


def main() -> None:
    if not STUDIO.exists():
        raise SystemExit(f'{STUDIO} is missing — run scripts/aws/fetch-assets.sh models first')

    catalogue = json.loads((STUDIO / 'wardrobe.json').read_text())
    if STAGE.exists():
        shutil.rmtree(STAGE)

    wanted: set[str] = set()
    total = 0
    staged = 0

    total += stage(STUDIO / 'wardrobe.json', STAGE / 'wardrobe.json')
    staged += 1

    for body in BODIES:
        figure = STUDIO / f'{body}.glb'
        if not figure.exists():
            print(f'{body}: not built, skipping')
            continue
        total += stage(figure, STAGE / figure.name)
        staged += 1
        wanted.update(images(figure))

        # The USDZ is what RealityKit draws — it carries its own textures inside the
        # package — and the poses travel beside it, because a skeleton binds one
        # animation source at a time and these are stances to switch between.
        for extra in (STUDIO / f'{body}.usdz', STUDIO / f'{body}-poses.json'):
            if extra.exists():
                total += stage(extra, STAGE / extra.name)
                staged += 1

        for garment in catalogue['defaults'].get(body, []):
            source = STUDIO / 'wardrobe' / body / f'{garment}.glb'
            if not source.exists():
                print(f'{body}: {garment} is not built, skipping')
                continue
            total += stage(source, STAGE / 'wardrobe' / body / source.name)
            staged += 1
            wanted.update(images(source))
            package = source.with_suffix('.usdz')
            if package.exists():
                total += stage(package, STAGE / 'wardrobe' / body / package.name)
                staged += 1

    for uri in sorted(wanted):
        source = STUDIO / uri
        if not source.exists():
            raise SystemExit(f'{uri} is referenced but not on disk')
        total += stage(source, STAGE / uri)
        staged += 1

    everything = sum(f.stat().st_size for f in (STUDIO / 'textures').glob('*') if f.is_file())
    print(f'staged {staged} files, {total / 1_048_576:.1f} MB, into {STAGE.relative_to(ROOT)}')
    print(f'the texture directory is {everything / 1_048_576:.0f} MB; '
          f'{len(wanted)} of its files are on the plane')


if __name__ == '__main__':
    sys.exit(main())
