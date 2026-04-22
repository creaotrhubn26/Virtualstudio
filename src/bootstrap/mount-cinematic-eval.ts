import { mountIsland } from './mount';

export function mountCinematicEval(): Promise<unknown> {
  return mountIsland('cinematicEvalRoot', () =>
    import('../App').then((m) => m.CinematicEvaluationApp),
  );
}
