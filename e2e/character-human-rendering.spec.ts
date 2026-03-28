import { expect, test } from '@playwright/test';

test.describe('Character Human Rendering', () => {
  test.describe.configure({ timeout: 120_000 });

  test('loads a human default avatar instead of Cesium at startup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => Boolean((window as any).virtualStudio?.scene), { timeout: 90_000 });
    await page.waitForFunction(() => {
      const studio = (window as any).virtualStudio;
      const mesh = studio?.scene?.getMeshByName?.('default_avatar');
      const sourceModelUrl = mesh?.metadata?.avatarSourceUrl ?? mesh?.metadata?.sourceModelUrl ?? null;
      return typeof sourceModelUrl === 'string' && sourceModelUrl.includes('/models/avatars/avatar_');
    }, { timeout: 30_000 });

    const defaultAvatar = await page.evaluate(() => {
      const studio = (window as any).virtualStudio;
      const mesh = studio?.scene?.getMeshByName?.('default_avatar');
      return {
        exists: Boolean(mesh),
        sourceModelUrl: mesh?.metadata?.avatarSourceUrl ?? mesh?.metadata?.sourceModelUrl ?? null,
        pbrKey: mesh?.metadata?.pbrKey ?? null,
      };
    });

    expect(defaultAvatar.exists).toBe(true);
    expect(defaultAvatar.sourceModelUrl).toContain('/models/avatars/avatar_');
    expect(defaultAvatar.pbrKey).not.toBe('cesium_man');
  });

  test('loads AI scene workers as human GLBs instead of mannequin fallback', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });

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
          },
          {
            name: 'Kassemedarbeider',
            role: 'cashier',
            archetypeId: 'worker_cashier',
            placementHint: 'Front register',
            actionHint: 'Taking customer orders',
            wardrobeStyle: 'cashier',
            outfitColors: ['#2f6b45', '#f4e7d3'],
            logoPlacement: 'shirt_chest',
            appearance: {
              skinTone: '#8d5b3b',
              hairColor: '#31241c',
              hairStyle: 'bun',
              facialHair: 'none',
            },
          },
        ],
      });
    });

    await page.waitForFunction(() => {
      const studio = (window as any).virtualStudio;
      const diagnostics = studio?.buildEnvironmentDiagnostics?.('character-human-rendering-wait');
      const characters = diagnostics?.sceneState?.characters ?? [];
      return characters.length === 2
        && characters.every((character: any) => character.visualKind === 'catalog-glb')
        && characters.every((character: any) => String(character.sourceModelUrl || '').includes('/models/avatars/avatar_'));
    }, { timeout: 30_000 });

    const characters = await page.evaluate(() => {
      const diagnostics = (window as any).virtualStudio.buildEnvironmentDiagnostics('character-human-rendering');
      return diagnostics.sceneState.characters.map((character: any) => ({
        id: character.id,
        name: character.name,
        visualKind: character.visualKind,
        sourceModelUrl: character.sourceModelUrl,
        avatarUrl: character.avatarUrl,
      }));
    });

    expect(characters).toHaveLength(2);
    expect(characters.every((character: any) => character.visualKind === 'catalog-glb')).toBe(true);
    expect(characters.every((character: any) => String(character.sourceModelUrl || '').includes('/models/avatars/avatar_'))).toBe(true);
  });
});
