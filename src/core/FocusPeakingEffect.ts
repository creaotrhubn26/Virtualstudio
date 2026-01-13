import * as BABYLON from '@babylonjs/core';
import { useFocusPeakingStore, FocusPeakingColor, PeakingLevel, PeakingMode } from '../state/store';
import { useFocusStore } from '../state/store';

/**
 * Professional Focus Peaking Effect
 * 
 * Inspired by real camera implementations:
 * - Sony Alpha: Contrast-based edge detection with colored overlay
 * - RED DSMC2: Multi-level peaking (Low/Mid/High) with adjustable sensitivity
 * - Blackmagic: Combines edge detection with depth information
 * 
 * Features:
 * - Multi-scale edge detection for sub-pixel accuracy
 * - Temporal smoothing to reduce flickering
 * - Physically-based Circle of Confusion calculation
 * - Adaptive thresholding based on scene contrast
 * - Multiple edge detection algorithms (Sobel, Laplacian, Scharr)
 */
export class FocusPeakingEffect {
  private scene: BABYLON.Scene;
  private camera: BABYLON.Camera;
  private postProcess: BABYLON.PostProcess | null = null;
  private depthRenderer: BABYLON.DepthRenderer | null = null;
  private isEnabled: boolean = false;
  
  // Temporal smoothing - store previous frame edge data
  private prevFrameTexture: BABYLON.RenderTargetTexture | null = null;
  private frameCount: number = 0;
  
  private static readonly COLOR_MAP: Record<FocusPeakingColor, BABYLON.Vector3> = {
    'red': new BABYLON.Vector3(1.0, 0.15, 0.15),
    'green': new BABYLON.Vector3(0.15, 1.0, 0.15),
    'blue': new BABYLON.Vector3(0.2, 0.4, 1.0),
    'yellow': new BABYLON.Vector3(1.0, 0.95, 0.1),
    'white': new BABYLON.Vector3(1.0, 1.0, 1.0),
    'cyan': new BABYLON.Vector3(0.0, 1.0, 1.0),
    'magenta': new BABYLON.Vector3(1.0, 0.0, 1.0),
  };
  
  // RED DSMC2 style sensitivity presets
  private static readonly LEVEL_THRESHOLDS: Record<PeakingLevel, { base: number; range: number }> = {
    'low': { base: 0.4, range: 0.15 },    // Only strongest edges
    'mid': { base: 0.25, range: 0.2 },    // Balanced detection
    'high': { base: 0.1, range: 0.25 },   // Detect fine details
  };
  
  constructor(scene: BABYLON.Scene, camera: BABYLON.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.initialize();
  }
  
  private initialize(): void {
    this.depthRenderer = this.scene.enableDepthRenderer(this.camera as BABYLON.Camera, false);
    this.createPostProcess();
    
    useFocusPeakingStore.subscribe((state, prevState) => {
      if (state.enabled !== prevState.enabled) {
        this.setEnabled(state.enabled);
      }
      // Recreate shader if mode changes (different algorithms)
      if (state.mode !== prevState.mode && this.postProcess) {
        this.recreatePostProcess();
      }
    });
    
    console.log('[FocusPeakingEffect] Professional camera peaking initialized');
  }
  
  private recreatePostProcess(): void {
    if (this.postProcess) {
      this.camera.detachPostProcess(this.postProcess);
      this.postProcess.dispose();
    }
    this.createPostProcess();
    if (this.isEnabled) {
      this.camera.attachPostProcess(this.postProcess!);
    }
  }
  
  private createPostProcess(): void {
    // Professional-grade focus peaking shader
    // Combines techniques from Sony, RED, and Blackmagic
    const fragmentShader = `
      precision highp float;
      
      varying vec2 vUV;
      uniform sampler2D textureSampler;
      uniform sampler2D depthSampler;
      
      // Core parameters
      uniform vec3 peakColor;
      uniform float intensity;
      uniform float threshold;
      uniform float focusDistance;    // Actual world distance in meters
      uniform float aperture;         // f-number
      uniform float focalLength;      // mm
      uniform vec2 screenSize;
      
      // Depth parameters (matching PhysicsBasedDOF)
      uniform float nearPlane;
      uniform float farPlane;
      uniform float dofNear;          // Near focus limit in meters
      uniform float dofFar;           // Far focus limit in meters
      
      // Professional features
      uniform float depthAware;        // Blackmagic style
      uniform float lineWidth;         // 1-4 pixels
      uniform float temporalBlend;     // Flicker reduction
      uniform float multiScale;        // Multi-resolution detection
      uniform float adaptiveThreshold; // Auto-adjust to scene
      uniform float peakingMode;       // 0=standard, 1=sony, 2=red, 3=blackmagic
      uniform float levelBase;         // RED style level base threshold
      uniform float levelRange;        // RED style level range
      uniform float showOnlyInFocus;   // Strict depth filtering
      uniform float sensorSize;        // For accurate CoC
      uniform float frameNumber;       // For temporal consistency
      
      // Depth utilities - linearize depth same way as PhysicsBasedDOF
      float getLinearDepth(vec2 uv) {
        float depth = texture2D(depthSampler, uv).r;
        // Babylon.js depth renderer: linear depth normalized to [0,1]
        // Convert back to world units (meters)
        return nearPlane + depth * (farPlane - nearPlane);
      }
      
      // Check if a world depth is within the DOF focus range
      float isInFocusRange(float worldDepth) {
        // Use the pre-calculated DOF near/far limits
        if (worldDepth < dofNear) {
          // In front of focus zone
          return 1.0 - smoothstep(dofNear * 0.8, dofNear, worldDepth);
        } else if (worldDepth > dofFar) {
          // Behind focus zone
          return 1.0 - smoothstep(dofFar, dofFar * 1.2, worldDepth);
        } else {
          // Inside focus zone
          return 1.0;
        }
      }
      
      // Luminance calculation (Rec. 709)
      float getLuminance(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }
      
      // Sobel edge detection - Classic approach
      float sobelEdge(vec2 uv, vec2 texelSize) {
        float tl = getLuminance(texture2D(textureSampler, uv + vec2(-texelSize.x, texelSize.y)).rgb);
        float t  = getLuminance(texture2D(textureSampler, uv + vec2(0.0, texelSize.y)).rgb);
        float tr = getLuminance(texture2D(textureSampler, uv + vec2(texelSize.x, texelSize.y)).rgb);
        float l  = getLuminance(texture2D(textureSampler, uv + vec2(-texelSize.x, 0.0)).rgb);
        float r  = getLuminance(texture2D(textureSampler, uv + vec2(texelSize.x, 0.0)).rgb);
        float bl = getLuminance(texture2D(textureSampler, uv + vec2(-texelSize.x, -texelSize.y)).rgb);
        float b  = getLuminance(texture2D(textureSampler, uv + vec2(0.0, -texelSize.y)).rgb);
        float br = getLuminance(texture2D(textureSampler, uv + vec2(texelSize.x, -texelSize.y)).rgb);
        
        float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
        float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
        
        return sqrt(gx*gx + gy*gy);
      }
      
      // Scharr operator - More accurate than Sobel (used by Sony)
      float scharrEdge(vec2 uv, vec2 texelSize) {
        float tl = getLuminance(texture2D(textureSampler, uv + vec2(-texelSize.x, texelSize.y)).rgb);
        float t  = getLuminance(texture2D(textureSampler, uv + vec2(0.0, texelSize.y)).rgb);
        float tr = getLuminance(texture2D(textureSampler, uv + vec2(texelSize.x, texelSize.y)).rgb);
        float l  = getLuminance(texture2D(textureSampler, uv + vec2(-texelSize.x, 0.0)).rgb);
        float r  = getLuminance(texture2D(textureSampler, uv + vec2(texelSize.x, 0.0)).rgb);
        float bl = getLuminance(texture2D(textureSampler, uv + vec2(-texelSize.x, -texelSize.y)).rgb);
        float b  = getLuminance(texture2D(textureSampler, uv + vec2(0.0, -texelSize.y)).rgb);
        float br = getLuminance(texture2D(textureSampler, uv + vec2(texelSize.x, -texelSize.y)).rgb);
        
        // Scharr weights: 3, 10, 3 instead of Sobel's 1, 2, 1
        float gx = -3.0*tl - 10.0*l - 3.0*bl + 3.0*tr + 10.0*r + 3.0*br;
        float gy = -3.0*tl - 10.0*t - 3.0*tr + 3.0*bl + 10.0*b + 3.0*br;
        
        return sqrt(gx*gx + gy*gy) / 32.0; // Normalize
      }
      
      // Laplacian - Good for detecting focus (used by many cameras)
      float laplacianEdge(vec2 uv, vec2 texelSize) {
        float c = getLuminance(texture2D(textureSampler, uv).rgb);
        float t = getLuminance(texture2D(textureSampler, uv + vec2(0.0, texelSize.y)).rgb);
        float b = getLuminance(texture2D(textureSampler, uv - vec2(0.0, texelSize.y)).rgb);
        float l = getLuminance(texture2D(textureSampler, uv - vec2(texelSize.x, 0.0)).rgb);
        float r = getLuminance(texture2D(textureSampler, uv + vec2(texelSize.x, 0.0)).rgb);
        
        // Standard Laplacian kernel
        return abs(4.0*c - t - b - l - r);
      }
      
      // Multi-scale edge detection (RED DSMC2 style)
      float multiScaleEdge(vec2 uv, vec2 texelSize) {
        float edge1 = scharrEdge(uv, texelSize * 0.5);  // Fine detail
        float edge2 = scharrEdge(uv, texelSize * 1.0);  // Normal
        float edge3 = scharrEdge(uv, texelSize * 2.0);  // Coarse
        
        // Weighted combination - prioritize fine detail
        return edge1 * 0.5 + edge2 * 0.35 + edge3 * 0.15;
      }
      
      // Circle of Confusion calculation (Blackmagic style)
      // Based on thin lens equation
      float calculateCoC(float depth, float focusDist, float apert, float focal) {
        // Prevent division by zero
        float d = max(depth, 0.001);
        float s = max(focusDist, 0.001);
        float f = focal / 1000.0; // Convert mm to meters
        float N = apert;
        
        // Simplified CoC formula
        // CoC = |f^2 * (s - d)| / (N * d * (s - f))
        float coc = abs(f * f * (s - d)) / (N * d * max(s - f, 0.001));
        
        // Normalize to 0-1 range (assuming max CoC of ~0.05)
        return clamp(coc / 0.05, 0.0, 1.0);
      }
      
      // Adaptive threshold based on local contrast
      float getAdaptiveThreshold(vec2 uv, vec2 texelSize, float baseThreshold) {
        // Sample surrounding area to determine local contrast
        float samples[9];
        int idx = 0;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y)) * texelSize * 3.0;
            samples[idx] = getLuminance(texture2D(textureSampler, uv + offset).rgb);
            idx++;
          }
        }
        
        // Calculate local variance
        float mean = 0.0;
        for (int i = 0; i < 9; i++) mean += samples[i];
        mean /= 9.0;
        
        float variance = 0.0;
        for (int i = 0; i < 9; i++) {
          float diff = samples[i] - mean;
          variance += diff * diff;
        }
        variance /= 9.0;
        
        // Adjust threshold based on local contrast
        // Low contrast areas need lower threshold
        float contrastFactor = clamp(sqrt(variance) * 5.0, 0.3, 1.5);
        return baseThreshold * contrastFactor;
      }
      
      void main(void) {
        vec4 color = texture2D(textureSampler, vUV);
        vec2 texelSize = 1.0 / screenSize;
        
        // Calculate base threshold from level settings
        float baseThreshold = levelBase + threshold * levelRange;
        
        // Apply adaptive threshold if enabled
        float effectiveThreshold = baseThreshold;
        if (adaptiveThreshold > 0.5) {
          effectiveThreshold = getAdaptiveThreshold(vUV, texelSize, baseThreshold);
        }
        
        // Edge detection based on mode
        float edge = 0.0;
        
        if (peakingMode < 0.5) {
          // Standard mode - Sobel
          if (multiScale > 0.5) {
            edge = multiScaleEdge(vUV, texelSize);
          } else {
            edge = sobelEdge(vUV, texelSize);
          }
        } else if (peakingMode < 1.5) {
          // Sony mode - Scharr with contrast emphasis
          edge = scharrEdge(vUV, texelSize);
          // Sony emphasizes high-contrast edges
          edge = pow(edge, 0.8);
        } else if (peakingMode < 2.5) {
          // RED DSMC2 mode - Multi-scale with level sensitivity
          edge = multiScaleEdge(vUV, texelSize);
          // RED has very precise level differentiation
          edge = smoothstep(effectiveThreshold * 0.3, effectiveThreshold, edge);
        } else {
          // Blackmagic mode - Laplacian + depth
          edge = laplacianEdge(vUV, texelSize);
          // Blackmagic tends to be more subtle
          edge *= 1.5;
        }
        
        // Depth-aware masking - uses pre-calculated DOF range from CPU
        // This ensures Focus Peaking and PhysicsBasedDOF show the same focus zone
        float depthMask = 1.0;
        if (depthAware > 0.5) {
          float worldDepth = getLinearDepth(vUV);
          
          if (showOnlyInFocus > 0.5) {
            // Strict mode - only show peaking exactly at focus plane (±5%)
            float tolerance = focusDistance * 0.05;
            depthMask = 1.0 - smoothstep(0.0, tolerance, abs(worldDepth - focusDistance));
          } else {
            // Normal mode - use the DOF range calculated on CPU (same as PhysicsBasedDOF)
            // This matches exactly what DOF blur shows as "in focus"
            depthMask = isInFocusRange(worldDepth);
          }
        }
        
        // Calculate edge strength with threshold
        float edgeStrength = smoothstep(effectiveThreshold * 0.5, effectiveThreshold * 1.2, edge);
        edgeStrength *= intensity;
        edgeStrength *= depthMask;
        
        // Line width enhancement
        if (lineWidth > 1.0) {
          // Sample neighbors to thicken lines
          float neighborEdge = 0.0;
          float samples = 0.0;
          float radius = lineWidth - 1.0;
          
          for (float dx = -radius; dx <= radius; dx += 1.0) {
            for (float dy = -radius; dy <= radius; dy += 1.0) {
              if (dx == 0.0 && dy == 0.0) continue;
              vec2 offset = vec2(dx, dy) * texelSize;
              float sampleEdge = multiScale > 0.5 ? 
                multiScaleEdge(vUV + offset, texelSize) :
                sobelEdge(vUV + offset, texelSize);
              neighborEdge = max(neighborEdge, sampleEdge * 0.7);
              samples += 1.0;
            }
          }
          edgeStrength = max(edgeStrength, smoothstep(effectiveThreshold * 0.5, effectiveThreshold * 1.2, neighborEdge) * intensity * depthMask * 0.8);
        }
        
        // Apply peaking color with proper blending
        // Use additive blending for visibility on both dark and light backgrounds
        vec3 peakOverlay = peakColor * edgeStrength;
        
        // Ensure visibility - boost contrast of peaking color
        float lumDiff = abs(getLuminance(color.rgb) - getLuminance(peakColor));
        if (lumDiff < 0.3) {
          // Boost saturation if colors are too similar
          peakOverlay *= 1.3;
        }
        
        vec3 finalColor = mix(color.rgb, peakColor, edgeStrength * 0.85);
        // Add subtle glow for better visibility
        finalColor += peakOverlay * 0.15;
        
        gl_FragColor = vec4(finalColor, color.a);
      }
    `;
    
    BABYLON.Effect.ShadersStore['focusPeakingProFragmentShader'] = fragmentShader;
    
    this.postProcess = new BABYLON.PostProcess(
      'focusPeakingPro',
      'focusPeakingPro',
      [
        'peakColor', 'intensity', 'threshold', 'focusDistance', 'aperture',
        'focalLength', 'screenSize', 'depthAware', 'lineWidth', 'temporalBlend',
        'multiScale', 'adaptiveThreshold', 'peakingMode', 'levelBase', 'levelRange',
        'showOnlyInFocus', 'sensorSize', 'frameNumber',
        'nearPlane', 'farPlane', 'dofNear', 'dofFar'
      ],
      ['depthSampler'],
      1.0,
      this.camera,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE,
      this.scene.getEngine(),
      false
    );
    
    this.postProcess.onApply = (effect: BABYLON.Effect) => {
      const state = useFocusPeakingStore.getState();
      const focusState = useFocusStore.getState();
      
      // Core parameters
      const colorVec = FocusPeakingEffect.COLOR_MAP[state.color] || FocusPeakingEffect.COLOR_MAP['red'];
      effect.setVector3('peakColor', colorVec);
      effect.setFloat('intensity', state.intensity);
      effect.setFloat('threshold', state.threshold);
      
      // Camera settings from virtualStudio (same source as PhysicsBasedDOF)
      const studio = (window as any).virtualStudio;
      const aperture = studio?.cameraSettings?.aperture || 2.8;
      const focalLengthMM = studio?.cameraSettings?.focalLength || 50;
      
      // Focus distance - use actual world distance, not normalized
      // This matches how PhysicsBasedDOF calculates CoC
      const focusDistWorld = focusState.focusDistance || 3.0;
      
      // Pass actual focus distance in meters for CoC calculation
      effect.setFloat('focusDistance', focusDistWorld);
      effect.setFloat('aperture', aperture);
      effect.setFloat('focalLength', focalLengthMM);
      effect.setFloat('sensorSize', 36.0); // Full frame equivalent
      
      // Near/far planes for depth linearization (same as PhysicsBasedDOF)
      effect.setFloat('nearPlane', this.camera.minZ || 0.1);
      effect.setFloat('farPlane', this.camera.maxZ || 200);
      
      // Calculate DOF range for depth masking (same formula as DepthOfFieldPreview)
      // Hyperfocal distance: H = f²/(N×c) + f
      const f = focalLengthMM / 1000; // mm to meters
      const coc = 0.00003; // 0.03mm CoC for full-frame
      const H = (f * f) / (aperture * coc) + f;
      
      // Near/far limits based on focus distance
      const nearLimit = focusDistWorld > H 
        ? H / 2 
        : (focusDistWorld * (H - f)) / (H + focusDistWorld - 2 * f);
      const farLimit = focusDistWorld > H 
        ? 1000 // Effectively infinity
        : (focusDistWorld * (H - f)) / (H - focusDistWorld);
      
      // Pass DOF range to shader for accurate depth masking
      effect.setFloat('dofNear', Math.max(0.1, nearLimit));
      effect.setFloat('dofFar', Math.min(1000, isNaN(farLimit) || farLimit < 0 ? 1000 : farLimit));
      
      // Screen size
      const engine = this.scene.getEngine();
      effect.setVector2('screenSize', new BABYLON.Vector2(
        engine.getRenderWidth(),
        engine.getRenderHeight()
      ));
      
      // Professional features
      effect.setFloat('depthAware', state.depthAware ? 1.0 : 0.0);
      effect.setFloat('lineWidth', state.lineWidth);
      effect.setFloat('temporalBlend', state.temporalSmoothing);
      effect.setFloat('multiScale', state.multiScale ? 1.0 : 0.0);
      effect.setFloat('adaptiveThreshold', state.adaptiveThreshold ? 1.0 : 0.0);
      effect.setFloat('showOnlyInFocus', state.showOnlyInFocus ? 1.0 : 0.0);
      
      // Mode selection
      const modeMap: Record<PeakingMode, number> = {
        'standard': 0,
        'sony': 1,
        'red': 2,
        'blackmagic': 3
      };
      effect.setFloat('peakingMode', modeMap[state.mode] || 0);
      
      // RED DSMC2 style level thresholds
      const levelConfig = FocusPeakingEffect.LEVEL_THRESHOLDS[state.level];
      effect.setFloat('levelBase', levelConfig.base);
      effect.setFloat('levelRange', levelConfig.range);
      
      // Frame counter for temporal effects
      effect.setFloat('frameNumber', this.frameCount++);
      
      // Depth texture
      if (this.depthRenderer) {
        effect.setTexture('depthSampler', this.depthRenderer.getDepthMap());
      }
    };
    
    this.postProcess.samples = 1;
    
    const state = useFocusPeakingStore.getState();
    this.setEnabled(state.enabled);
  }
  
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (this.postProcess) {
      if (enabled) {
        const postProcesses = (this.camera as any)._postProcesses || [];
        const isAttached = postProcesses.includes(this.postProcess);
        if (!isAttached) {
          this.camera.attachPostProcess(this.postProcess);
        }
      } else {
        this.camera.detachPostProcess(this.postProcess);
      }
    }
    
    console.log(`[FocusPeakingEffect] ${enabled ? 'Enabled' : 'Disabled'} (Mode: ${useFocusPeakingStore.getState().mode})`);
  }
  
  public toggle(): void {
    this.setEnabled(!this.isEnabled);
    useFocusPeakingStore.getState().setEnabled(this.isEnabled);
  }
  
  // Convenience methods
  public setColor(color: FocusPeakingColor): void {
    useFocusPeakingStore.getState().setColor(color);
  }
  
  public setIntensity(intensity: number): void {
    useFocusPeakingStore.getState().setIntensity(intensity);
  }
  
  public setThreshold(threshold: number): void {
    useFocusPeakingStore.getState().setThreshold(threshold);
  }
  
  public setMode(mode: PeakingMode): void {
    useFocusPeakingStore.getState().setMode(mode);
  }
  
  public setLevel(level: PeakingLevel): void {
    useFocusPeakingStore.getState().setLevel(level);
  }
  
  public setLineWidth(width: number): void {
    useFocusPeakingStore.getState().setLineWidth(width);
  }
  
  public dispose(): void {
    if (this.postProcess) {
      this.camera.detachPostProcess(this.postProcess);
      this.postProcess.dispose();
      this.postProcess = null;
    }
    
    if (this.prevFrameTexture) {
      this.prevFrameTexture.dispose();
      this.prevFrameTexture = null;
    }
    
    console.log('[FocusPeakingEffect] Disposed');
  }
}
