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

  // Mottled / håndmalt lerret
  { id: 'canvas-mottled-gray', name: 'Mottled Grå Lerret', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Håndmalt mottled lerret — grå toner, kunstnerisk tekstur' },
  { id: 'canvas-mottled-brown', name: 'Mottled Brun Lerret', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Håndmalt brun/oker lerret — varm filmisk bakgrunn' },
  { id: 'canvas-mottled-sage', name: 'Mottled Salviegrønn Lerret', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Håndmalt lerret med salviegrønne toner — naturlig og rolig' },
  { id: 'canvas-mottled-taupe', name: 'Mottled Taupe Lerret', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Håndmalt taupe lerret — nøytral og flaterende for portrett' },
  { id: 'canvas-mottled-navy', name: 'Mottled Marineblå Lerret', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Håndmalt dyp blå lerret — dramatisk og elegant' },
  { id: 'canvas-mottled-mauve', name: 'Mottled Mauve Lerret', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Håndmalt rosa/grå lerret — beauty og motebruk' },

  // Fløyel (velvet)
  { id: 'velvet-black', name: 'Sort Fløyel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Sort fløyelbakgrunn — absorberer lys, dypeste svart mulig' },
  { id: 'velvet-burgundy', name: 'Burgunder Fløyel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dyp burgunder fløyel — dramatisk og luksuriøs' },
  { id: 'velvet-midnight-blue', name: 'Midnattsblå Fløyel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Midnattsblå fløyel — rom-estetikk, myk og rik' },
  { id: 'velvet-charcoal', name: 'Kull Fløyel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Mørkegrå fløyel — elegant og allsidig' },

  // Papir — mer farger
  { id: 'backdrop-storm-gray', name: 'Stormgrå Seamless', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Mørk, kald grå seamless — dramatisk men nøytral' },
  { id: 'backdrop-natural-linen', name: 'Linen Naturell', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Naturell linfarget seamless — varmt og organisk' },
  { id: 'backdrop-sage', name: 'Salvie Seamless', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dempet salviegrønn — rolig og naturinspirert' },
  { id: 'backdrop-terracotta', name: 'Terrakotta Seamless', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Varm terrakotta — jordnær mediterran estetikk' },
  { id: 'backdrop-dusty-blue', name: 'Støvblå Seamless', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Myk, dempet blå — klassisk portrett og beauty' },
  { id: 'backdrop-nude', name: 'Nude/Hudfarget Seamless', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Hudfarget/beige seamless — subtil og naturlig skinntone-bakgrunn' },

  // Reflektorer og modifikatorer
  { id: 'reflector-5in1-kit', name: '5-i-1 Reflektor Kit', category: 'reflektor', size: '120 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'Sammenleggbar reflektorsett: gull, sølv, hvit, svart og hvit diffuser' },
  { id: 'foam-core-white', name: 'Foam Core Hvit', category: 'reflektor', size: '60 x 90 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'Hvit foam core — lett og effektiv fill-kilde for nærbilder' },
  { id: 'foam-core-black', name: 'Foam Core Sort', category: 'reflektor', size: '60 x 90 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'Sort foam core — negativt fill / flagg for lyskontroll' },
  { id: 'popup-reflector-oval', name: 'Oval Pop-up Reflektor', category: 'reflektor', size: '60 x 90 cm', thumbnail: '/images/gear/equipment_vflat.png', description: 'Oval sammenleggbar reflektor — gull/sølv dobbeltside' },
  { id: 'diffuser-frame-120', name: 'Diffuser Ramme', category: 'diffuser', size: '120 x 120 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Fast diffuserramme med uttrekkbar white diffuser' },
  { id: 'diffuser-silks', name: 'Diffuser Silks 1.5-stop', category: 'diffuser', size: '180 x 180 cm', thumbnail: '/images/gear/equipment_diffuser_panel.png', description: 'Filmdiffuser silks, 1.5-stop reduksjon — jevn myk kilde' },

  // On-location environment backdrops
  { id: 'env-brick-dark', name: 'Mørk Teglvegg', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Rå mørk teglvegg — urban, industriell og dramatisk atmosfære' },
  { id: 'env-brick-red', name: 'Rød Teglvegg', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Klassisk rød tegl — varm og teksturert, urban loft-estetikk' },
  { id: 'env-concrete-raw', name: 'Rå Betong', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Ubehandlet støpt betong — industriell estetikk, grå og teksturert' },
  { id: 'env-concrete-smooth', name: 'Jevn Betong', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Polert betong — minimal og moderne arkitektonisk bakgrunn' },
  { id: 'env-wood-dark', name: 'Mørk Treplanke', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Mørk treverk paneling — varm og organisk for interiørsett' },
  { id: 'env-wood-light', name: 'Lys Treplanke', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Lys naturlig tre — skandinavisk stil, luftig og naturlig' },
  { id: 'env-curtain-dark', name: 'Mørk Gardin', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Tunge mørke teaterdraperi — elegante filmsett og intervjuer' },
  { id: 'env-curtain-velvet', name: 'Burgunder Velurdraperi', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Rike burgunder velurdraperi — luksuriøst og teatralsk' },
  { id: 'env-window-city-night', name: 'Byutsikt Natt (Vindu)', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Panoramautsikt over bylandskap om natten — penthouse-estetikk' },
  { id: 'env-window-city-day', name: 'Byutsikt Dag (Vindu)', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dagslys med stor glassfasade mot urban skyline' },
  { id: 'env-garden-blurred', name: 'Hage Bokeh Bakgrunn', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Uskarp hage/utendørs grønn bakgrunn — naturlig og frisk' },
  { id: 'env-library-books', name: 'Bokhylle Bibliotek', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Bokhyller fylt med bøker — akademisk og intellektuell setting' },
  { id: 'env-restaurant-interior', name: 'Restaurant Interiør', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Skummel restaurantatmosfære med bord, stolar og belysning' },
  { id: 'env-loft-interior', name: 'Loft Interiør', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Urban loft med eksponerte installasjonar og høge vinduer' },
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
