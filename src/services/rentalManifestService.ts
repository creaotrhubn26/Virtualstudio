/**
 * Rental Manifest Service
 * Generates a CSV equipment list from the current studio lights
 * that can be sent directly to a rental house.
 */

export interface ManifestLight {
  id: string;
  name: string;
  type: string;
  cct: number;
  intensity: number;
  modifier: string;
  enabled: boolean;
}

interface RentalLineItem {
  navn: string;
  type: string;
  merke: string;
  modell: string;
  antall: number;
  stativ: string;
  tilbehør: string;
  cct: string;
  effekt: string;
  kategori: string;
}

const TYPE_MAP: Record<string, { merke: string; modell: string; stativ: string; kategori: string }> = {
  strobe:    { merke: 'Profoto',   modell: 'Pro-11-2400B',       stativ: 'C-stativ 230cm', kategori: 'Blits' },
  flash:     { merke: 'Profoto',   modell: 'Pro-11-2400B',       stativ: 'C-stativ 230cm', kategori: 'Blits' },
  fresnel:   { merke: 'Arri',      modell: 'T5 Tungsten Fresnel',stativ: 'Baby stand 200cm', kategori: 'Kontinuerlig' },
  hmi:       { merke: 'Arri',      modell: 'M18 HMI PAR',        stativ: 'Combo stand 300cm', kategori: 'HMI' },
  kinoflo:   { merke: 'Kino Flo',  modell: 'FreeStyle LED 31',   stativ: 'Baby stand 200cm', kategori: 'LED Panel' },
  led:       { merke: 'Aputure',   modell: '300d II',            stativ: 'Baby stand 200cm', kategori: 'LED' },
  tungsten:  { merke: 'Arri',      modell: '650W Fresnel',       stativ: 'Baby stand 200cm', kategori: 'Tungsten' },
  area:      { merke: 'Litepanels',modell: 'Gemini 2×1',         stativ: 'C-stativ 230cm', kategori: 'LED Panel' },
  softbox:   { merke: 'Profoto',   modell: 'Pro-10-2400B',       stativ: 'C-stativ 230cm', kategori: 'Blits' },
  default:   { merke: 'Diverse',   modell: '—',                  stativ: 'Baby stand 200cm', kategori: 'Kontinuerlig' },
};

const MODIFIER_MAP: Record<string, string> = {
  softbox:        'Softboks 90×90cm',
  octabox:        'Oktagondiffusor 120cm',
  umbrella:       'Hvit paraply 110cm',
  beauty_dish:    'Beauty dish 56cm + diffusjonssokk',
  snoot:          'Spot snoot',
  grid:           'Honeycomb-grid 30°',
  barn_doors:     'Barn doors',
  strip_box:      'Stripboks 35×160cm',
  diffusion:      'Silent 250 diffusjonsramme',
  none:           '—',
};

function resolveType(type: string): { merke: string; modell: string; stativ: string; kategori: string } {
  const lower = type.toLowerCase();
  for (const key of Object.keys(TYPE_MAP)) {
    if (lower.includes(key)) return TYPE_MAP[key];
  }
  return TYPE_MAP.default;
}

function resolveModifier(modifier: string): string {
  if (!modifier || modifier === 'none') return '—';
  const lower = modifier.toLowerCase().replace(/[\s-]/g, '_');
  for (const key of Object.keys(MODIFIER_MAP)) {
    if (lower.includes(key)) return MODIFIER_MAP[key];
  }
  return modifier;
}

function escapeCsv(v: string | number): string {
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function buildRentalManifest(lights: ManifestLight[]): RentalLineItem[] {
  const items: RentalLineItem[] = [];

  // One row per light
  for (const light of lights) {
    if (!light.enabled) continue;
    const eq = resolveType(light.type);
    items.push({
      navn: light.name,
      type: light.type,
      merke: eq.merke,
      modell: eq.modell,
      antall: 1,
      stativ: eq.stativ,
      tilbehør: resolveModifier(light.modifier),
      cct: `${light.cct}K`,
      effekt: `${Math.round(light.intensity)}%`,
      kategori: eq.kategori,
    });
  }

  // Group stands if many lights share the same stand type
  const standGroups = new Map<string, number>();
  for (const item of items) {
    standGroups.set(item.stativ, (standGroups.get(item.stativ) ?? 0) + 1);
  }

  // Append stand summary rows
  for (const [stativ, count] of standGroups.entries()) {
    if (count > 1) {
      items.push({
        navn: `${stativ} (×${count})`,
        type: 'stativ',
        merke: 'Manfrotto / Matthews',
        modell: stativ,
        antall: count,
        stativ: '—',
        tilbehør: '—',
        cct: '—',
        effekt: '—',
        kategori: 'Stativ',
      });
    }
  }

  // Always add sandbags
  if (items.length > 0) {
    items.push({
      navn: `Sandsekker (×${items.filter(i => i.kategori !== 'Stativ').length * 2})`,
      type: 'sandbag',
      merke: 'Diverse',
      modell: '15kg',
      antall: items.filter(i => i.kategori !== 'Stativ').length * 2,
      stativ: '—',
      tilbehør: '—',
      cct: '—',
      effekt: '—',
      kategori: 'Sikkerhet',
    });

    // Extension cables
    items.push({
      navn: 'Skjøteledninger 10A (×4)',
      type: 'cable',
      merke: 'Diverse',
      modell: '10m',
      antall: 4,
      stativ: '—',
      tilbehør: '—',
      cct: '—',
      effekt: '—',
      kategori: 'Kabel/Strøm',
    });
  }

  return items;
}

export function buildRentalCsv(lights: ManifestLight[], sceneName = 'Studio'): string {
  const items = buildRentalManifest(lights);
  const headers = ['Navn', 'Type', 'Merke', 'Modell', 'Antall', 'Stativ', 'Tilbehør', 'Fargetemperatur', 'Effekt', 'Kategori'];
  const rows = items.map(i => [
    escapeCsv(i.navn),
    escapeCsv(i.type),
    escapeCsv(i.merke),
    escapeCsv(i.modell),
    escapeCsv(i.antall),
    escapeCsv(i.stativ),
    escapeCsv(i.tilbehør),
    escapeCsv(i.cct),
    escapeCsv(i.effekt),
    escapeCsv(i.kategori),
  ].join(','));

  const header = `# Leieutstyrsliste — ${sceneName}\n# Generert: ${new Date().toLocaleString('nb-NO')}\n# ${lights.filter(l => l.enabled).length} aktive lyskilder\n\n`;
  return header + headers.join(',') + '\n' + rows.join('\n');
}

export function downloadRentalCsv(lights: ManifestLight[], sceneName = 'Studio'): void {
  const csv = buildRentalCsv(lights, sceneName);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leieutstyr-${(sceneName || 'studio').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
