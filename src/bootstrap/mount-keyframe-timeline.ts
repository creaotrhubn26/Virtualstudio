import { mountIsland } from './mount';

export function mountKeyframeTimeline(): Promise<unknown> {
  return mountIsland('keyframeTimelineRoot', () =>
    import('../App').then((m) => m.TidslinjeLibraryPanelApp),
  );
}
