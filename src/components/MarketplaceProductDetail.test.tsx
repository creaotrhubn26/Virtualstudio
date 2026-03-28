// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MarketplaceProductDetail } from './MarketplaceProductDetail';
import type { MarketplaceProduct } from '../core/models/marketplace';

const {
  publishCurrentEnvironmentPackMock,
  promoteEnvironmentPackMock,
  updateProductInfoMock,
  getReviewsMock,
  addReviewMock,
  showSuccessMock,
  showErrorMock,
} = vi.hoisted(() => ({
  publishCurrentEnvironmentPackMock: vi.fn(),
  promoteEnvironmentPackMock: vi.fn(),
  updateProductInfoMock: vi.fn(() => true),
  getReviewsMock: vi.fn(() => []),
  addReviewMock: vi.fn(() => ({
    id: 'review-1',
    productId: 'environment-shared-noir-pack',
    userId: 'user-1',
    userName: 'User',
    rating: 5,
    comment: 'Great',
    helpfulCount: 0,
    createdAt: '2026-03-27T00:00:00Z',
  })),
  showSuccessMock: vi.fn(),
  showErrorMock: vi.fn(),
}));

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getReviews: getReviewsMock,
    addReview: addReviewMock,
    updateProductInfo: updateProductInfoMock,
    publishCurrentEnvironmentPack: publishCurrentEnvironmentPackMock,
    promoteEnvironmentPack: promoteEnvironmentPackMock,
  },
}));

vi.mock('./ToastStack', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

function buildRegistryProduct(canUpdate: boolean): MarketplaceProduct {
  return {
    id: 'environment-shared-noir-pack',
    name: 'Shared Noir Pack',
    description: 'Shared noir pack',
    category: 'template',
    price: 0,
    thumbnail: 'data:image/svg+xml,test',
    screenshots: [],
    version: '1.0.0',
    author: { id: 'admin-1', name: 'Admin' },
    rating: 0,
    reviewCount: 0,
    downloadCount: 0,
    installCount: 0,
    tags: ['noir'],
    features: ['Noir scene'],
    releaseDate: '2026-03-27T00:00:00Z',
    lastUpdated: '2026-03-27T00:00:00Z',
    license: 'Marketplace Shared Pack',
    isInstalled: false,
    hasUpdate: false,
    isFavorite: false,
    source: 'registry',
    registryMetadata: {
      visibility: 'shared',
      ownerId: 'admin-1',
      ownerName: 'Admin',
      ownerRole: 'admin',
      adminManaged: true,
      lineageId: 'environment-shared-noir-pack',
      releaseStatus: 'stable',
    },
    registryPermissions: {
      canUpdate,
      canSaveCopy: true,
      canPublishShared: canUpdate,
      reason: canUpdate
        ? 'Administrator kan oppdatere denne Marketplace-pakken.'
        : 'Kun administrator kan oppdatere delte Marketplace-pakker. Du kan lagre en egen kopi.',
    },
    environmentPackage: {
      packageId: 'marketplace-shared-noir-pack',
      type: 'environment_plan',
      plan: {
        version: '1.0',
        planId: 'shared-noir-plan',
        prompt: 'Noir office',
        source: 'prompt',
        summary: 'Noir office',
        concept: 'Noir office',
        roomShell: {
          type: 'storefront',
          width: 12,
          depth: 10,
          height: 4,
          openCeiling: false,
          notes: [],
        },
        surfaces: [],
        atmosphere: {
          clearColor: '#111827',
          ambientColor: '#ffffff',
          ambientIntensity: 0.5,
          fogEnabled: false,
        },
        ambientSounds: [],
        props: [],
        characters: [],
        branding: {
          enabled: false,
          palette: ['#111827'],
        },
        lighting: [],
        camera: {
          shotType: 'dramatic',
        },
        compatibility: {
          currentStudioShellSupported: true,
          confidence: 0.9,
          gaps: [],
          nextBuildModules: [],
        },
      },
    },
  };
}

describe('MarketplaceProductDetail', () => {
  beforeEach(() => {
    publishCurrentEnvironmentPackMock.mockReset();
    promoteEnvironmentPackMock.mockReset();
    updateProductInfoMock.mockClear();
    getReviewsMock.mockClear();
    addReviewMock.mockClear();
    showSuccessMock.mockClear();
    showErrorMock.mockClear();
    publishCurrentEnvironmentPackMock.mockResolvedValue({
      ...buildRegistryProduct(false),
      name: 'Shared Noir Pack (kopi)',
    });
    promoteEnvironmentPackMock.mockResolvedValue(buildRegistryProduct(true));
  });

  it('shows save-copy for shared registry packs and publishes a private copy', async () => {
    const onProductUpdated = vi.fn();
    render(
      <MarketplaceProductDetail
        open
        product={buildRegistryProduct(false)}
        onClose={vi.fn()}
        onInstall={vi.fn()}
        onUninstall={vi.fn()}
        onUpdate={vi.fn()}
        onApplyEnvironment={vi.fn()}
        onToggleFavorite={vi.fn()}
        onProductUpdated={onProductUpdated}
      />,
    );

    expect(screen.getByTestId('marketplace-detail-save-copy-environment-shared-noir-pack')).toBeTruthy();
    expect(screen.queryByTestId('marketplace-detail-update-shared-environment-shared-noir-pack')).toBeNull();
    expect(screen.queryByLabelText('Rediger produkt')).toBeNull();

    fireEvent.click(screen.getByTestId('marketplace-detail-save-copy-environment-shared-noir-pack'));

    await waitFor(() => {
      expect(publishCurrentEnvironmentPackMock).toHaveBeenCalledWith({
        targetProduct: expect.objectContaining({ id: 'environment-shared-noir-pack' }),
        mode: 'save_copy',
      });
      expect(onProductUpdated).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalled();
    });
  });

  it('shows update-shared controls when admin permissions are present', () => {
    render(
      <MarketplaceProductDetail
        open
        product={buildRegistryProduct(true)}
        onClose={vi.fn()}
        onInstall={vi.fn()}
        onUninstall={vi.fn()}
        onUpdate={vi.fn()}
        onApplyEnvironment={vi.fn()}
        onToggleFavorite={vi.fn()}
        onProductUpdated={vi.fn()}
      />,
    );

    expect(screen.getByTestId('marketplace-detail-save-copy-environment-shared-noir-pack')).toBeTruthy();
    expect(screen.getByTestId('marketplace-detail-update-shared-environment-shared-noir-pack')).toBeTruthy();
    expect(screen.getByLabelText('Rediger produkt')).toBeTruthy();
  });

  it('shows promote control for candidate packs and promotes them to stable', async () => {
    const onProductUpdated = vi.fn();
    render(
      <MarketplaceProductDetail
        open
        product={{
          ...buildRegistryProduct(true),
          id: 'environment-shared-noir-pack--candidate',
          registryMetadata: {
            ...buildRegistryProduct(true).registryMetadata!,
            releaseStatus: 'candidate',
            lineageId: 'environment-shared-noir-pack',
          },
          registryPermissions: {
            ...buildRegistryProduct(true).registryPermissions!,
            canPromote: true,
          },
        }}
        onClose={vi.fn()}
        onInstall={vi.fn()}
        onUninstall={vi.fn()}
        onUpdate={vi.fn()}
        onApplyEnvironment={vi.fn()}
        onToggleFavorite={vi.fn()}
        onProductUpdated={onProductUpdated}
      />,
    );

    fireEvent.click(screen.getByTestId('marketplace-detail-promote-stable-environment-shared-noir-pack--candidate'));

    await waitFor(() => {
      expect(promoteEnvironmentPackMock).toHaveBeenCalledWith('environment-shared-noir-pack--candidate');
      expect(onProductUpdated).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalled();
    });
  });
});
