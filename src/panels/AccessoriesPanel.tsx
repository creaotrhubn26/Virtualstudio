/**
 * Accessories Panel
 * 
 * Unified UI for selecting and customizing all types of accessories:
 * - Facial features (noses, ears, mouths, eyebrows, facial hair)
 * - Head accessories (hats, hair, headbands, crowns, helmets)
 * - Body accessories (earrings, necklaces, bracelets, watches, bags)
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  logger } from '../core/services/logger';
import Grid from '@mui/material/GridLegacy';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Stack,
} from '@mui/material';
import { Face, EmojiPeople, Watch, Add } from '@mui/icons-material';
import { useAppStore, type SceneNode } from '../state/store';
import { SKIN_TONES } from '../core/data/actorPresets';
import { CHARACTER_CATALOG } from '../data/characterCatalog';
import {
  FACIAL_FEATURES,
  FACIAL_FEATURES_BY_CATEGORY,
  FacialFeatureCategory,
} from '../core/data/facialFeaturesStyles';
import {
  HEAD_ACCESSORIES,
  HEAD_ACCESSORIES_BY_CATEGORY,
  HeadAccessoryCategory,
} from '../core/data/headAccessoriesStyles';
import {
  BODY_ACCESSORIES,
  BODY_ACCESSORIES_BY_CATEGORY,
  BodyAccessoryCategory,
} from '../core/data/bodyAccessoriesStyles';

const log = logger.module('AccessoriesPanel');

type AccessoryType = 'facial' | 'head' | 'body';

type CharacterAppearanceDraft = {
  name: string;
  role: string;
  characterCatalogId: string;
  wardrobeStyle: string;
  wardrobeVariantId: string;
  wardrobeNotes: string;
  logoPlacement: string;
  actionHint: string;
  behaviorType: string;
  behaviorHomeZoneId: string;
  behaviorRouteZoneIds: string;
  behaviorCustomRoutePointsJson: string;
  behaviorLookAtTarget: string;
  behaviorPace: string;
  behaviorRadius: number;
  skinTone: string;
  hairColor: string;
  hairStyle: string;
  facialHair: string;
  ageGroup: string;
  genderPresentation: string;
  outfitPrimaryColor: string;
  outfitSecondaryColor: string;
};

type CharacterInspectorTestApi = {
  getState: () => {
    selectedActor: string;
    actorIds: string[];
    draft: CharacterAppearanceDraft;
    visualKind: string | null;
  };
  selectCharacter: (nodeId: string) => boolean;
  applyDraftPatch: (patch: Partial<CharacterAppearanceDraft>) => boolean;
};

const FACIAL_CATEGORIES: { value: FacialFeatureCategory; label: string }[] = [
  { value: 'noses', label: 'Noses' },
  { value: 'ears', label: 'Ears' },
  { value: 'mouths', label: 'Mouths' },
  { value: 'eyebrows', label: 'Eyebrows' },
  { value: 'facial_hair', label: 'Facial Hair' },
];

const HEAD_CATEGORIES: { value: HeadAccessoryCategory; label: string }[] = [
  { value: 'hats', label: 'Hats' },
  { value: 'hair', label: 'Hair' },
  { value: 'headbands', label: 'Headbands' },
  { value: 'crowns', label: 'Crowns' },
  { value: 'helmets', label: 'Helmets' },
];

const BODY_CATEGORIES: { value: BodyAccessoryCategory; label: string }[] = [
  { value: 'earrings', label: 'Earrings' },
  { value: 'necklaces', label: 'Necklaces' },
  { value: 'bracelets', label: 'Bracelets' },
  { value: 'watches', label: 'Watches' },
  { value: 'bags', label: 'Bags' },
];

const HAIR_STYLE_OPTIONS = [
  { value: 'short', label: 'Kort' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Langt' },
  { value: 'bun', label: 'Knute' },
  { value: 'covered', label: 'Dekt' },
];

const FACIAL_HAIR_OPTIONS = [
  { value: 'none', label: 'Ingen' },
  { value: 'stubble', label: 'Stubb' },
  { value: 'mustache', label: 'Bart' },
  { value: 'beard', label: 'Skjegg' },
];

const AGE_GROUP_OPTIONS = [
  { value: 'teen', label: 'Tenåring' },
  { value: 'young_adult', label: 'Ung voksen' },
  { value: 'adult', label: 'Voksen' },
  { value: 'senior', label: 'Senior' },
];

const GENDER_PRESENTATION_OPTIONS = [
  { value: 'neutral', label: 'Nøytral' },
  { value: 'female', label: 'Feminin' },
  { value: 'male', label: 'Maskulin' },
];

const WARDROBE_STYLE_OPTIONS = [
  { value: 'baker', label: 'Baker' },
  { value: 'server', label: 'Servering' },
  { value: 'cashier', label: 'Kasse' },
  { value: 'worker', label: 'Ansatt' },
  { value: 'host', label: 'Vertskap' },
  { value: 'casual', label: 'Casual' },
  { value: 'branded_uniform', label: 'Brandet uniform' },
];

const LOGO_PLACEMENT_OPTIONS = [
  { value: 'none', label: 'Ingen logo' },
  { value: 'apron_chest', label: 'Forkle bryst' },
  { value: 'shirt_chest', label: 'Skjorte bryst' },
  { value: 'cap_front', label: 'Caps front' },
];

const BEHAVIOR_TYPE_OPTIONS = [
  { value: 'none', label: 'Ingen AI-bevegelse' },
  { value: 'stationary', label: 'Stasjonær' },
  { value: 'work_loop', label: 'Arbeidsloop' },
  { value: 'patrol', label: 'Patrulje' },
  { value: 'counter_service', label: 'Diskservice' },
  { value: 'serve_route', label: 'Serveringsrute' },
  { value: 'hero_idle', label: 'Hero idle' },
];

const BEHAVIOR_LOOK_TARGET_OPTIONS = [
  { value: '', label: 'Ingen' },
  { value: 'camera', label: 'Kamera' },
  { value: 'hero_prop', label: 'Hero-prop' },
  { value: 'counter', label: 'Disk' },
  { value: 'oven', label: 'Ovn' },
  { value: 'guests', label: 'Gjester' },
];

const BEHAVIOR_PACE_OPTIONS = [
  { value: 'still', label: 'Rolig' },
  { value: 'subtle', label: 'Subtil' },
  { value: 'active', label: 'Aktiv' },
];

const ROLE_OPTIONS = [
  { value: 'baker', label: 'Bakemester' },
  { value: 'cashier', label: 'Kassemedarbeider' },
  { value: 'server', label: 'Servitør' },
  { value: 'host', label: 'Vertskap' },
  { value: 'worker', label: 'Ansatt' },
  { value: 'talent', label: 'Talent' },
  { value: 'customer', label: 'Kunde' },
];

function isCharacterNode(node: SceneNode): boolean {
  if (node.type !== 'model') {
    return false;
  }
  const userData = (node.userData || {}) as Record<string, unknown>;
  return Boolean(
    userData.characterId
    || userData.avatarId
    || userData.avatarUrl
    || userData.actorRole
    || userData.characterCatalogId
    || userData.appearance,
  );
}

function buildCharacterDraft(node: SceneNode | null | undefined): CharacterAppearanceDraft {
  const userData = ((node?.userData || {}) as Record<string, unknown>);
  const appearance = ((userData.appearance || {}) as Record<string, string | undefined>);
  const outfitColors = Array.isArray(userData.outfitColors)
    ? (userData.outfitColors as string[])
    : [];
  const behaviorPlan = ((userData.behaviorPlan || {}) as Record<string, unknown>);
  const wardrobeNotes = Array.isArray(userData.wardrobeNotes)
    ? (userData.wardrobeNotes as string[])
    : [];
  const catalogEntry = CHARACTER_CATALOG.find((entry) => entry.id === userData.characterCatalogId);

  return {
    name: node?.name || '',
    role: typeof userData.actorRole === 'string' ? userData.actorRole : 'worker',
    characterCatalogId: typeof userData.characterCatalogId === 'string' ? userData.characterCatalogId : 'worker_generic',
    wardrobeStyle: typeof userData.wardrobeStyle === 'string' ? userData.wardrobeStyle : 'worker',
    wardrobeVariantId: typeof userData.wardrobeVariantId === 'string'
      ? userData.wardrobeVariantId
      : (catalogEntry?.wardrobeVariants?.[0] || ''),
    wardrobeNotes: wardrobeNotes.join(', '),
    logoPlacement: typeof userData.logoPlacement === 'string' ? userData.logoPlacement : 'shirt_chest',
    actionHint: typeof userData.actionHint === 'string' ? userData.actionHint : '',
    behaviorType: typeof behaviorPlan.type === 'string' ? behaviorPlan.type : 'none',
    behaviorHomeZoneId: typeof behaviorPlan.homeZoneId === 'string' ? behaviorPlan.homeZoneId : '',
    behaviorRouteZoneIds: Array.isArray(behaviorPlan.routeZoneIds)
      ? (behaviorPlan.routeZoneIds as string[]).join(', ')
      : '',
    behaviorCustomRoutePointsJson: Array.isArray(behaviorPlan.customRoutePoints)
      ? JSON.stringify(behaviorPlan.customRoutePoints)
      : '',
    behaviorLookAtTarget: typeof behaviorPlan.lookAtTarget === 'string' ? behaviorPlan.lookAtTarget : '',
    behaviorPace: typeof behaviorPlan.pace === 'string' ? behaviorPlan.pace : 'subtle',
    behaviorRadius: typeof behaviorPlan.radius === 'number' ? behaviorPlan.radius : 0.8,
    skinTone: appearance.skinTone || SKIN_TONES.medium,
    hairColor: appearance.hairColor || '#3b2f2f',
    hairStyle: appearance.hairStyle || 'short',
    facialHair: appearance.facialHair || 'none',
    ageGroup: appearance.ageGroup || 'adult',
    genderPresentation: appearance.genderPresentation || 'neutral',
    outfitPrimaryColor: outfitColors[0] || '#c0392b',
    outfitSecondaryColor: outfitColors[1] || '#f4e7d3',
  };
}

function buildCharacterUpdateDetail(nodeId: string, draft: CharacterAppearanceDraft) {
  const wardrobeNotes = draft.wardrobeNotes
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const routeZoneIds = draft.behaviorRouteZoneIds
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  let customRoutePoints: Array<{ x: number; z: number }> | undefined;
  if (draft.behaviorCustomRoutePointsJson.trim().length > 0) {
    try {
      const parsed = JSON.parse(draft.behaviorCustomRoutePointsJson);
      if (Array.isArray(parsed)) {
        customRoutePoints = parsed
          .map((value) => ({
            x: Number((value as { x?: number }).x),
            z: Number((value as { z?: number }).z),
          }))
          .filter((value) => Number.isFinite(value.x) && Number.isFinite(value.z))
          .slice(0, 8);
      }
    } catch (_error) {
      customRoutePoints = undefined;
    }
  }
  const behaviorPlan = draft.behaviorType === 'none'
    ? null
    : {
      type: draft.behaviorType,
      homeZoneId: draft.behaviorHomeZoneId || undefined,
      routeZoneIds,
      customRoutePoints,
      lookAtTarget: draft.behaviorLookAtTarget || undefined,
      pace: draft.behaviorPace || undefined,
      radius: Number.isFinite(draft.behaviorRadius) ? draft.behaviorRadius : undefined,
    };

  return {
    nodeId,
    name: draft.name,
    role: draft.role,
    characterCatalogId: draft.characterCatalogId,
    wardrobeStyle: draft.wardrobeStyle,
    wardrobeVariantId: draft.wardrobeVariantId || null,
    wardrobeNotes,
    logoPlacement: draft.logoPlacement,
    actionHint: draft.actionHint,
    behaviorPlan,
    outfitColors: [
      draft.outfitPrimaryColor,
      draft.outfitSecondaryColor,
    ],
    appearance: {
      skinTone: draft.skinTone,
      hairColor: draft.hairColor,
      hairStyle: draft.hairStyle,
      facialHair: draft.facialHair,
      ageGroup: draft.ageGroup,
      genderPresentation: draft.genderPresentation,
    },
  };
}

function buildBrandAdjustedDraft(draft: CharacterAppearanceDraft, palette: string[]): CharacterAppearanceDraft {
  const nextPrimary = palette[0] || draft.outfitPrimaryColor;
  const nextSecondary = palette[1] || palette[0] || draft.outfitSecondaryColor;
  const nextWardrobeStyle = draft.wardrobeStyle === 'casual' || draft.wardrobeStyle === 'worker'
    ? 'branded_uniform'
    : draft.wardrobeStyle;
  const preferredLogoPlacement = nextWardrobeStyle === 'baker' ? 'apron_chest' : 'shirt_chest';

  return {
    ...draft,
    wardrobeStyle: nextWardrobeStyle,
    wardrobeVariantId: draft.wardrobeVariantId || 'branded_polo',
    logoPlacement: draft.logoPlacement === 'none' ? preferredLogoPlacement : draft.logoPlacement,
    outfitPrimaryColor: nextPrimary,
    outfitSecondaryColor: nextSecondary,
  };
}

function isBrandableStaff(node: SceneNode): boolean {
  const userData = (node.userData || {}) as Record<string, unknown>;
  const role = String(userData.actorRole || '').toLowerCase();
  return Boolean(
    userData.environmentGenerated
    || role.includes('baker')
    || role.includes('cashier')
    || role.includes('server')
    || role.includes('host')
    || role.includes('worker')
  );
}

export const AccessoriesPanel: React.FC = () => {
  const { addNode } = useAppStore();
  const nodes = useAppStore((s) => s.scene) || [];

  const [accessoryType, setAccessoryType] = useState<AccessoryType>('head');
  const [facialCategory, setFacialCategory] = useState<FacialFeatureCategory>('noses');
  const [headCategory, setHeadCategory] = useState<HeadAccessoryCategory>('hair');
  const [bodyCategory, setBodyCategory] = useState<BodyAccessoryCategory>('watches');
  const [selectedActor, setSelectedActor] = useState<string>('');
  const [characterDraft, setCharacterDraft] = useState<CharacterAppearanceDraft>(buildCharacterDraft(null));
  const [brandPalette, setBrandPalette] = useState<string[]>([]);
  const [roomShellZones, setRoomShellZones] = useState<Array<{ id: string; label: string }>>([]);
  const [customColor, setCustomColor] = useState({ hue: 25, saturation: 40, lightness: 70 });
  const [roughness, setRoughness] = useState(0.8);
  const [metalness, setMetalness] = useState(0);

  const actors = useMemo(() => nodes.filter(isCharacterNode), [nodes]);
  const selectedCharacterNode = useMemo(
    () => actors.find((actor) => actor.id === selectedActor) || null,
    [actors, selectedActor],
  );
  const selectedCatalogEntry = useMemo(
    () => CHARACTER_CATALOG.find((entry) => entry.id === characterDraft.characterCatalogId) || null,
    [characterDraft.characterCatalogId],
  );
  const wardrobeVariantOptions = selectedCatalogEntry?.wardrobeVariants || [];

  useEffect(() => {
    if (!selectedCharacterNode) {
      return;
    }
    setCharacterDraft(buildCharacterDraft(selectedCharacterNode));
  }, [selectedCharacterNode]);

  useEffect(() => {
    if (wardrobeVariantOptions.length === 0) {
      return;
    }
    if (!wardrobeVariantOptions.includes(characterDraft.wardrobeVariantId)) {
      setCharacterDraft((prev) => ({
        ...prev,
        wardrobeVariantId: wardrobeVariantOptions[0],
      }));
    }
  }, [characterDraft.wardrobeVariantId, wardrobeVariantOptions]);

  useEffect(() => {
    if (!selectedActor && actors.length > 0) {
      setSelectedActor(actors[0].id);
    }
  }, [actors, selectedActor]);

  useEffect(() => {
    const handleSceneSelectionSync = (event: Event) => {
      const detail = (event as CustomEvent).detail?.selection || {};
      const nextId = (detail.selectedActorId || detail.selectedNodeId || '') as string;
      if (nextId && actors.some((actor) => actor.id === nextId)) {
        setSelectedActor(nextId);
      }
    };

    const handleEnvironmentDiagnostics = (event: Event) => {
      const palette = (event as CustomEvent).detail?.sceneState?.branding?.palette;
      const zones = (event as CustomEvent).detail?.sceneState?.roomShell?.zones;
      if (Array.isArray(palette)) {
        setBrandPalette(palette.filter((value: unknown): value is string => typeof value === 'string'));
      }
      if (Array.isArray(zones)) {
        setRoomShellZones(zones
          .filter((value: unknown): value is { id: string; label?: string } => typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string')
          .map((zone) => ({
            id: zone.id,
            label: typeof zone.label === 'string' && zone.label.trim().length > 0 ? zone.label : zone.id,
          })));
      }
    };

    const existingPalette = (window as any).__virtualStudioDiagnostics?.environment?.sceneState?.branding?.palette;
    if (Array.isArray(existingPalette)) {
      setBrandPalette(existingPalette.filter((value: unknown): value is string => typeof value === 'string'));
    }
    const existingZones = (window as any).__virtualStudioDiagnostics?.environment?.sceneState?.roomShell?.zones;
    if (Array.isArray(existingZones)) {
      setRoomShellZones(existingZones
        .filter((value: unknown): value is { id: string; label?: string } => typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string')
        .map((zone) => ({
          id: zone.id,
          label: typeof zone.label === 'string' && zone.label.trim().length > 0 ? zone.label : zone.id,
        })));
    }

    window.addEventListener('vs-scene-selection-sync', handleSceneSelectionSync as EventListener);
    window.addEventListener('vs-environment-diagnostics', handleEnvironmentDiagnostics as EventListener);
    return () => {
      window.removeEventListener('vs-scene-selection-sync', handleSceneSelectionSync as EventListener);
      window.removeEventListener('vs-environment-diagnostics', handleEnvironmentDiagnostics as EventListener);
    };
  }, [actors]);

  const getCurrentItems = () => {
    switch (accessoryType) {
      case 'facial':
        return FACIAL_FEATURES_BY_CATEGORY[facialCategory] || [];
      case 'head':
        return HEAD_ACCESSORIES_BY_CATEGORY[headCategory] || [];
      case 'body':
        return BODY_ACCESSORIES_BY_CATEGORY[bodyCategory] || [];
      default:
        return [];
    }
  };

  const handleAddAccessory = (itemId: string) => {
    if (!selectedActor) {
      log.warn('No actor selected');
      return;
    }

    let item;
    let nodeType;
    switch (accessoryType) {
      case 'facial':
        item = FACIAL_FEATURES.find(f => f.id === itemId);
        nodeType = 'facial_feature';
        break;
      case 'head':
        item = HEAD_ACCESSORIES.find(h => h.id === itemId);
        nodeType = 'head_accessory';
        break;
      case 'body':
        item = BODY_ACCESSORIES.find(b => b.id === itemId);
        nodeType = 'body_accessory';
        break;
    }

    if (!item) return;

    addNode({
      id: `${itemId}_${Date.now()}`,
      name: item.name,
      type: 'accessory',
      visible: true,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      userData: {
        accessoryType: nodeType,
        accessoryId: itemId,
        parentActorId: selectedActor,
        color: customColor,
        roughness,
        metalness,
      },
    });

    log.info(`Added ${item.name} to actor`);
  };

  const currentItems = getCurrentItems();

  const handleCharacterDraftChange = <K extends keyof CharacterAppearanceDraft>(
    key: K,
    value: CharacterAppearanceDraft[K],
  ) => {
    setCharacterDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyPaletteColor = (index: 0 | 1, color: string) => {
    if (index === 0) {
      handleCharacterDraftChange('outfitPrimaryColor', color);
      return;
    }
    handleCharacterDraftChange('outfitSecondaryColor', color);
  };

  const handleApplyCharacterChanges = () => {
    if (!selectedActor) {
      return;
    }

    window.dispatchEvent(new CustomEvent('ch-update-character', {
      detail: buildCharacterUpdateDetail(selectedActor, characterDraft),
    }));
  };

  const handleMatchSelectedCharacterToBrand = () => {
    if (!selectedActor || brandPalette.length === 0) {
      return;
    }

    const nextDraft = buildBrandAdjustedDraft(characterDraft, brandPalette);
    setCharacterDraft(nextDraft);
    window.dispatchEvent(new CustomEvent('ch-update-character', {
      detail: buildCharacterUpdateDetail(selectedActor, nextDraft),
    }));
  };

  const handleMatchAllStaffToBrand = () => {
    if (brandPalette.length === 0) {
      return;
    }

    actors
      .filter(isBrandableStaff)
      .forEach((actor) => {
        const nextDraft = buildBrandAdjustedDraft(buildCharacterDraft(actor), brandPalette);
        window.dispatchEvent(new CustomEvent('ch-update-character', {
          detail: buildCharacterUpdateDetail(actor.id, nextDraft),
        }));

        if (actor.id === selectedActor) {
          setCharacterDraft(nextDraft);
        }
      });
  };

  const selectedCharacterUserData = (selectedCharacterNode?.userData || {}) as Record<string, unknown>;

  useEffect(() => {
    const globalWindow = window as Window & {
      __virtualStudioCharacterInspectorTestApi?: CharacterInspectorTestApi;
    };

    globalWindow.__virtualStudioCharacterInspectorTestApi = {
      getState: () => ({
        selectedActor,
        actorIds: actors.map((actor) => actor.id),
        draft: characterDraft,
        visualKind: typeof selectedCharacterUserData.characterVisualKind === 'string'
          ? selectedCharacterUserData.characterVisualKind
          : null,
      }),
      selectCharacter: (nodeId: string) => {
        if (!actors.some((actor) => actor.id === nodeId)) {
          return false;
        }
        setSelectedActor(nodeId);
        return true;
      },
      applyDraftPatch: (patch: Partial<CharacterAppearanceDraft>) => {
        if (!selectedActor) {
          return false;
        }

        const nextDraft: CharacterAppearanceDraft = {
          ...characterDraft,
          ...patch,
        };

        setCharacterDraft(nextDraft);

        window.dispatchEvent(new CustomEvent('ch-update-character', {
          detail: buildCharacterUpdateDetail(selectedActor, nextDraft),
        }));

        return true;
      },
    };

    return () => {
      delete globalWindow.__virtualStudioCharacterInspectorTestApi;
    };
  }, [actors, characterDraft, selectedActor, selectedCharacterUserData.characterVisualKind]);

  return (
    <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <EmojiPeople sx={{ mr: 1 }} />
        <Typography variant="h6">Accessories</Typography>
      </Box>

      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="subtitle1" gutterBottom>
          Valgt karakter
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Her kan du justere AI-lagte karakterer og andre scene-karakterer direkte i scenen.
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Velg karakter</InputLabel>
          <Select
            value={actors.some((actor) => actor.id === selectedActor) ? selectedActor : ''}
            onChange={(e) => setSelectedActor(e.target.value)}
            label="Velg karakter"
            MenuProps={{ sx: { zIndex: 1400 } }}
          >
            {actors.map((actor) => (
              <MenuItem key={actor.id} value={actor.id}>
                {actor.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedCharacterNode ? (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              {typeof selectedCharacterUserData.actorRole === 'string' && (
                <Chip size="small" label={`Rolle: ${selectedCharacterUserData.actorRole}`} />
              )}
              {selectedCharacterUserData.environmentGenerated === true && (
                <Chip size="small" color="secondary" label="AI-lagt til" />
              )}
              {typeof selectedCharacterUserData.wardrobeStyle === 'string' && (
                <Chip size="small" variant="outlined" label={`Antrekk: ${selectedCharacterUserData.wardrobeStyle}`} />
              )}
              {typeof selectedCharacterUserData.wardrobeVariantId === 'string' && selectedCharacterUserData.wardrobeVariantId.length > 0 && (
                <Chip size="small" variant="outlined" label={`Variant: ${selectedCharacterUserData.wardrobeVariantId}`} />
              )}
              {selectedCharacterUserData.characterVisualKind === 'catalog-glb' && (
                <Chip
                  size="small"
                  color="success"
                  data-testid="character-visual-kind-chip"
                  label="Menneske-GLB"
                />
              )}
              {selectedCharacterUserData.characterVisualKind === 'procedural-mannequin' && (
                <Chip
                  size="small"
                  color="warning"
                  data-testid="character-visual-kind-chip"
                  label="Mannequin fallback"
                />
              )}
            </Stack>

            <Grid container spacing={2}>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Visningsnavn"
                  value={characterDraft.name}
                  onChange={(event) => handleCharacterDraftChange('name', event.target.value)}
                  inputProps={{ 'data-testid': 'character-display-name-input' }}
                />
              </Grid>
              <Grid xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Karaktertype</InputLabel>
                  <Select
                    value={characterDraft.characterCatalogId}
                    onChange={(event) => handleCharacterDraftChange('characterCatalogId', event.target.value)}
                    label="Karaktertype"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {CHARACTER_CATALOG.map((entry) => (
                      <MenuItem key={entry.id} value={entry.id}>
                        {entry.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Rolle</InputLabel>
                  <Select
                    value={characterDraft.role}
                    onChange={(event) => handleCharacterDraftChange('role', event.target.value)}
                    label="Rolle"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Antrekk</InputLabel>
                  <Select
                    value={characterDraft.wardrobeStyle}
                    onChange={(event) => handleCharacterDraftChange('wardrobeStyle', event.target.value)}
                    label="Antrekk"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {WARDROBE_STYLE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Uniform-variant</InputLabel>
                  <Select
                    value={characterDraft.wardrobeVariantId}
                    onChange={(event) => handleCharacterDraftChange('wardrobeVariantId', event.target.value)}
                    label="Uniform-variant"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {wardrobeVariantOptions.length === 0 && (
                      <MenuItem value="">
                        Standard
                      </MenuItem>
                    )}
                    {wardrobeVariantOptions.map((variantId) => (
                      <MenuItem key={variantId} value={variantId}>
                        {variantId}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Logo-plassering</InputLabel>
                  <Select
                    value={characterDraft.logoPlacement}
                    onChange={(event) => handleCharacterDraftChange('logoPlacement', event.target.value)}
                    label="Logo-plassering"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {LOGO_PLACEMENT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Action hint"
                  value={characterDraft.actionHint}
                  onChange={(event) => handleCharacterDraftChange('actionHint', event.target.value)}
                  inputProps={{ 'data-testid': 'character-action-hint-input' }}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Wardrobe-notater"
                  value={characterDraft.wardrobeNotes}
                  onChange={(event) => handleCharacterDraftChange('wardrobeNotes', event.target.value)}
                  helperText="Kommaseparert, f.eks. logo, forklé, cap"
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>AI-behavior</InputLabel>
                  <Select
                    value={characterDraft.behaviorType}
                    onChange={(event) => handleCharacterDraftChange('behaviorType', event.target.value)}
                    label="AI-behavior"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {BEHAVIOR_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {characterDraft.behaviorType !== 'none' && (
                <>
                  <Grid xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Hjemmesone</InputLabel>
                      <Select
                        value={characterDraft.behaviorHomeZoneId}
                        onChange={(event) => handleCharacterDraftChange('behaviorHomeZoneId', event.target.value)}
                        label="Hjemmesone"
                        MenuProps={{ sx: { zIndex: 1400 } }}
                      >
                        <MenuItem value="">
                          Ingen
                        </MenuItem>
                        {roomShellZones.map((zone) => (
                          <MenuItem key={zone.id} value={zone.id}>
                            {zone.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Rutesoner"
                      value={characterDraft.behaviorRouteZoneIds}
                      onChange={(event) => handleCharacterDraftChange('behaviorRouteZoneIds', event.target.value)}
                      helperText="Kommaseparert sone-ID-er"
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Se mot</InputLabel>
                      <Select
                        value={characterDraft.behaviorLookAtTarget}
                        onChange={(event) => handleCharacterDraftChange('behaviorLookAtTarget', event.target.value)}
                        label="Se mot"
                        MenuProps={{ sx: { zIndex: 1400 } }}
                      >
                        {BEHAVIOR_LOOK_TARGET_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tempo</InputLabel>
                      <Select
                        value={characterDraft.behaviorPace}
                        onChange={(event) => handleCharacterDraftChange('behaviorPace', event.target.value)}
                        label="Tempo"
                        MenuProps={{ sx: { zIndex: 1400 } }}
                      >
                        {BEHAVIOR_PACE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Radius"
                      type="number"
                      value={characterDraft.behaviorRadius}
                      onChange={(event) => handleCharacterDraftChange('behaviorRadius', Number(event.target.value))}
                      inputProps={{ min: 0.1, max: 6, step: 0.1 }}
                    />
                  </Grid>
                </>
              )}
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Hudtone"
                  type="color"
                  value={characterDraft.skinTone}
                  onChange={(event) => handleCharacterDraftChange('skinTone', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ 'data-testid': 'character-skin-tone-input' }}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Hårfarge"
                  type="color"
                  value={characterDraft.hairColor}
                  onChange={(event) => handleCharacterDraftChange('hairColor', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ 'data-testid': 'character-hair-color-input' }}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Hårstil</InputLabel>
                  <Select
                    value={characterDraft.hairStyle}
                    onChange={(event) => handleCharacterDraftChange('hairStyle', event.target.value)}
                    label="Hårstil"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {HAIR_STYLE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ansiktshår</InputLabel>
                  <Select
                    value={characterDraft.facialHair}
                    onChange={(event) => handleCharacterDraftChange('facialHair', event.target.value)}
                    label="Ansiktshår"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {FACIAL_HAIR_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Aldersuttrykk</InputLabel>
                  <Select
                    value={characterDraft.ageGroup}
                    onChange={(event) => handleCharacterDraftChange('ageGroup', event.target.value)}
                    label="Aldersuttrykk"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {AGE_GROUP_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Kjønnsuttrykk</InputLabel>
                  <Select
                    value={characterDraft.genderPresentation}
                    onChange={(event) => handleCharacterDraftChange('genderPresentation', event.target.value)}
                    label="Kjønnsuttrykk"
                    MenuProps={{ sx: { zIndex: 1400 } }}
                  >
                    {GENDER_PRESENTATION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Primær antrekksfarge"
                  type="color"
                  value={characterDraft.outfitPrimaryColor}
                  onChange={(event) => handleCharacterDraftChange('outfitPrimaryColor', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ 'data-testid': 'character-outfit-primary-input' }}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Sekundær antrekksfarge"
                  type="color"
                  value={characterDraft.outfitSecondaryColor}
                  onChange={(event) => handleCharacterDraftChange('outfitSecondaryColor', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ 'data-testid': 'character-outfit-secondary-input' }}
                />
              </Grid>
            </Grid>

            {brandPalette.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Brand-palett fra aktiv scene
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {brandPalette.map((color) => (
                    <Button
                      key={color}
                      size="small"
                      variant="outlined"
                      onClick={() => applyPaletteColor(0, color)}
                      sx={{ color, borderColor: color }}
                    >
                      {color}
                    </Button>
                  ))}
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleMatchSelectedCharacterToBrand}
                  >
                    Match valgt uniform med brand
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleMatchAllStaffToBrand}
                  >
                    Match alle ansatte
                  </Button>
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleApplyCharacterChanges}
                data-testid="character-apply-button"
              >
                Oppdater karakter
              </Button>
              <Button
                variant="outlined"
                onClick={() => selectedCharacterNode && setCharacterDraft(buildCharacterDraft(selectedCharacterNode))}
              >
                Tilbakestill fra scene
              </Button>
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Velg en scene-karakter for å redigere hudtone, hår, antrekk og branding.
          </Typography>
        )}
      </Box>

      {/* Actor Selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Actor</InputLabel>
        <Select
          value={selectedActor}
          onChange={(e) => setSelectedActor(e.target.value)}
          label="Select Actor"
          MenuProps={{ sx: { zIndex: 1400 } }}
        >
          {actors.map((actor) => (
            <MenuItem key={actor.id} value={actor.id}>
              {actor.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Accessory Type Toggle */}
      <ToggleButtonGroup
        value={accessoryType}
        exclusive
        onChange={(_, newValue) => newValue && setAccessoryType(newValue)}
        fullWidth
        sx={{ mb: 2 }}
      >
        <ToggleButton value="facial">
          <Face sx={{ mr: 1 }} />
          Facial
        </ToggleButton>
        <ToggleButton value="head">
          <EmojiPeople sx={{ mr: 1 }} />
          Head
        </ToggleButton>
        <ToggleButton value="body">
          <Watch sx={{ mr: 1 }} />
          Body
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Category Tabs */}
      {accessoryType === 'facial' && (
        <Tabs
          value={facialCategory}
          onChange={(_, newValue) => setFacialCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {FACIAL_CATEGORIES.map((cat) => (
            <Tab key={cat.value} label={cat.label} value={cat.value} />
          ))}
        </Tabs>
      )}
      {accessoryType === 'head' && (
        <Tabs
          value={headCategory}
          onChange={(_, newValue) => setHeadCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {HEAD_CATEGORIES.map((cat) => (
            <Tab key={cat.value} label={cat.label} value={cat.value} />
          ))}
        </Tabs>
      )}
      {accessoryType === 'body' && (
        <Tabs
          value={bodyCategory}
          onChange={(_, newValue) => setBodyCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {BODY_CATEGORIES.map((cat) => (
            <Tab key={cat.value} label={cat.label} value={cat.value} />
          ))}
        </Tabs>
      )}

      {/* Color Customization */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Color (HSL)
        </Typography>
        <Box sx={{ px: 1 }}>
          <Typography variant="caption">Hue: {customColor.hue}°</Typography>
          <Slider
            value={customColor.hue}
            onChange={(_, v) => setCustomColor({ ...customColor, hue: v as number })}
            min={0}
            max={360}
            size="small"
          />
          <Typography variant="caption">Saturation: {customColor.saturation}%</Typography>
          <Slider
            value={customColor.saturation}
            onChange={(_, v) => setCustomColor({ ...customColor, saturation: v as number })}
            min={0}
            max={100}
            size="small"
          />
          <Typography variant="caption">Lightness: {customColor.lightness}%</Typography>
          <Slider
            value={customColor.lightness}
            onChange={(_, v) => setCustomColor({ ...customColor, lightness: v as number })}
            min={0}
            max={100}
            size="small"
          />
        </Box>
      </Box>

      {/* Material Customization */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Material
        </Typography>
        <Box sx={{ px: 1 }}>
          <Typography variant="caption">Roughness: {roughness.toFixed(2)}</Typography>
          <Slider
            value={roughness}
            onChange={(_, v) => setRoughness(v as number)}
            min={0}
            max={1}
            step={0.01}
            size="small"
          />
          <Typography variant="caption">Metalness: {metalness.toFixed(2)}</Typography>
          <Slider
            value={metalness}
            onChange={(_, v) => setMetalness(v as number)}
            min={0}
            max={1}
            step={0.01}
            size="small"
          />
        </Box>
      </Box>

      {/* Items Grid */}
      <Grid container spacing={2}>
        {currentItems.map((item) => (
          <Grid xs={12} sm={6} key={item.id}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {item.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {item.tags.slice(0, 3).map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
                {item.gender && (
                  <Typography variant="caption" color="text.secondary">
                    {item.gender}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => handleAddAccessory(item.id)}
                  disabled={!selectedActor}
                >
                  Add
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};
