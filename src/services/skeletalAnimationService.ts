/**
 * Skeletal Animation Service
 * Full character rigging, IK/FK, motion capture, and blend shapes support
 * With integrated animation-driven material controller
 */

import * as BABYLON from '@babylonjs/core';
import { create } from 'zustand';
import { AnimationMaterialController } from './animationMaterialController';
import { getActivityTypeFromAnimation } from '../data/activityProfiles';
import { detectEmotionFromBlendShapes } from '../data/emotionPresets';

// Animation types
export interface BoneData {
  name: string;
  index: number;
  parentIndex: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
}

export interface AnimationClip {
  id: string;
  name: string;
  duration: number;
  frameRate: number;
  loop: boolean;
  tracks: AnimationTrack[];
}

export interface AnimationTrack {
  boneName: string;
  property: 'position' | 'rotation' | 'scale';
  keyframes: AnimationKeyframe[];
}

export interface AnimationKeyframe {
  time: number;
  value: number[];
  inTangent?: number[];
  outTangent?: number[];
  interpolation: 'linear' | 'step' | 'cubic';
}

export interface BlendShape {
  name: string;
  weight: number;
  targetIndex: number;
}

export interface IKTarget {
  chainName: string;
  targetPosition: { x: number; y: number; z: number };
  polePosition?: { x: number; y: number; z: number };
  enabled: boolean;
  iterations: number;
}

export interface CharacterRig {
  id: string;
  name: string;
  skeleton: BABYLON.Skeleton | null;
  mesh: BABYLON.AbstractMesh | null;
  restBoneRotations: Map<string, BABYLON.Quaternion>;
  animations: Map<string, AnimationClip>;
  blendShapes: Map<string, BlendShape>;
  ikTargets: Map<string, IKTarget>;
  currentAnimation: string | null;
  animationWeight: number;
  blendTime: number;
}

export interface SkeletalAnimationState {
  // Rigs
  rigs: Map<string, CharacterRig>;
  activeRigId: string | null;
  
  // Playback
  isPlaying: boolean;
  playbackSpeed: number;
  currentTime: number;
  
  // IK
  ikEnabled: boolean;
  
  // Animation-Material Integration
  materialController: AnimationMaterialController | null;
  animationMaterialIntegration: boolean;
  
  // Blend shapes
  blendShapePresets: Map<string, Map<string, number>>;
  
  // Actions
  loadRig: (mesh: BABYLON.AbstractMesh, name?: string) => Promise<string>;
  unloadRig: (rigId: string) => void;
  setActiveRig: (rigId: string) => void;
  initializeMaterialController: (scene: BABYLON.Scene) => void;
  
  // Animation control
  playAnimation: (rigId: string, animationName: string, loop?: boolean, blendTime?: number) => void;
  stopAnimation: (rigId: string) => void;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  setPlaybackSpeed: (speed: number) => void;
  seekTo: (time: number) => void;
  
  // Animation blending
  crossfade: (rigId: string, toAnimation: string, duration: number) => void;
  setAnimationWeight: (rigId: string, weight: number) => void;
  
  // Bone manipulation
  setBoneRotation: (rigId: string, boneName: string, rotation: { x: number; y: number; z: number }) => void;
  setBonePosition: (rigId: string, boneName: string, position: { x: number; y: number; z: number }) => void;
  resetBone: (rigId: string, boneName: string) => void;
  resetAllBones: (rigId: string) => void;
  
  // IK
  setIKTarget: (rigId: string, chainName: string, target: Partial<IKTarget>) => void;
  enableIK: (rigId: string, chainName: string, enabled: boolean) => void;
  
  // Blend shapes
  setBlendShapeWeight: (rigId: string, shapeName: string, weight: number) => void;
  applyBlendShapePreset: (rigId: string, presetName: string) => void;
  saveBlendShapePreset: (rigId: string, presetName: string) => void;
  
  // Animation-Material Integration
  applyExertionEffects: (rigId: string, intensity: number) => void;
  applyFacialExpression: (rigId: string, emotion: string, intensity?: number) => void;
  resetMaterialEffects: (rigId: string) => void;
  
  // Import/Export
  importAnimation: (rigId: string, file: File) => Promise<void>;
  exportAnimation: (rigId: string, animationName: string) => Promise<Blob>;
  importMocapData: (rigId: string, data: any, format: 'bvh' | 'fbx' | 'json') => Promise<void>;
}

// Generate unique ID
const generateId = () => `rig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Standard humanoid bone mapping
const HUMANOID_BONE_MAP: Record<string, string[]> = {
  'hips': [
    'Hips', 'pelvis', 'hip', 'root', 'mixamorigHips',
    'torso_joint_1', 'Skeleton_torso_joint_1'
  ],
  'spine': [
    'Spine', 'spine1', 'torso', 'mixamorigSpine',
    'torso_joint_1', 'torso_joint_2', 'Skeleton_torso_joint_1', 'Skeleton_torso_joint_2'
  ],
  'chest': [
    'Spine1', 'Spine2', 'chest', 'upper_torso', 'mixamorigSpine1', 'mixamorigSpine2',
    'torso_joint_2', 'torso_joint_3', 'Skeleton_torso_joint_2', 'Skeleton_torso_joint_3'
  ],
  'neck': [
    'Neck', 'neck', 'mixamorigNeck',
    'neck_joint_1', 'Skeleton_neck_joint_1'
  ],
  'head': [
    'Head', 'head', 'mixamorigHead',
    'neck_joint_2', 'Skeleton_neck_joint_2'
  ],
  'leftShoulder': ['LeftShoulder', 'shoulder_L', 'L_shoulder', 'mixamorigLeftShoulder'],
  'leftUpperArm': [
    'LeftArm', 'upperarm_L', 'L_upperarm', 'mixamorigLeftArm',
    'arm_joint_L_4', 'Skeleton_arm_joint_L__4_'
  ],
  'leftLowerArm': [
    'LeftForeArm', 'forearm_L', 'L_forearm', 'mixamorigLeftForeArm',
    'arm_joint_L_3', 'Skeleton_arm_joint_L__3_'
  ],
  'leftHand': [
    'LeftHand', 'hand_L', 'L_hand', 'mixamorigLeftHand',
    'arm_joint_L_2', 'Skeleton_arm_joint_L__2_'
  ],
  'rightShoulder': ['RightShoulder', 'shoulder_R', 'R_shoulder', 'mixamorigRightShoulder'],
  'rightUpperArm': [
    'RightArm', 'upperarm_R', 'R_upperarm', 'mixamorigRightArm',
    'arm_joint_R', 'Skeleton_arm_joint_R'
  ],
  'rightLowerArm': [
    'RightForeArm', 'forearm_R', 'R_forearm', 'mixamorigRightForeArm',
    'arm_joint_R_2', 'Skeleton_arm_joint_R__2_'
  ],
  'rightHand': [
    'RightHand', 'hand_R', 'R_hand', 'mixamorigRightHand',
    'arm_joint_R_3', 'Skeleton_arm_joint_R__3_'
  ],
  'leftUpperLeg': [
    'LeftUpLeg', 'thigh_L', 'L_thigh', 'mixamorigLeftUpLeg',
    'leg_joint_L_1', 'Skeleton_leg_joint_L_1'
  ],
  'leftLowerLeg': [
    'LeftLeg', 'calf_L', 'L_calf', 'shin_L', 'mixamorigLeftLeg',
    'leg_joint_L_2', 'leg_joint_L_3', 'Skeleton_leg_joint_L_2', 'Skeleton_leg_joint_L_3'
  ],
  'leftFoot': [
    'LeftFoot', 'foot_L', 'L_foot', 'mixamorigLeftFoot',
    'leg_joint_L_5', 'Skeleton_leg_joint_L_5'
  ],
  'rightUpperLeg': [
    'RightUpLeg', 'thigh_R', 'R_thigh', 'mixamorigRightUpLeg',
    'leg_joint_R_1', 'Skeleton_leg_joint_R_1'
  ],
  'rightLowerLeg': [
    'RightLeg', 'calf_R', 'R_calf', 'shin_R', 'mixamorigRightLeg',
    'leg_joint_R_2', 'leg_joint_R_3', 'Skeleton_leg_joint_R_2', 'Skeleton_leg_joint_R_3'
  ],
  'rightFoot': [
    'RightFoot', 'foot_R', 'R_foot', 'mixamorigRightFoot',
    'leg_joint_R_5', 'Skeleton_leg_joint_R_5'
  ]
};

const normalizeBoneToken = (value: string): string => value.trim().toLowerCase();
const compactBoneToken = (value: string): string => normalizeBoneToken(value).replace(/[^a-z0-9]/g, '');
const expandCompactSideVariants = (token: string): string[] => {
  const variants = new Set<string>([token]);
  if (!token) return Array.from(variants);

  if (token.startsWith('left')) variants.add(token.replace(/^left/, 'l'));
  if (token.startsWith('right')) variants.add(token.replace(/^right/, 'r'));
  if (token.endsWith('left')) variants.add(token.replace(/left$/, 'l'));
  if (token.endsWith('right')) variants.add(token.replace(/right$/, 'r'));

  if (token.startsWith('l') && token.length > 1) variants.add(`${token.slice(1)}l`);
  if (token.startsWith('r') && token.length > 1) variants.add(`${token.slice(1)}r`);
  if (token.endsWith('l') && token.length > 1) variants.add(`l${token.slice(0, -1)}`);
  if (token.endsWith('r') && token.length > 1) variants.add(`r${token.slice(0, -1)}`);

  if (token.includes('left')) {
    variants.add(token.replace(/left/g, 'l'));
    variants.add(token.replace(/left/g, ''));
  }
  if (token.includes('right')) {
    variants.add(token.replace(/right/g, 'r'));
    variants.add(token.replace(/right/g, ''));
  }

  return Array.from(variants).filter((value) => value.length > 0);
};

const stripBoneNamespace = (value: string): string => {
  const pathTrimmed = value.split('/').pop() || value;
  const pipeTrimmed = pathTrimmed.split('|').pop() || pathTrimmed;
  return pipeTrimmed.split(':').pop() || pipeTrimmed;
};

const getBoneLinkedTransformNode = (bone: BABYLON.Bone): BABYLON.TransformNode | null => {
  const withGetter = bone as BABYLON.Bone & { getTransformNode?: () => BABYLON.TransformNode | null };
  const withPrivate = bone as BABYLON.Bone & { _linkedTransformNode?: BABYLON.TransformNode | null };
  return withGetter.getTransformNode?.() || withPrivate._linkedTransformNode || null;
};

// IK Chain definitions
const IK_CHAINS: Record<string, { bones: string[]; poleAngle: number }> = {
  'leftArm': { bones: ['leftUpperArm', 'leftLowerArm', 'leftHand'], poleAngle: -90 },
  'rightArm': { bones: ['rightUpperArm', 'rightLowerArm', 'rightHand'], poleAngle: 90 },
  'leftLeg': { bones: ['leftUpperLeg', 'leftLowerLeg', 'leftFoot'], poleAngle: 0 },
  'rightLeg': { bones: ['rightUpperLeg', 'rightLowerLeg', 'rightFoot'], poleAngle: 0 }
};

// Exported preset reference for UI panels
export const BLEND_SHAPE_PRESETS: Record<string, Record<string, number>> = {
  neutral: {},
  smile: { mouthSmile: 1.0, eyeSquint: 0.3 },
  sad: { mouthFrown: 0.8, browDown: 0.5 },
  angry: { browDown: 1.0, mouthFrown: 0.5, eyeSquint: 0.4 },
  surprised: { browUp: 1.0, mouthOpen: 0.7, eyeWide: 0.8 }
};

const resolveBoneName = (skeleton: BABYLON.Skeleton, boneName: string): string | null => {
  const aliases = HUMANOID_BONE_MAP[boneName] || [];
  const searchTokens = new Set<string>();
  const compactSearchTokens = new Set<string>();

  [boneName, ...aliases].forEach((token) => {
    const normalized = normalizeBoneToken(token);
    searchTokens.add(normalized);
    searchTokens.add(normalizeBoneToken(stripBoneNamespace(token)));

    const compact = compactBoneToken(token);
    const compactStripped = compactBoneToken(stripBoneNamespace(token));
    expandCompactSideVariants(compact).forEach((variant) => compactSearchTokens.add(variant));
    expandCompactSideVariants(compactStripped).forEach((variant) => compactSearchTokens.add(variant));
  });

  const exactMatch = skeleton.bones.find((bone) => {
    const boneNormalized = normalizeBoneToken(bone.name);
    if (searchTokens.has(boneNormalized)) return true;

    const stripped = normalizeBoneToken(stripBoneNamespace(bone.name));
    return searchTokens.has(stripped);
  });

  if (exactMatch?.name) {
    return exactMatch.name;
  }

  const tokens = Array.from(searchTokens);
  const suffixMatch = skeleton.bones.find((bone) => {
    const boneNormalized = normalizeBoneToken(bone.name);
    const stripped = normalizeBoneToken(stripBoneNamespace(bone.name));
    return tokens.some((token) => boneNormalized.endsWith(token) || stripped.endsWith(token));
  });
  if (suffixMatch?.name) {
    return suffixMatch.name;
  }

  const compactTokens = Array.from(compactSearchTokens).filter((token) => token.length >= 4);
  const containsMatch = skeleton.bones.find((bone) => {
    const compactBoneName = compactBoneToken(bone.name);
    const compactStripped = compactBoneToken(stripBoneNamespace(bone.name));
    return compactTokens.some((token) => compactBoneName.includes(token) || compactStripped.includes(token));
  });

  return containsMatch?.name || null;
};

const getExertionIntensityForActivity = (activityType: ReturnType<typeof getActivityTypeFromAnimation>): number => {
  switch (activityType) {
    case 'run':
      return 0.75;
    case 'athletic':
      return 0.6;
    case 'walk':
      return 0.3;
    case 'combat':
      return 0.9;
    case 'idle':
    default:
      return 0.1;
  }
};

export const useSkeletalAnimationStore = create<SkeletalAnimationState>((set, get) => ({
  // Initial state
  rigs: new Map(),
  activeRigId: null,
  isPlaying: false,
  playbackSpeed: 1.0,
  currentTime: 0,
  ikEnabled: true,
  materialController: null,
  animationMaterialIntegration: false,
  blendShapePresets: new Map([
    ['neutral', new Map()],
    ['smile', new Map([['mouthSmile', 1.0], ['eyeSquint', 0.3]])],
    ['sad', new Map([['mouthFrown', 0.8], ['browDown', 0.5]])],
    ['angry', new Map([['browDown', 1.0], ['mouthFrown', 0.5], ['eyeSquint', 0.4]])],
    ['surprised', new Map([['browUp', 1.0], ['mouthOpen', 0.7], ['eyeWide', 0.8]])]
  ]),
  
  initializeMaterialController: (scene: BABYLON.Scene): void => {
    const controller = new AnimationMaterialController(scene);
    set({ materialController: controller, animationMaterialIntegration: true });
  },
  
  loadRig: async (mesh: BABYLON.AbstractMesh, name?: string): Promise<string> => {
    const rigId = generateId();
    const skeleton = mesh.skeleton;
    
    if (!skeleton) {
      throw new Error('Mesh does not have a skeleton');
    }
    
    // Extract animations from skeleton
    const animations = new Map<string, AnimationClip>();
    
    if (skeleton.getAnimationRanges().length > 0) {
      skeleton.getAnimationRanges().forEach((range) => {
        if (range) {
          const clip: AnimationClip = {
            id: `anim_${range.name}`,
            name: range.name,
            duration: (range.to - range.from) / 30, // Assuming 30fps
            frameRate: 30,
            loop: true,
            tracks: []
          };
          animations.set(range.name, clip);
        }
      });
    }
    
    // Extract blend shapes (morph targets)
    const blendShapes = new Map<string, BlendShape>();
    
    if (mesh instanceof BABYLON.Mesh && mesh.morphTargetManager) {
      for (let i = 0; i < mesh.morphTargetManager.numTargets; i++) {
        const target = mesh.morphTargetManager.getTarget(i);
        blendShapes.set(target.name, {
          name: target.name,
          weight: target.influence,
          targetIndex: i
        });
      }
    }
    
    // Setup IK targets
    const ikTargets = new Map<string, IKTarget>();
    
    Object.keys(IK_CHAINS).forEach((chainName) => {
      ikTargets.set(chainName, {
        chainName,
        targetPosition: { x: 0, y: 0, z: 0 },
        enabled: false,
        iterations: 10
      });
    });

    const restBoneRotations = new Map<string, BABYLON.Quaternion>();
    skeleton.bones.forEach((bone) => {
      const linkedNode = getBoneLinkedTransformNode(bone);
      if (linkedNode) {
        if (linkedNode.rotationQuaternion) {
          restBoneRotations.set(bone.name, linkedNode.rotationQuaternion.clone());
        } else {
          restBoneRotations.set(
            bone.name,
            BABYLON.Quaternion.FromEulerAngles(
              linkedNode.rotation.x,
              linkedNode.rotation.y,
              linkedNode.rotation.z
            )
          );
        }
        return;
      }

      if (bone.rotationQuaternion) {
        restBoneRotations.set(bone.name, bone.rotationQuaternion.clone());
        return;
      }

      restBoneRotations.set(
        bone.name,
        BABYLON.Quaternion.FromEulerAngles(
          bone.rotation?.x ?? 0,
          bone.rotation?.y ?? 0,
          bone.rotation?.z ?? 0
        )
      );
    });
    
    const rig: CharacterRig = {
      id: rigId,
      name: name || mesh.name || 'Unnamed Rig',
      skeleton,
      mesh,
      restBoneRotations,
      animations,
      blendShapes,
      ikTargets,
      currentAnimation: null,
      animationWeight: 1.0,
      blendTime: 0.3
    };
    
    set((state) => {
      const newRigs = new Map(state.rigs);
      newRigs.set(rigId, rig);
      return { rigs: newRigs, activeRigId: rigId };
    });
    
    return rigId;
  },
  
  unloadRig: (rigId: string) => {
    const { materialController } = get();
    if (materialController) {
      materialController.unregisterRig(rigId);
    }
    
    set((state) => {
      const newRigs = new Map(state.rigs);
      newRigs.delete(rigId);
      return {
        rigs: newRigs,
        activeRigId: state.activeRigId === rigId ? null : state.activeRigId
      };
    });
  },
  
  setActiveRig: (rigId: string) => {
    set({ activeRigId: rigId });
  },
  
  playAnimation: (rigId: string, animationName: string, loop = true, blendTime = 0.3) => {
    const { rigs, materialController } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) return;
    
    const scene = rig.skeleton.getScene();
    
    // Stop current animation
    scene.stopAnimation(rig.skeleton);
    
    // Play new animation
    const animRange = rig.skeleton.getAnimationRange(animationName);
    if (animRange) {
      scene.beginAnimation(
        rig.skeleton,
        animRange.from,
        animRange.to,
        loop,
        get().playbackSpeed
      );
      
      // Apply animation-driven material effects
      if (materialController && rig.mesh) {
        const activityType = getActivityTypeFromAnimation(animationName);
        const intensity = getExertionIntensityForActivity(activityType);
        get().applyExertionEffects(rigId, intensity);
      }
      
      set((state) => {
        const newRigs = new Map(state.rigs);
        const updatedRig = { ...rig, currentAnimation: animationName, blendTime };
        newRigs.set(rigId, updatedRig);
        return { rigs: newRigs, isPlaying: true };
      });
    }
  },
  
  stopAnimation: (rigId: string) => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) return;
    
    const scene = rig.skeleton.getScene();
    scene.stopAnimation(rig.skeleton);
    
    set((state) => {
      const newRigs = new Map(state.rigs);
      const updatedRig = { ...rig, currentAnimation: null };
      newRigs.set(rigId, updatedRig);
      return { rigs: newRigs, isPlaying: false };
    });
  },
  
  pauseAnimation: () => {
    set({ isPlaying: false });
  },
  
  resumeAnimation: () => {
    set({ isPlaying: true });
  },
  
  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
  },
  
  seekTo: (time: number) => {
    set({ currentTime: time });
  },
  
  crossfade: (rigId: string, toAnimation: string, duration: number) => {
    const { rigs, playAnimation } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) return;
    
    // Simple crossfade implementation
    playAnimation(rigId, toAnimation, true, duration);
  },
  
  setAnimationWeight: (rigId: string, weight: number) => {
    set((state) => {
      const newRigs = new Map(state.rigs);
      const rig = newRigs.get(rigId);
      if (rig) {
        newRigs.set(rigId, { ...rig, animationWeight: weight });
      }
      return { rigs: newRigs };
    });
  },
  
  setBoneRotation: (rigId: string, boneName: string, rotation: { x: number; y: number; z: number }) => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) return;
    
    const resolvedName = resolveBoneName(rig.skeleton, boneName);
    const bone = resolvedName ? rig.skeleton.bones.find(b => b.name === resolvedName) : null;
    if (bone) {
      const baseRotation = rig.restBoneRotations.get(bone.name) || BABYLON.Quaternion.Identity();
      const deltaRotation = BABYLON.Quaternion.FromEulerAngles(rotation.x, rotation.y, rotation.z);
      const targetRotation = baseRotation.multiply(deltaRotation);
      const linkedNode = getBoneLinkedTransformNode(bone);

      if (linkedNode) {
        if (!linkedNode.rotationQuaternion) {
          linkedNode.rotationQuaternion = BABYLON.Quaternion.Identity();
        }
        linkedNode.rotationQuaternion.copyFrom(targetRotation);
        linkedNode.computeWorldMatrix(true);
      } else if (bone.rotationQuaternion) {
        bone.setRotationQuaternion(targetRotation);
      } else {
        bone.setRotation(targetRotation.toEulerAngles());
      }
    }
  },
  
  setBonePosition: (rigId: string, boneName: string, position: { x: number; y: number; z: number }) => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) return;
    
    const resolvedName = resolveBoneName(rig.skeleton, boneName);
    const bone = resolvedName ? rig.skeleton.bones.find(b => b.name === resolvedName) : null;
    if (bone) {
      const linkedNode = getBoneLinkedTransformNode(bone);
      if (linkedNode) {
        linkedNode.position.set(position.x, position.y, position.z);
        linkedNode.computeWorldMatrix(true);
      } else {
        bone.setPosition(new BABYLON.Vector3(position.x, position.y, position.z));
      }
    }
  },
  
  resetBone: (rigId: string, boneName: string) => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) return;
    
    const resolvedName = resolveBoneName(rig.skeleton, boneName);
    const bone = resolvedName ? rig.skeleton.bones.find(b => b.name === resolvedName) : null;
    if (bone) {
      const linkedNode = getBoneLinkedTransformNode(bone);
      const restRotation = rig.restBoneRotations.get(bone.name);
      if (linkedNode && restRotation) {
        if (!linkedNode.rotationQuaternion) {
          linkedNode.rotationQuaternion = BABYLON.Quaternion.Identity();
        }
        linkedNode.rotationQuaternion.copyFrom(restRotation);
        linkedNode.computeWorldMatrix(true);
      }
      bone.returnToRest();
    }
  },
  
  resetAllBones: (rigId: string) => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) return;
    
    rig.skeleton.returnToRest();
    rig.skeleton.bones.forEach((bone) => {
      const restRotation = rig.restBoneRotations.get(bone.name);
      if (!restRotation) return;
      const linkedNode = getBoneLinkedTransformNode(bone);
      if (!linkedNode) return;
      if (!linkedNode.rotationQuaternion) {
        linkedNode.rotationQuaternion = BABYLON.Quaternion.Identity();
      }
      linkedNode.rotationQuaternion.copyFrom(restRotation);
      linkedNode.computeWorldMatrix(true);
    });
  },
  
  setIKTarget: (rigId: string, chainName: string, target: Partial<IKTarget>) => {
    set((state) => {
      const newRigs = new Map(state.rigs);
      const rig = newRigs.get(rigId);
      if (rig) {
        const ikTargets = new Map(rig.ikTargets);
        const existing = ikTargets.get(chainName) || {
          chainName,
          targetPosition: { x: 0, y: 0, z: 0 },
          enabled: false,
          iterations: 10
        };
        ikTargets.set(chainName, { ...existing, ...target });
        newRigs.set(rigId, { ...rig, ikTargets });
      }
      return { rigs: newRigs };
    });
  },
  
  enableIK: (rigId: string, chainName: string, enabled: boolean) => {
    const { setIKTarget } = get();
    setIKTarget(rigId, chainName, { enabled });
  },
  
  setBlendShapeWeight: (rigId: string, shapeName: string, weight: number) => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.mesh || !(rig.mesh instanceof BABYLON.Mesh)) return;
    
    const morphManager = rig.mesh.morphTargetManager;
    if (!morphManager) return;
    
    for (let i = 0; i < morphManager.numTargets; i++) {
      const target = morphManager.getTarget(i);
      if (target.name === shapeName) {
        target.influence = Math.max(0, Math.min(1, weight));
        
        set((state) => {
          const newRigs = new Map(state.rigs);
          const currentRig = newRigs.get(rigId);
          if (currentRig) {
            const blendShapes = new Map(currentRig.blendShapes);
            const shape = blendShapes.get(shapeName);
            if (shape) {
              blendShapes.set(shapeName, { ...shape, weight });
            }
            newRigs.set(rigId, { ...currentRig, blendShapes });
          }
          return { rigs: newRigs };
        });
        break;
      }
    }
  },
  
  applyBlendShapePreset: (rigId: string, presetName: string) => {
    const { blendShapePresets, setBlendShapeWeight, rigs, materialController } = get();
    const preset = blendShapePresets.get(presetName);
    const rig = rigs.get(rigId);
    
    if (!preset || !rig) return;
    
    // Reset all blend shapes to 0
    rig.blendShapes.forEach((_, shapeName) => {
      setBlendShapeWeight(rigId, shapeName, 0);
    });
    
    // Apply preset weights
    preset.forEach((weight, shapeName) => {
      setBlendShapeWeight(rigId, shapeName, weight);
    });
    
    // Apply emotion-based material changes if available
    if (materialController) {
      const weights = new Map<string, number>();
      rig.blendShapes.forEach((shape) => {
        weights.set(shape.name, shape.weight);
      });

      const allowedEmotions = ['neutral', 'happy', 'sad', 'angry', 'surprised'] as const;
      if (allowedEmotions.includes(presetName as typeof allowedEmotions[number])) {
        materialController.applyFacialExpression(rigId, presetName as typeof allowedEmotions[number]);
      } else {
        const inferred = detectEmotionFromBlendShapes(weights);
        if (inferred.emotion) {
          materialController.applyFacialExpression(rigId, inferred.emotion as any, inferred.confidence);
        }
      }
    }
  },
  
  saveBlendShapePreset: (rigId: string, presetName: string) => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig) return;
    
    const weights = new Map<string, number>();
    rig.blendShapes.forEach((shape) => {
      weights.set(shape.name, shape.weight);
    });
    
    set((state) => {
      const newPresets = new Map(state.blendShapePresets);
      newPresets.set(presetName, weights);
      return { blendShapePresets: newPresets };
    });
  },
  
  // Animation-Material Integration Methods
  applyExertionEffects: (rigId: string, intensity: number) => {
    const { materialController, rigs } = get();
    if (!materialController) return;
    
    const rig = rigs.get(rigId);
    if (rig) {
      materialController.registerRig(rig);
      materialController.setInterpolationDuration(Math.max(0.15, 0.5 - intensity * 0.3));
      materialController.update(rigId, 1 / 60);
    }
  },
  
  applyFacialExpression: (rigId: string, emotion: string, intensity: number = 0.7) => {
    const { materialController } = get();
    if (!materialController) return;
    
    materialController.applyFacialExpression(
      rigId,
      emotion as 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'custom',
      intensity
    );
  },
  
  resetMaterialEffects: (rigId: string) => {
    const { materialController } = get();
    if (!materialController) return;
    
    materialController.resetMaterials(rigId);
  },
  
  importAnimation: async (rigId: string, file: File) => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) return;
    
    // Load animation from file
    const scene = rig.skeleton.getScene();
    const url = URL.createObjectURL(file);
    
    try {
      const result = await BABYLON.SceneLoader.ImportAnimationsAsync(
        '',
        url,
        scene,
        false
      );
      
      if (result.animationGroups?.length) {
        result.animationGroups.forEach(group => {
          const duration = (group.to - group.from) / (group.speedRatio || 1);
          rig.animations.set(group.name, {
            id: `anim_${group.name}`,
            name: group.name,
            duration,
            frameRate: 30,
            loop: true,
            tracks: []
          });
          group.stop();
        });
      }
      console.log('Animation imported successfully');
    } finally {
      URL.revokeObjectURL(url);
    }
  },
  
  exportAnimation: async (rigId: string, animationName: string): Promise<Blob> => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) throw new Error('No rig found');
    
    // Export animation data as JSON
    const animRange = rig.skeleton.getAnimationRange(animationName);
    if (!animRange) throw new Error('Animation not found');
    
    const exportData = {
      name: animationName,
      frameRate: 30,
      startFrame: animRange.from,
      endFrame: animRange.to,
      bones: rig.skeleton.bones.map(bone => ({
        name: bone.name,
        animations: bone.animations?.map(anim => ({
          property: anim.targetProperty,
          keys: anim.getKeys()
        })) || []
      }))
    };
    
    return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  },
  
  importMocapData: async (rigId: string, data: any, format: 'bvh' | 'fbx' | 'json') => {
    const { rigs } = get();
    const rig = rigs.get(rigId);
    
    if (!rig?.skeleton) return;
    
    // Parse mocap data based on format
    if (format === 'bvh') {
      // BVH parsing logic
      console.log('BVH mocap import not yet implemented');
    } else if (format === 'json') {
      // JSON mocap data
      if (data.frames && Array.isArray(data.frames)) {
        // Create animation from mocap frames
        const animationName = data.name || 'mocap_import';
        
        rig.skeleton.bones.forEach((bone) => {
          const boneData = data.bones?.find((b: any) => b.name === bone.name);
          if (!boneData) return;
          
          const rotationAnimation = new BABYLON.Animation(
            `${animationName}_${bone.name}_rotation`,
            'rotation',
            data.frameRate || 30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          
          const keys: { frame: number; value: BABYLON.Vector3 }[] = [];
          
          data.frames.forEach((frame: any, idx: number) => {
            const boneFrame = frame.bones?.find((b: any) => b.name === bone.name);
            if (boneFrame?.rotation) {
              keys.push({
                frame: idx,
                value: new BABYLON.Vector3(
                  boneFrame.rotation.x,
                  boneFrame.rotation.y,
                  boneFrame.rotation.z
                )
              });
            }
          });
          
          rotationAnimation.setKeys(keys);
          bone.animations = bone.animations || [];
          bone.animations.push(rotationAnimation);
        });
        
        // Create animation range
        rig.skeleton.createAnimationRange(animationName, 0, data.frames.length - 1);
      }
    }
  }
}));

export default useSkeletalAnimationStore;
