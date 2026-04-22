/**
 * Character casting client — description → full-body reference → 3D GLB.
 *
 * Backend pipeline (runs sequentially):
 *   1. Claude (if available) writes an image prompt targeted at full-body
 *      TripoSR-friendly 2D reference.
 *   2. gpt-image-1 or FLUX generates the image.
 *   3. TripoSR converts the image to a GLB.
 *   4. Result is cached by name+description hash so repeat requests are free.
 *
 * The pipeline can be slow (30-90 s for TripoSR). Callers should show a
 * progress indicator and use the returned ``status`` field:
 *   pending | prompting | imaging | meshing | ready | cached | failed
 */

export type CastingStatus =
  | 'pending'
  | 'prompting'
  | 'imaging'
  | 'meshing'
  | 'ready'
  | 'cached'
  | 'failed';

export interface CastingJob {
  key: string;
  name: string;
  description: string | null;
  status: CastingStatus;
  prompt: string | null;
  imageUrl: string | null;
  triposrJobId: string | null;
  glbUrl: string | null;
  error: string | null;
  directorNotes: string[];
}

export interface CachedCharacter {
  key: string;
  name: string;
  description: string | null;
  glbUrl: string;
  imageUrl: string | null;
  sizeBytes: number;
}

const API = '/api/characters';

export async function generateCharacter(params: {
  name: string;
  description?: string;
  useCache?: boolean;
}): Promise<CastingJob> {
  const response = await fetch(`${API}/generate-from-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      description: params.description ?? null,
      useCache: params.useCache ?? true,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Character casting ${response.status}: ${body}`);
  }
  const data = (await response.json()) as { success: boolean; job: CastingJob };
  return data.job;
}

export async function getCharacterStatus(key: string): Promise<{
  cached: boolean;
  key: string;
  glbUrl?: string;
  sizeBytes?: number;
}> {
  const response = await fetch(`${API}/status/${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error(`Status ${response.status}`);
  return response.json();
}

export async function listCharacters(): Promise<CachedCharacter[]> {
  const response = await fetch(`${API}/`);
  if (!response.ok) throw new Error(`List ${response.status}`);
  const data = (await response.json()) as { characters: CachedCharacter[] };
  return data.characters;
}
