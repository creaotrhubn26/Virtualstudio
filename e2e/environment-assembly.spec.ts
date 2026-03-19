import { expect, test, type Page } from '@playwright/test';

type EnvironmentPropSnapshot = {
  assetId: string;
  name: string;
  position: [number, number, number];
  environmentGenerated?: boolean;
  placementHint?: string | null;
};

type EnvironmentDiagnostics = {
  sceneState: {
    props: EnvironmentPropSnapshot[];
  };
};

async function waitForStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => !!(window as any).virtualStudio, { timeout: 90_000 });
}

async function buildPizzaEnvironment(page: Page): Promise<EnvironmentDiagnostics> {
  return page.evaluate(async () => {
    const studio = (window as any).virtualStudio;
    if (!studio?.addEnvironmentProps || !studio?.clearEnvironmentGeneratedProps || !studio?.buildEnvironmentDiagnostics) {
      throw new Error('VirtualStudio environment runtime helpers are not available');
    }

    studio.clearEnvironmentGeneratedProps();

    await studio.addEnvironmentProps([
      {
        assetId: 'table_rustic',
        name: 'Rustic Table',
        placementHint: 'Front-center, angled slightly towards the camera.',
      },
      {
        assetId: 'pizza_peel_wall',
        name: 'Pizza Peel',
        placementHint: 'Visible in the background, suggesting a working pizzeria.',
        metadata: { placementMode: 'wall' },
      },
      {
        assetId: 'menu_board_wall',
        name: 'Vintage Poster',
        placementHint: 'On the back wall, slightly out of focus.',
        metadata: { placementMode: 'wall' },
      },
      {
        assetId: 'pizza_hero_display',
        name: 'Hero Pizza',
        placementHint: 'Center of the frame, on a rustic wooden table.',
        metadata: { placementMode: 'surface', surfaceHint: 'table' },
      },
      {
        assetId: 'wine_bottle_red',
        name: 'Wine Bottle',
        placementHint: 'On the table, slightly out of focus, to the side of the pizza.',
        metadata: { placementMode: 'surface', surfaceHint: 'table' },
      },
      {
        assetId: 'wine_glass_clear',
        name: 'Wine Glass',
        placementHint: 'On the table, next to the wine bottle.',
        metadata: { placementMode: 'surface', surfaceHint: 'table' },
      },
      {
        assetId: 'herb_pots_cluster',
        name: 'Herb Pots',
        placementHint: 'On the table, adding a touch of freshness.',
        metadata: { placementMode: 'surface', surfaceHint: 'table' },
      },
    ], {
      clearExisting: true,
      planId: 'playwright-environment-assembly',
    });

    return studio.buildEnvironmentDiagnostics('playwright-environment-assembly') as EnvironmentDiagnostics;
  });
}

test.describe('Environment Assembly Runtime', () => {
  test.beforeEach(async ({ page }) => {
    await waitForStudio(page);
  });

  test('places tabletop props above the generated table anchor', async ({ page }) => {
    const diagnostics = await buildPizzaEnvironment(page);
    const props = diagnostics.sceneState.props;

    const table = props.find((prop) => prop.assetId === 'table_rustic');
    const pizza = props.find((prop) => prop.assetId === 'pizza_hero_display');
    const bottle = props.find((prop) => prop.assetId === 'wine_bottle_red');
    const glass = props.find((prop) => prop.assetId === 'wine_glass_clear');
    const herbs = props.find((prop) => prop.assetId === 'herb_pots_cluster');

    expect(table).toBeDefined();
    expect(pizza).toBeDefined();
    expect(bottle).toBeDefined();
    expect(glass).toBeDefined();
    expect(herbs).toBeDefined();

    expect(pizza!.position[1]).toBeGreaterThan(table!.position[1]);
    expect(bottle!.position[1]).toBeGreaterThan(table!.position[1]);
    expect(glass!.position[1]).toBeGreaterThan(table!.position[1]);
    expect(herbs!.position[1]).toBeGreaterThan(table!.position[1]);
  });

  test('tracks generated props in diagnostics and clears them cleanly', async ({ page }) => {
    const diagnostics = await buildPizzaEnvironment(page);
    expect(diagnostics.sceneState.props.length).toBeGreaterThanOrEqual(6);
    expect(diagnostics.sceneState.props.every((prop) => prop.environmentGenerated)).toBeTruthy();

    const clearedCount = await page.evaluate(() => {
      const studio = (window as any).virtualStudio;
      if (!studio?.clearEnvironmentGeneratedProps || !studio?.buildEnvironmentDiagnostics) {
        throw new Error('VirtualStudio environment runtime helpers are not available');
      }

      const clearedIds = studio.clearEnvironmentGeneratedProps() as string[];
      const after = studio.buildEnvironmentDiagnostics('playwright-environment-cleared') as EnvironmentDiagnostics;
      if (after.sceneState.props.length !== 0) {
        throw new Error(`Expected cleared props, found ${after.sceneState.props.length}`);
      }
      return clearedIds.length;
    });

    expect(clearedCount).toBeGreaterThanOrEqual(6);
  });
});
