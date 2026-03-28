import type { EnvironmentBrandApplicationTarget } from '../core/models/environmentPlan';

export interface BrandDirectionPreset {
  id: string;
  label: string;
  description: string;
  applicationTargets: EnvironmentBrandApplicationTarget[];
  uniformPolicy: 'match_palette' | 'hero_staff_only' | 'front_of_house_emphasis' | 'kitchen_emphasis';
  signageStyle: 'painted_wall' | 'neon' | 'menu_board' | 'window_decal';
  packagingStyle: 'box_stamp' | 'sticker' | 'printed_wrap';
  interiorStyle: 'accent_trim' | 'full_palette' | 'materials_only';
  usageNote: string;
}

const PRESETS: BrandDirectionPreset[] = [
  {
    id: 'trattoria-warm',
    label: 'Varm trattoria',
    description: 'Klassisk restaurantuttrykk med menybrett, trykt takeaway og varme staff-farger.',
    applicationTargets: ['wardrobe', 'signage', 'packaging', 'interior_details'],
    uniformPolicy: 'kitchen_emphasis',
    signageStyle: 'menu_board',
    packagingStyle: 'printed_wrap',
    interiorStyle: 'accent_trim',
    usageNote: 'Lean into a warm trattoria identity with menu-board signage, printed takeaway packaging and kitchen-first uniforms.',
  },
  {
    id: 'editorial-clean',
    label: 'Editorial clean',
    description: 'Renere look for kampanjer der produkt og interiør må føles mer premium enn travel service.',
    applicationTargets: ['wardrobe', 'signage', 'interior_details'],
    uniformPolicy: 'hero_staff_only',
    signageStyle: 'painted_wall',
    packagingStyle: 'sticker',
    interiorStyle: 'materials_only',
    usageNote: 'Keep the brand premium and editorial with restrained interior branding, hero-staff wardrobe accents and clean painted signage.',
  },
  {
    id: 'front-counter-pop',
    label: 'Front counter pop',
    description: 'Sterkere signage og front-of-house-uniformer for takeaway, åpning og retail-lignende scener.',
    applicationTargets: ['wardrobe', 'signage', 'packaging', 'interior_details'],
    uniformPolicy: 'front_of_house_emphasis',
    signageStyle: 'window_decal',
    packagingStyle: 'box_stamp',
    interiorStyle: 'full_palette',
    usageNote: 'Push the brand hardest at the counter with bold signage, stamped packaging and front-of-house color emphasis.',
  },
  {
    id: 'neon-takeaway',
    label: 'Neon takeaway',
    description: 'Mer energisk look med neon-aktig signage og tydelige takeaway-detaljer.',
    applicationTargets: ['signage', 'packaging', 'interior_details'],
    uniformPolicy: 'match_palette',
    signageStyle: 'neon',
    packagingStyle: 'box_stamp',
    interiorStyle: 'full_palette',
    usageNote: 'Use high-energy signage, bolder palette accents and takeaway branding that feels fast, urban and visible on camera.',
  },
];

export function getBrandDirectionPresets(): BrandDirectionPreset[] {
  return PRESETS.map((preset) => ({ ...preset, applicationTargets: [...preset.applicationTargets] }));
}

export function getBrandDirectionPresetById(id: string | null | undefined): BrandDirectionPreset | null {
  if (!id) {
    return null;
  }
  return getBrandDirectionPresets().find((preset) => preset.id === id) || null;
}
