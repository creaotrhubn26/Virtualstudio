/**
 * Model Preview Component
 * 
 * Displays a 3D preview of generated GLB models using Babylon.js
 */

import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ModelPreviewProps {
  modelUrl?: string | null;
  height?: number;
  onError?: (error: Error) => void;
  waitingMessage?: string;
  showWaiting?: boolean;
}

export const ModelPreview: React.FC<ModelPreviewProps> = ({ 
  modelUrl, 
  height = 300,
  onError,
  waitingMessage = 'Venter på generering...',
  showWaiting = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    
    // Always initialize the scene, even when waiting
    const shouldInitialize = modelUrl || showWaiting;
    if (!shouldInitialize) {
      return;
    }

    // Cleanup previous engine/scene if they exist
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    if (sceneRef.current) {
      sceneRef.current.dispose();
      sceneRef.current = null;
    }

    // Initialize Babylon.js engine
    const engine = new BABYLON.Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      antialias: true,
    });
    engineRef.current = engine;

    // Create scene with Christopher Nolan style: Dark, dramatic, atmospheric
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.03, 1); // Very dark, Nolan-style black
    scene.ambientColor = new BABYLON.Color3(0.15, 0.15, 0.18); // Lower ambient for high contrast
    
    // Add atmospheric fog for depth - Nolan's signature atmospheric depth
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.035; // More fog for atmospheric depth
    scene.fogColor = new BABYLON.Color3(0.02, 0.02, 0.03); // Dark fog
    
    sceneRef.current = scene;

    // Create camera (always create it)
    // Initial values will be adjusted when model loads
    const camera = new BABYLON.ArcRotateCamera(
      'previewCamera',
      -Math.PI / 2,
      Math.PI / 3,
      6, // Start with a reasonable default distance
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 1;
    camera.upperRadiusLimit = 20; // Allow zooming out more
    camera.wheelDeltaPercentage = 0.01;
    camera.minZ = 0.01; // Very close near plane for precise focus on object
    camera.maxZ = 1000; // Far plane to ensure object is always visible
    // Ensure camera always focuses on target (focal plane)
    camera.fov = 0.8; // Slightly narrower FOV for better focus

    // Create Christopher Nolan style environment: Minimalist, dark, dramatic
    // Background walls - darker, more atmospheric
    const wallMat = new BABYLON.StandardMaterial('wallMat', scene);
    wallMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.06); // Very dark, Nolan-style
    wallMat.specularColor = new BABYLON.Color3(0.01, 0.01, 0.01); // Minimal specular
    wallMat.roughness = 0.95; // Very matte, non-reflective
    wallMat.alpha = 0.5; // More visible but still atmospheric
    
    // Place walls much further away
    const backWall = BABYLON.MeshBuilder.CreatePlane('backWall', { width: 30, height: 20, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    backWall.position.set(0, 10, -20);
    backWall.material = wallMat;
    
    const leftWall = BABYLON.MeshBuilder.CreatePlane('leftWall', { width: 30, height: 20, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    leftWall.position.set(-20, 10, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.material = wallMat;
    
    const rightWall = BABYLON.MeshBuilder.CreatePlane('rightWall', { width: 30, height: 20, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    rightWall.position.set(20, 10, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.material = wallMat;
    
    // Ground - dark, dramatic, Nolan-style (not white)
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 15, height: 15 }, scene);
    const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
    // Dark color - Nolan's signature dark, moody floors
    groundMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.1); // Dark gray/black
    // Subtle specular for slight reflection
    groundMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.25);
    // Medium roughness for subtle reflection
    groundMat.roughness = 0.4;
    // Lower metallic for less reflection
    groundMat.metallic = 0.1;
    ground.material = groundMat;
    ground.receiveShadows = true;
    ground.position.y = 0;
    
    // Create reflection probe for ground reflections
    const reflectionProbe = new BABYLON.ReflectionProbe('reflectionProbe', 1024, scene); // Higher resolution for better reflections
    reflectionProbe.position = new BABYLON.Vector3(0, 5, 0);
    reflectionProbe.renderList.push(ground);
    
    // Apply reflection to ground material with strong fresnel effect
    groundMat.reflectionTexture = reflectionProbe.cubeTexture;
    groundMat.reflectionFresnelParameters = new BABYLON.FresnelParameters();
    groundMat.reflectionFresnelParameters.bias = 0.0; // Start reflections immediately
    groundMat.reflectionFresnelParameters.power = 1.5; // Smooth fresnel transition
    // Enable fresnel for more realistic reflections
    groundMat.useFresnelForReflection = true;

    // Grid overlay - very subtle on dark floor (Nolan minimalist style)
    const grid = BABYLON.MeshBuilder.CreateGround('grid', { width: 15, height: 15, subdivisions: 15 }, scene);
    const gridMaterial = new BABYLON.StandardMaterial('gridMaterial', scene);
    gridMaterial.wireframe = true;
    gridMaterial.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18); // Subtle on dark
    gridMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.12); // Very subtle glow
    gridMaterial.alpha = 0.2; // Subtle on dark floor
    grid.material = gridMaterial;
    grid.position.y = 0.01;

    // Christopher Nolan lighting: High contrast, dramatic, focused on subject
    // Key light (main light from front-right) - strong, focused
    const keyLight = new BABYLON.DirectionalLight('keyLight', new BABYLON.Vector3(-2, 3, 2), scene);
    keyLight.intensity = 3.5; // Very strong, focused key light (increased from 2.5)
    keyLight.diffuse = new BABYLON.Color3(1.0, 0.98, 0.95); // Slightly warm, cinematic
    keyLight.specular = new BABYLON.Color3(1.0, 0.98, 0.95);
    keyLight.shadowEnabled = true;
    
    // Enhanced shadow settings - dramatic, high contrast shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, keyLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    shadowGenerator.setDarkness(0.4); // Darker shadows for high contrast (Nolan style)
    shadowGenerator.bias = 0.00001;
    
    // Fill light (minimal fill for high contrast) - Nolan's low fill approach
    const fillLight = new BABYLON.DirectionalLight('fillLight', new BABYLON.Vector3(2, 1, 1), scene);
    fillLight.intensity = 0.6; // Increased fill light (from 0.3 to 0.6)
    fillLight.diffuse = new BABYLON.Color3(0.7, 0.75, 0.85); // Cool, subtle fill
    fillLight.specular = new BABYLON.Color3(0.2, 0.2, 0.3); // Minimal specular
    
    // Rim light (back light for edge definition) - dramatic separation
    const rimLight = new BABYLON.DirectionalLight('rimLight', new BABYLON.Vector3(0, 2, -3), scene);
    rimLight.intensity = 1.2; // Strong rim for dramatic edge
    rimLight.diffuse = new BABYLON.Color3(1.0, 1.0, 1.0); // Pure white rim
    rimLight.specular = new BABYLON.Color3(0.8, 0.8, 0.9); // Strong specular
    
    // Ambient light (very low for high contrast) - Nolan's dark ambient
    const ambientLight = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.2; // Low ambient for high contrast
    ambientLight.groundColor = new BABYLON.Color3(0.05, 0.05, 0.08); // Very dark ground
    ambientLight.diffuse = new BABYLON.Color3(0.25, 0.25, 0.3); // Dark ambient
    
    // Accent light (focused point light) - dramatic spotlight effect
    const accentLight = new BABYLON.PointLight('accentLight', new BABYLON.Vector3(0, 4, 3), scene);
    accentLight.intensity = 0.8; // Strong accent
    accentLight.diffuse = new BABYLON.Color3(1.0, 0.98, 0.95);
    accentLight.range = 10; // Focused range
    
    // Create particle systems for atmosphere
    // Dust particles
    const dustParticles = new BABYLON.ParticleSystem('dustParticles', 200, scene);
    // Create a simple white particle texture (1x1 white pixel)
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    const particleCtx = particleCanvas.getContext('2d');
    if (particleCtx) {
      const gradient = particleCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      particleCtx.fillStyle = gradient;
      particleCtx.fillRect(0, 0, 32, 32);
    }
    dustParticles.particleTexture = new BABYLON.Texture(particleCanvas.toDataURL(), scene);
    const dustEmitter = BABYLON.MeshBuilder.CreateBox('dustEmitter', { size: 0.1 }, scene);
    dustEmitter.isVisible = false;
    dustEmitter.position = new BABYLON.Vector3(0, 3, 0);
    dustParticles.emitter = dustEmitter;
    dustParticles.minEmitBox = new BABYLON.Vector3(-8, 0, -8);
    dustParticles.maxEmitBox = new BABYLON.Vector3(8, 6, 8);
    dustParticles.color1 = new BABYLON.Color4(0.8, 0.8, 0.85, 0.1);
    dustParticles.color2 = new BABYLON.Color4(0.7, 0.7, 0.75, 0.05);
    dustParticles.colorDead = new BABYLON.Color4(0.6, 0.6, 0.65, 0);
    dustParticles.minSize = 0.01;
    dustParticles.maxSize = 0.03;
    dustParticles.minLifeTime = 10;
    dustParticles.maxLifeTime = 20;
    dustParticles.emitRate = 5;
    dustParticles.gravity = new BABYLON.Vector3(0, -0.01, 0);
    dustParticles.direction1 = new BABYLON.Vector3(-0.1, 0.1, -0.1);
    dustParticles.direction2 = new BABYLON.Vector3(0.1, 0.2, 0.1);
    dustParticles.start();
    
    // Light glints particles
    const glintParticles = new BABYLON.ParticleSystem('glintParticles', 50, scene);
    // Create a bright star-like particle texture for glints
    const glintCanvas = document.createElement('canvas');
    glintCanvas.width = 32;
    glintCanvas.height = 32;
    const glintCtx = glintCanvas.getContext('2d');
    if (glintCtx) {
      const gradient = glintCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 240, 1)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 200, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
      glintCtx.fillStyle = gradient;
      glintCtx.fillRect(0, 0, 32, 32);
    }
    glintParticles.particleTexture = new BABYLON.Texture(glintCanvas.toDataURL(), scene);
    const glintEmitter = BABYLON.MeshBuilder.CreateBox('glintEmitter', { size: 0.1 }, scene);
    glintEmitter.isVisible = false;
    glintEmitter.position = new BABYLON.Vector3(-2, 3, 2);
    glintParticles.emitter = glintEmitter;
    glintParticles.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
    glintParticles.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);
    glintParticles.color1 = new BABYLON.Color4(1.0, 0.98, 0.9, 0.8);
    glintParticles.color2 = new BABYLON.Color4(1.0, 0.95, 0.85, 0.6);
    glintParticles.colorDead = new BABYLON.Color4(1.0, 0.9, 0.8, 0);
    glintParticles.minSize = 0.02;
    glintParticles.maxSize = 0.05;
    glintParticles.minLifeTime = 0.5;
    glintParticles.maxLifeTime = 1.5;
    glintParticles.emitRate = 10;
    glintParticles.gravity = new BABYLON.Vector3(0, 0, 0);
    glintParticles.direction1 = new BABYLON.Vector3(-0.2, 0.2, -0.2);
    glintParticles.direction2 = new BABYLON.Vector3(0.2, 0.3, 0.2);
    glintParticles.start();
    
    // HDRI environment support (with fallback)
    // Note: HDRI loading would require an actual HDRI file URL
    // For now, we rely on the excellent 5-point lighting setup
    // If you have an HDRI file, you can load it like this:
    // const hdrTexture = await BABYLON.CubeTexture.CreateFromPrefilteredData(hdriUrl, scene);
    // scene.environmentTexture = hdrTexture;
    // scene.environmentIntensity = 0.5;
    // The current lighting setup provides professional studio lighting without HDRI
    
    // Post-processing pipeline
    const defaultPipeline = new BABYLON.DefaultRenderingPipeline(
      'defaultPipeline',
      true,
      scene,
      [camera]
    );
    
    // Bloom effect - cinematic glow
    defaultPipeline.bloomEnabled = true;
    defaultPipeline.bloomKernel = 128; // Larger kernel for smoother bloom
    defaultPipeline.bloomScale = 0.8; // More pronounced bloom
    defaultPipeline.bloomThreshold = 0.85; // Lower threshold for more bloom
    defaultPipeline.bloomWeight = 0.5; // Stronger bloom effect
    
    // Color grading - cinematic film look
    defaultPipeline.colorCurvesEnabled = true;
    // Set color curves if available (may not be initialized immediately)
    try {
      if (defaultPipeline.colorCurves) {
        // Cinematic color grading: warm highlights, cool shadows, rich saturation
        defaultPipeline.colorCurves.globalHue = 0;
        defaultPipeline.colorCurves.globalDensity = 0;
        defaultPipeline.colorCurves.globalSaturation = 8; // Rich, vibrant colors
        defaultPipeline.colorCurves.highlightsHue = 5; // Slight warm tint in highlights
        defaultPipeline.colorCurves.highlightsDensity = 0;
        defaultPipeline.colorCurves.highlightsSaturation = 4; // Strong highlights
        defaultPipeline.colorCurves.midtonesHue = 0;
        defaultPipeline.colorCurves.midtonesDensity = 0;
        defaultPipeline.colorCurves.midtonesSaturation = 3; // Rich midtones
        defaultPipeline.colorCurves.shadowsHue = -5; // Slight cool tint in shadows
        defaultPipeline.colorCurves.shadowsDensity = 0;
        defaultPipeline.colorCurves.shadowsSaturation = 1.5; // Subtle shadow saturation
      } else {
        // If colorCurves is not available, try to set it after a short delay
        setTimeout(() => {
          if (defaultPipeline.colorCurves) {
            defaultPipeline.colorCurves.globalHue = 0;
            defaultPipeline.colorCurves.globalDensity = 0;
            defaultPipeline.colorCurves.globalSaturation = 8;
            defaultPipeline.colorCurves.highlightsHue = 5;
            defaultPipeline.colorCurves.highlightsDensity = 0;
            defaultPipeline.colorCurves.highlightsSaturation = 4;
            defaultPipeline.colorCurves.midtonesHue = 0;
            defaultPipeline.colorCurves.midtonesDensity = 0;
            defaultPipeline.colorCurves.midtonesSaturation = 3;
            defaultPipeline.colorCurves.shadowsHue = -5;
            defaultPipeline.colorCurves.shadowsDensity = 0;
            defaultPipeline.colorCurves.shadowsSaturation = 1.5;
          }
        }, 100);
      }
    } catch (error) {
      console.warn('Could not set color curves:', error);
    }
    
    // Tone mapping - cinematic ACES
    defaultPipeline.toneMappingEnabled = true;
    defaultPipeline.toneMappingType = BABYLON.DefaultRenderingPipeline.TONEMAPPING_ACES;
    
    // Image processing - Christopher Nolan style: High contrast, dramatic
    defaultPipeline.imageProcessing.contrast = 1.25; // Higher contrast for dramatic look
    defaultPipeline.imageProcessing.exposure = 0.9; // Slightly darker for moody Nolan feel
    defaultPipeline.imageProcessing.toneMappingEnabled = true;
    defaultPipeline.imageProcessing.vignetteEnabled = true; // Enable vignette
    defaultPipeline.imageProcessing.vignetteBlendMode = BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    defaultPipeline.imageProcessing.vignetteWeight = 1.5; // Strong vignette
    defaultPipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 1); // Black vignette
    
    // Film grain effect
    defaultPipeline.imageProcessing.filmGrainEnabled = true;
    defaultPipeline.imageProcessing.filmGrainIntensity = 0.3; // Subtle film grain
    defaultPipeline.imageProcessing.filmGrainAnimated = true; // Animated grain
    
    // Chromatic aberration for filmic look
    defaultPipeline.chromaticAberrationEnabled = true;
    defaultPipeline.chromaticAberration.aberrationAmount = 0.5; // Subtle chromatic aberration
    defaultPipeline.chromaticAberration.radialIntensity = 0.1; // Radial distortion

    // Load model if we have a URL
    if (modelUrl) {
      setLoading(true);
      setError(null);

      (async () => {
        try {
          const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', modelUrl, scene);
          
          if (result.meshes.length === 0) {
            const err = new Error('Ingen geometri funnet i modellen');
            setError(err.message);
            setLoading(false);
            onError?.(err);
            return;
          }

          // Calculate bounding box to center and scale model
          const rootMesh = result.meshes[0];
          
          // Fix rotation - models may be exported upside down
          // Rotate 180 degrees around X axis to flip right-side up
          rootMesh.rotation = new BABYLON.Vector3(Math.PI, 0, 0);
          
          // Get bounding box before scaling
          const bounds = rootMesh.getHierarchyBoundingVectors(true);
          const center = bounds.min.add(bounds.max).scale(0.5);
          const size = bounds.max.subtract(bounds.min);
          const maxDim = Math.max(size.x, size.y, size.z);
          
          // Use larger scale factor (3.5 instead of 2) to make model bigger
          const scale = maxDim > 0 ? 3.5 / maxDim : 1;
          
          // Position and scale all meshes - simpler approach
          result.meshes.forEach((mesh) => {
            if (mesh instanceof BABYLON.Mesh) {
              // First scale
              mesh.scaling.scaleInPlace(scale);
              // Then center: subtract center position (scaled)
              const scaledCenter = center.scale(scale);
              mesh.position.subtractInPlace(new BABYLON.Vector3(scaledCenter.x, bounds.min.y * scale, scaledCenter.z));
              mesh.receiveShadows = true;
              // Add to reflection probe and shadow generator
              reflectionProbe.renderList.push(mesh);
              shadowGenerator.addShadowCaster(mesh);
              mesh.getChildMeshes().forEach((child) => {
                if (child instanceof BABYLON.Mesh) {
                  child.receiveShadows = true;
                  reflectionProbe.renderList.push(child);
                  shadowGenerator.addShadowCaster(child);
                }
              });
            }
          });

          // Calculate optimal camera distance based on model size
          const finalBounds = rootMesh.getHierarchyBoundingVectors(true);
          const finalSize = finalBounds.max.subtract(finalBounds.min);
          const maxSize = Math.max(finalSize.x, finalSize.y, finalSize.z);
          
          // Use FaceXFormer to detect face by rendering model to image
          let faceTarget = BABYLON.Vector3.Zero();
          let leftEyeTarget: BABYLON.Vector3 | null = null;
          let rightEyeTarget: BABYLON.Vector3 | null = null;
          let eyeDistance = 0;
          
          // Render model to image for face detection
          const renderToImage = async (): Promise<{ face: BABYLON.Vector3 | null; leftEye: BABYLON.Vector3 | null; rightEye: BABYLON.Vector3 | null; eyeDistance: number }> => {
            try {
              // Temporarily set camera for front view
              const originalAlpha = camera.alpha;
              const originalBeta = camera.beta;
              const originalRadius = camera.radius;
              
              // Temporarily disable reflection probe and post-processing to avoid feedback loops
              let reflectionTextureBackup: BABYLON.BaseTexture | null = null;
              if (reflectionProbe && groundMat) {
                reflectionTextureBackup = groundMat.reflectionTexture;
                // Store backup in material for error recovery
                (groundMat as any)._reflectionTextureBackup = reflectionTextureBackup;
                groundMat.reflectionTexture = null;
              }
              
              const postProcessingWasEnabled = defaultPipeline ? defaultPipeline.isEnabled : false;
              if (defaultPipeline) {
                defaultPipeline.setEnabled(false);
              }
              
              camera.alpha = -Math.PI / 2;
              camera.beta = Math.PI / 3;
              camera.radius = optimalRadius * 1.2;
              camera.setTarget(BABYLON.Vector3.Zero());
              
              // Wait for next frame to ensure clean render
              await new Promise(resolve => requestAnimationFrame(resolve));
              
              // Render scene to canvas
              scene.render();
              
              // Wait one more frame to ensure rendering is complete
              await new Promise(resolve => requestAnimationFrame(resolve));
              
              // Get canvas and convert to image
              const canvas = engineRef.current?.getRenderingCanvas();
              if (!canvas) {
                // Re-enable reflection probe and post-processing before returning
                if (reflectionProbe && groundMat && reflectionTextureBackup) {
                  groundMat.reflectionTexture = reflectionTextureBackup;
                }
                if (defaultPipeline && postProcessingWasEnabled) {
                  defaultPipeline.setEnabled(true);
                }
                // Restore camera
                camera.alpha = originalAlpha;
                camera.beta = originalBeta;
                camera.radius = originalRadius;
                return { face: null, leftEye: null, rightEye: null, eyeDistance: 0 };
              }
              
              // Convert canvas to blob and send to FaceXFormer API
              return new Promise((resolve) => {
                canvas.toBlob(async (blob) => {
                  // Restore camera
                  camera.alpha = originalAlpha;
                  camera.beta = originalBeta;
                  camera.radius = originalRadius;
                  
                  // Re-enable reflection probe and post-processing
                  if (reflectionProbe && groundMat && reflectionTextureBackup) {
                    groundMat.reflectionTexture = reflectionTextureBackup;
                  }
                  if (defaultPipeline && postProcessingWasEnabled) {
                    defaultPipeline.setEnabled(true);
                  }
                  
                  if (!blob) {
                    resolve({ face: null, leftEye: null, rightEye: null, eyeDistance: 0 });
                    return;
                  }
                  
                  try {
                    const formData = new FormData();
                    formData.append('file', blob, 'model-render.png');
                    
                    const response = await fetch('/api/facexformer/analyze', {
                      method: 'POST',
                      body: formData,
                    });
                    
                    if (!response.ok) {
                      throw new Error(`FaceXFormer API error: ${response.statusText}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.success && result.landmarks && result.landmarks.length > 0) {
                      // Face detected! Calculate 3D position from 2D landmarks
                      const landmarks = result.landmarks;
                      let centerX = 0;
                      let centerY = 0;
                      let count = 0;
                      
                      // Focus on eye landmarks for eye-level positioning
                      // Left eye: 36-41, Right eye: 42-47
                      // Use ALL landmarks but weight corner landmarks (36, 39 for left; 42, 45 for right) more heavily
                      // Corner landmarks are more stable and accurate
                      const leftEyeAllIndices = [36, 37, 38, 39, 40, 41]; // All left eye landmarks
                      const rightEyeAllIndices = [42, 43, 44, 45, 46, 47]; // All right eye landmarks
                      
                      // Corner landmarks get weight 3.0, other landmarks get weight 1.0
                      const leftEyeCornerIndices = [36, 39]; // Outer and inner corners
                      const rightEyeCornerIndices = [42, 45]; // Outer and inner corners
                      
                      let leftEyeX = 0, leftEyeY = 0, leftEyeWeightSum = 0;
                      let leftEyePoints: Array<[number, number, number]> = []; // [x, y, weight]
                      
                      for (const idx of leftEyeAllIndices) {
                        if (landmarks[idx] && Array.isArray(landmarks[idx]) && landmarks[idx].length >= 2) {
                          const x = landmarks[idx][0];
                          const y = landmarks[idx][1];
                          const weight = leftEyeCornerIndices.includes(idx) ? 3.0 : 1.0;
                          leftEyeX += x * weight;
                          leftEyeY += y * weight;
                          leftEyeWeightSum += weight;
                          leftEyePoints.push([x, y, weight]);
                          centerX += x;
                          centerY += y;
                          count++;
                        }
                      }
                      
                      let rightEyeX = 0, rightEyeY = 0, rightEyeWeightSum = 0;
                      let rightEyePoints: Array<[number, number, number]> = []; // [x, y, weight]
                      
                      for (const idx of rightEyeAllIndices) {
                        if (landmarks[idx] && Array.isArray(landmarks[idx]) && landmarks[idx].length >= 2) {
                          const x = landmarks[idx][0];
                          const y = landmarks[idx][1];
                          const weight = rightEyeCornerIndices.includes(idx) ? 3.0 : 1.0;
                          rightEyeX += x * weight;
                          rightEyeY += y * weight;
                          rightEyeWeightSum += weight;
                          rightEyePoints.push([x, y, weight]);
                          centerX += x;
                          centerY += y;
                          count++;
                        }
                      }
                      
                      const leftEyeCount = leftEyePoints.length;
                      const rightEyeCount = rightEyePoints.length;
                      
                      // Calculate weighted eye centers for 2D distance calculation
                      let calculatedEyeDistance = 0;
                      if (leftEyeWeightSum > 0 && rightEyeWeightSum > 0) {
                        leftEyeX /= leftEyeWeightSum;
                        leftEyeY /= leftEyeWeightSum;
                        rightEyeX /= rightEyeWeightSum;
                        rightEyeY /= rightEyeWeightSum;
                        calculatedEyeDistance = Math.sqrt(
                          Math.pow(rightEyeX - leftEyeX, 2) + Math.pow(rightEyeY - leftEyeY, 2)
                        );
                      }
                      
                      // If we have eye landmarks, use them; otherwise fall back to general face landmarks
                      if (count === 0) {
                        // Fallback: use key facial landmarks (nose tip is typically index 30)
                        const keyLandmarkIndices = [30, 33, 36, 39, 42, 45, 48, 51, 54, 57]; // Nose, eyes, mouth
                        for (const idx of keyLandmarkIndices) {
                          if (landmarks[idx] && Array.isArray(landmarks[idx]) && landmarks[idx].length >= 2) {
                            centerX += landmarks[idx][0];
                            centerY += landmarks[idx][1];
                            count++;
                          }
                        }
                      }
                      
                      if (count > 0) {
                        centerX /= count;
                        centerY /= count;
                        
                        // Convert 2D image coordinates to 3D world coordinates using raycasting
                        const normalizedX = (centerX / canvas.width) * 2 - 1; // -1 to 1
                        const normalizedY = 1 - (centerY / canvas.height) * 2; // 1 to -1 (flip Y)
                        
                        // Create ray from camera through the 2D point
                        const ray = BABYLON.Ray.CreateNewFromScreenCoordinates(
                          normalizedX,
                          normalizedY,
                          scene.getEngine().getRenderWidth(),
                          scene.getEngine().getRenderHeight(),
                          camera.getViewMatrix(),
                          camera.getProjectionMatrix()
                        );
                        
                        // Pick mesh with ray
                        const pickInfo = scene.pickWithRay(ray, (mesh) => mesh instanceof BABYLON.Mesh);
                        
                        let detectedFace: BABYLON.Vector3 | null = null;
                        let detectedLeftEye: BABYLON.Vector3 | null = null;
                        let detectedRightEye: BABYLON.Vector3 | null = null;
                        
                        if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                          detectedFace = pickInfo.pickedPoint;
                          console.log('Face detected by FaceXFormer at 3D position:', detectedFace);
                          
                          // Calculate left and right eye positions using precise weighted raycasting with outlier filtering
                          if (leftEyeCount > 0 && rightEyeCount > 0 && leftEyePoints.length > 0 && rightEyePoints.length > 0) {
                            // Helper function to filter outliers and calculate weighted median
                            const filterOutliersAndCalculateWeightedAverage = (
                              points: BABYLON.Vector3[],
                              weights: number[]
                            ): BABYLON.Vector3 | null => {
                              if (points.length === 0) return null;
                              if (points.length === 1) return points[0];
                              
                              // Calculate weighted center
                              let weightedSum = BABYLON.Vector3.Zero();
                              let totalWeight = 0;
                              for (let i = 0; i < points.length; i++) {
                                weightedSum = weightedSum.add(points[i].scale(weights[i]));
                                totalWeight += weights[i];
                              }
                              const weightedCenter = weightedSum.scale(1 / totalWeight);
                              
                              // Calculate distances from weighted center
                              const distances = points.map(p => BABYLON.Vector3.Distance(p, weightedCenter));
                              
                              // Calculate median distance
                              const sortedDistances = [...distances].sort((a, b) => a - b);
                              const medianDistance = sortedDistances[Math.floor(sortedDistances.length / 2)];
                              
                              // Filter out points that are more than 2x median distance from center (outliers)
                              const filteredPoints: BABYLON.Vector3[] = [];
                              const filteredWeights: number[] = [];
                              const threshold = medianDistance * 2;
                              
                              for (let i = 0; i < points.length; i++) {
                                if (distances[i] <= threshold) {
                                  filteredPoints.push(points[i]);
                                  filteredWeights.push(weights[i]);
                                }
                              }
                              
                              // If we filtered out too many points, use original
                              if (filteredPoints.length < Math.max(2, points.length * 0.5)) {
                                filteredPoints.length = 0;
                                filteredWeights.length = 0;
                                filteredPoints.push(...points);
                                filteredWeights.push(...weights);
                              }
                              
                              // Calculate weighted average from filtered points
                              let finalSum = BABYLON.Vector3.Zero();
                              let finalWeight = 0;
                              for (let i = 0; i < filteredPoints.length; i++) {
                                finalSum = finalSum.add(filteredPoints[i].scale(filteredWeights[i]));
                                finalWeight += filteredWeights[i];
                              }
                              
                              return finalWeight > 0 ? finalSum.scale(1 / finalWeight) : weightedCenter;
                            };
                            
                            // Raycast each landmark point for left eye with weights
                            // pickWithRay already returns the closest hit (front surface)
                            const leftEye3DPoints: BABYLON.Vector3[] = [];
                            const leftEyeWeights: number[] = [];
                            
                            for (const [x, y, weight] of leftEyePoints) {
                              const normalizedX = (x / canvas.width) * 2 - 1;
                              const normalizedY = 1 - (y / canvas.height) * 2;
                              
                              const ray = BABYLON.Ray.CreateNewFromScreenCoordinates(
                                normalizedX,
                                normalizedY,
                                scene.getEngine().getRenderWidth(),
                                scene.getEngine().getRenderHeight(),
                                camera.getViewMatrix(),
                                camera.getProjectionMatrix()
                              );
                              
                              // pickWithRay returns the closest hit (front surface) automatically
                              const pickInfo = scene.pickWithRay(ray, (mesh) => mesh instanceof BABYLON.Mesh);
                              
                              if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                                leftEye3DPoints.push(pickInfo.pickedPoint);
                                leftEyeWeights.push(weight);
                              }
                            }
                            
                            // Raycast each landmark point for right eye with weights
                            // pickWithRay already returns the closest hit (front surface)
                            const rightEye3DPoints: BABYLON.Vector3[] = [];
                            const rightEyeWeights: number[] = [];
                            
                            for (const [x, y, weight] of rightEyePoints) {
                              const normalizedX = (x / canvas.width) * 2 - 1;
                              const normalizedY = 1 - (y / canvas.height) * 2;
                              
                              const ray = BABYLON.Ray.CreateNewFromScreenCoordinates(
                                normalizedX,
                                normalizedY,
                                scene.getEngine().getRenderWidth(),
                                scene.getEngine().getRenderHeight(),
                                camera.getViewMatrix(),
                                camera.getProjectionMatrix()
                              );
                              
                              // pickWithRay returns the closest hit (front surface) automatically
                              const pickInfo = scene.pickWithRay(ray, (mesh) => mesh instanceof BABYLON.Mesh);
                              
                              if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                                rightEye3DPoints.push(pickInfo.pickedPoint);
                                rightEyeWeights.push(weight);
                              }
                            }
                            
                            // Calculate weighted average with outlier filtering for left eye
                            if (leftEye3DPoints.length > 0) {
                              detectedLeftEye = filterOutliersAndCalculateWeightedAverage(leftEye3DPoints, leftEyeWeights);
                              console.log(`Left eye: ${leftEye3DPoints.length} landmarks raycasted (${leftEyeWeights.reduce((a, b) => a + b, 0).toFixed(1)} total weight), position:`, detectedLeftEye);
                            } else {
                              // Fallback: use weighted center point with raycasting
                              const leftNormalizedX = (leftEyeX / canvas.width) * 2 - 1;
                              const leftNormalizedY = 1 - (leftEyeY / canvas.height) * 2;
                              const leftRay = BABYLON.Ray.CreateNewFromScreenCoordinates(
                                leftNormalizedX,
                                leftNormalizedY,
                                scene.getEngine().getRenderWidth(),
                                scene.getEngine().getRenderHeight(),
                                camera.getViewMatrix(),
                                camera.getProjectionMatrix()
                              );
                              const leftPickInfo = scene.pickWithRay(leftRay, (mesh) => mesh instanceof BABYLON.Mesh);
                              if (leftPickInfo && leftPickInfo.hit && leftPickInfo.pickedPoint) {
                                detectedLeftEye = leftPickInfo.pickedPoint;
                              }
                            }
                            
                            // Calculate weighted average with outlier filtering for right eye
                            if (rightEye3DPoints.length > 0) {
                              detectedRightEye = filterOutliersAndCalculateWeightedAverage(rightEye3DPoints, rightEyeWeights);
                              console.log(`Right eye: ${rightEye3DPoints.length} landmarks raycasted (${rightEyeWeights.reduce((a, b) => a + b, 0).toFixed(1)} total weight), position:`, detectedRightEye);
                            } else {
                              // Fallback: use weighted center point with raycasting
                              const rightNormalizedX = (rightEyeX / canvas.width) * 2 - 1;
                              const rightNormalizedY = 1 - (rightEyeY / canvas.height) * 2;
                              const rightRay = BABYLON.Ray.CreateNewFromScreenCoordinates(
                                rightNormalizedX,
                                rightNormalizedY,
                                scene.getEngine().getRenderWidth(),
                                scene.getEngine().getRenderHeight(),
                                camera.getViewMatrix(),
                                camera.getProjectionMatrix()
                              );
                              const rightPickInfo = scene.pickWithRay(rightRay, (mesh) => mesh instanceof BABYLON.Mesh);
                              if (rightPickInfo && rightPickInfo.hit && rightPickInfo.pickedPoint) {
                                detectedRightEye = rightPickInfo.pickedPoint;
                              }
                            }
                            
                            // Recalculate eye distance from actual 3D positions
                            if (detectedLeftEye && detectedRightEye) {
                              calculatedEyeDistance = BABYLON.Vector3.Distance(detectedLeftEye, detectedRightEye);
                              console.log('Precise eye distance from filtered 3D positions:', calculatedEyeDistance);
                            }
                          }
                          
                          resolve({ face: detectedFace, leftEye: detectedLeftEye, rightEye: detectedRightEye, eyeDistance: calculatedEyeDistance });
                          return;
                        } else {
                          // Fallback: estimate from image position and model bounds
                          const faceX = normalizedX * finalSize.x * 0.3;
                          const faceY = finalBounds.min.y + (1 - normalizedY) * finalSize.y * 0.5;
                          const faceZ = finalSize.z * 0.1;
                          const estimated = new BABYLON.Vector3(faceX, faceY, faceZ);
                          console.log('Face detected by FaceXFormer (estimated 3D position):', estimated);
                          
                          // Estimate eye positions
                          if (calculatedEyeDistance > 0) {
                            const eyeOffset3D = (calculatedEyeDistance / canvas.width) * finalSize.x * 0.15;
                            detectedLeftEye = new BABYLON.Vector3(estimated.x - eyeOffset3D, estimated.y, estimated.z);
                            detectedRightEye = new BABYLON.Vector3(estimated.x + eyeOffset3D, estimated.y, estimated.z);
                          }
                          
                          resolve({ face: estimated, leftEye: detectedLeftEye, rightEye: detectedRightEye, eyeDistance: calculatedEyeDistance });
                          return;
                        }
                      }
                    } else {
                      console.log('FaceXFormer: No face detected in rendered image');
                    }
                  } catch (error) {
                    console.warn('FaceXFormer detection failed:', error);
                  }
                  
                  resolve({ face: null, leftEye: null, rightEye: null, eyeDistance: 0 });
                }, 'image/png');
              });
            } catch (error) {
              console.warn('Failed to render model for face detection:', error);
              // Ensure reflection probe and post-processing are re-enabled even on error
              // Note: reflectionTextureBackup and postProcessingWasEnabled are in outer scope
              // We need to restore them here, but they might not be defined if error occurred early
              try {
                if (reflectionProbe && groundMat) {
                  // Try to restore reflection texture if it was backed up
                  const groundMatRef = groundMat as any;
                  if (groundMatRef._reflectionTextureBackup) {
                    groundMat.reflectionTexture = groundMatRef._reflectionTextureBackup;
                    groundMatRef._reflectionTextureBackup = null;
                  }
                }
                if (defaultPipeline) {
                  defaultPipeline.setEnabled(true);
                }
              } catch (restoreError) {
                console.warn('Failed to restore effects:', restoreError);
              }
              return { face: null, leftEye: null, rightEye: null, eyeDistance: 0 };
            }
          };
          
          // Try FaceXFormer detection
          const detectionResult = await renderToImage();
          
          if (detectionResult && detectionResult.face && !detectionResult.face.equals(BABYLON.Vector3.Zero())) {
            faceTarget = detectionResult.face;
            leftEyeTarget = detectionResult.leftEye;
            rightEyeTarget = detectionResult.rightEye;
            eyeDistance = detectionResult.eyeDistance;
            console.log('Eye detection complete - Face:', faceTarget, 'Left eye:', leftEyeTarget, 'Right eye:', rightEyeTarget, 'Distance:', eyeDistance);
          } else {
            // Fallback: try to find face/head mesh by name - expanded keywords with eye focus
            const faceKeywords = [
              'head', 'face', 'skull', 'head_', 'face_', 'Head', 'Face', 'HEAD', 'FACE',
              'hode', 'ansikt', 'skalle', 'Hode', 'Ansikt', 'HODE', 'ANSIKT',
              'head_mesh', 'face_mesh', 'headMesh', 'faceMesh',
              'upper', 'top', 'cranium', 'crown', 'forehead', 'temple',
              'eye', 'eyes', 'Eye', 'Eyes', 'EYE', 'EYES', 'øye', 'øyne', 'Øye', 'Øyne',
              'left_eye', 'right_eye', 'leftEye', 'rightEye', 'eye_left', 'eye_right',
              'nose', 'mouth', 'chin', 'jaw', 'cheek', 'cheeks'
            ];
            let faceMesh: BABYLON.Mesh | null = null;
            
            // Search all meshes for face/head
            const allMeshes: BABYLON.Mesh[] = [];
            const collectMeshes = (mesh: BABYLON.AbstractMesh) => {
              if (mesh instanceof BABYLON.Mesh) {
                allMeshes.push(mesh);
              }
              mesh.getChildMeshes().forEach(collectMeshes);
            };
            result.meshes.forEach(collectMeshes);
            
            // First pass: exact matches
            for (const mesh of allMeshes) {
              const meshName = mesh.name.toLowerCase();
              if (faceKeywords.some(keyword => meshName === keyword.toLowerCase() || meshName.includes(keyword.toLowerCase()))) {
                faceMesh = mesh;
                console.log('Face mesh found by exact/partial match:', mesh.name);
                break;
              }
            }
            
            // If not found by name, find the highest mesh (likely head)
            // Also check for meshes in the upper portion of the model
            if (!faceMesh) {
              const modelHeight = finalBounds.max.y - finalBounds.min.y;
              const upperThreshold = finalBounds.min.y + modelHeight * 0.6; // Upper 40% of model
              
              let highestY = -Infinity;
              let highestMesh: BABYLON.Mesh | null = null;
              
              for (const mesh of allMeshes) {
                const meshBounds = mesh.getBoundingInfo();
                const meshTop = meshBounds.boundingBox.maximumWorld.y;
                const meshCenter = meshBounds.boundingBox.centerWorld.y;
                
                // Prefer meshes in the upper portion
                if (meshCenter > upperThreshold && meshTop > highestY) {
                  highestY = meshTop;
                  highestMesh = mesh;
                }
              }
              
              // If we found a mesh in upper portion, use it
              if (highestMesh) {
                faceMesh = highestMesh;
                console.log('Face mesh found in upper portion:', highestMesh.name);
              } else {
                // Fallback: just find the highest mesh overall
                for (const mesh of allMeshes) {
                  const meshBounds = mesh.getBoundingInfo();
                  const meshTop = meshBounds.boundingBox.maximumWorld.y;
                  if (meshTop > highestY) {
                    highestY = meshTop;
                    faceMesh = mesh;
                  }
                }
                if (faceMesh) {
                  console.log('Face mesh found by highest position:', faceMesh.name);
                }
              }
            }
            
            // Calculate face position - focus on eye level
            if (faceMesh) {
              const faceBounds = faceMesh.getBoundingInfo();
              const faceCenter = faceBounds.boundingBox.centerWorld;
              // Adjust Y to be at eye level (typically 2/3 up the face from chin to top of head)
              const faceHeight = faceBounds.boundingBox.maximumWorld.y - faceBounds.boundingBox.minimumWorld.y;
              // Eyes are typically at 2/3 of face height from bottom (or 1/3 from top)
              const eyeLevelY = faceBounds.boundingBox.minimumWorld.y + faceHeight * 0.65; // Eye level
              faceTarget = new BABYLON.Vector3(faceCenter.x, eyeLevelY, faceCenter.z);
              console.log('Face detected by mesh name/position at eye level:', faceTarget, 'Mesh name:', faceMesh.name);
            } else {
              // Final fallback: estimate eye position (typically at 2/3 of head height)
              const modelHeight = finalBounds.max.y - finalBounds.min.y;
              // Eyes are typically at about 2/3 up the head from bottom
              const eyeYPosition = finalBounds.min.y + modelHeight * 0.75; // Eye level (75% up from bottom)
              faceTarget = new BABYLON.Vector3(0, eyeYPosition, 0);
              console.log('Face not found, using estimated eye position (75% of height):', faceTarget);
              
              // Estimate eye positions
              const estimatedEyeDistance = modelHeight * 0.1; // ~10% of model height
              leftEyeTarget = new BABYLON.Vector3(-estimatedEyeDistance / 2, eyeYPosition, 0);
              rightEyeTarget = new BABYLON.Vector3(estimatedEyeDistance / 2, eyeYPosition, 0);
              eyeDistance = estimatedEyeDistance;
            }
          }
          
          // Fallback: if we don't have eye targets, create them from face target
          if (!leftEyeTarget || !rightEyeTarget) {
            const estimatedEyeDistance = eyeDistance > 0 ? eyeDistance : maxSize * 0.1;
            if (!leftEyeTarget) {
              leftEyeTarget = new BABYLON.Vector3(faceTarget.x - estimatedEyeDistance / 2, faceTarget.y, faceTarget.z);
            }
            if (!rightEyeTarget) {
              rightEyeTarget = new BABYLON.Vector3(faceTarget.x + estimatedEyeDistance / 2, faceTarget.y, faceTarget.z);
            }
            if (eyeDistance === 0) {
              eyeDistance = estimatedEyeDistance;
            }
          }
          
          // Fallback: if we don't have eye targets, create them from face target
          if (!leftEyeTarget || !rightEyeTarget) {
            const estimatedEyeDistance = eyeDistance > 0 ? eyeDistance : maxSize * 0.1;
            if (!leftEyeTarget) {
              leftEyeTarget = new BABYLON.Vector3(faceTarget.x - estimatedEyeDistance / 2, faceTarget.y, faceTarget.z);
            }
            if (!rightEyeTarget) {
              rightEyeTarget = new BABYLON.Vector3(faceTarget.x + estimatedEyeDistance / 2, faceTarget.y, faceTarget.z);
            }
            if (eyeDistance === 0) {
              eyeDistance = estimatedEyeDistance;
            }
          }
          
          // Simple calculation: use 2.5x the largest dimension for good visibility
          const optimalRadius = Math.max(maxSize * 2.5, 4);
          const startRadius = optimalRadius * 1.3; // Start further away for dolly zoom
          const endRadius = optimalRadius; // End at optimal distance
          const closeRadius = Math.max(maxSize * 0.8, 1.5); // Close-up radius (for face shots)
          const veryCloseRadius = Math.max(maxSize * 0.5, 1); // Very close radius (for detail shots)
          
          // Eye-specific close-up radius based on eye distance
          const eyeCloseRadius = eyeDistance > 0 
            ? Math.max(eyeDistance * 2.5, 0.8) // 2.5x eye distance for eye close-ups
            : Math.max(maxSize * 0.4, 0.8); // Fallback if no eye distance
          
          // Update camera limits based on model size
          camera.lowerRadiusLimit = Math.max(maxSize * 0.3, 0.5); // Allow very close shots
          camera.upperRadiusLimit = Math.max(maxSize * 4, 15);
          
          // Adjust clipping planes to ensure object is always in focal plane
          // Near plane should be close enough to see details, far plane should include entire scene
          camera.minZ = Math.max(maxSize * 0.01, 0.01); // Very close near plane for precise focus
          camera.maxZ = Math.max(maxSize * 10, 1000); // Far plane to ensure object is always visible
          
          // Camera target should be at origin (where we centered the model)
          // We'll adjust target for close-up shots - this ensures object is in focal plane
          camera.setTarget(BABYLON.Vector3.Zero());
          
          const fps = 60; // Higher FPS for smoother animations
          // Christopher Nolan style: Very slow, dramatic, controlled movements
          const dollyDuration = 6.0; // 6 seconds for dramatic dolly zoom (Nolan-style slow)
          const baseTransitionDuration = 7.0; // Base 7 seconds for ultra-smooth, cinematic camera movements
          const pauseDuration = 5.0; // 5 second pause at each angle (Nolan-style contemplative holds)
          
          // Variable transition duration based on shot type (close-ups are slower)
          const getTransitionDuration = (radius: number) => {
            if (radius < eyeCloseRadius) return 9.0; // Very slow for extreme eye close-ups
            if (radius < veryCloseRadius) return 8.5; // Slow for very close shots
            if (radius < closeRadius) return 8.0; // Slower for close-ups
            return baseTransitionDuration; // Standard for wide shots
          };
          
          const dollyFrames = dollyDuration * fps;
          const pauseFrames = pauseDuration * fps;
          
          // Set initial camera position
          camera.radius = startRadius;
          camera.beta = Math.PI / 6; // Start with camera tilted up very high to see head/face
          
          // Christopher Nolan style: Dramatic, slow, controlled camera movements
          // Mix of wide establishing shots, slow orbits, dramatic vertical movements, and intense close-ups
          const angleSequence: Array<{ alpha: number; beta: number; radius: number; target: BABYLON.Vector3 }> = [
            // Opening: Dramatic wide establishing shot (Nolan signature)
            { alpha: -Math.PI / 2, beta: Math.PI / 6, radius: endRadius * 1.2, target: BABYLON.Vector3.Zero() },
            
            // Slow dolly in - classic Nolan approach
            { alpha: -Math.PI / 2, beta: Math.PI / 6, radius: endRadius, target: BABYLON.Vector3.Zero() },
            
            // Crane up - dramatic vertical reveal (Nolan signature)
            { alpha: -Math.PI / 2, beta: Math.PI / 8, radius: endRadius, target: BABYLON.Vector3.Zero() },
            
            // Slow orbit around object - contemplative
            { alpha: -Math.PI / 2 + Math.PI / 8, beta: Math.PI / 7, radius: endRadius, target: BABYLON.Vector3.Zero() },
            { alpha: -Math.PI / 2 + Math.PI / 4, beta: Math.PI / 8, radius: endRadius, target: BABYLON.Vector3.Zero() },
            { alpha: -Math.PI / 2 + Math.PI / 3, beta: Math.PI / 9, radius: endRadius, target: BABYLON.Vector3.Zero() },
            
            // Dramatic close-up on face (Nolan intensity)
            { alpha: -Math.PI / 2, beta: Math.PI / 7, radius: closeRadius, target: faceTarget },
            
            // Eye-specific close-ups - intense focus on eyes
            { alpha: -Math.PI / 2, beta: Math.PI / 7, radius: eyeCloseRadius, target: leftEyeTarget || faceTarget },
            { alpha: -Math.PI / 2 + Math.PI / 12, beta: Math.PI / 7, radius: eyeCloseRadius, target: rightEyeTarget || faceTarget },
            
            // Slow vertical tilt down while orbiting
            { alpha: -Math.PI / 2 + Math.PI / 2, beta: Math.PI / 10, radius: endRadius, target: BABYLON.Vector3.Zero() },
            { alpha: -Math.PI / 2 + Math.PI * 0.6, beta: Math.PI / 9, radius: endRadius, target: BABYLON.Vector3.Zero() },
            
            // Another intense close-up from different angle
            { alpha: -Math.PI / 2 + Math.PI / 4, beta: Math.PI / 8, radius: veryCloseRadius, target: faceTarget },
            
            // Slow orbit continues - contemplative movement
            { alpha: -Math.PI / 2 + Math.PI * 0.75, beta: Math.PI / 8, radius: endRadius, target: BABYLON.Vector3.Zero() },
            { alpha: -Math.PI / 2 + Math.PI, beta: Math.PI / 7, radius: endRadius, target: BABYLON.Vector3.Zero() },
            
            // Dramatic crane down - reverse of opening
            { alpha: -Math.PI / 2 + Math.PI, beta: Math.PI / 6, radius: endRadius, target: BABYLON.Vector3.Zero() },
            
            // Extreme close-up - Nolan's signature detail shots
            { alpha: -Math.PI / 2 + Math.PI / 2, beta: Math.PI / 7, radius: veryCloseRadius, target: faceTarget },
            
            // Extreme eye close-ups from side angles
            { alpha: -Math.PI / 2 + Math.PI / 2, beta: Math.PI / 7, radius: eyeCloseRadius, target: leftEyeTarget || faceTarget },
            { alpha: -Math.PI / 2 + Math.PI * 0.75, beta: Math.PI / 8, radius: eyeCloseRadius, target: rightEyeTarget || faceTarget },
            
            // Slow vertical movement up - dramatic reveal
            { alpha: -Math.PI / 2 + Math.PI * 1.25, beta: Math.PI / 9, radius: endRadius, target: BABYLON.Vector3.Zero() },
            { alpha: -Math.PI / 2 + Math.PI * 1.5, beta: Math.PI / 10, radius: endRadius, target: BABYLON.Vector3.Zero() },
            
            // Final contemplative close-up
            { alpha: -Math.PI / 2 + Math.PI * 1.75, beta: Math.PI / 8, radius: closeRadius, target: faceTarget },
            
            // Return to wide establishing - full circle
            { alpha: -Math.PI / 2 + Math.PI * 2, beta: Math.PI / 6, radius: endRadius * 1.1, target: BABYLON.Vector3.Zero() },
          ];
          
          // Create animation keys for the entire sequence including target
          let currentFrame = 0;
          const allKeys: { [key: string]: BABYLON.IAnimationKey[] } = {
            radius: [],
            alpha: [],
            beta: [],
            targetX: [],
            targetY: [],
            targetZ: []
          };
          
          // Helper function to add target keys
          const addTargetKeys = (frame: number, target: BABYLON.Vector3) => {
            allKeys.targetX.push({ frame, value: target.x });
            allKeys.targetY.push({ frame, value: target.y });
            allKeys.targetZ.push({ frame, value: target.z });
          };
          
          // Helper function to update clipping planes based on camera distance
          // This ensures object is always in focal plane
          const updateClippingPlanes = (radius: number) => {
            // Near plane: close enough to see details, but not too close to clip the object
            camera.minZ = Math.max(radius * 0.01, 0.01);
            // Far plane: far enough to include entire scene
            camera.maxZ = Math.max(radius * 10, maxSize * 10, 1000);
          };
          
          // Dolly zoom entrance
          allKeys.radius.push({ frame: currentFrame, value: startRadius });
          allKeys.alpha.push({ frame: currentFrame, value: camera.alpha });
          allKeys.beta.push({ frame: currentFrame, value: camera.beta });
          addTargetKeys(currentFrame, BABYLON.Vector3.Zero());
          
          currentFrame += dollyFrames;
          const firstAngle = angleSequence[0];
          allKeys.radius.push({ frame: currentFrame, value: firstAngle.radius });
          allKeys.alpha.push({ frame: currentFrame, value: firstAngle.alpha });
          allKeys.beta.push({ frame: currentFrame, value: firstAngle.beta });
          addTargetKeys(currentFrame, firstAngle.target);
          // Update clipping planes for focal plane
          updateClippingPlanes(firstAngle.radius);
          
          // Add pause
          currentFrame += pauseFrames;
          allKeys.radius.push({ frame: currentFrame, value: firstAngle.radius });
          allKeys.alpha.push({ frame: currentFrame, value: firstAngle.alpha });
          allKeys.beta.push({ frame: currentFrame, value: firstAngle.beta });
          addTargetKeys(currentFrame, firstAngle.target);
          
          // Create multiple cameras for each angle - this allows smooth crossfading
          const angleCameras: BABYLON.ArcRotateCamera[] = [];
          for (let i = 0; i < angleSequence.length; i++) {
            const angle = angleSequence[i];
            const angleCam = new BABYLON.ArcRotateCamera(
              `angleCamera_${i}`,
              angle.alpha,
              angle.beta,
              angle.radius,
              angle.target.clone(),
              scene
            );
            angleCam.lowerRadiusLimit = Math.max(maxSize * 0.3, 0.5);
            angleCam.upperRadiusLimit = Math.max(maxSize * 4, 15);
            angleCam.wheelDeltaPercentage = 0.01;
            angleCam.fov = 0.8;
            angleCam.minZ = Math.max(angle.radius * 0.01, 0.01);
            angleCam.maxZ = Math.max(angle.radius * 10, maxSize * 10, 1000);
            angleCam.setTarget(angle.target);
            angleCam.detachControl(); // Don't allow manual control
            angleCameras.push(angleCam);
          }
          
          // Smooth camera blending system
          let currentAngleIndex = 0;
          let transitionStartTime = 0;
          let isTransitioning = false;
          // transitionDuration is already defined above
          
          // Ultra-smooth interpolation function (quintic smoothstep for even smoother transitions)
          // This creates a smoother curve than standard smoothstep
          const smootherstep = (t: number) => {
            // Clamp t to [0, 1]
            t = Math.max(0, Math.min(1, t));
            // Quintic smoothstep: 6t^5 - 15t^4 + 10t^3
            return t * t * t * (t * (t * 6 - 15) + 10);
          };
          
          // Alternative: Even smoother with double smoothstep
          const doubleSmoothstep = (t: number) => {
            t = Math.max(0, Math.min(1, t));
            const s = t * t * (3 - 2 * t); // Standard smoothstep
            return s * s * (3 - 2 * s); // Apply smoothstep again
          };
          
          // Use the smoothest interpolation
          const smoothstep = doubleSmoothstep;
          
          // Blend between two cameras with ultra-smooth interpolation
          const blendCameras = (fromIndex: number, toIndex: number, t: number) => {
            const fromCam = angleCameras[fromIndex];
            const toCam = angleCameras[toIndex];
            
            // Apply double smoothstep for ultra-smooth transitions
            // This creates a very smooth acceleration and deceleration curve
            const smoothT = smoothstep(t);
            
            // Use spherical linear interpolation (SLERP) for angles to avoid gimbal lock
            // For alpha and beta, we use standard lerp but with smooth easing
            camera.alpha = fromCam.alpha + (toCam.alpha - fromCam.alpha) * smoothT;
            camera.beta = fromCam.beta + (toCam.beta - fromCam.beta) * smoothT;
            
            // Smooth radius interpolation
            camera.radius = fromCam.radius + (toCam.radius - fromCam.radius) * smoothT;
            
            // Smooth target interpolation
            const targetX = fromCam.target.x + (toCam.target.x - fromCam.target.x) * smoothT;
            const targetY = fromCam.target.y + (toCam.target.y - fromCam.target.y) * smoothT;
            const targetZ = fromCam.target.z + (toCam.target.z - fromCam.target.z) * smoothT;
            camera.setTarget(new BABYLON.Vector3(targetX, targetY, targetZ));
            
            // Update clipping planes smoothly
            const fromMinZ = fromCam.minZ;
            const toMinZ = toCam.minZ;
            const fromMaxZ = fromCam.maxZ;
            const toMaxZ = toCam.maxZ;
            camera.minZ = fromMinZ + (toMinZ - fromMinZ) * smoothT;
            camera.maxZ = fromMaxZ + (toMaxZ - fromMaxZ) * smoothT;
          };
          
          // Animation timeline using multiple cameras
          let animationTime = 0;
          const timeline: Array<{ time: number; angleIndex: number; duration: number; type: 'hold' | 'transition' }> = [];
          
          // Dolly zoom to first angle
          timeline.push({ time: animationTime, angleIndex: 0, duration: dollyDuration, type: 'transition' });
          animationTime += dollyDuration;
          
          // Hold at first angle
          timeline.push({ time: animationTime, angleIndex: 0, duration: pauseDuration, type: 'hold' });
          animationTime += pauseDuration;
          
          // Add transitions and holds for all other angles with variable duration
          for (let i = 1; i < angleSequence.length; i++) {
            const angle = angleSequence[i];
            const transitionDur = getTransitionDuration(angle.radius); // Variable duration based on shot type
            
            // Transition to next angle
            timeline.push({ time: animationTime, angleIndex: i, duration: transitionDur, type: 'transition' });
            animationTime += transitionDur;
            
            // Hold at this angle
            timeline.push({ time: animationTime, angleIndex: i, duration: pauseDuration, type: 'hold' });
            animationTime += pauseDuration;
          }
          
          // Animation loop that blends between cameras
          let startTime = Date.now();
          const animateCameraBlend = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const loopTime = elapsed % animationTime; // Loop the animation
            
            // Find current timeline segment
            let currentSegment = timeline[0];
            for (let i = timeline.length - 1; i >= 0; i--) {
              if (loopTime >= timeline[i].time) {
                currentSegment = timeline[i];
                break;
              }
            }
            
            const segmentStart = currentSegment.time;
            const segmentEnd = currentSegment.time + currentSegment.duration;
            const segmentProgress = Math.min(1, Math.max(0, (loopTime - segmentStart) / currentSegment.duration));
            
            // Find previous segment for blending
            const segmentIndex = timeline.indexOf(currentSegment);
            const prevSegment = segmentIndex > 0 ? timeline[segmentIndex - 1] : currentSegment;
            
            if (currentSegment.type === 'transition' && segmentIndex > 0) {
              // Blend from previous to current camera
              blendCameras(prevSegment.angleIndex, currentSegment.angleIndex, segmentProgress);
              
              // Eye-tracking in close-up shots: adjust target to follow eyes if available
              const currentAngle = angleSequence[currentSegment.angleIndex];
              if (currentAngle.radius < closeRadius && (leftEyeTarget || rightEyeTarget)) {
                // In close-ups, smoothly track between eyes or focus on face
                const eyeTarget = currentAngle.target;
                if (eyeTarget && leftEyeTarget && rightEyeTarget && 
                    (eyeTarget.equals(leftEyeTarget) || eyeTarget.equals(rightEyeTarget))) {
                  // Already targeting an eye, keep it
                  camera.setTarget(eyeTarget);
                } else if (leftEyeTarget && rightEyeTarget) {
                  // Blend between eyes for smooth eye-tracking
                  const eyeBlend = Math.sin(segmentProgress * Math.PI) * 0.3; // Subtle eye movement
                  const blendedEyeX = leftEyeTarget.x + (rightEyeTarget.x - leftEyeTarget.x) * (0.5 + eyeBlend);
                  const eyeTargetY = (leftEyeTarget.y + rightEyeTarget.y) / 2;
                  const eyeTargetZ = (leftEyeTarget.z + rightEyeTarget.z) / 2;
                  const blendedEyeTarget = new BABYLON.Vector3(blendedEyeX, eyeTargetY, eyeTargetZ);
                  // Blend between face target and eye target
                  const faceEyeBlend = 0.3; // 30% towards eye target
                  const finalTarget = new BABYLON.Vector3(
                    faceTarget.x + (blendedEyeTarget.x - faceTarget.x) * faceEyeBlend,
                    faceTarget.y + (blendedEyeTarget.y - faceTarget.y) * faceEyeBlend,
                    faceTarget.z + (blendedEyeTarget.z - faceTarget.z) * faceEyeBlend
                  );
                  camera.setTarget(finalTarget);
                }
              }
            } else {
              // Hold at current camera position
              const targetCam = angleCameras[currentSegment.angleIndex];
              camera.alpha = targetCam.alpha;
              camera.beta = targetCam.beta;
              camera.radius = targetCam.radius;
              camera.setTarget(targetCam.target.clone());
              camera.minZ = targetCam.minZ;
              camera.maxZ = targetCam.maxZ;
            }
          };
          
          // Register the smooth camera blend animation (this is the primary animation system)
          const animateCameraBlendObserver = scene.onBeforeRenderObservable.add(animateCameraBlend);
          
          // Note: The keyframe animations below are kept for compatibility but are not used
          // since animateCameraBlend handles all camera movement with smooth blending
          // Angle sequence
          for (let i = 1; i < angleSequence.length; i++) {
            const angle = angleSequence[i];
            
            // Transition to new angle with smooth intermediate steps
            const steps = 10; // More steps for smoother transitions
            const transitionDur = getTransitionDuration(angle.radius); // Use variable duration
            const transitionFrames = transitionDur * fps; // Calculate transition frames
            for (let step = 1; step <= steps; step++) {
              const progress = step / steps;
              const smoothProgress = smoothstep(progress);
              const prevAngle = angleSequence[i - 1];
              
              currentFrame += Math.floor(transitionFrames / steps);
              allKeys.radius.push({ 
                frame: currentFrame, 
                value: prevAngle.radius + (angle.radius - prevAngle.radius) * smoothProgress 
              });
              allKeys.alpha.push({ 
                frame: currentFrame, 
                value: prevAngle.alpha + (angle.alpha - prevAngle.alpha) * smoothProgress 
              });
              allKeys.beta.push({ 
                frame: currentFrame, 
                value: prevAngle.beta + (angle.beta - prevAngle.beta) * smoothProgress 
              });
              
              const targetX = prevAngle.target.x + (angle.target.x - prevAngle.target.x) * smoothProgress;
              const targetY = prevAngle.target.y + (angle.target.y - prevAngle.target.y) * smoothProgress;
              const targetZ = prevAngle.target.z + (angle.target.z - prevAngle.target.z) * smoothProgress;
              addTargetKeys(currentFrame, new BABYLON.Vector3(targetX, targetY, targetZ));
            }
            
            // Hold at this angle
            currentFrame += pauseFrames;
            allKeys.radius.push({ frame: currentFrame, value: angle.radius });
            allKeys.alpha.push({ frame: currentFrame, value: angle.alpha });
            allKeys.beta.push({ frame: currentFrame, value: angle.beta });
            addTargetKeys(currentFrame, angle.target);
          }
          
          // Create animations with loop mode
          const radiusAnim = new BABYLON.Animation(
            'cameraRadius',
            'radius',
            fps,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          radiusAnim.setKeys(allKeys.radius);
          
          const alphaAnim = new BABYLON.Animation(
            'cameraAlpha',
            'alpha',
            fps,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          alphaAnim.setKeys(allKeys.alpha);
          
          const betaAnim = new BABYLON.Animation(
            'cameraBeta',
            'beta',
            fps,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          betaAnim.setKeys(allKeys.beta);
          
          // Create target animations
          const targetXAnim = new BABYLON.Animation(
            'cameraTargetX',
            'target.x',
            fps,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          targetXAnim.setKeys(allKeys.targetX);
          
          const targetYAnim = new BABYLON.Animation(
            'cameraTargetY',
            'target.y',
            fps,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          targetYAnim.setKeys(allKeys.targetY);
          
          const targetZAnim = new BABYLON.Animation(
            'cameraTargetZ',
            'target.z',
            fps,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          targetZAnim.setKeys(allKeys.targetZ);
          
          // Apply ultra-smooth easing for cinematic movement
          // Use CircleEase for the smoothest, most natural transitions (ease-in-out with smooth curve)
          const easing = new BABYLON.CircleEase();
          easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
          
          // Alternative: Use ElasticEase for very smooth, organic feeling transitions
          // const easing = new BABYLON.ElasticEase();
          // easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
          // easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
          // easing.oscillations = 1;
          // easing.springiness = 3;
          
          // Apply easing to all animations
          radiusAnim.setEasingFunction(easing);
          alphaAnim.setEasingFunction(easing);
          betaAnim.setEasingFunction(easing);
          targetXAnim.setEasingFunction(easing);
          targetYAnim.setEasingFunction(easing);
          targetZAnim.setEasingFunction(easing);
          
          // Set animation speed multiplier for even smoother transitions
          radiusAnim.framePerSecond = fps;
          alphaAnim.framePerSecond = fps;
          betaAnim.framePerSecond = fps;
          targetXAnim.framePerSecond = fps;
          targetYAnim.framePerSecond = fps;
          targetZAnim.framePerSecond = fps;
          
          // Start animation
          camera.animations = [radiusAnim, alphaAnim, betaAnim, targetXAnim, targetYAnim, targetZAnim];
          
          // Update clipping planes dynamically during animation to keep object in focal plane
          const originalOnAnimationEnd = camera.onAnimationEnd;
          camera.onAnimationEnd = () => {
            if (originalOnAnimationEnd) {
              originalOnAnimationEnd();
            }
            // Update clipping planes based on current camera radius
            updateClippingPlanes(camera.radius);
          };
          
          // Also update clipping planes on each frame during animation
          const updateOnFrame = () => {
            if (camera.animations && camera.animations.length > 0) {
              updateClippingPlanes(camera.radius);
            }
          };
          
          // Register for scene render loop to update clipping planes
          const updateOnFrameObserver = scene.onBeforeRenderObservable.add(updateOnFrame);
          
          // Store observers for cleanup
          (scene as any)._previewObservers = [
            animateCameraBlendObserver,
            updateOnFrameObserver
          ];
          
          // Note: animateCameraBlend handles all camera animation with smooth looping
          // The keyframe animations are created but not started since blend system is primary
          // If you want to use keyframe animations instead, uncomment the line below:
          // scene.beginAnimation(camera, 0, currentFrame, true, 1.0);

          setLoading(false);
        } catch (error: any) {
          console.error('Error loading model:', error);
          const err = new Error(error.message || 'Kunne ikke laste modell');
          setError(err.message);
          setLoading(false);
          onError?.(err);
        }
      })();
    }

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup function
    const cleanup = () => {
      // Stop render loop
      if (engineRef.current) {
        engineRef.current.stopRenderLoop();
      }
      
      // Remove all observables and event listeners
      if (sceneRef.current) {
        // Remove observables before disposing
        const observers = (sceneRef.current as any)._previewObservers;
        if (observers && Array.isArray(observers)) {
          observers.forEach((observer: any) => {
            if (observer && sceneRef.current) {
              sceneRef.current.onBeforeRenderObservable.remove(observer);
            }
          });
        }
        // Dispose all meshes, materials, textures, etc.
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
      
      // Dispose engine (this also disposes the WebGL context)
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      
      // Remove resize listener
      window.removeEventListener('resize', handleResize);
    };
    
    // Return cleanup function
    return cleanup;
  }, [modelUrl, showWaiting, onError]);

  // Always show something, even if not initialized
  const shouldShowWaiting = showWaiting && !modelUrl;
  const shouldShowLoading = loading && modelUrl;
  
  return (
      <Box
        sx={{
          width: '100%',
          height: height,
          minHeight: height,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'rgba(0,0,0,0.3)',
          border: '2px solid rgba(139,92,246,0.3)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Cinematic letterbox bars (black bars top and bottom)
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0))',
            zIndex: 10,
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))',
            zIndex: 10,
            pointerEvents: 'none',
          },
        }}
      >
      {/* Always show something - fallback if nothing else is showing */}
      {!shouldShowWaiting && !shouldShowLoading && !error && !modelUrl && (
        <Box sx={{ 
          position: 'absolute', 
          zIndex: 5, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 2,
          width: '100%',
          height: '100%',
          bgcolor: 'rgba(10, 10, 20, 0.8)',
        }}>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#e0e0e0', 
              textAlign: 'center', 
              fontSize: '1.125rem',
              fontWeight: 500,
              lineHeight: 1.6,
              px: 2,
            }}
          >
            {waitingMessage}
          </Typography>
        </Box>
      )}
      {showWaiting && !modelUrl && (
        <Box sx={{ 
          position: 'absolute', 
          zIndex: 10, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 2,
          width: '100%',
          height: '100%',
          bgcolor: 'rgba(0,0,0,0.5)',
          borderRadius: 2,
        }}>
          <CircularProgress size={50} sx={{ color: '#8b5cf6' }} />
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#e0e0e0', 
              textAlign: 'center', 
              fontSize: '1.125rem',
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            {waitingMessage}
          </Typography>
        </Box>
      )}
      {loading && modelUrl && (
        <Box sx={{ 
          position: 'absolute', 
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          width: '100%',
          height: '100%',
          bgcolor: 'rgba(0,0,0,0.5)',
          borderRadius: 2,
        }}>
          <CircularProgress size={50} sx={{ color: '#8b5cf6' }} />
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#e0e0e0', 
              textAlign: 'center', 
              fontSize: '1.125rem',
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            Laster modell...
          </Typography>
        </Box>
      )}
      {error && (
        <Box sx={{ position: 'absolute', zIndex: 10, p: 2 }}>
          <Typography variant="body2" sx={{ color: '#ff6b6b', textAlign: 'center', fontSize: '1rem' }}>
            {error}
          </Typography>
        </Box>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          backgroundColor: 'rgba(10, 10, 20, 1)',
        }}
      />
    </Box>
  );
};

export default ModelPreview;

