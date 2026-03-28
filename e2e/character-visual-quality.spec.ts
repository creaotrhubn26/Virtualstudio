import { expect, test } from '@playwright/test';

test.describe('Character Visual Quality', () => {
  test.describe.configure({ timeout: 180_000 });

  test('renders imported branded workers without fake face geometry and captures proof screenshots', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => Boolean((window as any).virtualStudio), { timeout: 90_000 });

    await page.evaluate(async () => {
      const studio = (window as any).virtualStudio;
      const logoSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
          <rect width="256" height="256" rx="48" fill="#f4e7d3"/>
          <circle cx="128" cy="128" r="86" fill="#c0392b"/>
          <path d="M88 80h80v20h-30v86h-20v-86H88z" fill="#fff7ed"/>
        </svg>
      `)}`;

      studio.applyEnvironmentBranding({
        planId: 'character-visual-quality',
        branding: {
          enabled: true,
          brandName: 'Trattoria Uno',
          palette: ['#c0392b', '#f4e7d3', '#1f2937'],
          logoImage: logoSvg,
          signageText: 'Trattoria Uno',
          applyToWardrobe: true,
          applyToEnvironment: false,
          applyToSignage: false,
          applicationTargets: ['wardrobe'],
          uniformPolicy: 'staff_brand_uniform',
          notes: ['visual quality proof'],
        },
      });

      await studio.addEnvironmentCharacters({
        clearExisting: true,
        characters: [
          {
            name: 'Bakemester',
            role: 'baker',
            archetypeId: 'worker_baker',
            placementHint: 'Front center',
            actionHint: 'Presenting artisan pizza dough',
            wardrobeStyle: 'baker',
            wardrobeVariantId: 'branded_apron_service',
            outfitColors: ['#c0392b', '#f4e7d3', '#1f2937'],
            logoPlacement: 'apron_chest',
            appearance: {
              skinTone: '#b77755',
              hairColor: '#2f241f',
              hairStyle: 'covered',
              facialHair: 'stubble',
            },
          },
          {
            name: 'Kassevert',
            role: 'cashier',
            archetypeId: 'worker_cashier',
            placementHint: 'Camera-right front',
            actionHint: 'Welcoming guests at the register',
            wardrobeStyle: 'cashier',
            wardrobeVariantId: 'front_counter_cap',
            outfitColors: ['#2f6b45', '#f4e7d3', '#102a43'],
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
      const diagnostics = (window as any).virtualStudio?.buildEnvironmentDiagnostics?.('character-visual-quality');
      const characters = diagnostics?.sceneState?.characters ?? [];
      if (characters.length !== 2) {
        return false;
      }
      return characters.every((character: any) => character.visualKind === 'catalog-glb')
        && characters.every((character: any) => (character.appearanceAccessoryCount ?? 0) === 0)
        && characters.every((character: any) => (character.wardrobeAccessoryCount ?? 0) <= 2)
        && characters.some((character: any) => (character.wardrobeAccessoryNames ?? []).some((name: string) => name.includes('logoPlate')))
        && characters.every((character: any) => !(character.appearanceAccessoryNames ?? []).some((name: string) => name.includes('noseBridge')))
        && characters.every((character: any) => !(character.appearanceAccessoryNames ?? []).some((name: string) => name.includes('leftEye')))
        && characters.every((character: any) => !(character.wardrobeAccessoryNames ?? []).some((name: string) => name.includes('apronStrap')))
        && characters.every((character: any) => !(character.wardrobeAccessoryNames ?? []).some((name: string) => name.includes('shoulderYoke')));
    }, { timeout: 45_000 });

    const diagnostics = await page.evaluate(() => {
      return (window as any).virtualStudio.buildEnvironmentDiagnostics('character-visual-quality-assert');
    });

    const baker = diagnostics.sceneState.characters.find((entry: any) => entry.role === 'baker');
    const cashier = diagnostics.sceneState.characters.find((entry: any) => entry.role === 'cashier');

    expect(baker).toBeTruthy();
    expect(cashier).toBeTruthy();
    expect(baker.visualKind).toBe('catalog-glb');
    expect(cashier.visualKind).toBe('catalog-glb');
    expect(baker.appearanceAccessoryCount).toBe(0);
    expect(cashier.appearanceAccessoryCount).toBe(0);
    expect(baker.appearanceAccessoryNames.some((name: string) => name.includes('noseBridge'))).toBe(false);
    expect(baker.appearanceAccessoryNames.some((name: string) => name.includes('leftEye'))).toBe(false);
    expect(baker.wardrobeAccessoryNames.some((name: string) => name.includes('apronStrap'))).toBe(false);
    expect(baker.wardrobeAccessoryNames.some((name: string) => name.includes('logoPlate'))).toBe(true);
    expect(cashier.wardrobeAccessoryNames.some((name: string) => name.includes('shoulderYoke'))).toBe(false);
    expect(cashier.wardrobeAccessoryNames.some((name: string) => name.includes('collar'))).toBe(false);

    await page.evaluate(() => {
      const studio = (window as any).virtualStudio;
      const diagnostics = studio.buildEnvironmentDiagnostics('character-visual-quality-camera');
      const baker = diagnostics.sceneState.characters.find((entry: any) => entry.role === 'baker');
      const cashier = diagnostics.sceneState.characters.find((entry: any) => entry.role === 'cashier');
      const camera = studio.camera;
      const targetX = ((baker?.position?.[0] ?? 0) + (cashier?.position?.[0] ?? 0)) * 0.5;
      const targetY = Math.max(baker?.position?.[1] ?? 0, cashier?.position?.[1] ?? 0) + 1.15;
      const targetZ = ((baker?.position?.[2] ?? 0) + (cashier?.position?.[2] ?? 0)) * 0.5;
      camera.position.set(targetX + 1.25, targetY + 0.15, targetZ + 1.7);
      if (typeof camera.setTarget === 'function') {
        const target = new camera.position.constructor(targetX, targetY, targetZ);
        camera.setTarget(target);
      }
    });

    await page.waitForTimeout(1200);
    await page.screenshot({
      path: testInfo.outputPath('character-visual-quality-proof.png'),
      fullPage: false,
    });
  });
});
