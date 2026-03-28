// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GoboBrowser } from './GoboBrowser';

describe('GoboBrowser', () => {
  it('uses synced light selection when no selectedLightId prop is provided', async () => {
    await act(async () => {
      render(<GoboBrowser />);
    });

    await act(async () => {
      window.dispatchEvent(new CustomEvent('vs-camera-lighting-sync', {
        detail: {
          selection: {
            selectedLightId: 'light-key-1',
          },
        },
      }));
    });

    fireEvent.click(screen.getByText('Vindusmønster'));

    await waitFor(() => {
      expect(screen.getByText('Fest til lys (light-key-1)')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Fest til lys' })).toBeTruthy();
    });
  });
});
