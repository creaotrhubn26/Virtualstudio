import { mountIsland } from './mount';

export function mountCinematographyPatterns(): Promise<unknown> {
  return mountIsland('cinematographyPatternsRoot', () =>
    import('../App').then((m) => m.CinematographyPatternsApp),
  );
}
