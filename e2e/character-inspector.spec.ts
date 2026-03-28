import { expect, test } from '@playwright/test';

test.describe('Character Inspector', () => {
  test.describe.configure({ timeout: 180_000 });

  test('updates a selected scene worker from the accessories panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });
    await page.waitForFunction(() => Boolean((window as any).__virtualStudioCharacterInspectorTestApi), { timeout: 90_000 });

    await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      await studio.addEnvironmentCharacters({
        clearExisting: true,
        characters: [
          {
            name: 'Bakemester',
            role: 'baker',
            archetypeId: 'worker_baker',
            placementHint: 'Back-left prep counter',
            actionHint: 'Stretching dough',
            wardrobeStyle: 'baker',
            outfitColors: ['#c0392b', '#f4e7d3'],
            logoPlacement: 'apron_chest',
            appearance: {
              skinTone: '#c58c62',
              hairColor: '#2f241f',
              hairStyle: 'covered',
              facialHair: 'stubble',
            },
            behaviorPlan: {
              type: 'work_loop',
              lookAtTarget: 'oven',
              pace: 'active',
              radius: 0.7,
            },
          },
        ],
      });
    });

    await page.waitForFunction(() => {
      const diagnostics = (window as any).virtualStudio?.buildEnvironmentDiagnostics?.('character-inspector-loaded');
      return (diagnostics?.sceneState?.characters?.length ?? 0) === 1;
    }, { timeout: 45_000 });

    const characterId = await page.evaluate(() => {
      const diagnostics = (window as any).virtualStudio.buildEnvironmentDiagnostics('character-inspector-id');
      return diagnostics.sceneState.characters[0].id as string;
    });

    await page.evaluate((nodeId: string) => {
      window.dispatchEvent(new CustomEvent('ch-scene-node-selected', {
        detail: { nodeId },
      }));
    }, characterId);

    await page.waitForFunction((targetId: string) => {
      const api = (window as any).__virtualStudioCharacterInspectorTestApi;
      const selectedNodeId = (window as any).__virtualStudioDiagnostics?.selection?.selectedNodeId;
      return Boolean(api)
        && (selectedNodeId === targetId || api.getState?.().selectedActor === targetId);
    }, characterId, { timeout: 30_000 });

    const inspectorState = await page.evaluate(() => {
      return (window as any).__virtualStudioCharacterInspectorTestApi.getState();
    });

    expect(inspectorState.selectedActor).toBe(characterId);
    expect(inspectorState.draft.name).toBe('Bakemester');
    expect(inspectorState.visualKind).toBe('catalog-glb');

    await page.evaluate(() => {
      return (window as any).__virtualStudioCharacterInspectorTestApi.applyDraftPatch({
        skinTone: '#4a2c1a',
        actionHint: 'Greeting guests from the oven side',
        behaviorType: 'counter_service',
        behaviorLookAtTarget: 'counter',
        behaviorPace: 'subtle',
        behaviorRadius: 1.1,
      });
    });

    await page.waitForFunction((targetId: string) => {
      const diagnostics = (window as any).virtualStudio?.buildEnvironmentDiagnostics?.('character-inspector-after');
      const character = diagnostics?.sceneState?.characters?.find((entry: { id: string }) => entry.id === targetId);
      return character?.appearance?.skinTone === '#4a2c1a'
        && character?.actionHint === 'Greeting guests from the oven side'
        && character?.behaviorPlan?.type === 'counter_service'
        && character?.behaviorPlan?.lookAtTarget === 'counter'
        && character?.behaviorPlan?.pace === 'subtle';
    }, characterId, { timeout: 30_000 });

    const diagnostics = await page.evaluate((targetId: string) => {
      const snapshot = (window as any).virtualStudio.buildEnvironmentDiagnostics('character-inspector-final');
      return snapshot.sceneState.characters.find((entry: { id: string }) => entry.id === targetId);
    }, characterId);

    expect(diagnostics?.appearance?.skinTone).toBe('#4a2c1a');
    expect(diagnostics?.actionHint).toBe('Greeting guests from the oven side');
    expect(diagnostics?.wardrobeStyle).toBe('baker');
    expect(diagnostics?.behaviorPlan?.type).toBe('counter_service');
    expect(diagnostics?.behaviorPlan?.lookAtTarget).toBe('counter');
    expect(diagnostics?.behaviorPlan?.pace).toBe('subtle');
    expect(diagnostics?.behaviorPlan?.radius).toBeCloseTo(1.1, 1);
  });
});
