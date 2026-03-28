import { describe, expect, it } from 'vitest';
import {
  consumeBufferedPanelPayload,
  consumeBufferedPanelVisibilityState,
  installBufferedPanelPayloadEvent,
  installBufferedPanelVisibilityEvents,
  isBufferedPanelReady,
  markBufferedPanelReady,
} from './panelOpenBuffer';

describe('panelOpenBuffer', () => {
  it('buffers an open event until the panel consumes it', () => {
    installBufferedPanelVisibilityEvents('testPanelOpen', 'openTestPanelOpen');

    window.dispatchEvent(new CustomEvent('openTestPanelOpen'));

    expect(consumeBufferedPanelVisibilityState('testPanelOpen')).toBe(true);
    expect(consumeBufferedPanelVisibilityState('testPanelOpen')).toBeNull();
  });

  it('buffers a close event for panels that support close', () => {
    installBufferedPanelVisibilityEvents('testPanelClose', 'openTestPanelClose', 'closeTestPanelClose');

    window.dispatchEvent(new CustomEvent('closeTestPanelClose'));

    expect(consumeBufferedPanelVisibilityState('testPanelClose')).toBe(false);
    expect(consumeBufferedPanelVisibilityState('testPanelClose')).toBeNull();
  });

  it('buffers payload-bearing open events until the panel consumes them', () => {
    installBufferedPanelPayloadEvent<{ preferredPatternId?: string | null; openPreferredPatternDetails?: boolean }>(
      'testPanelPayload',
      'openTestPanelPayload',
    );

    window.dispatchEvent(new CustomEvent('openTestPanelPayload', {
      detail: {
        preferredPatternId: 'low-key',
        openPreferredPatternDetails: true,
      },
    }));

    expect(consumeBufferedPanelPayload<{ preferredPatternId?: string | null; openPreferredPatternDetails?: boolean }>('testPanelPayload')).toEqual({
      hasEvent: true,
      payload: {
        preferredPatternId: 'low-key',
        openPreferredPatternDetails: true,
      },
    });
    expect(consumeBufferedPanelPayload('testPanelPayload')).toBeNull();
  });

  it('preserves payload-less open events as real open requests', () => {
    installBufferedPanelPayloadEvent('testPanelPayloadWithoutDetail', 'openTestPanelPayloadWithoutDetail');

    window.dispatchEvent(new CustomEvent('openTestPanelPayloadWithoutDetail'));

    expect(consumeBufferedPanelPayload('testPanelPayloadWithoutDetail')).toEqual({
      hasEvent: true,
      payload: null,
    });
  });

  it('does not re-buffer payload opens while the panel is already ready', () => {
    installBufferedPanelPayloadEvent<{ panel?: string | null }>(
      'testPanelReadyPayload',
      'openTestPanelReadyPayload',
    );

    markBufferedPanelReady('testPanelReadyPayload', true);
    window.dispatchEvent(new CustomEvent('openTestPanelReadyPayload', {
      detail: {
        panel: 'particles',
      },
    }));

    expect(consumeBufferedPanelPayload<{ panel?: string | null }>('testPanelReadyPayload')).toBeNull();

    markBufferedPanelReady('testPanelReadyPayload', false);
  });

  it('tracks ready state explicitly', () => {
    expect(isBufferedPanelReady('testPanelReady')).toBe(false);
    markBufferedPanelReady('testPanelReady', true);
    expect(isBufferedPanelReady('testPanelReady')).toBe(true);
    markBufferedPanelReady('testPanelReady', false);
    expect(isBufferedPanelReady('testPanelReady')).toBe(false);
  });
});
