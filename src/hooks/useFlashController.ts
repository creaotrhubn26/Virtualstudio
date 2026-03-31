import { useState, useCallback } from 'react';
import {
  FLASH_CONTROLLERS,
  DEFAULT_FLASH_GROUPS,
  type FlashController,
  type FlashGroup,
  type FlashTriggerConfig,
  type FlashMode,
  type SyncMode,
  type LightInScene,
} from '../core/data/FlashControllerData';

export interface FlashControllerState {
  selectedControllerId: string | null;
  controller: FlashController | null;
  groups: FlashGroup[];
  config: FlashTriggerConfig | null;
  isArmed: boolean;
  isFiring: boolean;
  testFired: boolean;
  syncMode: SyncMode;
  hssEnabled: boolean;
  ttlEnabled: boolean;
  channel: number;
  lastTestFire: number | null;
  connectedLights: LightInScene[];
  unassignedLights: LightInScene[];
  isSyncing: boolean;
}

export function useFlashController() {
  const [selectedControllerId, setSelectedControllerId] = useState<string | null>(null);
  const [groups, setGroups] = useState<FlashGroup[]>(DEFAULT_FLASH_GROUPS);
  const [syncMode, setSyncMode] = useState<SyncMode>('front-curtain');
  const [hssEnabled, setHssEnabled] = useState(false);
  const [ttlEnabled, setTtlEnabled] = useState(false);
  const [channel, setChannelState] = useState(1);
  const [isArmed, setIsArmed] = useState(false);
  const [isFiring, setIsFiring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testFired, setTestFired] = useState(false);
  const [lastTestFire, setLastTestFire] = useState<number | null>(null);
  const [connectedLights, setConnectedLights] = useState<LightInScene[]>([]);

  const controller = selectedControllerId
    ? FLASH_CONTROLLERS.find((c) => c.id === selectedControllerId) ?? null
    : null;

  const unassignedLights = connectedLights.filter((l) => !l.groupId);

  const selectController = useCallback((id: string | null) => {
    setSelectedControllerId(id);
  }, []);

  const clearController = useCallback(() => {
    setSelectedControllerId(null);
  }, []);

  const updateGroup = useCallback((groupId: string, updates: Partial<FlashGroup>) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g)));
  }, []);

  const setGroupPower = useCallback((groupId: string, power: number) => {
    updateGroup(groupId, { power: Math.max(0, Math.min(1, power)) });
  }, [updateGroup]);

  const adjustGroupPower = useCallback((groupId: string, delta: number) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, power: Math.max(0, Math.min(1, (g.power ?? 0.5) + delta)) } : g,
      ),
    );
  }, []);

  const setGroupMode = useCallback((groupId: string, mode: FlashMode) => {
    updateGroup(groupId, { mode });
  }, [updateGroup]);

  const toggleGroup = useCallback((groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, enabled: !g.enabled } : g)),
    );
  }, []);

  const toggleModelingLight = useCallback((groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, modelingLightEnabled: !(g as FlashGroup & { modelingLightEnabled?: boolean }).modelingLightEnabled } : g,
      ),
    );
  }, []);

  const assignLightToGroup = useCallback((lightId: string, groupId: string) => {
    setConnectedLights((prev) =>
      prev.map((l) => (l.id === lightId ? { ...l, groupId } : l)),
    );
  }, []);

  const unassignLight = useCallback((lightId: string) => {
    setConnectedLights((prev) =>
      prev.map((l) => (l.id === lightId ? { ...l, groupId: undefined } : l)),
    );
  }, []);

  const getUnassignedLights = useCallback(() => {
    return connectedLights.filter((l) => !l.groupId);
  }, [connectedLights]);

  const setChannel = useCallback((ch: number) => {
    setChannelState(Math.max(1, Math.min(16, ch)));
  }, []);

  const syncToScene = useCallback(async () => {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSyncing(false);
  }, []);

  const toggleHSS = useCallback(() => {
    setHssEnabled((prev) => !prev);
  }, []);

  const toggleTTL = useCallback(() => {
    setTtlEnabled((prev) => !prev);
  }, []);

  const canControlLight = useCallback((_lightId: string) => {
    return controller !== null;
  }, [controller]);

  const arm = useCallback(() => setIsArmed(true), []);
  const disarm = useCallback(() => setIsArmed(false), []);

  const testFire = useCallback(async (_groupId?: string) => {
    if (!isArmed) return;
    setIsFiring(true);
    setTestFired(false);
    await new Promise((resolve) => setTimeout(resolve, 150));
    setIsFiring(false);
    setTestFired(true);
    setLastTestFire(Date.now());
    setTimeout(() => setTestFired(false), 2000);
  }, [isArmed]);

  const config: FlashTriggerConfig | null = controller
    ? {
        controllerId: controller.id,
        channel,
        groups,
        syncMode,
        hssEnabled,
        shutterSpeedLimit: hssEnabled ? 1 / 8000 : 1 / 250,
      }
    : null;

  const state: FlashControllerState = {
    selectedControllerId,
    controller,
    groups,
    config,
    isArmed,
    isFiring,
    testFired,
    syncMode,
    hssEnabled,
    ttlEnabled,
    channel,
    lastTestFire,
    connectedLights,
    unassignedLights,
    isSyncing,
  };

  return {
    selectedControllerId,
    controller,
    groups,
    config,
    isArmed,
    isFiring,
    testFired,
    syncMode,
    hssEnabled,
    ttlEnabled,
    channel,
    lastTestFire,
    connectedLights,
    unassignedLights,
    isSyncing,
    availableControllers: FLASH_CONTROLLERS,
    state,
    selectController,
    clearController,
    updateGroup,
    setGroupPower,
    adjustGroupPower,
    setGroupMode,
    toggleGroup,
    toggleModelingLight,
    assignLightToGroup,
    unassignLight,
    getUnassignedLights,
    setChannel,
    setSyncMode,
    setHssEnabled,
    toggleHSS,
    toggleTTL,
    canControlLight,
    syncToScene,
    arm,
    disarm,
    testFire,
  };
}
