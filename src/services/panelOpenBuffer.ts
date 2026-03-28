type PanelVisibilityState = {
  isOpen: boolean;
};

type PanelBufferedPayload<TPayload> = {
  hasEvent: true;
  payload: TPayload | null;
};

type BufferedPanelPayloadWindow = Window & {
  __virtualStudioBufferedPanelInstallations?: Record<string, boolean>;
  [key: string]: unknown;
};

const installationKeyFor = (panelId: string) => `__virtualStudioPanelBufferInstalled_${panelId}`;
const pendingStateKeyFor = (panelId: string) => `__virtualStudioPendingPanelState_${panelId}`;
const pendingPayloadKeyFor = (panelId: string) => `__virtualStudioPendingPanelPayload_${panelId}`;
const readyKeyFor = (panelId: string) => `__virtualStudioPanelReady_${panelId}`;

export const installBufferedPanelVisibilityEvents = (
  panelId: string,
  openEventName: string,
  closeEventName?: string,
): void => {
  const panelWindow = window as BufferedPanelPayloadWindow;
  const installKey = installationKeyFor(panelId);
  if (panelWindow[installKey]) {
    return;
  }

  panelWindow[installKey] = true;
  window.addEventListener(openEventName, (() => {
    panelWindow[pendingStateKeyFor(panelId)] = { isOpen: true } satisfies PanelVisibilityState;
  }) as EventListener);

  if (closeEventName) {
    window.addEventListener(closeEventName, (() => {
      panelWindow[pendingStateKeyFor(panelId)] = { isOpen: false } satisfies PanelVisibilityState;
    }) as EventListener);
  }
};

export const consumeBufferedPanelVisibilityState = (panelId: string): boolean | null => {
  const panelWindow = window as BufferedPanelPayloadWindow;
  const pendingKey = pendingStateKeyFor(panelId);
  const pendingState = panelWindow[pendingKey] as PanelVisibilityState | undefined;
  if (typeof pendingState?.isOpen !== 'boolean') {
    return null;
  }
  delete panelWindow[pendingKey];
  return pendingState.isOpen;
};

export const installBufferedPanelPayloadEvent = <TPayload,>(
  panelId: string,
  openEventName: string,
): void => {
  const panelWindow = window as BufferedPanelPayloadWindow;
  const installKey = installationKeyFor(panelId);
  if (panelWindow[installKey]) {
    return;
  }

  panelWindow[installKey] = true;
  window.addEventListener(openEventName, ((event: Event) => {
    if (isBufferedPanelReady(panelId)) {
      return;
    }
    const customEvent = event as CustomEvent<TPayload>;
    panelWindow[pendingPayloadKeyFor(panelId)] = {
      hasEvent: true,
      payload: customEvent.detail ?? null,
    } satisfies PanelBufferedPayload<TPayload>;
  }) as EventListener);
};

export const consumeBufferedPanelPayload = <TPayload,>(panelId: string): PanelBufferedPayload<TPayload> | null => {
  const panelWindow = window as BufferedPanelPayloadWindow;
  const pendingKey = pendingPayloadKeyFor(panelId);
  const payload = (panelWindow[pendingKey] as PanelBufferedPayload<TPayload> | undefined) ?? null;
  delete panelWindow[pendingKey];
  return payload;
};

export const markBufferedPanelReady = (panelId: string, ready: boolean): void => {
  const panelWindow = window as BufferedPanelPayloadWindow;
  const readyKey = readyKeyFor(panelId);
  if (ready) {
    panelWindow[readyKey] = true;
    return;
  }
  delete panelWindow[readyKey];
};

export const isBufferedPanelReady = (panelId: string): boolean => {
  const panelWindow = window as BufferedPanelPayloadWindow;
  return panelWindow[readyKeyFor(panelId)] === true;
};
