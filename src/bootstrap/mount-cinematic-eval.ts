import { mountIsland } from './mount';

export function mountCinematicEval(): Promise<unknown> {
  return mountIsland('cinematicEvalRoot', () =>
    import('../apps/CinematicEvaluationApp').then((m) => m.default),
  );
}
