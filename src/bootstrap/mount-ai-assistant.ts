import { mountIsland } from './mount';

export function mountAiAssistant(): Promise<unknown> {
  return mountIsland('aiAssistantPanelRoot', () =>
    import('../App').then((m) => m.AIAssistantApp),
  );
}
