export type FlashMode = 'manual' | 'ttl' | 'multi' | 'hss' | 'stroboscopic';
export type SyncMode = 'front-curtain' | 'rear-curtain' | 'hss' | 'radio' | 'optical';
export type TriggerMode = 'radio' | 'optical' | 'cable' | 'infrared';

export interface FlashController {
  id: string;
  brand: string;
  model: string;
  type: 'trigger' | 'commander' | 'receiver' | 'integrated';
  maxChannels: number;
  maxGroups: number;
  supportedModes: FlashMode[];
  supportedSyncModes: SyncMode[];
  triggerMode: TriggerMode;
  hssSupport: boolean;
  ttlSupport: boolean;
  touchscreen: boolean;
  batteryType?: string;
  price?: number;
  accentColor?: string;
  primaryColor?: string;
  thumbnailUrl?: string;
  supportsTTL?: boolean;
  supportsHSS?: boolean;
  supportsBluetooth?: boolean;
  supportsApp?: boolean;
  hasScreen?: boolean;
  screenSize?: string;
  screenType?: string;
  weight?: number;
  displayName?: string;
  powerRange?: [number, number];
  channelRange?: [number, number];
  supportsManual?: boolean;
  supportsModelingLight?: boolean;
  powerStepSize?: number;
}

export interface FlashGroup {
  id: string;
  label: string;
  name?: string;
  channel: number;
  mode: FlashMode;
  power: number;
  compensation: number;
  enabled: boolean;
  color?: string;
  lightIds: string[];
  powerMode?: 'manual' | 'ttl' | 'hss';
  powerStops?: number;
  modelingLight?: boolean;
}

export interface FlashTriggerConfig {
  controllerId: string;
  channel: number;
  groups: FlashGroup[];
  syncMode: SyncMode;
  hssEnabled: boolean;
  shutterSpeedLimit: number;
}

export interface ControllerRecommendation {
  controllerId: string;
  reason: string;
  score: number;
  compatible: boolean;
  notes?: string;
}

export interface LightInScene {
  id: string;
  name: string;
  brand: string;
  model: string;
  groupId?: string;
  channel?: number;
  power: number;
  flashMode: FlashMode;
  isConnected: boolean;
  batteryLevel?: number;
  nodeId?: string;
  nodeName?: string;
  type?: string;
}

export const FLASH_CONTROLLERS: FlashController[] = [
  {
    id: 'profoto-air-remote',
    brand: 'Profoto',
    model: 'Air Remote TTL',
    type: 'trigger',
    maxChannels: 8,
    maxGroups: 3,
    supportedModes: ['manual', 'ttl', 'hss'],
    supportedSyncModes: ['front-curtain', 'rear-curtain', 'hss', 'radio'],
    triggerMode: 'radio',
    hssSupport: true,
    ttlSupport: true,
    touchscreen: false,
    price: 3490,
  },
  {
    id: 'godox-xpro',
    brand: 'Godox',
    model: 'XPro',
    type: 'commander',
    maxChannels: 16,
    maxGroups: 5,
    supportedModes: ['manual', 'ttl', 'multi', 'hss'],
    supportedSyncModes: ['front-curtain', 'rear-curtain', 'hss', 'radio'],
    triggerMode: 'radio',
    hssSupport: true,
    ttlSupport: true,
    touchscreen: false,
    price: 890,
  },
  {
    id: 'broncolor-rfs',
    brand: 'Broncolor',
    model: 'RFS 2.2',
    type: 'trigger',
    maxChannels: 4,
    maxGroups: 4,
    supportedModes: ['manual'],
    supportedSyncModes: ['front-curtain', 'rear-curtain', 'radio'],
    triggerMode: 'radio',
    hssSupport: false,
    ttlSupport: false,
    touchscreen: false,
    price: 4990,
  },
];

export const DEFAULT_FLASH_GROUPS: FlashGroup[] = [
  { id: 'group-a', label: 'Gruppe A', channel: 1, mode: 'manual', power: 0.5, compensation: 0, enabled: true, color: '#FF6B6B', lightIds: [] },
  { id: 'group-b', label: 'Gruppe B', channel: 1, mode: 'manual', power: 0.25, compensation: -1, enabled: true, color: '#4ECDC4', lightIds: [] },
  { id: 'group-c', label: 'Gruppe C', channel: 1, mode: 'manual', power: 0.125, compensation: -2, enabled: false, color: '#45B7D1', lightIds: [] },
];

export const CONTROLLER_THUMBNAILS: Record<string, string> = {
  'profoto-air-remote': '/images/controllers/profoto-air-remote.jpg',
  'godox-xpro': '/images/controllers/godox-xpro.jpg',
  'broncolor-rfs': '/images/controllers/broncolor-rfs.jpg',
};

export function formatPowerFraction(power: number): string {
  if (power >= 1) return '1/1';
  if (power >= 0.5) return '1/2';
  if (power >= 0.25) return '1/4';
  if (power >= 0.125) return '1/8';
  if (power >= 0.0625) return '1/16';
  if (power >= 0.03125) return '1/32';
  if (power >= 0.015625) return '1/64';
  return '1/128';
}

export function formatPowerStops(power: number): string {
  const stops = powerToStops(power);
  return stops >= 0 ? `+${stops.toFixed(1)} EV` : `${stops.toFixed(1)} EV`;
}

export function powerToStops(power: number): number {
  return Math.log2(Math.max(power, 0.001));
}

export function getControllerThumbnail(controllerId: string): string {
  return CONTROLLER_THUMBNAILS[controllerId] || '/images/controllers/default.jpg';
}

export function getControllerRecommendations(
  controller: FlashController,
  lights: LightInScene[]
): ControllerRecommendation[] {
  const recommendations: ControllerRecommendation[] = [];
  const hasHSS = lights.some(l => l.flashMode === 'hss');
  const hasTTL = lights.some(l => l.flashMode === 'ttl');

  if (hasHSS && !controller.hssSupport) {
    recommendations.push({
      controllerId: controller.id,
      reason: 'Controller støtter ikke HSS',
      score: 0,
      compatible: false,
      notes: 'Velg en controller med HSS-støtte for høyhastighetssynk',
    });
  } else {
    recommendations.push({
      controllerId: controller.id,
      reason: hasTTL && controller.ttlSupport ? 'God TTL-kompatibilitet' : 'Manuell modus tilgjengelig',
      score: (controller.hssSupport ? 30 : 0) + (controller.ttlSupport ? 30 : 0) + 40,
      compatible: true,
    });
  }
  return recommendations;
}

export function getBestControllerForLights(lights: LightInScene[]): ControllerRanking | null {
  if (lights.length === 0) return null;
  const ranked = getAllControllerRecommendations(lights);
  return ranked[0] ?? null;
}

export interface ControllerRanking {
  matchScore: number;
  controller: FlashController;
  matchReason?: string;
  features?: string[];
}

export function getAllControllerRecommendations(lights: LightInScene[]): ControllerRanking[] {
  return FLASH_CONTROLLERS.map(controller => {
    const rec = getControllerRecommendations(controller, lights);
    const matchScore = rec.length > 0 ? rec[0].score : 0;
    const features: string[] = [];
    if (controller.hssSupport) features.push('HSS');
    if (controller.ttlSupport) features.push('TTL');
    if (controller.touchscreen) features.push('Touchscreen');
    if (controller.maxGroups >= 5) features.push(`${controller.maxGroups} grupper`);
    if (controller.supportsBluetooth) features.push('Bluetooth');
    if (controller.supportsApp) features.push('App-kontroll');
    return {
      matchScore,
      controller,
      matchReason: rec.length > 0 ? rec[0].reason : `${controller.brand} ${controller.model}`,
      features,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
