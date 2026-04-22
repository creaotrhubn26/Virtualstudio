# Backend ML vendoring — current state & migration plan

## What's vendored today

The following upstream ML repos are checked into `backend/` as source copies:

| Directory | Upstream | Purpose |
| --- | --- | --- |
| `detectron2_install/` | facebookresearch/detectron2 | Object detection / instance segmentation used by SAM3D |
| `facexformer_repo/` | Kartik-3004/facexformer | Face analysis (landmarks, age, gender, expressions) |
| `humaniflow/` | akashsengupta1997/HuManiFlow | 3D body shape estimation |
| `sam3d_repo/` | facebookresearch/sam-3d-body | SAM 3D body avatar generation |
| `trellis_models/` | microsoft/TRELLIS | 3D generation (weights live here, not code) |

`backend/trellis_uploads/` and `backend/outputs/` are runtime state (user uploads,
generated GLB avatars) and should never be tracked.

## Why this is a problem

1. **Size**: Each repo adds tens of MB of Python + test fixtures to every clone.
2. **CVEs**: Upstream security patches require manually re-vendoring.
3. **Reproducibility**: There is no recorded commit pin, so two clones may have
   different code at the same path.
4. **Legal**: Upstream licenses travel with the checked-in copy; redistributing
   without explicit attribution is a compliance risk.

## Migration plan

This migration is **not performed in-session** because it requires re-running
the Python import paths against the real backend and validating against live
ML inference — both need GPU hardware we don't have here.

Steps (for a dedicated session):

1. Record the exact commit hash each vendored copy was derived from
   (`git log` inside each dir if it has its own history, else manual diff
   against the upstream master branch).
2. Rewrite `backend/requirements.txt` to install from pinned commits, e.g.:
   ```
   git+https://github.com/facebookresearch/detectron2.git@<hash>#egg=detectron2
   git+https://github.com/Kartik-3004/facexformer.git@<hash>#egg=facexformer
   git+https://github.com/akashsengupta1997/HuManiFlow.git@<hash>#egg=humaniflow
   git+https://github.com/facebookresearch/sam-3d-body.git@<hash>#egg=sam_3d_body
   ```
3. Update backend Python imports:
   - `from sam_3d_body import ...` already works once installed (same package name).
   - `from humaniflow import ...` same.
   - Any `sys.path.insert(0, '.../humaniflow')` hacks must be removed.
4. Document model-weight downloads in `backend/README.md` (they were never in
   git — TRELLIS/SAM3D weights come from Hugging Face with the tokens in
   `.env.example`).
5. `git rm -r` the five vendored directories.
6. `.gitignore` already lists them so they stay out going forward.

## Quick check: do Python imports already resolve via installed packages?

Run inside the backend venv:

```bash
python -c "import sam_3d_body; print(sam_3d_body.__file__)"
python -c "import humaniflow; print(humaniflow.__file__)"
```

If the answer is a path inside `backend/`, the vendored copy is in use.
If it's inside `site-packages/`, the vendored copy is dead weight.
