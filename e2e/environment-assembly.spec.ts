import { expect, test, type Page } from '@playwright/test';

type EnvironmentPropSnapshot = {
  assetId: string;
  name: string;
  position: [number, number, number];
  rotationY?: number;
  environmentGenerated?: boolean;
  placementHint?: string | null;
  relativePlacementType?: string | null;
  relativePlacementTargetAssetId?: string | null;
  faceTarget?: string | null;
  preferredWallTarget?: string | null;
  shotZoneX?: number | null;
  shotDepthZone?: string | null;
};

type EnvironmentDiagnostics = {
  serviceState: {
    roomShell: {
      type: string;
      width: number;
      depth: number;
      height: number;
    };
  };
  sceneState: {
    camera: {
      position: [number, number, number];
    };
    roomShell: {
      type: string;
      ceilingStyle?: string | null;
      ceilingVisible: boolean;
      renderedOpenings: string[];
      renderedNiches: string[];
      renderedWallSegments: string[];
      renderedFixtures: string[];
      niches: Array<{
        id: string;
        kind: string;
        wallTarget?: string | null;
      }>;
      wallSegments: Array<{
        id: string;
        kind: string;
        wallTarget?: string | null;
      }>;
      brandAccessoryKinds: string[];
      brandDecorationKinds: string[];
      fixtures: Array<{
        id: string;
        kind: string;
        zoneId?: string | null;
      }>;
      typeAccessoryKinds: string[];
    };
    props: EnvironmentPropSnapshot[];
  };
};

async function waitForStudio(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => !!(window as any).virtualStudio, { timeout: 90_000 });
  await page.waitForFunction(() => Boolean((window as any).__virtualStudioRuntimeReady?.ready), { timeout: 90_000 });
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

async function buildRelativePlacementEnvironment(page: Page): Promise<EnvironmentDiagnostics> {
  return page.evaluate(async () => {
    const studio = (window as any).virtualStudio;
    if (!studio?.addEnvironmentProps || !studio?.clearEnvironmentGeneratedProps || !studio?.buildEnvironmentDiagnostics) {
      throw new Error('VirtualStudio environment runtime helpers are not available');
    }

    studio.clearEnvironmentGeneratedProps();

    await studio.addEnvironmentProps([
      {
        assetId: 'beauty_table',
        name: 'Beauty Table',
        placementHint: 'Center foreground',
      },
      {
        assetId: 'chair_posing',
        name: 'Posing Chair',
        placementHint: 'Centered just behind the beauty table, facing the camera.',
        metadata: {
          relativePlacementType: 'behind',
          relativePlacementTargetAssetId: 'beauty_table',
          relativePlacementSide: 'center',
          faceTarget: 'camera',
        },
      },
      {
        assetId: 'reflective_panel',
        name: 'Reflective Panel',
        placementHint: 'Slightly camera-left',
        metadata: {
          relativePlacementType: 'next_to',
          relativePlacementTargetAssetId: 'beauty_table',
          relativePlacementSide: 'left',
        },
      },
      {
        assetId: 'plant_potted',
        name: 'Plant',
        placementHint: 'Slightly camera-right',
        metadata: {
          relativePlacementType: 'next_to',
          relativePlacementTargetAssetId: 'beauty_table',
          relativePlacementSide: 'right',
        },
      },
    ], {
      clearExisting: true,
      planId: 'playwright-relative-placement',
    });

    return studio.buildEnvironmentDiagnostics('playwright-relative-placement') as EnvironmentDiagnostics;
  });
}

async function buildZoneAwareEnvironment(page: Page): Promise<EnvironmentDiagnostics> {
  return page.evaluate(async () => {
    const studio = (window as any).virtualStudio;
    if (!studio?.addEnvironmentProps || !studio?.clearEnvironmentGeneratedProps || !studio?.buildEnvironmentDiagnostics) {
      throw new Error('VirtualStudio environment runtime helpers are not available');
    }

    studio.clearEnvironmentGeneratedProps();

    await studio.addEnvironmentProps([
      {
        assetId: 'beauty_table',
        name: 'Beauty Table',
        placementHint: 'Hero workstation.',
        metadata: {
          shotZoneX: 0.7,
          shotDepthZone: 'foreground',
        },
      },
      {
        assetId: 'reflective_panel',
        name: 'Reflective Panel',
        placementHint: 'Supportive bounce panel.',
        metadata: {
          shotZoneX: -0.7,
          shotDepthZone: 'midground',
        },
      },
      {
        assetId: 'display_shelf_wall',
        name: 'Display Shelf',
        placementHint: 'Background wall dressing.',
        metadata: {
          placementMode: 'wall',
          preferredWallTarget: 'rearWall',
          shotDepthZone: 'background',
        },
      },
    ], {
      clearExisting: true,
      planId: 'playwright-zone-aware-placement',
    });

    return studio.buildEnvironmentDiagnostics('playwright-zone-aware-placement') as EnvironmentDiagnostics;
  });
}

async function buildZoneAwareSurfaceEnvironment(page: Page): Promise<EnvironmentDiagnostics> {
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
        placementHint: 'Center foreground',
      },
      {
        assetId: 'pizza_hero_display',
        name: 'Hero Pizza',
        placementHint: 'Hero product on the tabletop.',
        metadata: {
          placementMode: 'surface',
          surfaceHint: 'table',
          shotZoneX: 0.78,
          shotDepthZone: 'foreground',
        },
      },
      {
        assetId: 'herb_pots_cluster',
        name: 'Herb Pots',
        placementHint: 'Table styling in the background plane.',
        metadata: {
          placementMode: 'surface',
          surfaceHint: 'table',
          shotZoneX: -0.74,
          shotDepthZone: 'background',
        },
      },
    ], {
      clearExisting: true,
      planId: 'playwright-zone-aware-surface-placement',
    });

    return studio.buildEnvironmentDiagnostics('playwright-zone-aware-surface-placement') as EnvironmentDiagnostics;
  });
}

async function applyRoomShellAndCapture(
  page: Page,
  shell: {
    type: string;
    width: number;
    depth: number;
    height: number;
    openCeiling: boolean;
    openings?: Array<Record<string, unknown>>;
    zones?: Array<Record<string, unknown>>;
    fixtures?: Array<Record<string, unknown>>;
    niches?: Array<Record<string, unknown>>;
  },
): Promise<EnvironmentDiagnostics> {
  return page.evaluate(async (requestedShell) => {
    const studio = (window as any).virtualStudio;
    if (!studio?.buildEnvironmentDiagnostics) {
      throw new Error('VirtualStudio environment runtime helpers are not available');
    }

    window.dispatchEvent(new CustomEvent('ch-apply-room-shell', {
      detail: {
        shell: requestedShell,
      },
    }));

    await new Promise((resolve) => window.setTimeout(resolve, 120));

    return studio.buildEnvironmentDiagnostics(`playwright-room-shell-${requestedShell.type}`) as EnvironmentDiagnostics;
  }, shell);
}

async function applyBrandingToShellAndCapture(
  page: Page,
  options: {
    shell: {
      type: string;
      width: number;
      depth: number;
      height: number;
      openCeiling: boolean;
      openings?: Array<Record<string, unknown>>;
      zones?: Array<Record<string, unknown>>;
      fixtures?: Array<Record<string, unknown>>;
      niches?: Array<Record<string, unknown>>;
    };
    branding: Record<string, unknown>;
  },
): Promise<EnvironmentDiagnostics> {
  return page.evaluate(async (payload) => {
    const studio = (window as any).virtualStudio;
    if (!studio?.buildEnvironmentDiagnostics || !studio?.applyEnvironmentBranding) {
      throw new Error('VirtualStudio branding helpers are not available');
    }

    window.dispatchEvent(new CustomEvent('ch-apply-room-shell', {
      detail: {
        shell: payload.shell,
      },
    }));

    await new Promise((resolve) => window.setTimeout(resolve, 120));
    studio.applyEnvironmentBranding({
      planId: 'playwright-shell-branding',
      branding: payload.branding,
    });
    await new Promise((resolve) => window.setTimeout(resolve, 120));

    return studio.buildEnvironmentDiagnostics('playwright-shell-branding') as EnvironmentDiagnostics;
  }, options);
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

  test('respects relative placement relationships for ground props', async ({ page }) => {
    const diagnostics = await buildRelativePlacementEnvironment(page);
    const props = diagnostics.sceneState.props;
    const cameraPosition = diagnostics.sceneState.camera.position;

    const table = props.find((prop) => prop.assetId === 'beauty_table');
    const chair = props.find((prop) => prop.assetId === 'chair_posing');
    const panel = props.find((prop) => prop.assetId === 'reflective_panel');
    const plant = props.find((prop) => prop.assetId === 'plant_potted');

    expect(table).toBeDefined();
    expect(chair).toBeDefined();
    expect(panel).toBeDefined();
    expect(plant).toBeDefined();

    expect(chair!.relativePlacementType).toBe('behind');
    expect(chair!.relativePlacementTargetAssetId).toBe('beauty_table');
    expect(chair!.faceTarget).toBe('camera');

    const distanceToCamera = (position: [number, number, number]) => Math.sqrt(
      ((position[0] - cameraPosition[0]) ** 2)
      + ((position[1] - cameraPosition[1]) ** 2)
      + ((position[2] - cameraPosition[2]) ** 2),
    );
    const forward = [
      table!.position[0] - cameraPosition[0],
      0,
      table!.position[2] - cameraPosition[2],
    ] as const;
    const forwardLength = Math.sqrt((forward[0] ** 2) + (forward[2] ** 2)) || 1;
    const normalizedForward = [
      forward[0] / forwardLength,
      0,
      forward[2] / forwardLength,
    ] as const;
    const cameraRight = [
      -normalizedForward[2],
      0,
      normalizedForward[0],
    ] as const;
    const projectRight = (position: [number, number, number]) => (
      ((position[0] - table!.position[0]) * cameraRight[0])
      + ((position[2] - table!.position[2]) * cameraRight[2])
    );
    const expectedChairYaw = Math.atan2(
      cameraPosition[0] - chair!.position[0],
      cameraPosition[2] - chair!.position[2],
    );
    const normalizeAngle = (value: number) => {
      let angle = value;
      while (angle > Math.PI) angle -= Math.PI * 2;
      while (angle < -Math.PI) angle += Math.PI * 2;
      return angle;
    };

    expect(distanceToCamera(chair!.position)).toBeGreaterThan(distanceToCamera(table!.position));
    expect(projectRight(panel!.position)).toBeLessThan(0);
    expect(projectRight(plant!.position)).toBeGreaterThan(0);
    expect(Math.abs(normalizeAngle((chair!.rotationY ?? 0) - expectedChairYaw))).toBeLessThan(1.2);
  });

  test('uses shot-aware and preferred-wall metadata for zone-aware placement', async ({ page }) => {
    const diagnostics = await buildZoneAwareEnvironment(page);
    const props = diagnostics.sceneState.props;

    const hero = props.find((prop) => prop.assetId === 'beauty_table');
    const support = props.find((prop) => prop.assetId === 'reflective_panel');
    const wallShelf = props.find((prop) => prop.assetId === 'display_shelf_wall');

    expect(hero).toBeDefined();
    expect(support).toBeDefined();
    expect(wallShelf).toBeDefined();

    expect(hero!.shotZoneX).toBeGreaterThan(0);
    expect(hero!.shotDepthZone).toBe('foreground');
    expect(support!.shotZoneX).toBeLessThan(0);
    expect(support!.shotDepthZone).toBe('midground');
    expect(support!.position[0]).toBeLessThan(hero!.position[0]);
    expect(support!.position[2]).toBeLessThan(hero!.position[2]);
    expect(wallShelf!.preferredWallTarget).toBe('rearWall');
    expect(wallShelf!.position[2]).toBeGreaterThan(hero!.position[2]);
  });

  test('uses shot-aware zones for surface props on the same anchor', async ({ page }) => {
    const diagnostics = await buildZoneAwareSurfaceEnvironment(page);
    const props = diagnostics.sceneState.props;
    const cameraPosition = diagnostics.sceneState.camera.position;

    const table = props.find((prop) => prop.assetId === 'table_rustic');
    const pizza = props.find((prop) => prop.assetId === 'pizza_hero_display');
    const herbs = props.find((prop) => prop.assetId === 'herb_pots_cluster');

    expect(table).toBeDefined();
    expect(pizza).toBeDefined();
    expect(herbs).toBeDefined();

    const forward = [
      table!.position[0] - cameraPosition[0],
      0,
      table!.position[2] - cameraPosition[2],
    ] as const;
    const forwardLength = Math.sqrt((forward[0] ** 2) + (forward[2] ** 2)) || 1;
    const normalizedForward = [
      forward[0] / forwardLength,
      0,
      forward[2] / forwardLength,
    ] as const;
    const cameraRight = [
      -normalizedForward[2],
      0,
      normalizedForward[0],
    ] as const;
    const distanceToCamera = (position: [number, number, number]) => Math.sqrt(
      ((position[0] - cameraPosition[0]) ** 2)
      + ((position[1] - cameraPosition[1]) ** 2)
      + ((position[2] - cameraPosition[2]) ** 2),
    );
    const projectRight = (position: [number, number, number]) => (
      ((position[0] - table!.position[0]) * cameraRight[0])
      + ((position[2] - table!.position[2]) * cameraRight[2])
    );

    expect(pizza!.position[1]).toBeGreaterThan(table!.position[1]);
    expect(herbs!.position[1]).toBeGreaterThan(table!.position[1]);
    expect(projectRight(pizza!.position)).toBeGreaterThan(projectRight(herbs!.position) + 0.12);
    expect(distanceToCamera(pizza!.position)).toBeLessThan(distanceToCamera(herbs!.position));
  });

  test('builds storefront shell accessories and opening diagnostics', async ({ page }) => {
    const diagnostics = await applyRoomShellAndCapture(page, {
      type: 'storefront',
      width: 18,
      depth: 12,
      height: 6,
      openCeiling: false,
      openings: [
        {
          id: 'entry_front',
          wallTarget: 'rearWall',
          kind: 'door',
          widthRatio: 0.22,
          heightRatio: 0.72,
          xAlign: 'left',
          sillHeight: 0,
        },
        {
          id: 'display_window',
          wallTarget: 'rearWall',
          kind: 'window',
          widthRatio: 0.38,
          heightRatio: 0.42,
          xAlign: 'right',
          sillHeight: 1.1,
        },
      ],
      fixtures: [
        {
          id: 'front_counter_block',
          kind: 'counter_block',
          zoneId: 'front_counter',
          widthRatio: 0.32,
          depthRatio: 0.14,
          height: 1.08,
        },
        {
          id: 'host_stand',
          kind: 'host_stand',
          xBias: 0.24,
          zBias: -0.08,
          widthRatio: 0.12,
          depthRatio: 0.08,
          height: 1.18,
        },
        {
          id: 'window_plinth',
          kind: 'display_plinth',
          xBias: -0.18,
          zBias: -0.12,
          widthRatio: 0.14,
          depthRatio: 0.14,
          height: 0.82,
        },
      ],
      niches: [
        {
          id: 'menu_display_niche',
          wallTarget: 'rightWall',
          kind: 'display',
          widthRatio: 0.18,
          heightRatio: 0.34,
          xAlign: 'center',
          sillHeight: 0.86,
          depth: 0.22,
        },
      ],
    });

    expect(diagnostics.sceneState.roomShell.type).toBe('storefront');
    expect(diagnostics.serviceState.roomShell.type).toBe('storefront');
    expect(diagnostics.sceneState.roomShell.ceilingVisible).toBeTruthy();
    expect(diagnostics.sceneState.roomShell.renderedOpenings).toEqual(
      expect.arrayContaining(['entry_front', 'display_window']),
    );
    expect(diagnostics.sceneState.roomShell.renderedNiches).toEqual(
      expect.arrayContaining(['menu_display_niche']),
    );
    expect(diagnostics.sceneState.roomShell.renderedFixtures).toEqual(
      expect.arrayContaining(['front_counter_block', 'host_stand', 'window_plinth']),
    );
    expect(diagnostics.sceneState.roomShell.fixtures.map((fixture) => fixture.kind)).toEqual(
      expect.arrayContaining(['counter_block', 'host_stand', 'display_plinth']),
    );
    expect(diagnostics.sceneState.roomShell.typeAccessoryKinds).toEqual(
      expect.arrayContaining(['storefront_awning', 'storefront_header', 'display_ledge', 'counter_block', 'host_stand', 'display_plinth', 'niche_display']),
    );
  });

  test('builds warehouse shell accessories for industrial scenes', async ({ page }) => {
    const diagnostics = await applyRoomShellAndCapture(page, {
      type: 'warehouse',
      width: 22,
      depth: 18,
      height: 8,
      openCeiling: false,
    });

    expect(diagnostics.sceneState.roomShell.type).toBe('warehouse');
    expect(diagnostics.serviceState.roomShell.type).toBe('warehouse');
    expect(diagnostics.sceneState.roomShell.typeAccessoryKinds).toEqual(
      expect.arrayContaining(['warehouse_beam', 'warehouse_column']),
    );
  });

  test('builds outdoor illusion shell accessories with an open sky treatment', async ({ page }) => {
    const diagnostics = await applyRoomShellAndCapture(page, {
      type: 'outdoor_illusion',
      width: 20,
      depth: 14,
      height: 7,
      openCeiling: true,
    });

    expect(diagnostics.sceneState.roomShell.type).toBe('outdoor_illusion');
    expect(diagnostics.serviceState.roomShell.type).toBe('outdoor_illusion');
    expect(diagnostics.sceneState.roomShell.ceilingVisible).toBeFalsy();
    expect(diagnostics.sceneState.roomShell.typeAccessoryKinds).toEqual(
      expect.arrayContaining(['sky_backdrop', 'ground_extension']),
    );
  });

  test('applies branded shell accessories when environment branding targets the room', async ({ page }) => {
    const diagnostics = await applyBrandingToShellAndCapture(page, {
      shell: {
        type: 'storefront',
        width: 16,
        depth: 12,
        height: 5.4,
        openCeiling: false,
      },
      branding: {
        enabled: true,
        brandName: "Luigi's Pizza",
        profileName: 'warm-neighborhood-pizzeria',
        palette: ['#c0392b', '#f4e7d3', '#2f6b45'],
        signageText: 'Wood-fired slices',
        applyToEnvironment: true,
        applyToWardrobe: false,
        applyToSignage: true,
        applicationTargets: ['environment', 'signage', 'interior_details'],
        signageStyle: 'menu_board',
        interiorStyle: 'accent_trim',
      },
    });

    expect(diagnostics.sceneState.roomShell.brandAccessoryKinds).toEqual(
      expect.arrayContaining(['brand_wall_band', 'brand_floor_runner', 'brand_window_decal']),
    );
    expect(diagnostics.sceneState.roomShell.brandDecorationKinds).toEqual(
      expect.arrayContaining(['interior_trim', 'signage']),
    );
  });

  test('renders room-shell niches as modular wall details', async ({ page }) => {
    const diagnostics = await applyRoomShellAndCapture(page, {
      type: 'interior_room',
      width: 14,
      depth: 10,
      height: 4.2,
      openCeiling: false,
      niches: [
        {
          id: 'hero_display_niche',
          wallTarget: 'backWall',
          kind: 'display',
          widthRatio: 0.24,
          heightRatio: 0.36,
          xAlign: 'center',
          sillHeight: 0.72,
          depth: 0.24,
        },
      ],
    });

    expect(diagnostics.sceneState.roomShell.niches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'hero_display_niche',
          kind: 'display',
          wallTarget: 'backWall',
        }),
      ]),
    );
    expect(diagnostics.sceneState.roomShell.renderedNiches).toContain('hero_display_niche');
    expect(diagnostics.sceneState.roomShell.typeAccessoryKinds).toContain('niche_display');
  });

  test('renders ceiling treatments and wall segments as modular room-shell details', async ({ page }) => {
    const diagnostics = await applyRoomShellAndCapture(page, {
      type: 'interior_room',
      width: 14,
      depth: 10,
      height: 4.2,
      openCeiling: false,
      ceilingStyle: 'coffered',
      wallSegments: [
        {
          id: 'back_panel_segment',
          wallTarget: 'backWall',
          kind: 'panel',
          widthRatio: 0.24,
          heightRatio: 0.54,
          xAlign: 'center',
          sillHeight: 0.18,
          depth: 0.08,
        },
        {
          id: 'left_pilaster_segment',
          wallTarget: 'leftWall',
          kind: 'pilaster',
          widthRatio: 0.1,
          heightRatio: 0.72,
          xAlign: 'right',
          sillHeight: 0,
          depth: 0.06,
        },
      ],
    });

    expect(diagnostics.sceneState.roomShell.ceilingStyle).toBe('coffered');
    expect(diagnostics.sceneState.roomShell.wallSegments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'back_panel_segment',
          kind: 'panel',
          wallTarget: 'backWall',
        }),
        expect.objectContaining({
          id: 'left_pilaster_segment',
          kind: 'pilaster',
          wallTarget: 'leftWall',
        }),
      ]),
    );
    expect(diagnostics.sceneState.roomShell.renderedWallSegments).toEqual(
      expect.arrayContaining(['back_panel_segment', 'left_pilaster_segment']),
    );
    expect(diagnostics.sceneState.roomShell.typeAccessoryKinds).toEqual(
      expect.arrayContaining(['ceiling_coffered', 'wall_segment_panel', 'wall_segment_pilaster']),
    );
  });
});
