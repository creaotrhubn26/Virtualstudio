import { describe, expect, it } from 'vitest';
import { assetLibraryService } from './assetLibrary';

describe('assetLibraryService semantic search', () => {
  it('finds beauty table through semantic vanity wording', async () => {
    const results = await assetLibraryService.getAssets({
      search: 'vanity workstation for cosmetics',
      category: 'furniture',
      limit: 5,
    });

    expect(results[0]?.id).toBe('beauty_table');
  });

  it('finds cinematic floor assets through mood-based search', async () => {
    const results = await assetLibraryService.getAssets({
      search: 'wet blade runner floor',
      category: 'floor',
      limit: 5,
    });

    expect(results[0]?.id).toBe('floor-blade-runner-wet');
  });
});
