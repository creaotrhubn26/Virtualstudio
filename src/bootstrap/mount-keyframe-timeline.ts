import { mountIsland } from './mount';

export function mountKeyframeTimeline(): Promise<unknown> {
  return mountIsland('keyframeTimelineRoot', () =>
    import('../apps/TidslinjeLibraryPanelApp').then((m) => m.default),
  );
}
