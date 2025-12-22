export interface HairStyle {
  id: string;
  name: string;
  category: 'male' | 'female' | 'children' | 'textured';
  description: string;
  thumbnail?: string;
  tags?: string[];
}

const HAIR_STYLES: HairStyle[] = [
  { id: 'short-classic', name: 'Kort Klassisk', category: 'male', description: 'Tradisjonell kort herrefrisyre' },
  { id: 'buzz-cut', name: 'Buzz Cut', category: 'male', description: 'Veldig kort, jevn klipp' },
  { id: 'side-part', name: 'Sideskill', category: 'male', description: 'Klassisk sideskill med volum' },
  { id: 'undercut', name: 'Undercut', category: 'male', description: 'Moderne undercut stil' },
  { id: 'long-wavy', name: 'Lang Bølget', category: 'female', description: 'Lang hår med naturlige bølger' },
  { id: 'bob', name: 'Bob', category: 'female', description: 'Klassisk bob-frisyre' },
  { id: 'pixie', name: 'Pixie', category: 'female', description: 'Kort pixie-klipp' },
  { id: 'ponytail', name: 'Hestehale', category: 'female', description: 'Høy eller lav hestehale' },
  { id: 'braids', name: 'Fletter', category: 'female', description: 'Elegante fletter' },
  { id: 'updo', name: 'Oppsatt', category: 'female', description: 'Formell oppsatt frisyre' },
  { id: 'kids-short', name: 'Barn Kort', category: 'children', description: 'Enkel barnefrisyre' },
  { id: 'kids-pigtails', name: 'Barnehalepar', category: 'children', description: 'To hestehaler' },
  { id: 'afro', name: 'Afro', category: 'textured', description: 'Naturlig afro-tekstur' },
  { id: 'locs', name: 'Dreadlocks', category: 'textured', description: 'Tradisjonelle dreadlocks' },
  { id: 'curly', name: 'Krøllete', category: 'textured', description: 'Naturlige krøller' },
  { id: 'bald', name: 'Skallete', category: 'male', description: 'Ingen hår' }
];

export const getHairStyles = (category?: HairStyle['category']): HairStyle[] => {
  if (!category || category === 'all' as never) {
    return HAIR_STYLES;
  }
  return HAIR_STYLES.filter(style => style.category === category);
};

export const getHairStyleById = (id: string): HairStyle | undefined => {
  return HAIR_STYLES.find(style => style.id === id);
};
