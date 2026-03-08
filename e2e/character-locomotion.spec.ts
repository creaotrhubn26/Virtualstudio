import { expect, test, type Page } from '@playwright/test';

type Snapshot = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  keyboardMode: string | null;
  keyboardAuthority: string | null;
  keyboardAnimation: string | null;
  pathMode: string | null;
  pathAuthority: string | null;
};

const distance2D = (a: Snapshot, b: Snapshot): number => Math.hypot(a.x - b.x, a.z - b.z);

async function waitForStudioAndCharacter(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await page.waitForFunction(() => !!(window as any).virtualStudio, { timeout: 90_000 });
  await page.waitForFunction(() => {
    const studio = (window as any).virtualStudio;
    const mesh = studio?.getPrimaryCharacterMesh?.();
    return !!mesh && !mesh.isDisposed?.();
  }, { timeout: 90_000 });
}

async function focusCanvas(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const candidates = Array.from(document.querySelectorAll('canvas'))
      .map((canvas) => {
        const rect = canvas.getBoundingClientRect();
        const style = window.getComputedStyle(canvas);
        const visible = (
          rect.width > 500 &&
          rect.height > 300 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          style.opacity !== '0'
        );
        return { canvas, rect, visible };
      })
      .filter((entry) => entry.visible)
      .sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height));

    if (candidates.length === 0) return false;
    document.querySelectorAll('canvas[data-playwright-main-canvas=\"true\"]').forEach((el) => {
      el.removeAttribute('data-playwright-main-canvas');
    });
    candidates[0].canvas.setAttribute('data-playwright-main-canvas', 'true');
    return true;
  }, { timeout: 90_000 });

  const canvas = page.locator('canvas[data-playwright-main-canvas=\"true\"]').first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await canvas.evaluate((element: HTMLCanvasElement) => {
    if (element.tabIndex < 0) {
      element.tabIndex = 0;
    }
    element.focus();
  });
  await canvas.click({ position: { x: 40, y: 40 } });
  await page.waitForFunction(() => {
    const active = document.activeElement;
    return active instanceof HTMLCanvasElement;
  }, { timeout: 10_000 });
}

async function snapshot(page: Page): Promise<Snapshot> {
  const value = await page.evaluate(() => {
    const studio = (window as any).virtualStudio;
    if (!studio) return null;

    const mesh = studio.getPrimaryCharacterMesh?.();
    if (!mesh) return null;

    const profile = studio.resolveCharacterModelProfile?.(mesh) ?? null;
    const motionNode = studio.resolveCharacterMotionNode?.(mesh, profile) ?? mesh;
    const absolute = motionNode.getAbsolutePosition
      ? motionNode.getAbsolutePosition()
      : motionNode.position;
    const yaw = (() => {
      if (typeof studio.getMeshYaw === 'function') {
        try {
          return studio.getMeshYaw(motionNode, profile);
        } catch {
          // Fall back below.
        }
      }
      return motionNode.rotationQuaternion
        ? motionNode.rotationQuaternion.toEulerAngles().y
        : motionNode.rotation?.y ?? 0;
    })();

    const keyboardState = studio.characterKeyboardState ?? null;
    const pathState = studio.activeCharacterLocomotion ?? null;

    return {
      x: Number(absolute?.x ?? motionNode.position?.x ?? 0),
      y: Number(absolute?.y ?? motionNode.position?.y ?? 0),
      z: Number(absolute?.z ?? motionNode.position?.z ?? 0),
      yaw: Number(yaw),
      keyboardMode: keyboardState?.locomotionMode ?? null,
      keyboardAuthority: keyboardState?.animationAuthority ?? null,
      keyboardAnimation: keyboardState?.activeAnimation ?? null,
      pathMode: pathState?.locomotionMode ?? null,
      pathAuthority: pathState?.animationAuthority ?? null,
    } satisfies Snapshot;
  });

  if (!value) {
    throw new Error('Could not read character snapshot from window.virtualStudio');
  }

  return value;
}

test.describe('Character Locomotion Regression', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    await waitForStudioAndCharacter(page);
    await focusCanvas(page);
  });

  test('keyboard movement only happens while keys are pressed', async ({ page }) => {
    const start = await snapshot(page);

    await page.waitForTimeout(700);
    const idle = await snapshot(page);
    expect(distance2D(start, idle)).toBeLessThan(0.06);

    await page.keyboard.down('w');
    await page.waitForTimeout(1000);
    const moved = await snapshot(page);
    expect(distance2D(start, moved)).toBeGreaterThan(0.1);
    expect(moved.keyboardMode).not.toBe('idle');

    await page.keyboard.up('w');
    await page.waitForTimeout(650);
    const stopA = await snapshot(page);
    await page.waitForTimeout(650);
    const stopB = await snapshot(page);

    expect(distance2D(stopA, stopB)).toBeLessThan(0.07);
    expect(stopB.keyboardMode).toBe('idle');
  });

  test('strafe input rotates facing direction and stays under animation authority', async ({ page }) => {
    const before = await snapshot(page);

    await page.keyboard.down('d');
    await page.waitForTimeout(900);
    const during = await snapshot(page);
    await page.keyboard.up('d');

    expect(distance2D(before, during)).toBeGreaterThan(0.09);
    const yawDelta = Math.abs(during.yaw - before.yaw);
    expect(yawDelta).toBeGreaterThan(0.04);

    // Authority can be rig/group clip or procedural fallback with no active clip.
    const hasValidAuthorityState = (
      during.keyboardAuthority === 'rig' ||
      during.keyboardAuthority === 'group' ||
      during.keyboardAnimation === null
    );
    expect(hasValidAuthorityState).toBeTruthy();
  });

  test('path locomotion uses centralized mode transitions and completes grounded', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ch-character-keyboard-controls', { detail: { enabled: false } }));
    });

    const start = await snapshot(page);
    const target = { x: start.x + 1.2, z: start.z + 0.2 };

    await page.evaluate(({ x, z }) => {
      window.dispatchEvent(new CustomEvent('ch-character-walk-to', {
        detail: {
          x,
          z,
          speed: 1.25,
          arrivalThreshold: 0.08,
          snapToGround: true,
        },
      }));
    }, target);

    await page.waitForFunction(() => {
      const studio = (window as any).virtualStudio;
      const locomotion = studio?.activeCharacterLocomotion;
      return !!locomotion && (locomotion.locomotionMode === 'walk' || locomotion.locomotionMode === 'turn');
    }, { timeout: 20_000 });

    await page.waitForFunction(() => {
      const studio = (window as any).virtualStudio;
      return !studio?.activeCharacterLocomotion;
    }, { timeout: 30_000 });

    const end = await snapshot(page);
    expect(distance2D(start, end)).toBeGreaterThan(0.75);
    expect(Math.abs(end.y - start.y)).toBeLessThan(0.35);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ch-character-keyboard-controls', { detail: { enabled: true } }));
    });
  });
});
