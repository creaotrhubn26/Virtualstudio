export interface CachedActorAppearance {
  hairStyle?: string;
  hairColor?: string;
  facialHair?: string;
}

export interface CachedActorParameters {
  gender: number;
  height: number;
  weight: number;
  muscle: number;
  age: number;
}

export interface CachedActorMetadata {
  genre?: string;
  mood?: string;
}

export interface CachedActor {
  id: string;
  name: string;
  description: string;
  skinTone: string;
  parameters: CachedActorParameters;
  metadata: CachedActorMetadata;
  appearance?: CachedActorAppearance;
}

const _cache = new Map<string, CachedActor>();

export function getCachedActor(id: string): CachedActor | undefined {
  return _cache.get(id);
}

export function cacheActor(actor: CachedActor): void {
  _cache.set(actor.id, actor);
}

export function getAllCachedActors(): CachedActor[] {
  return Array.from(_cache.values());
}

export function removeCachedActor(id: string): void {
  _cache.delete(id);
}
