export type BackdropCategory = 'bakgrunn' | 'diffuser' | 'reflektor';

export interface BackdropSpec {
  id: string;
  name: string;
  category: BackdropCategory;
  size?: string;
  thumbnail: string;
  description?: string;
}

export const BACKDROP_DATABASE: BackdropSpec[] = [
  { id: 'background', name: 'Bakgrunn', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Seamless papir bakgrunn' },
  { id: 'cove', name: 'Syklorama', category: 'bakgrunn', thumbnail: '/images/gear/equipment_cove.png', description: 'Profesjonell cyclorama' },
  { id: 'shooting-table', name: 'Fotograferingsbord', category: 'bakgrunn', thumbnail: '/images/gear/equipment_shooting_table.png', description: 'Produktfotograferingsbord' },
  { id: 'diffuser-panel', name: 'Diffuserpanel', category: 'diffuser', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Stort diffuserpanel' },
  { id: 'diffuser-scrim-120', name: 'Diffuser Scrim', category: 'diffuser', size: '120 x 120 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Scrim ramme 120x120cm' },
  { id: 'diffuser-scrim-180', name: 'Diffuser Scrim', category: 'diffuser', size: '180 x 180 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Scrim ramme 180x180cm' },
  { id: 'diffuser-scrim-240', name: 'Diffuser Scrim', category: 'diffuser', size: '240 x 240 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Scrim ramme 240x240cm' },
  { id: 'diffuser-scrim-360', name: 'Diffuser Scrim', category: 'diffuser', size: '360 x 360 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Scrim ramme 360x360cm' },
  { id: 'light-blocker', name: 'Lysblokkerer', category: 'reflektor', thumbnail: '/images/gear/equipment_light_blocker.png', description: 'Sort flagg/lysblokkerer' },
  { id: 'v-flat', name: 'V-Flat', category: 'reflektor', size: '200 x 100 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'V-flat reflektor/absorber' },
];

export const BACKDROP_CATEGORIES: { key: BackdropCategory; label: string }[] = [
  { key: 'bakgrunn', label: 'Bakgrunn' },
  { key: 'diffuser', label: 'Diffuser' },
  { key: 'reflektor', label: 'Reflektor' },
];

export function getBackdropById(id: string): BackdropSpec | undefined {
  return BACKDROP_DATABASE.find(b => b.id === id);
}

export function getBackdropsByCategory(category: BackdropCategory): BackdropSpec[] {
  return BACKDROP_DATABASE.filter(b => b.category === category);
}
