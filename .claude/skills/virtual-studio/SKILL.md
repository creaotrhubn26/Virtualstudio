---
name: virtual-studio
description: How to add a capability to Virtualstudio so that a grandmother can use it and a photographer still trusts it. Use when building or reviewing any Virtualstudio feature — lighting, camera moves, props, characters, scenarios — and whenever deciding whether a feature is worth building at all. Covers the naming rule (places and moves, not parameters), progressive disclosure, the states every control must have, and the five questions a feature has to answer before it earns a button.
---

# Virtualstudio

Virtualstudio is a scenario tool, not a settings panel. Someone who has never
lit anything should be able to make a kitchen look like a kitchen; someone who
lights for a living should find real fixtures underneath, in real units, that
they can take apart.

Both of those are the same feature. Getting them from one feature, rather than
building a simple mode and an expert mode, is what this skill is about.

## The naming rule

A control is named after the thing the user wants, never after the parameter it
changes.

| Say this | Not this |
|---|---|
| Kjøkken · middag | Key 2800 K, fill −2 EV |
| Dolly inn | Camera position keyframe |
| Flimre | Intensity track, 8 keyframes |
| Stue · kveld | Practical rig preset 3 |

Two consequences follow, and both are load-bearing:

- **Every button carries a plain explanation.** A `title` that says what the
  word means, for the person who does not know the word. "Dolly inn" means
  nothing on its own; "Kameraet kjører nærmere motivet" does. The unit tests in
  `movePresets.test.ts` and `lightingLooks.test.ts` assert that every entry has
  one and that it is long enough to be a sentence, because an empty hint is the
  failure mode that creeps back in.
- **The named thing is built from the same primitives as the manual thing.** A
  look leaves ordinary fixtures on stands; a move leaves ordinary keyframes in
  the sequence. Nothing is a locked preset. This is what lets one feature serve
  both users: the beginner never opens the panel, the professional opens it and
  finds nothing strange in there.

## Progressive disclosure

Three layers, in this order. A user should be able to stop at any one of them
and still have done something real.

1. **Name it.** One button: a place, a move, a look. No numbers.
2. **Time it and weigh it.** A length slider, a start time, on/off. Still no
   photographic vocabulary.
3. **Take it apart.** The light panel, the timeline, the keyframe editor. Real
   units: candela, stops, kelvin, metres, seconds.

Never put layer 3 controls next to layer 1 controls. Never make layer 1
unreachable because layer 3 exists.

## Design every state

The happy path is the state that needs the least work. Every control needs all
of these decided before it ships:

- **Empty** — "Ingen bevegelser ennå. Velg en over." Says what to do, not that
  nothing is there.
- **Working** — a rig takes a moment to rebuild. Say so and disable the buttons
  while it happens; silence reads as a dead button.
- **Impossible** — a light move with no fixture on set returns null, and the
  panel says "Velg en lyskilde først for å bevege lyset." The button is never
  simply inert.
- **Active** — `aria-pressed` on the look that is on. The user should never
  have to remember what they chose.
- **Failed** — say it plainly and offer the next move, do not roll back
  silently.

Feedback is immediate or it is not feedback. If the work takes longer than a
frame, the state changes first and the work happens second.

## Prevent the error instead of explaining it

Constraints belong in the data and the solver, not in a warning:

- Joint limits are swing and twist, so an impossible elbow cannot be asked for.
- `placeFixtureForIlluminance` never drives a head past 100 %; it walks the
  light in instead.
- A visible source — a lamp, a window, a candle — is marked `motivating` and is
  never relocated to make a level. It burns at what it can give from where it
  stands, which is what the real lamp does.
- Validation runs on a whole document before the current scene is cleared.

When a constraint cannot be enforced, measure it in a test rather than trusting
it. `lightingLooks.test.ts` asserts no working light ends up closer than 0.8 m
to the subject — that test caught a ceiling pendant that would have hung 46 cm
from an actor's face.

## Consistency

- Radians everywhere in scene documents and the animation format; degrees only
  at the edge of a panel that shows degrees.
- Metres for distance, seconds for time, stops for ratios, kelvin for colour.
- Norwegian in the interface, English in the code and comments.
- A new capability addresses nodes by id and resolves them through the same
  path the existing ones use. Two ways to move a thing means one of them will
  drift.
- Schema additions are optional or versioned, and come with a round-trip test.

## Before it earns a button

A feature is worth building when it can answer all five. Write the answers down
in the PR; if two of them are weak, build something else first.

1. **Does it hurt?** There is a real cost to leaving it undone — a shoot
   re-lit, a scene rebuilt, a client meeting without a previsualization.
2. **Does it happen often?** Daily and weekly beats annual. A lighting look is
   used every session; an obscure export is used once.
3. **Who has the budget?** Name the buyer. A photographer, a production
   company, a health authority making training video. If nobody is named, the
   feature is a hobby.
4. **Can it be shown in a minute?** If the value needs a tutorial, the naming
   is wrong — go back to the naming rule.
5. **Does it get more valuable with use?** Saved scenes, reusable looks, a
   wardrobe, a prop library, a sequence that can be re-cut. Work that
   accumulates is what makes the tool worth keeping.

## Acceptance

Every shipped capability carries, at minimum:

- a real workflow test in the browser, not only a unit test;
- a scene round trip if any of it is persisted;
- resource cleanup when the thing is replaced or removed;
- a number or a screenshot demonstrating the behaviour, not a claim that it
  works.

Claims in docs and PRs stay inside what has actually been measured. The known
limits in `CLAUDE.md` are part of the product, not an embarrassment to be
written around.
