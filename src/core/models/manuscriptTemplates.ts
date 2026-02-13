/**
 * Manuscript Template System
 * Provides pre-built templates for screenplay writing
 */

export type TemplateType = 
  | 'full-manuscript'
  | 'scene'
  | 'character'
  | 'dialogue'
  | 'action'
  | 'structure';

export type TemplateGenre = 
  | 'feature'
  | 'short'
  | 'tv-episode'
  | 'commercial'
  | 'documentary'
  | 'music-video';

export type StructureType = 
  | '3-act'
  | 'save-the-cat'
  | 'heroes-journey'
  | 'teaser-4acts'
  | '5-act'
  | 'simple';

export interface StoryBeat {
  name: string;
  page: number | { min: number; max: number };
  description: string;
}

export interface StructureTemplate {
  id: string;
  name: string;
  description: string;
  beats: StoryBeat[];
  totalPages: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  genre?: TemplateGenre;
  structure?: StructureType;
  content: string;
  preview?: string;
  tags: string[];
  icon?: string;
  isUserTemplate?: boolean;
  createdAt?: string;
  usageCount?: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  templates: Template[];
}

export interface TemplateLibrary {
  categories: TemplateCategory[];
  userTemplates: Template[];
  recentlyUsed: Template[];
}

export interface AutoCompleteSuggestion {
  type: string;
  value: string;
  description?: string;
}

// Story Structure Templates
export const STRUCTURE_TEMPLATES: StructureTemplate[] = [
  {
    id: 'save-the-cat',
    name: 'Save the Cat',
    description: 'Blake Snyder\'s 15-beat story structure',
    totalPages: 110,
    beats: [
      { name: 'Opening Image', page: 1, description: 'Et visuelt som setter tonen' },
      { name: 'Theme Stated', page: 5, description: 'Hva handler historien om?' },
      { name: 'Setup', page: { min: 1, max: 10 }, description: 'Vis hovedpersons verden' },
      { name: 'Catalyst', page: 12, description: 'Noe skjer som endrer alt' },
      { name: 'Debate', page: { min: 12, max: 25 }, description: 'Skal de ta utfordringen?' },
      { name: 'Break into Two', page: 25, description: 'Hovedpersonen tar et valg' },
      { name: 'B Story', page: 30, description: 'Love interest eller mentor' },
      { name: 'Fun and Games', page: { min: 30, max: 55 }, description: 'Løftet fra plakaten' },
      { name: 'Midpoint', page: 55, description: 'Falsk seier eller nederlag' },
      { name: 'Bad Guys Close In', page: { min: 55, max: 75 }, description: 'Ting blir verre' },
      { name: 'All Is Lost', page: 75, description: 'Bunnen er nådd' },
      { name: 'Dark Night of the Soul', page: { min: 75, max: 85 }, description: 'Refleksjon og tvil' },
      { name: 'Break into Three', page: 85, description: 'Løsningen dukker opp' },
      { name: 'Finale', page: { min: 85, max: 110 }, description: 'Klimaks og oppgjør' },
      { name: 'Final Image', page: 110, description: 'Motsatt av åpningsbildet' }
    ]
  },
  {
    id: 'heroes-journey',
    name: "Hero's Journey",
    description: 'Joseph Campbell\'s klassiske heltefortelling',
    totalPages: 110,
    beats: [
      { name: 'Ordinary World', page: { min: 1, max: 10 }, description: 'Heltens normale liv' },
      { name: 'Call to Adventure', page: { min: 10, max: 15 }, description: 'Invitasjon til eventyr' },
      { name: 'Refusal of the Call', page: { min: 15, max: 20 }, description: 'Helten nøler' },
      { name: 'Meeting the Mentor', page: { min: 20, max: 25 }, description: 'Veileder dukker opp' },
      { name: 'Crossing the Threshold', page: 25, description: 'Inn i den nye verden' },
      { name: 'Tests, Allies, Enemies', page: { min: 30, max: 55 }, description: 'Læring og utfordringer' },
      { name: 'Approach to Inmost Cave', page: { min: 55, max: 65 }, description: 'Forberedelse til prøvelse' },
      { name: 'Ordeal', page: 75, description: 'Største utfordring' },
      { name: 'Reward', page: { min: 75, max: 85 }, description: 'Seier, men ikke ferdig' },
      { name: 'The Road Back', page: 85, description: 'Tilbake til vanlig verden' },
      { name: 'Resurrection', page: { min: 95, max: 105 }, description: 'Endelig prøvelse' },
      { name: 'Return with Elixir', page: 110, description: 'Helten har forandret seg' }
    ]
  },
  {
    id: '3-act',
    name: '3-Act Structure',
    description: 'Klassisk tre-akt struktur',
    totalPages: 110,
    beats: [
      { name: 'Act 1: Setup', page: { min: 1, max: 25 }, description: 'Introduksjon til verden og karakterer' },
      { name: 'Plot Point 1', page: 25, description: 'Noe endrer retningen' },
      { name: 'Act 2: Confrontation', page: { min: 25, max: 85 }, description: 'Økende konflikter' },
      { name: 'Midpoint', page: 55, description: 'Game changer i midten' },
      { name: 'Plot Point 2', page: 85, description: 'Alt ser håpløst ut' },
      { name: 'Act 3: Resolution', page: { min: 85, max: 110 }, description: 'Klimaks og løsning' }
    ]
  }
];

// Full Manuscript Templates
export const MANUSCRIPT_TEMPLATES: Template[] = [
  {
    id: 'feature-blank',
    name: 'Blank Feature Film',
    description: 'Standard spillefilmformat (90-120 sider)',
    type: 'full-manuscript',
    genre: 'feature',
    structure: '3-act',
    tags: ['starter', 'feature', 'blank'],
    icon: 'Movie',
    content: `Title: UNTITLED PROJECT
Credit: Written by
Author: 
Draft date: ${new Date().toLocaleDateString('no-NO')}

FADE IN:

INT. LOCATION - DAY



FADE OUT.`
  },
  {
    id: 'tv-episode',
    name: 'TV Episode (1 hour)',
    description: 'En times TV-episode med teaser og 4 akter',
    type: 'full-manuscript',
    genre: 'tv-episode',
    structure: 'teaser-4acts',
    tags: ['starter', 'tv', 'series'],
    icon: 'Tv',
    content: `Title: EPISODE TITLE
Show: 
Episode: 1x01
Written by: 
Draft date: ${new Date().toLocaleDateString('no-NO')}

TEASER

FADE IN:

INT. LOCATION - DAY



END OF TEASER

ACT ONE

INT. LOCATION - DAY



END OF ACT ONE

ACT TWO



END OF ACT TWO

ACT THREE



END OF ACT THREE

ACT FOUR



FADE OUT.

THE END`
  },
  {
    id: 'short-film',
    name: 'Short Film (5-15 min)',
    description: 'Kortfilm med enkel struktur',
    type: 'full-manuscript',
    genre: 'short',
    structure: 'simple',
    tags: ['starter', 'short', 'festival'],
    icon: 'VideoLibrary',
    content: `Title: SHORT FILM TITLE
Written by: 
Draft date: ${new Date().toLocaleDateString('no-NO')}
Length: 10 minutes

FADE IN:

INT. LOCATION - DAY



FADE OUT.`
  },
  {
    id: 'commercial',
    name: 'Commercial (30/60 sec)',
    description: 'Reklamefilm med visuelt fokus',
    type: 'full-manuscript',
    genre: 'commercial',
    tags: ['commercial', 'advertising', 'short'],
    icon: 'Campaign',
    content: `COMMERCIAL SCRIPT
Client: 
Product: 
Length: 30 seconds
Date: ${new Date().toLocaleDateString('no-NO')}

FADE IN:

VIDEO                           AUDIO
-------------------------------- --------------------------------

EXT. LOCATION - DAY              MUSIC: Upbeat, energetic

PRODUCT in focus.                VO: "Your message here."



SUPER: Brand Logo                VO: "Tagline."

FADE OUT.`
  }
];

// Scene Templates
export const SCENE_TEMPLATES: Template[] = [
  {
    id: 'opening-sequence',
    name: 'Opening Sequence',
    description: 'Etablerer hovedperson og verden',
    type: 'scene',
    tags: ['opening', 'introduction', 'character'],
    icon: 'MovieCreation',
    preview: 'INT. KITCHEN - MORNING\n\nANNA (30s, energisk)...',
    content: `INT. LOCATION - DAY

CHARACTER (age, beskrivelse) gjør noe karakteristisk.

CHARACTER
(emosjonell tilstand)
Første replikk som avslører personlighet.

De fortsetter med handling som viser hvem de er.`
  },
  {
    id: 'dialogue-scene',
    name: 'Dialogue Scene',
    description: 'Samtale mellom to karakterer',
    type: 'dialogue',
    tags: ['dialogue', 'conversation', 'character'],
    icon: 'ChatBubble',
    preview: 'INT. CAFÉ - DAY\n\nTo personer snakker...',
    content: `INT. LOCATION - DAY

CHARACTER1 og CHARACTER2 sitter overfor hverandre.

CHARACTER1
Jeg tror ikke dette fungerer.

CHARACTER2
(nøler)
Vi må i hvert fall prøve.

CHARACTER1 ser bort.

CHARACTER1
Hva om du tar feil?

CHARACTER2
(bestemt)
Det gjør jeg ikke.`
  },
  {
    id: 'action-sequence',
    name: 'Action Sequence',
    description: 'Fysisk action eller spenning',
    type: 'action',
    tags: ['action', 'chase', 'suspense'],
    icon: 'FlashOn',
    preview: 'EXT. CITY STREET - NIGHT\n\nCHARACTER springer...',
    content: `EXT. LOCATION - NIGHT

CHARACTER springer gjennom regnet.

FOTTRINN bak dem.

De snur seg - gaten er tom.

SMASH! En bil svinger rundt hjørnet.

CHARACTER kaster seg til siden.

Bilen bråbremser. Døren åpnes.`
  },
  {
    id: 'montage',
    name: 'Montage',
    description: 'Tidsforløp eller parallelle hendelser',
    type: 'scene',
    tags: ['montage', 'time-passage', 'parallel'],
    icon: 'Timer',
    preview: 'MONTAGE - TRAINING SEQUENCE',
    content: `MONTAGE - BESKRIVELSE

-- CHARACTER gjør aktivitet 1.

-- CHARACTER gjør aktivitet 2.

-- CHARACTER gjør aktivitet 3.

-- CHARACTER når mål.

END MONTAGE`
  },
  {
    id: 'flashback',
    name: 'Flashback',
    description: 'Tilbakeblikk til tidligere hendelse',
    type: 'scene',
    tags: ['flashback', 'memory', 'past'],
    icon: 'History',
    preview: 'FLASHBACK:\n\nINT. OLD HOUSE...',
    content: `FLASHBACK:

INT. LOCATION - DAY (YEAR)

YOUNGER CHARACTER gjør noe betydningsfullt.

VOICE OVER (CHARACTER)
Jeg husker den dagen...

END FLASHBACK

Tilbake til nåtid.`
  },
  {
    id: 'phone-conversation',
    name: 'Phone Conversation',
    description: 'Telefonsamtale (en eller to sider)',
    type: 'dialogue',
    tags: ['phone', 'dialogue', 'split-screen'],
    icon: 'Phone',
    preview: 'INTERCUT - PHONE CONVERSATION',
    content: `INTERCUT - PHONE CONVERSATION

INT. LOCATION A - DAY

CHARACTER1 holder telefonen.

CHARACTER1
Hør her...

INT. LOCATION B - SAME TIME

CHARACTER2 svarer.

CHARACTER2
Jeg lytter.

BACK TO CHARACTER1

CHARACTER1
Vi har et problem.

END INTERCUT`
  }
];

// Character Introduction Templates
export const CHARACTER_TEMPLATES: Template[] = [
  {
    id: 'protagonist-intro',
    name: 'Protagonist Introduction',
    description: 'Introduser hovedpersonen med stil',
    type: 'character',
    tags: ['character', 'protagonist', 'introduction'],
    icon: 'Person',
    preview: 'ANNA (30s, energisk...)...',
    content: `CHARACTER_NAME (alder, karakteristikk) gjør noe som definerer dem.

De er fokuserte, drevne av [motivasjon].

CHARACTER_NAME
(til seg selv)
Første tanke som avslører indre konflikt.`
  },
  {
    id: 'villain-reveal',
    name: 'Villain Reveal',
    description: 'Dramatisk introduksjon av antagonist',
    type: 'character',
    tags: ['character', 'villain', 'antagonist'],
    icon: 'PersonOutline',
    preview: 'Skyggefull figur...',
    content: `En SKYGGEFULL FIGUR beveger seg gjennom [location].

De stopper. Vender seg sakte.

VILLAIN_NAME (alder, truende) smiler kaldt.

VILLAIN_NAME
Perfekt timing.

Deres øyne avslører [intention].`
  },
  {
    id: 'mentor-intro',
    name: 'Mentor Introduction',
    description: 'Klok veileder dukker opp',
    type: 'character',
    tags: ['character', 'mentor', 'guide'],
    icon: 'School',
    preview: 'MENTOR viser visdom...',
    content: `MENTOR_NAME (alder, klok og erfaren) observerer situasjonen.

MENTOR_NAME
(rolig)
Du stiller feil spørsmål.

De smiler med en visshet som kommer fra erfaring.

MENTOR_NAME (CONT'D)
La meg vise deg.`
  }
];

// Auto-complete suggestions
export const AUTO_COMPLETE_SUGGESTIONS = {
  SCENE_HEADING: [
    { type: 'interior', value: 'INT. APARTMENT - DAY', description: 'Interior apartment scene' },
    { type: 'interior', value: 'INT. OFFICE - DAY', description: 'Office interior' },
    { type: 'interior', value: 'INT. CAR - DAY', description: 'Inside a car' },
    { type: 'interior', value: 'INT. CAFÉ - DAY', description: 'Coffee shop interior' },
    { type: 'interior', value: 'INT. BEDROOM - NIGHT', description: 'Bedroom at night' },
    { type: 'exterior', value: 'EXT. CITY STREET - DAY', description: 'City street exterior' },
    { type: 'exterior', value: 'EXT. PARK - DAY', description: 'Park scene' },
    { type: 'exterior', value: 'EXT. BUILDING - NIGHT', description: 'Outside building' },
    { type: 'exterior', value: 'EXT. BEACH - DAY', description: 'Beach location' },
    { type: 'int-ext', value: 'INT/EXT. CAR - DAY', description: 'Car with windows' }
  ],
  TIME_OF_DAY: [
    { type: 'time', value: 'DAY', description: 'Daytime' },
    { type: 'time', value: 'NIGHT', description: 'Nighttime' },
    { type: 'time', value: 'MORNING', description: 'Morning light' },
    { type: 'time', value: 'EVENING', description: 'Evening/dusk' },
    { type: 'time', value: 'DAWN', description: 'Early morning' },
    { type: 'time', value: 'DUSK', description: 'Sunset' },
    { type: 'time', value: 'LATER', description: 'Time has passed' },
    { type: 'time', value: 'CONTINUOUS', description: 'Continues from previous' },
    { type: 'time', value: 'MOMENTS LATER', description: 'Short time skip' }
  ],
  TRANSITIONS: [
    { type: 'transition', value: 'CUT TO:', description: 'Standard cut' },
    { type: 'transition', value: 'FADE TO:', description: 'Fade transition' },
    { type: 'transition', value: 'DISSOLVE TO:', description: 'Dissolve effect' },
    { type: 'transition', value: 'SMASH CUT TO:', description: 'Sudden transition' },
    { type: 'transition', value: 'MATCH CUT TO:', description: 'Visual match' },
    { type: 'transition', value: 'FADE OUT.', description: 'End scene' },
    { type: 'transition', value: 'FADE IN:', description: 'Start scene' }
  ]
};

// Build complete template library
export function buildTemplateLibrary(): TemplateLibrary {
  return {
    categories: [
      {
        id: 'starter',
        name: 'Starter Templates',
        icon: 'Rocket',
        description: 'Kom i gang raskt med komplette oppsett',
        templates: MANUSCRIPT_TEMPLATES
      },
      {
        id: 'scenes',
        name: 'Scene Starters',
        icon: 'MovieCreation',
        description: 'Ferdiglagde scenetyper',
        templates: SCENE_TEMPLATES
      },
      {
        id: 'characters',
        name: 'Character Intros',
        icon: 'Person',
        description: 'Introduser karakterer profesjonelt',
        templates: CHARACTER_TEMPLATES
      }
    ],
    userTemplates: [],
    recentlyUsed: []
  };
}
