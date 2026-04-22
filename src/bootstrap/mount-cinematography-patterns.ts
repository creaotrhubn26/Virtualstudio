import { mountIsland } from './mount';

export function mountCinematographyPatterns(): Promise<unknown> {
  return mountIsland('cinematographyPatternsRoot', () =>
    import('../apps/CinematographyPatternsApp').then((m) => m.default),
  );
}
