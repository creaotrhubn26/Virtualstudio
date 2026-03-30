/**
 * 50 poseable character variants — 25 male + 25 female.
 * Each shares a rigged Mixamo base mesh but gets its own
 * material tint config (skin, top, bottom) and height scale.
 * All support the full PoseLibrary.
 */

export interface MaterialTints {
  /** Multiply tint for skin submeshes (albedo × tint) */
  skin: string;
  /** Multiply tint for upper-body / top clothing */
  top: string;
  /** Multiply tint for lower-body / bottom clothing */
  bottom: string;
  /** Multiply tint for accessories/visor/details */
  accent: string;
}

export interface CharacterVariant {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  baseModelUrl: string;
  heightScale: number;
  tints: MaterialTints;
}

const MALE_BASE = '/models/avatars/mixamo-character.glb';
const FEMALE_BASE = '/models/avatars/Michelle.glb';

export const CHARACTER_VARIANTS: CharacterVariant[] = [
  // ── Male variants ────────────────────────────────────────────
  { id: 'mv_01', name: 'Erik – Forretningsmann',    description: 'Lys hud, mørk dress',         gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 1.00, tints: { skin: '#F5CBA7', top: '#2C3E50', bottom: '#1A252F', accent: '#AAAAAA' } },
  { id: 'mv_02', name: 'Lars – Idrettsutøver',      description: 'Atletisk, sportsklær',        gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 1.04, tints: { skin: '#E59866', top: '#E74C3C', bottom: '#2C3E50', accent: '#FFFFFF' } },
  { id: 'mv_03', name: 'Mohamed – Lege',            description: 'Mellombrun hud, hvit frakk',  gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 0.99, tints: { skin: '#C0834C', top: '#FFFFFF', bottom: '#7F8C8D', accent: '#DDDDDD' } },
  { id: 'mv_04', name: 'Jonas – Kunstner',           description: 'Blek hud, fargerik topp',    gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 0.97, tints: { skin: '#FAE0CC', top: '#8E44AD', bottom: '#2C3E50', accent: '#F39C12' } },
  { id: 'mv_05', name: 'Kwame – Musiker',           description: 'Mørk hud, hvit skjorte',     gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 1.02, tints: { skin: '#6E3B1F', top: '#FFFFFF', bottom: '#1A252F', accent: '#C0392B' } },
  { id: 'mv_06', name: 'Tobias – Student',          description: 'Lys hud, casual blå',        gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 0.96, tints: { skin: '#F0C18A', top: '#3498DB', bottom: '#2980B9', accent: '#BDC3C7' } },
  { id: 'mv_07', name: 'Samuel – Kokk',             description: 'Oliventonet, kokkeklær',     gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 0.98, tints: { skin: '#D4956A', top: '#EFEFEF', bottom: '#7F8C8D', accent: '#F0F0F0' } },
  { id: 'mv_08', name: 'Andrei – Ingeniør',         description: 'Lys hud, grå dressskjorte',  gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 1.01, tints: { skin: '#F5CBA7', top: '#BDC3C7', bottom: '#2C3E50', accent: '#95A5A6' } },
  { id: 'mv_09', name: 'Rafael – Fotograf',         description: 'Mellomhud, sort topp',       gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 1.00, tints: { skin: '#C9955C', top: '#1C1C1C', bottom: '#2C2C2C', accent: '#888888' } },
  { id: 'mv_10', name: 'Henrik – Lærer',            description: 'Blek hud, beige genser',     gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 0.98, tints: { skin: '#FAE5CC', top: '#D5DBBB', bottom: '#7F6F4A', accent: '#C8B88A' } },
  { id: 'mv_11', name: 'David – Arkitekt',          description: 'Lys oliven, blå skjorte',    gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 1.03, tints: { skin: '#D4A76A', top: '#2980B9', bottom: '#1A252F', accent: '#7FB3D3' } },
  { id: 'mv_12', name: 'Alex – Personlig trener',   description: 'Brun hud, rød treningsdrakt',gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 1.05, tints: { skin: '#A0522D', top: '#E74C3C', bottom: '#C0392B', accent: '#FFFFFF' } },
  { id: 'mv_13', name: 'Håkon – Bonde',             description: 'Solbrent, flanellskjorte',   gender: 'male',   baseModelUrl: MALE_BASE,   heightScale: 1.02, tints: { skin: '#CD8B5A', top: '#8B2500', bottom: '#5D4037', accent: '#795548' } },
  { id: 'mv_14', name: 'Olu – Designer',            description: 'Mørk hud, fargerik skjorte', gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 0.99, tints: { skin: '#5C3317', top: '#E67E22', bottom: '#1A252F', accent: '#F39C12' } },
  { id: 'mv_15', name: 'Magnus – Pilot',            description: 'Lys hud, mørk uniform',      gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 1.04, tints: { skin: '#F2D7B6', top: '#1A252F', bottom: '#1A252F', accent: '#F1C40F' } },
  { id: 'mv_16', name: 'Carlos – Dansær',           description: 'Mellomhud, svart antrekk',   gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 0.97, tints: { skin: '#C6894F', top: '#1C1C1C', bottom: '#1C1C1C', accent: '#C0392B' } },
  { id: 'mv_17', name: 'Mikael – Journalist',       description: 'Blek, grå jakke',            gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 0.99, tints: { skin: '#FAE0CC', top: '#7F8C8D', bottom: '#2C3E50', accent: '#95A5A6' } },
  { id: 'mv_18', name: 'Arjun – Forsker',           description: 'Oliven hud, hvit skjorte',   gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 1.00, tints: { skin: '#C8874A', top: '#FDFEFE', bottom: '#2471A3', accent: '#AED6F1' } },
  { id: 'mv_19', name: 'Felix – Barista',           description: 'Lys hud, svart forkle',      gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 0.96, tints: { skin: '#F5D5B0', top: '#1C1C1C', bottom: '#2C2C2C', accent: '#808080' } },
  { id: 'mv_20', name: 'Elias – Advokat',           description: 'Mellomhud, dress',           gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 1.01, tints: { skin: '#D4956A', top: '#17202A', bottom: '#17202A', accent: '#C0C0C0' } },
  { id: 'mv_21', name: 'Noah – Friluftsentusiast',  description: 'Solbrent, grønn jakke',      gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 1.02, tints: { skin: '#CC8855', top: '#27AE60', bottom: '#5D4037', accent: '#A9CCB4' } },
  { id: 'mv_22', name: 'Oliver – Musiker',          description: 'Blek hud, sort band-t-skjorte',gender: 'male', baseModelUrl: MALE_BASE,  heightScale: 0.98, tints: { skin: '#F9E4CF', top: '#1C1C1C', bottom: '#2C3E50', accent: '#C0392B' } },
  { id: 'mv_23', name: 'Sven – Snekker',            description: 'Rødbrun hud, arbeidsklær',   gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 1.03, tints: { skin: '#BB7744', top: '#E67E22', bottom: '#5D4037', accent: '#D35400' } },
  { id: 'mv_24', name: 'Liam – Sykepleier',         description: 'Lys hud, lyseblå uniform',   gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 0.99, tints: { skin: '#F5CBA7', top: '#85C1E9', bottom: '#2E86C1', accent: '#FFFFFF' } },
  { id: 'mv_25', name: 'Ibrahim – Sjef',            description: 'Mørk hud, krem skjorte',     gender: 'male',  baseModelUrl: MALE_BASE,   heightScale: 1.01, tints: { skin: '#6E3B1F', top: '#FDFEFE', bottom: '#1A252F', accent: '#D4AC0D' } },

  // ── Female variants ──────────────────────────────────────────
  { id: 'fv_01', name: 'Ingrid – Direktør',         description: 'Lys hud, marineblå dress',   gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.00, tints: { skin: '#F5CBA7', top: '#1A3A5C', bottom: '#1A252F', accent: '#BDC3C7' } },
  { id: 'fv_02', name: 'Amara – Lege',              description: 'Mørk hud, hvit frakk',       gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.99, tints: { skin: '#5C3317', top: '#FFFFFF', bottom: '#7F8C8D', accent: '#DDDDDD' } },
  { id: 'fv_03', name: 'Sofia – Danser',            description: 'Mellomhud, lilla',           gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.01, tints: { skin: '#C9955C', top: '#9B59B6', bottom: '#6C3483', accent: '#F1C40F' } },
  { id: 'fv_04', name: 'Nora – Kunstner',           description: 'Blek hud, fargerik topp',    gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.97, tints: { skin: '#FAE0CC', top: '#E74C3C', bottom: '#17202A', accent: '#F39C12' } },
  { id: 'fv_05', name: 'Aisha – Forsker',           description: 'Oliven hud, beige',          gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.98, tints: { skin: '#C8874A', top: '#D5CDB7', bottom: '#7F6F4A', accent: '#C8B88A' } },
  { id: 'fv_06', name: 'Emma – Student',            description: 'Lys hud, lyseblå',           gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.96, tints: { skin: '#F0C18A', top: '#85C1E9', bottom: '#2E86C1', accent: '#FFFFFF' } },
  { id: 'fv_07', name: 'Lin – Arkitekt',            description: 'Lys oliven, grå jakke',      gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.00, tints: { skin: '#D4A76A', top: '#95A5A6', bottom: '#2C3E50', accent: '#BDC3C7' } },
  { id: 'fv_08', name: 'Fatima – Sykepleier',       description: 'Mellombrun, blå uniform',    gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.99, tints: { skin: '#BB7744', top: '#2471A3', bottom: '#1A5276', accent: '#FFFFFF' } },
  { id: 'fv_09', name: 'Maria – Lærer',             description: 'Mellomhud, rød bluse',       gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.97, tints: { skin: '#C9955C', top: '#C0392B', bottom: '#1A252F', accent: '#F8C471' } },
  { id: 'fv_10', name: 'Kiri – Fotograf',           description: 'Brun hud, sort antrekk',     gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.01, tints: { skin: '#8B5E3C', top: '#1C1C1C', bottom: '#2C2C2C', accent: '#888888' } },
  { id: 'fv_11', name: 'Anna – Journalist',         description: 'Blek hud, kameljakke',       gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.98, tints: { skin: '#FAE5CC', top: '#C19A6B', bottom: '#1A252F', accent: '#B7950B' } },
  { id: 'fv_12', name: 'Priya – Ingeniør',          description: 'Oliven hud, grønn topp',     gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.98, tints: { skin: '#C0834C', top: '#1E8449', bottom: '#1A252F', accent: '#82E0AA' } },
  { id: 'fv_13', name: 'Camille – Motedesigner',    description: 'Blek hud, sort mote-look',   gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.03, tints: { skin: '#F5D5B0', top: '#1C1C1C', bottom: '#1C1C1C', accent: '#D4AC0D' } },
  { id: 'fv_14', name: 'Zoe – Personlig trener',    description: 'Solbrent, sports-outfit',    gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.02, tints: { skin: '#CC8855', top: '#E74C3C', bottom: '#2C3E50', accent: '#FFFFFF' } },
  { id: 'fv_15', name: 'Hanna – Advokat',           description: 'Lys hud, antrasi dress',     gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.00, tints: { skin: '#F2D7B6', top: '#2C3E50', bottom: '#2C3E50', accent: '#C0C0C0' } },
  { id: 'fv_16', name: 'Yasmin – Kokk',             description: 'Mellombrun, hvit kokkehatt', gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.97, tints: { skin: '#C08060', top: '#EFEFEF', bottom: '#7F8C8D', accent: '#F0F0F0' } },
  { id: 'fv_17', name: 'Bjørg – Bonde',             description: 'Solbrent, rutete skjorte',   gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.98, tints: { skin: '#CD8B5A', top: '#C0392B', bottom: '#5D4037', accent: '#795548' } },
  { id: 'fv_18', name: 'Layla – Designer',          description: 'Oliventonet, fargerik',      gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.00, tints: { skin: '#C8874A', top: '#8E44AD', bottom: '#2C3E50', accent: '#F39C12' } },
  { id: 'fv_19', name: 'Sara – Barista',            description: 'Lys hud, brun forkle',       gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.96, tints: { skin: '#F5CBA7', top: '#A04000', bottom: '#1C1C1C', accent: '#6E3B1F' } },
  { id: 'fv_20', name: 'Mei – Musiker',             description: 'Lys asiatisk hud, sort',     gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.96, tints: { skin: '#F0C8A0', top: '#1C1C1C', bottom: '#2C3E50', accent: '#C0392B' } },
  { id: 'fv_21', name: 'Elisa – Pilot',             description: 'Mellomhud, marineuniform',   gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.01, tints: { skin: '#D4956A', top: '#1A252F', bottom: '#1A252F', accent: '#F1C40F' } },
  { id: 'fv_22', name: 'Rebeca – Sykepleier',       description: 'Brun hud, lyserød uniform',  gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.99, tints: { skin: '#A0522D', top: '#F1948A', bottom: '#C0392B', accent: '#FFFFFF' } },
  { id: 'fv_23', name: 'Ida – Friluftsentusiast',   description: 'Blek, grønn outdoorjakke',   gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.97, tints: { skin: '#FAE0CC', top: '#27AE60', bottom: '#5D4037', accent: '#A9CCB4' } },
  { id: 'fv_24', name: 'Chioma – Forsker',          description: 'Mørk hud, hvit lab-frakk',   gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 0.99, tints: { skin: '#4A2512', top: '#FFFFFF', bottom: '#7F8C8D', accent: '#DDDDDD' } },
  { id: 'fv_25', name: 'Victoria – Sjef',           description: 'Mellomhud, burgundy dress',  gender: 'female', baseModelUrl: FEMALE_BASE, heightScale: 1.02, tints: { skin: '#C8874A', top: '#922B21', bottom: '#922B21', accent: '#D4AC0D' } },
];

/** Look up a character variant by id */
export function getCharacterVariant(id: string): CharacterVariant | undefined {
  return CHARACTER_VARIANTS.find(v => v.id === id);
}
