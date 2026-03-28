export type CharacterCatalogId =
  | 'worker_baker'
  | 'worker_cashier'
  | 'worker_server'
  | 'worker_host'
  | 'worker_generic'
  | 'worker_barista'
  | 'talent_woman'
  | 'talent_man'
  | 'customer_woman'
  | 'customer_man';

export type CharacterWardrobeStyle =
  | 'baker'
  | 'server'
  | 'cashier'
  | 'worker'
  | 'host'
  | 'casual'
  | 'branded_uniform';

export interface CharacterCatalogEntry {
  id: CharacterCatalogId;
  name: string;
  avatarId: string;
  modelUrl: string;
  roleTags: string[];
  wardrobeStyle: CharacterWardrobeStyle;
  wardrobeVariants?: string[];
  logoPlacement: 'none' | 'apron_chest' | 'shirt_chest' | 'cap_front';
  description: string;
}

export function getCharacterModelUrl(fileName: string): string {
  return `/models/avatars/${fileName}`;
}

export const CHARACTER_CATALOG: CharacterCatalogEntry[] = [
  {
    id: 'worker_baker',
    name: 'Bakemester',
    avatarId: 'avatar_man',
    modelUrl: getCharacterModelUrl('avatar_man.glb'),
    roleTags: ['baker', 'chef', 'pizza', 'kitchen', 'worker'],
    wardrobeStyle: 'baker',
    wardrobeVariants: ['classic_apron', 'oven_ready', 'artisan_cap'],
    logoPlacement: 'apron_chest',
    description: 'Synlig baker med plass for logo på forkle.',
  },
  {
    id: 'worker_cashier',
    name: 'Kassemedarbeider',
    avatarId: 'avatar_woman',
    modelUrl: getCharacterModelUrl('avatar_woman.glb'),
    roleTags: ['cashier', 'counter', 'register', 'restaurant', 'worker'],
    wardrobeStyle: 'cashier',
    wardrobeVariants: ['counter_polo', 'host_blazer', 'front_counter_apron'],
    logoPlacement: 'shirt_chest',
    description: 'Front-of-house figur for kasse og velkomst.',
  },
  {
    id: 'worker_server',
    name: 'Servering',
    avatarId: 'avatar_teenager',
    modelUrl: getCharacterModelUrl('avatar_teenager.glb'),
    roleTags: ['server', 'waiter', 'waitress', 'restaurant', 'worker'],
    wardrobeStyle: 'server',
    wardrobeVariants: ['floor_service_apron', 'service_shirt', 'tray_host'],
    logoPlacement: 'shirt_chest',
    description: 'Servicefigur for restaurant og cafe.',
  },
  {
    id: 'worker_host',
    name: 'Vertskap',
    avatarId: 'avatar_woman',
    modelUrl: getCharacterModelUrl('avatar_woman.glb'),
    roleTags: ['host', 'greeter', 'welcome', 'frontdesk'],
    wardrobeStyle: 'host',
    wardrobeVariants: ['host_blazer', 'host_polo', 'guest_welcome'],
    logoPlacement: 'shirt_chest',
    description: 'Vertskap ved inngang eller resepsjon.',
  },
  {
    id: 'worker_generic',
    name: 'Ansatt',
    avatarId: 'avatar_man',
    modelUrl: getCharacterModelUrl('avatar_man.glb'),
    roleTags: ['worker', 'staff', 'crew', 'assistant'],
    wardrobeStyle: 'worker',
    wardrobeVariants: ['branded_polo', 'brand_tee', 'utility_apron'],
    logoPlacement: 'shirt_chest',
    description: 'Generisk ansatt med branded uniform.',
  },
  {
    id: 'worker_barista',
    name: 'Barista',
    avatarId: 'avatar_woman',
    modelUrl: getCharacterModelUrl('avatar_woman.glb'),
    roleTags: ['barista', 'coffee', 'cafe', 'worker'],
    wardrobeStyle: 'baker',
    wardrobeVariants: ['classic_apron', 'coffee_apron', 'artisan_cap'],
    logoPlacement: 'apron_chest',
    description: 'Cafe- eller kaffebarfigur med forkle.',
  },
  {
    id: 'talent_woman',
    name: 'Talent Kvinne',
    avatarId: 'avatar_woman',
    modelUrl: getCharacterModelUrl('avatar_woman.glb'),
    roleTags: ['talent', 'hero', 'model', 'woman'],
    wardrobeStyle: 'casual',
    wardrobeVariants: ['brand_tee', 'hero_talent', 'clean_editorial'],
    logoPlacement: 'shirt_chest',
    description: 'Synlig hovedtalent for branded kommersielle scener.',
  },
  {
    id: 'talent_man',
    name: 'Talent Mann',
    avatarId: 'avatar_man',
    modelUrl: getCharacterModelUrl('avatar_man.glb'),
    roleTags: ['talent', 'hero', 'model', 'man'],
    wardrobeStyle: 'casual',
    wardrobeVariants: ['brand_tee', 'hero_talent', 'clean_editorial'],
    logoPlacement: 'shirt_chest',
    description: 'Synlig hovedtalent for branded kommersielle scener.',
  },
  {
    id: 'customer_woman',
    name: 'Kunde Kvinne',
    avatarId: 'avatar_woman',
    modelUrl: getCharacterModelUrl('avatar_woman.glb'),
    roleTags: ['customer', 'guest', 'client', 'woman'],
    wardrobeStyle: 'casual',
    wardrobeVariants: ['guest_casual', 'dining_guest'],
    logoPlacement: 'none',
    description: 'Bakgrunnsfigur for gjest eller kunde.',
  },
  {
    id: 'customer_man',
    name: 'Kunde Mann',
    avatarId: 'avatar_man',
    modelUrl: getCharacterModelUrl('avatar_man.glb'),
    roleTags: ['customer', 'guest', 'client', 'man'],
    wardrobeStyle: 'casual',
    wardrobeVariants: ['guest_casual', 'dining_guest'],
    logoPlacement: 'none',
    description: 'Bakgrunnsfigur for gjest eller kunde.',
  },
];

export function getCharacterCatalogEntry(id: string | null | undefined): CharacterCatalogEntry | undefined {
  if (!id) return undefined;
  return CHARACTER_CATALOG.find((entry) => entry.id === id);
}

export function inferCharacterCatalogEntry(query: string): CharacterCatalogEntry {
  const lowered = query.toLowerCase();

  const exactMatch = CHARACTER_CATALOG.find((entry) => (
    entry.id === lowered
    || entry.roleTags.some((tag) => lowered.includes(tag))
  ));
  if (exactMatch) {
    return exactMatch;
  }

  if (lowered.includes('woman') || lowered.includes('kvinne')) {
    return getCharacterCatalogEntry('talent_woman')!;
  }

  return getCharacterCatalogEntry('worker_generic')!;
}
