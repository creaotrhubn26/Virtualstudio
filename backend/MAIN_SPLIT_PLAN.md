# backend/main.py split plan

`backend/main.py` held 212 `@app.*` routes in a single 9,532-line file. Splitting
all of them in one session is risky — each route carries an implicit
dependency on the service-availability flags (`AUTH_SERVICE_AVAILABLE`,
`TUTORIALS_SERVICE_AVAILABLE`, etc.), helper functions, and globals declared
earlier in the file. Instead, we extract one group at a time behind an
`APIRouter` and verify imports after each step.

## Pattern (established, see `backend/routes/tutorials.py`)

For each group:

1. Create `backend/routes/<group>.py` with `router = APIRouter(prefix=..., tags=...)`.
2. Lazy-import the underlying service inside a `_require_service()` helper
   that raises `HTTPException(503)` on ImportError. This keeps the top-level
   `*_SERVICE_AVAILABLE` pattern alive without dragging globals into the router.
3. Move each `@app.<method>("/api/<group>/…")` → `@router.<method>("…")`.
4. In `main.py`, register with:
   ```python
   try:
       from routes.<group> import router as <group>_router
       app.include_router(<group>_router)
   except ImportError as e:
       print(f"Warning: <group> routes not available: {e}")
   ```
5. Delete the inline `@app.*` definitions.
6. Re-run `python -c "import main"` and verify route count stays the same.

## Remaining route groups

| Group | Target file | Count | Status |
| --- | --- | :-: | --- |
| **Tutorials** | `routes/tutorials.py` | 7 | ✓ EXTRACTED |
| **Wordbank** | `routes/wordbank.py` | 12 | ✓ EXTRACTED |
| **User KV** | `routes/user_kv.py` | 2 | ✓ EXTRACTED |
| **Branding** | `routes/branding.py` | 2 | ✓ EXTRACTED |
| **Settings** | `routes/settings.py` | 5 | ✓ EXTRACTED |
| **ShotCafe** | `routes/shotcafe.py` | 3 | ✓ EXTRACTED |
| **Core / health / static** | `routes/core.py` | 4 | ✓ EXTRACTED (`/`, `/api/health`, `/api/ml/health`, `/api/test-r2`) |
| **Studio** | `routes/studio.py` | 31 | ✓ EXTRACTED (scenes/presets/light-groups/assets/versions/notes+aliases/preferences/snapshots/camera-presets/export-templates) |
| **Rodin** | `routes/rodin.py` | 8 | ✓ EXTRACTED |
| **TripoSR** | `routes/triposr.py` | 5 | ✓ EXTRACTED |
| **Trellis** | `routes/trellis.py` | 6 | ✓ EXTRACTED |
| Collaboration | `routes/collaboration.py` | — | ✓ already in `collaboration_server.py` |
| External data | `routes/external_data.py` | — | ✓ already extracted |
| **Avatar generation** | `routes/avatar.py` | 6 | ✓ EXTRACTED (generate-avatar, GLB serve/head/delete, analyze-face, facexformer/analyze, generate-avatar-with-analysis) |
| **AI Director** | `routes/ai_director.py` | 5 | ✓ EXTRACTED (director/status, director, director/stream, analyze-reference, generate-prop-glb) |
| **Assets** | `routes/assets.py` | 3 | ✓ EXTRACTED (assets/search, polyhaven/gltf, sketchfab/download) |
| **Auth** | `routes/auth.py` | 6 | ✓ EXTRACTED (login, admins CRUD, reset-password) |
| **Brush presets** | `routes/brush_presets.py` | 8 | ✓ EXTRACTED (storyboard drawing tools; inline version had a latent NameError that this fix resolves) |
| **Shot planner** | `routes/shot_planner.py` | 4 | ✓ EXTRACTED (2D scenes CRUD for top-down planner) |
| **Story logic** | `routes/story_logic.py` | 3 | ✓ EXTRACTED (`/api/projects/{project_id}/story-logic`) |
| **Price admin / BRREG / weather** | `routes/price_admin.py` | 3 | ✓ EXTRACTED (BRREG company search + lookup, MET Norway weather forecast) |
| Split sheets (contributions + sharing) | `routes/split_sheets.py` | ~30+ | PENDING — dominant remaining group |
| **Consent** | `routes/consent.py` | 3 | ✓ EXTRACTED (`/api/consent/portal/access`, `/api/consent/portal/sign`, `/api/consent/generate-access-code`) |
| **Email / logo** | `routes/email.py` | 2 | ✓ EXTRACTED (`/api/email/logo-upload`, `/api/email/logo/{key}`) |
| **Storyboards** | `routes/storyboards.py` | 4 | ✓ EXTRACTED (templates, camera-angles, camera-movements, generate-frame via gpt-image-1) |
| **Environment** | `routes/environment.py` | 4 | ✓ EXTRACTED (planner status/plan + retrieve-assets status/search) |
| **Contracts** | `routes/contracts.py` | 4 | ✓ EXTRACTED (`/api/contracts/*` GET + list + POST + PUT) |
| **Norwegian laws** | `routes/norwegian_laws.py` | 5 | ✓ EXTRACTED (legal suggestions + references + law search) |
| **Production** | `routes/production.py` | 12 | ✓ EXTRACTED (shooting-days CRUD, stripboard CRUD, cast, crew, call-sheets, live-set-status). Seed-troll demo seeder (~500 lines) still inline — move to `routes/demo.py` in follow-up. |

## Why this isn't done in one shot

- Some groups (studio, face) reference ~10+ helper functions defined mid-file.
  Those helpers need to move to `backend/services/` first, or be imported by
  the new router file.
- Several routes silently share module-level constants (e.g. `OUTPUT_DIR`,
  `UPLOAD_DIR`, `AVATAR_DIR`). These need a small `backend/paths.py` module
  before any route group that uses them can move.
- Validating a migration needs live endpoints (Postgres + R2). Each group's
  extraction should be followed by `curl` or e2e-level verification.

## Suggested next passes (in order)

1. `routes/core.py` — trivial, establishes health-check stability.
2. `routes/wordbank.py` — self-contained, 11 routes, same pattern as tutorials.
3. `routes/user_kv.py`, `routes/branding.py`, `routes/settings.py` — all thin.
4. Extract `backend/paths.py` (module-level `OUTPUT_DIR`, etc.).
5. `routes/rodin.py`, `routes/triposr.py`, `routes/trellis.py`, `routes/avatar.py`.
6. `routes/studio.py` — biggest, split last, after paths module exists.
