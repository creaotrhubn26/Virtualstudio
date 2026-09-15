"""How many body shapes does the wardrobe actually have to be cut for?

A garment is fitted barycentrically: every garment vertex is a weighted sum of
body vertices plus a small standoff, so fitting to a given body is exact and
cheap. The open question is not whether a fit is possible but whether one fit
can be reused across bodies -- each extra shape means every garment rebuilt and
shipped for it.

Reusing shape A's fit on body B displaces the cloth by exactly the difference
between the two fits. Where that displacement exceeds the standoff the cloth
was given, body B's skin comes through it. This measures both and reports, per
garment and per shape, how far it would poke.

    STUDIO_CHARACTER_CACHE=/tmp/virtualstudio-character-source \\
      /Applications/Blender.app/Contents/MacOS/Blender --background \\
      --factory-startup --python scripts/characters/measure_garment_fit.py
"""
import runpy
import sys
from pathlib import Path

import numpy as np

BUILDER = Path(__file__).resolve().parent / 'build_studio_characters.py'
# run_name keeps the builder's own __main__ block from rebuilding everything.
builder = runpy.run_path(str(BUILDER), run_name='measure_garment_fit')

morphed = builder['morphed']
fit_asset = builder['fit_asset']
asset_bindings = builder['asset_bindings']
groups = builder['groups']
base = builder['base']
system_file = builder['system_file']
np_ = np


def body(male, age='young', muscle='averagemuscle', weight='averageweight', ethnicity='caucasian'):
    """A morphed body, using the macro axes the pinned data actually carries."""
    import gzip
    v = base.copy()
    gender = 'male' if male else 'female'
    for target in [f'macrodetails/{ethnicity}-{gender}-{age}',
                   f'macrodetails/universal-{gender}-{age}-{muscle}-{weight}']:
        with gzip.open(builder['data']('targets/' + target + '.target.gz'), 'rt') as f:
            for line in f:
                t = line.split()
                if len(t) == 4 and t[0].isdigit():
                    v[int(t[0])] += np.array(list(map(float, t[1:])))
    return v


def standoff(item, reference):
    """How far the cloth sits off the skin, in metres, on the reference body.

    Measured as the distance from each garment vertex to the body surface it
    was built from -- the room the garment has before skin would show through.
    """
    garment, _, _ = fit_asset('clothes', item, reference)
    body_ids = np.array(sorted(groups['body']))
    skin = reference[body_ids]
    # Nearest skin vertex per garment vertex. The meshes are small enough that
    # the direct distance matrix is faster than building an index.
    gaps = []
    for chunk in range(0, len(garment), 512):
        block = garment[chunk:chunk + 512]
        d = np.linalg.norm(block[:, None, :] - skin[None, :, :], axis=2)
        gaps.append(d.min(axis=1))
    return np.concatenate(gaps)


def scale_to_height(vertices, reference, height=1.72):
    """Both fits are compared at real scale, since that is what the eye sees."""
    body_ids = list(groups['body'])
    floor = min(reference[body_ids, 1])
    return (height / (max(reference[body_ids, 1]) - floor)) * vertices


SHAPES = {
    'average':      dict(),
    'slim':         dict(weight='minweight'),
    'heavy':        dict(weight='maxweight'),
    'muscular':     dict(muscle='maxmuscle'),
    'light-build':  dict(muscle='minmuscle'),
    'old':          dict(age='old'),
    'african':      dict(ethnicity='african'),
    'asian':        dict(ethnicity='asian'),
}

GARMENTS = {
    False: ['female_casualsuit01', 'female_elegantsuit01', 'female_sportsuit01'],
    True: ['male_casualsuit02', 'male_elegantsuit01', 'male_worksuit01'],
}


def main():
    for male in (False, True):
        label = 'man' if male else 'woman'
        reference = body(male)
        print(f'\n=== {label}: garment cut for the average shape, worn on others ===')
        print(f'{"garment":24} {"shape":12} {"median":>8} {"p95":>8} {"max":>8}   verdict')
        for item in GARMENTS[male]:
            room = standoff(item, reference)
            room_m = scale_to_height(room, reference)
            reference_fit = scale_to_height(fit_asset('clothes', item, reference)[0], reference)
            print(f'{item:24} {"standoff":12} '
                  f'{np.median(room_m) * 1000:7.1f} {np.percentile(room_m, 5) * 1000:7.1f} '
                  f'{room_m.min() * 1000:7.1f}   mm of cloth-to-skin room (median, p5, min)')
            for name, spec in SHAPES.items():
                if name == 'average':
                    continue
                other = body(male, **spec)
                other_fit = scale_to_height(fit_asset('clothes', item, other)[0], other)
                shift = np.linalg.norm(other_fit - reference_fit, axis=1)
                # Skin comes through where the shape moved further than the
                # cloth had room to give.
                through = float((shift > room_m).mean())
                verdict = 'fits' if through < 0.005 else ('marginal' if through < 0.05 else 'REFIT')
                print(f'{"":24} {name:12} {np.median(shift) * 1000:7.1f} '
                      f'{np.percentile(shift, 95) * 1000:7.1f} {shift.max() * 1000:7.1f}   '
                      f'{through * 100:5.1f}% through  {verdict}')


if __name__ == 'measure_garment_fit' or __name__ == '__main__':
    main()
