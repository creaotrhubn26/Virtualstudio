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

  // ── Colored Seamless Paper — Extended Palette ─────────────────────────────
  { id: 'seamless-sage', name: 'Seamless Salvie Grønn', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dempet salvie grønn — earth tone, naturlig og bærekraftig estetikk' },
  { id: 'seamless-sage-dark', name: 'Seamless Mørk Salvie', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Mørkere salvie — moden og jordnær, perfekt for portrettfotografi' },
  { id: 'seamless-dusty-rose', name: 'Seamless Støvete Rose', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dempet rosa — myk og feminin, vintage-inspirert beauty backdrop' },
  { id: 'seamless-blush', name: 'Seamless Blush Pink', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Lys blush rosa — frisk og moderne, populær for sosiale medier' },
  { id: 'seamless-stone-blue', name: 'Seamless Stein Blå', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Kjølig stein-blå — elegant, corporate og tidsriktig bakgrunn' },
  { id: 'seamless-slate', name: 'Seamless Skifer Grå', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Naturlig skifer grå — fleksibel og tidløs for all sjanger' },
  { id: 'seamless-warm-sand', name: 'Seamless Varm Sand', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Varm sand-toned beige — jordnær og flatterende for alle hudtoner' },
  { id: 'seamless-chocolate', name: 'Seamless Mørk Sjokolade', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Rik mørk brun — sofistikert og varm for portrett og mat' },
  { id: 'seamless-cobalt', name: 'Seamless Kobolt Blå', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Sterk kobolt blå — dramatisk og iøynefallende, pop-art estetikk' },
  { id: 'seamless-forest-green', name: 'Seamless Skogsgrønn', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dyp skogsgrønn — nature-inspired, editorial og livsstilsfoto' },
  { id: 'seamless-coral', name: 'Seamless Korall', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Levende korall — varmt og energisk, sommerstemning og mote' },
  { id: 'seamless-canary', name: 'Seamless Kanariegul', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Knall kanariegul — høy energi, pop og ungdommelig estetikk' },
  { id: 'seamless-lavender', name: 'Seamless Lavendel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Delikat lavendel — romantisk, drømmende og pastell-estetikk' },
  { id: 'seamless-mint', name: 'Seamless Mint', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Frisk mint — frisk og lettleket, perfekt for beauty og kosmetikk' },
  { id: 'seamless-burgundy', name: 'Seamless Burgunder', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dyp burgunder — eleganse, vindruer og høst-stemning' },
  { id: 'seamless-slate-green', name: 'Seamless Militærgrønn', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Militær/oliven grønn — aktiv, outdoors og urban streetstyle' },
  { id: 'seamless-rust', name: 'Seamless Rust Oransje', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Varm rust-oransje — autentisk, håndverk og vintage editorial' },
  { id: 'seamless-graphite', name: 'Seamless Grafitt', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Mørk grafitt — moderne maskulin estetikk for tech og mode' },

  // ── Specialized Environment Sets ──────────────────────────────────────────
  { id: 'env-gym-fitness', name: 'Treningsstudio / Gym', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Treningsstudio med vekter og speil — sportstil og livsstilsfotografi' },
  { id: 'env-garage-workshop', name: 'Garasje / Verksted', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Industriell garasje — automotive, DIY og hard maskulin estetikk' },
  { id: 'env-car-showroom', name: 'Bilforretning (Showroom)', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Bil showroom med blank gulv og spot lys — luksuriøs automotive' },
  { id: 'env-rooftop-sunset', name: 'Taktopp Solnedgang', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Taktopp med by horisont i solnedgang — urban livsstil og mote' },
  { id: 'env-beach-golden', name: 'Strand Gyllen Time', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Strand i gyllen time med sand og bølger i bokeh' },
  { id: 'env-forest-misty', name: 'Tåkete Skog', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Tåkefylt skog — mystisk, stemningsfull og dramatisk natur' },
  { id: 'env-mountain-peak', name: 'Fjell Topp', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Fjelltopp panorama — eventyr, friluft og kraftfull natur' },
  { id: 'env-kitchen-studio', name: 'Kjøkkenstudio (Mat)', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Lyst kjøkkenstudio med benkeplate — mat- og kokefotografi' },
  { id: 'env-music-studio', name: 'Musikk Studio', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Innspillingsstudio med utstyr — musikk-portrett og cover art' },
  { id: 'env-clinic-white', name: 'Klinisk Hvit', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Steril hvit klinisk setting — medisin, helse og kosmetikk' },
  { id: 'env-art-gallery', name: 'Kunstgalleri', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Hvit cube galleri med spotlys — kunst, design og luksus' },
  { id: 'env-hotel-lobby', name: 'Hotellober', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Luksuriøs hotell lobby — corporate, forretningsreise og livsstil' },
  { id: 'env-neon-city', name: 'Neon By (Natt)', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Regnvåt natt bygate med neonskilt — cyberpunk og nocturnal mote' },
  { id: 'env-snow-outdoor', name: 'Snø Utendørs', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Snødekt landskap i vinterlys — ren, frisk vinterestetikk' },

  // ── More Seamless Colors ──────────────────────────────────────────────────
  { id: 'seamless-peach', name: 'Seamless Fersken', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Myk ferskenrosa — feminin, varm og delikat beauty-estetikk' },
  { id: 'seamless-turquoise', name: 'Seamless Turkis', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Levende turkis — tropisk, frisk og sommernaturlig farge' },
  { id: 'seamless-rose-gold', name: 'Seamless Rose Gold', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Trendy rose gold metallic — luksus, beauty og produktfoto' },
  { id: 'seamless-deep-navy', name: 'Seamless Mørk Marine', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dyp marineblå — klassisk, profesjonell og tidløs estetikk' },
  { id: 'seamless-royal-blue', name: 'Seamless Kongeblå', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Kongeblå — klassisk British og formell stemning' },
  { id: 'seamless-hunter-green', name: 'Seamless Jaktgrønn', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dyp jaktgrønn — rik, naturlig og britisk elegang' },
  { id: 'seamless-sand', name: 'Seamless Sand', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Varm sandfarget — strandminimalism og naturlig jordtone' },
  { id: 'seamless-chocolate', name: 'Seamless Sjokolade', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Rik sjokoladebrun — luksus, cozy og varm editorial' },
  { id: 'seamless-terracotta', name: 'Seamless Terrakotta', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Mediterran terrakotta — varm, autentisk og jordnær stemning' },
  { id: 'seamless-sage', name: 'Seamless Salvie', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Muted salvie-grønn — naturlig, kalm og wellness-estetikk' },
  { id: 'seamless-dusty-rose', name: 'Seamless Støvete Rose', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Vintage støvete rose — romantisk, pastel og soft-editorial' },
  { id: 'seamless-electric-blue', name: 'Seamless Elektrisk Blå', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Neonblå elektrisk — pop, sport og energisk youth-estetikk' },
  { id: 'seamless-hot-pink', name: 'Seamless Sterk Rosa', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Sterk hot pink — leken, freidig og high-energy beauty' },
  { id: 'seamless-champagne', name: 'Seamless Champagne', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Eksklusiv champagnehvit — luksus, bryllup og high-fashion' },
  { id: 'seamless-copper', name: 'Seamless Kobber', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Varm kobbermetallisk — kunsthåndverk og industriell luksus' },
  { id: 'seamless-teal', name: 'Seamless Teal', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dypblå-grønn teal — moderne, fresh og editorial' },
  { id: 'seamless-off-white', name: 'Seamless Off-White (Krem)', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Varm kremhvit — naturlig, myk og timeless for portrett og beauty' },
  { id: 'seamless-black-velvet', name: 'Seamless Svart Fløyel', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Dypsvart fløyel — dramatisk, low-key og eksklusivt produktfoto' },
  { id: 'seamless-iridescent', name: 'Seamless Iriserende', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Holografisk iriserende — editorial, fantasy og avant-garde' },

  // ── More Environment Sets ─────────────────────────────────────────────────
  { id: 'env-living-room', name: 'Stue (Moderne)', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Moderne skandinavisk stue med sofaer og planter — livsstilsinteriør' },
  { id: 'env-conference-room', name: 'Møterom', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Corporate møterom med skjerm og stoler — business-portrett' },
  { id: 'env-greenhouse', name: 'Drivhus / Veksthus', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Grønt drivhus fylt med planter — natur, botanikk og wellness' },
  { id: 'env-sports-arena', name: 'Sportarena / Stadion', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Sporttarena med flombelysning og tribuner — idrettsfotografi' },
  { id: 'env-festival-stage', name: 'Festivalscene', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Festivalscene med LED-rig og publikum i bokeh — musikk og event' },
  { id: 'env-rooftop-pool', name: 'Takhøyde Basseng', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Hotell rooftop pool med byutsikt — luksus og reise' },
  { id: 'env-scandinavian-home', name: 'Skandinavisk Hjem', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Lyse skandinaviske rom med eikeparkett — hygge og interiørstil' },
  { id: 'env-warehouse-loft', name: 'Lager / Loft', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Industriell lager-loft med eksponerte rør — urban editorial og mote' },
  { id: 'env-japanese-zen', name: 'Japansk Zen-hage', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Zen-hage med bambus og grus — ro, meditasjon og minimalistisk estetikk' },
  { id: 'env-paris-cafe', name: 'Pariser Kafé', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Klassisk parisisk kafé med fletting og vinduer — romantikk og reise' },
  { id: 'env-desert-dunes', name: 'Ørkensand Dyner', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Sahara-lignende sanddyner i gyllen lys — dramatisk og eksotisk' },
  { id: 'env-underwater-studio', name: 'Undervanns Studio', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Simulert undervannsmiljø med blå lysbryting — kreativt konseptfoto' },
  { id: 'env-luxury-bathroom', name: 'Luksuriøst Baderom', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Marmorbasert luksus baderom — skjønnhetsprodukter og wellness' },
  { id: 'env-library-dark', name: 'Bibliotek (Mørkt)', category: 'bakgrunn', thumbnail: '/images/gear/equipment_backdrop.png', description: 'Lav-belyst gammelt bibliotek med vegger av bøker — dark academia' },
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
