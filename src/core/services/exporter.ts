/**
 * Saving the scene as a file.
 *
 * There used to be an `ExporterService` here that accepted seven formats —
 * GLB, glTF, FBX, OBJ, USDZ, .babylon, JSON — and answered every one of them
 * with `success: true`, `sizeBytes: 0` and an empty blob. Nothing imported it
 * except this file's own export list, so no user ever received one of those
 * empty files, but it made the repository claim an export pipeline that did not
 * exist. That matters now: the iPad plan rests on a real USD path, and a
 * plausible-looking stub is worse than nothing to plan against.
 *
 * Real geometry export belongs in the character builder, alongside the GLB
 * export that is already validated by hash. See `docs/ipad-plan.md`.
 */
export function exportJSON(scene: unknown): void {
  const json = JSON.stringify(scene, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scene-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
