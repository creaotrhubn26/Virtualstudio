# Panel Event Contract

This document defines how panel open/close events should work in Virtual Studio.

## Rules

1. Programmatic navigation must use explicit `vs-open-*` and `vs-close-*` events.
2. `toggle-*` events are allowed only for direct user-facing toggles or legacy compatibility.
3. New panels should expose a deterministic open/close surface before adding convenience toggles.
4. Browser coverage should verify both the modern event path and any intentional legacy compatibility path.

## Event Naming

- Use `vs-open-<panel>-panel` to open a panel.
- Use `vs-close-<panel>-panel` to close a panel.
- Use `toggle-<panel>-panel` only when:
  - the control is a real user toggle
  - or older integrations still depend on toggle behavior

For payload-based panels, prefer:

- `vs-open-<panel>` with `detail`
- `vs-close-<panel>` with optional `detail`

## Current Contracts

### Explicit open/close panels

- AI Assistant
  - `vs-open-ai-assistant-panel`
  - `vs-close-ai-assistant-panel`
- Environment Planner
  - `vs-open-ai-environment-planner`
  - `vs-close-ai-environment-planner`
- Notes
  - `vs-open-notes-panel`
  - `vs-close-notes-panel`
- Marketplace
  - `vs-open-marketplace-panel`
  - `vs-close-marketplace-panel`
- Help
  - `vs-open-help-panel`
  - `vs-close-help-panel`
- Studio Library
  - `vs-open-studio-library-panel`
  - `vs-close-studio-library-panel`
  - `vs-open-studio-library-tab` with `detail.tab`
- Scene Hierarchy
  - `vs-open-scene-hierarchy-panel`
  - `vs-close-scene-hierarchy-panel`
- Camera Controls
  - `vs-open-camera-controls-tab` with `detail.tab`
- Panel Creator
  - `vs-open-panel-creator`
- Virtual Studio Pro
  - `vs-open-pro-panel` with `detail.panel`
  - `vs-close-pro-panel` with `detail.panel`
- Installed tool panels
  - `vs-open-installed-tool-panel` with `detail.toolId`
  - `vs-close-installed-tool-panel` with `detail.toolId`
  - `vs-toggle-installed-tool-panel` with `detail.toolId`

### Intentional toggle or legacy compatibility paths

- `toggle-ai-assistant-panel`
  - kept for user-facing tool launchers and older callers
- `toggle-notes-panel`
  - kept for existing toolbar behavior
- `toggle-marketplace-panel`
  - kept for the marketplace trigger button
- `toggle-help-panel`
  - kept as legacy compatibility
- `toggle-pro-panel`
  - kept as legacy compatibility for old Pro callers
- `toggle-studio-library-panel`
  - kept for compatibility with direct user-toggle semantics
- `toggle-scene-hierarchy-panel`
  - kept for compatibility with direct user-toggle semantics

## Implementation Guidance

When adding a new panel:

1. Add explicit open/close events first.
2. If the panel is lazy-mounted, buffer early open requests.
3. Expose a stable DOM or snapshot marker for browser tests.
4. Add Playwright coverage for:
   - modern open/close
   - any payload-based opening
   - legacy toggle compatibility, if retained

## Test Coverage

The primary browser coverage for this contract lives in:

- `e2e/modern-panel-open-events.spec.ts`
- `e2e/legacy-panel-event-bridge.spec.ts`

These specs currently cover:

- Studio Library
- Scene Hierarchy
- Camera Controls
- Panel Creator
- AI Assistant
- Environment Planner
- Marketplace
- Help
- Virtual Studio Pro
- Installed tool panel wrapper
- Notes

## Practical Heuristic

If the intent is:

- "show this panel" -> use `vs-open-*`
- "hide this panel" -> use `vs-close-*`
- "user clicked the same launcher again" -> `toggle-*` may be appropriate
- "older code still depends on toggle" -> keep `toggle-*`, but treat it as compatibility only
