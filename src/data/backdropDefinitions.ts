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
  { id: 'backdrop-white', name: 'Hvit Seamless', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Hvit seamless papir — standard studiobruk' },
  { id: 'backdrop-gray', name: 'Nøytralgrå Seamless', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: '18% grå seamless — perfekt gråkortsbakgrunn' },
  { id: 'backdrop-black', name: 'Sort Seamless', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Sort seamless — dramatisk studio look' },
  { id: 'backdrop-cobalt', name: 'Koboltblå Gel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dyp koboltblå gel — kreativ bakgrunn' },
  { id: 'backdrop-crimson', name: 'Karmosinrød Gel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Intens rød gel bakgrunn' },
  { id: 'backdrop-emerald', name: 'Smaragdgrønn Gel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dyp smaragdgrønn gel' },
  { id: 'backdrop-amber', name: 'Rav/Gull Gel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Varm rav/gull gel — cinematisk look' },
  { id: 'backdrop-violet', name: 'Violet Gel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dyp violet gel — luksus-estetikk' },
  { id: 'backdrop-rose', name: 'Rosé Gel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Varm rosé gel — beauty og mote' },
  { id: 'backdrop-teal', name: 'Teal/Cyan Gel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Teal cinematisk gel — filmlook' },
  { id: 'backdrop-greenscreen', name: 'Greenscreen', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Chroma key grønn bakgrunn' },
  { id: 'backdrop-bluescreen', name: 'Bluescreen', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Chroma key blå bakgrunn' },
  { id: 'diffuser-panel', name: 'Diffuserpanel', category: 'diffuser', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Stort diffuserpanel' },
  { id: 'diffuser-scrim-120', name: 'Diffuser Scrim', category: 'diffuser', size: '120 x 120 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Scrim ramme 120x120cm' },
  { id: 'diffuser-scrim-180', name: 'Diffuser Scrim', category: 'diffuser', size: '180 x 180 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Scrim ramme 180x180cm' },
  { id: 'diffuser-scrim-240', name: 'Diffuser Scrim', category: 'diffuser', size: '240 x 240 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Scrim ramme 240x240cm' },
  { id: 'diffuser-scrim-360', name: 'Diffuser Scrim', category: 'diffuser', size: '360 x 360 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Scrim ramme 360x360cm' },
  { id: 'muslin-ivory', name: 'Muslin Elfenbenshvit', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Elfenbenshvit muslinbakgrunn — portrett' },
  { id: 'muslin-charcoal', name: 'Muslin Kull', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Mørkegrå muslin — naturlig tekstur' },
  { id: 'light-blocker', name: 'Lysblokkerer', category: 'reflektor', thumbnail: '/images/gear/equipment_light_blocker.png', description: 'Sort flagg/lysblokkerer' },
  { id: 'v-flat', name: 'V-Flat', category: 'reflektor', size: '200 x 100 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'V-flat reflektor/absorber' },
  { id: 'v-flat-white', name: 'V-Flat Hvit', category: 'reflektor', size: '200 x 100 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'Hvit side for myk refleksjon' },
  { id: 'v-flat-black', name: 'V-Flat Sort', category: 'reflektor', size: '200 x 100 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'Sort side for lysstyring og flagging' },
  { id: 'reflector-gold', name: 'Reflektor Gull', category: 'reflektor', size: '110 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'Varm gull refleksjon — naturlig utendørslys' },
  { id: 'reflector-silver', name: 'Reflektor Sølv', category: 'reflektor', size: '110 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'Nøytral sølvrefleksjon — neutral fylling' },
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
