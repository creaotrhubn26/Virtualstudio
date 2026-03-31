/**
 * Accessory Mesh Component
 * 
 * Renders accessories (facial features, head accessories, body accessories) for virtual actors.
 * Generic component that works with all accessory types.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneNode } from '../../core/models/scene';
import { logger } from '../../core/services/logger';
import { getFacialFeatureById } from '../../core/data/facialFeaturesStyles';
import { getHeadAccessoryById } from '../../core/data/headAccessoriesStyles';
import { getBodyAccessoryById } from '../../core/data/bodyAccessoriesStyles';

const log = logger.module('AccessoryMesh');

export type AccessoryType = 'facial_feature' | 'head_accessory' | 'body_accessory';

interface AccessoryMeshProps {
  node: SceneNode;
  actorNode?: SceneNode;
  accessoryType: AccessoryType;
}

export function AccessoryMesh({ node, actorNode, accessoryType }: AccessoryMeshProps) {
  const groupRef = useRef<any>(null);
  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => {
    if (!node.userData) return null;

    return {
      accessoryId: node.userData.accessoryId as string,
      color: node.userData.color as { hue: number; saturation: number; lightness: number } | undefined,
      scale: node.userData.scale as number | undefined,
      offset: node.userData.offset as { x: number; y: number; z: number } | undefined,
      roughness: node.userData.roughness as number | undefined,
      metalness: node.userData.metalness as number | undefined,
    };
  }, [node.userData]);

  useEffect(() => {
    if (!config || !config.accessoryId || !THREE || !GLTFLoader) {
      setLoading(false);
      return;
    }

    const loadAccessory = async () => {
      try {
        setLoading(true);
        setError(null);

        let accessoryDef;
        switch (accessoryType) {
          case 'facial_feature':
            accessoryDef = getFacialFeatureById(config.accessoryId);
            break;
          case 'head_accessory':
            accessoryDef = getHeadAccessoryById(config.accessoryId);
            break;
          case 'body_accessory':
            accessoryDef = getBodyAccessoryById(config.accessoryId);
            break;
        }

        if (!accessoryDef) {
          throw new Error(`Accessory ${config.accessoryId} not found`);
        }

        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(
            accessoryDef.modelUrl,
            resolve,
            undefined,
            reject
          );
        });

        const loadedModel = gltf.scene;

        // Apply color if specified
        if (config.color) {
          loadedModel.traverse((child: any) => {
            if (child.isMesh) {
              const hsl = config.color!;
              const color = new THREE.Color().setHSL(hsl.hue / 360, hsl.saturation / 100, hsl.lightness / 100);
              child.material = child.material.clone();
              child.material.color = color;
              
              if (config.roughness !== undefined) {
                child.material.roughness = config.roughness;
              }
              if (config.metalness !== undefined) {
                child.material.metalness = config.metalness;
              }
            }
          });
        }

        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        log.error(`Failed to load accessory: ${err}`);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadAccessory();
  }, [config, accessoryType]);

  useEffect(() => {
    if (!groupRef.current || !model) return;

    // Clear previous model
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    // Add new model
    groupRef.current.add(model);

    // Apply scale
    if (config?.scale) {
      model.scale.setScalar(config.scale);
    }

    // Apply offset
    if (config?.offset) {
      model.position.set(config.offset.x, config.offset.y, config.offset.z);
    }
  }, [model, config]);

  useEffect(() => {
    if (!groupRef.current || !actorNode) return;

    // Position relative to actor (SceneNode.transform stores arrays)
    const [px, py, pz] = actorNode.transform.position;
    const [rx, ry, rz] = actorNode.transform.rotation;
    groupRef.current.position.set(px, py, pz);
    groupRef.current.rotation.set(rx, ry, rz);
  }, [actorNode]);

  if (loading) return <primitive object={new THREE.Group()} ref={groupRef} />;
  if (error) return null;

  return <primitive object={new THREE.Group()} ref={groupRef} />;
}
