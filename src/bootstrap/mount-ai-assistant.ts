import { mountIsland } from './mount';

export function mountAiAssistant(): Promise<unknown> {
  return mountIsland('aiAssistantPanelRoot', () =>
    import('../apps/AIAssistantApp').then((m) => m.default),
  );
}
