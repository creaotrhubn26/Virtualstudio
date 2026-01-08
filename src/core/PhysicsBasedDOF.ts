import * as BABYLON from '@babylonjs/core';
import { useFocusStore, useAutoFocusStore } from '../state/store';

export interface DOFCameraSettings {
  focalLength: number;      // mm
  fStop: number;            // f-number (e.g., 2.8, 4, 5.6)
  sensorWidth: number;      // mm (36mm for full-frame)
  cocLimit: number;         // Circle of Confusion limit in mm (0.03 for full-frame)
}

export class PhysicsBasedDOF {
  private scene: BABYLON.Scene;
  private camera: BABYLON.Camera;
  private cocPass: BABYLON.PostProcess | null = null;
  private blurPass: BABYLON.PostProcess | null = null;
  private depthRenderer: BABYLON.DepthRenderer | null = null;
  private _isEnabled: boolean = false;
  private lastDebugLog: number = 0;
  
  private settings: DOFCameraSettings = {
    focalLength: 50,
    fStop: 2.8,
    sensorWidth: 36,        // Full-frame sensor
    cocLimit: 0.03          // Standard CoC for full-frame
  };
  
  // Bokeh quality settings for cinematic look
  private bokehSettings = {
    bladeCount: 7,           // 0=circular, 5-9=polygonal (7 is common for cinema lenses)
    bladeRotation: 0.0,      // Rotation angle in radians
    highlightThreshold: 0.7, // Brightness level to trigger highlight bloom
    highlightGain: 2.0       // Intensity multiplier for bokeh balls
  };
  
  constructor(scene: BABYLON.Scene, camera: BABYLON.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.initialize();
  }
  
  private initialize(): void {
    this.depthRenderer = this.scene.enableDepthRenderer(this.camera, false, false);
    this.createShaders();
    this.createPostProcesses();
    
    // Subscribe to autofocus DOF toggle
    useAutoFocusStore.subscribe((state, prevState) => {
      if (state.dofEnabled !== prevState.dofEnabled) {
        this.setEnabled(state.dofEnabled);
      }
    });
    
    // Listen for camera aperture changes from the UI panel
    window.addEventListener('vs-aperture-changed', ((e: CustomEvent) => {
      const { aperture, focusDistance, enabled } = e.detail;
      this.settings.fStop = aperture;
      // Auto-enable DOF for wide apertures (f/5.6 or lower)
      const shouldEnable = enabled !== undefined ? enabled : (aperture <= 5.6);
      this.setEnabled(shouldEnable);
      console.log(`[PhysicsBasedDOF] Aperture changed: f/${aperture}, DOF ${shouldEnable ? 'enabled' : 'disabled'}`);
    }) as EventListener);
    
    // Auto-enable on startup if aperture is wide
    const studio = (window as any).virtualStudio;
    if (studio?.cameraSettings?.aperture) {
      const aperture = studio.cameraSettings.aperture;
      if (aperture <= 5.6) {
        this.setEnabled(true);
        console.log(`[PhysicsBasedDOF] Auto-enabled for f/${aperture}`);
      }
    }
    
    console.log('[PhysicsBasedDOF] Initialized with physically accurate CoC calculations');
  }
  
  private createShaders(): void {
    BABYLON.Effect.ShadersStore['cocCalculationFragmentShader'] = `
      precision highp float;
      
      varying vec2 vUV;
      uniform sampler2D textureSampler;
      uniform sampler2D depthSampler;
      
      uniform float focalLength;      // mm
      uniform float fStop;            // f-number
      uniform float focusDistance;    // meters
      uniform float sensorWidth;      // mm
      uniform float cocLimit;         // mm
      uniform float nearPlane;        // camera near plane
      uniform float farPlane;         // camera far plane
      uniform vec2 screenSize;
      
      float linearizeDepth(float depth) {
        // Babylon.js depth renderer stores linear depth normalized to [0,1] range
        // where 0 = near plane and 1 = far plane
        // So we just need to convert back to world units
        return nearPlane + depth * (farPlane - nearPlane);
      }
      
      float calculateCoC(float objectDistance, float focusDist, float f, float N) {
        float A = f / N;
        float S = focusDist * 1000.0;
        float D = objectDistance * 1000.0;
        
        if (D <= 0.001 || abs(S - f) < 0.001) return 0.0;
        
        float coc = abs(A * f * (S - D) / (D * (S - f)));
        
        return coc;
      }
      
      void main(void) {
        vec4 color = texture2D(textureSampler, vUV);
        float depth = texture2D(depthSampler, vUV).r;
        
        float objectDistance = linearizeDepth(depth);
        
        float coc = calculateCoC(objectDistance, focusDistance, focalLength, fStop);
        
        // Convert CoC in mm to pixels
        // Formula: pixelCoC = (coc_mm / sensorWidth_mm) * screenWidth_px
        // At CoC limit (0.03mm) on 36mm sensor at 3840px: 0.03/36*3840 = 3.2px
        float pixelCoC = (coc / sensorWidth) * screenSize.x;
        
        // Clamp max blur radius
        pixelCoC = min(pixelCoC, 40.0);
        
        float sign = (objectDistance < focusDistance) ? -1.0 : 1.0;
        float signedCoC = sign * pixelCoC;
        
        gl_FragColor = vec4(color.rgb, (signedCoC + 40.0) / 80.0);
      }
    `;
    
    BABYLON.Effect.ShadersStore['dofBlurFragmentShader'] = `
      precision highp float;
      
      varying vec2 vUV;
      uniform sampler2D textureSampler;
      
      uniform vec2 screenSize;
      uniform float blurScale;
      uniform float bladeCount;
      uniform float bladeRotation;
      uniform float highlightThreshold;
      uniform float highlightGain;
      
      #define PI 3.14159265359
      
      float getCoC(vec2 uv) {
        float encoded = texture2D(textureSampler, uv).a;
        return (encoded * 80.0) - 40.0;
      }
      
      float luminance(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }
      
      float apertureShape(vec2 point, float blades, float rotation) {
        if (blades < 3.0) {
          return length(point);
        }
        float angle = atan(point.y, point.x) + rotation;
        float segmentAngle = 2.0 * PI / blades;
        float halfSegment = segmentAngle * 0.5;
        float theta = mod(angle + halfSegment, segmentAngle) - halfSegment;
        float r = length(point);
        float polygonRadius = cos(halfSegment) / cos(theta);
        return r / polygonRadius;
      }
      
      void main(void) {
        vec2 texelSize = 1.0 / screenSize;
        float centerCoC = getCoC(vUV);
        float absCoC = abs(centerCoC);
        
        if (absCoC < 0.5) {
          vec4 color = texture2D(textureSampler, vUV);
          gl_FragColor = vec4(color.rgb, 1.0);
          return;
        }
        
        vec3 colorSum = vec3(0.0);
        vec3 highlightSum = vec3(0.0);
        float weightSum = 0.0;
        float highlightWeightSum = 0.0;
        float blurRadius = absCoC * blurScale;
        
        // 48 samples in concentric rings for smooth bokeh
        for (int i = 0; i < 48; i++) {
          float fi = float(i);
          float ring = floor(fi / 12.0);
          float sampleInRing = mod(fi, 12.0);
          float ringRadius = (ring + 1.0) / 4.0;
          float angle = (sampleInRing / 12.0) * 2.0 * PI + bladeRotation + ring * 0.5;
          
          vec2 samplePoint = vec2(cos(angle), sin(angle)) * ringRadius;
          float shapeMask = apertureShape(samplePoint, bladeCount, bladeRotation);
          
          if (shapeMask <= 1.0) {
            vec2 offset = samplePoint * blurRadius * texelSize;
            vec2 sampleUV = vUV + offset;
            
            if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
              vec4 sampleData = texture2D(textureSampler, sampleUV);
              vec3 sampleColor = sampleData.rgb;
              float sampleCoC = (sampleData.a * 80.0) - 40.0;
              
              float edgeWeight = 1.0 - smoothstep(0.7, 1.0, shapeMask);
              float weight = 1.0 + edgeWeight * 0.5;
              
              if (centerCoC < 0.0 && sampleCoC > 0.0) {
                weight *= 0.1;
              }
              if (abs(sampleCoC) < absCoC * 0.5) {
                weight *= 0.5;
              }
              
              float lum = luminance(sampleColor);
              if (lum > highlightThreshold) {
                float highlightBoost = (lum - highlightThreshold) * highlightGain;
                highlightSum += sampleColor * highlightBoost * weight;
                highlightWeightSum += highlightBoost * weight;
              }
              
              colorSum += sampleColor * weight;
              weightSum += weight;
            }
          }
        }
        
        vec4 centerData = texture2D(textureSampler, vUV);
        colorSum += centerData.rgb;
        weightSum += 1.0;
        
        vec3 blurredColor = colorSum / max(weightSum, 0.001);
        
        if (highlightWeightSum > 0.0) {
          vec3 highlights = highlightSum / highlightWeightSum;
          float highlightMix = min(highlightWeightSum / weightSum, 0.5);
          blurredColor = mix(blurredColor, blurredColor + highlights * 0.3, highlightMix);
        }
        
        vec3 sharpColor = centerData.rgb;
        float blendFactor = smoothstep(0.0, 3.0, absCoC);
        
        gl_FragColor = vec4(mix(sharpColor, blurredColor, blendFactor), 1.0);
      }
    `;
  }
  
  private createPostProcesses(): void {
    this.cocPass = new BABYLON.PostProcess(
      'cocCalculation',
      'cocCalculation',
      ['focalLength', 'fStop', 'focusDistance', 'sensorWidth', 'cocLimit', 'nearPlane', 'farPlane', 'screenSize'],
      ['depthSampler'],
      1.0,
      null,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE,
      this.scene.getEngine(),
      false,
      null,
      BABYLON.Constants.TEXTURETYPE_FLOAT
    );
    
    this.cocPass.onApply = (effect: BABYLON.Effect) => {
      const focusState = useFocusStore.getState();
      const studio = (window as any).virtualStudio;
      
      const focalLength = studio?.cameraSettings?.focalLength || this.settings.focalLength;
      const fStop = studio?.cameraSettings?.aperture || this.settings.fStop;
      const focusDistance = focusState.focusDistance || 3.0;
      
      effect.setFloat('focalLength', focalLength);
      effect.setFloat('fStop', fStop);
      effect.setFloat('focusDistance', focusDistance);
      effect.setFloat('sensorWidth', this.settings.sensorWidth);
      effect.setFloat('cocLimit', this.settings.cocLimit);
      effect.setFloat('nearPlane', this.camera.minZ);
      effect.setFloat('farPlane', this.camera.maxZ);
      
      // Debug logging disabled for performance (uncomment for debugging)
      // if (!this.lastDebugLog || Date.now() - this.lastDebugLog > 5000) {
      //   this.lastDebugLog = Date.now();
      //   console.log(`[DOF] f=${focalLength}mm, f/${fStop}, focus=${focusDistance.toFixed(2)}m`);
      // }
      
      const engine = this.scene.getEngine();
      effect.setVector2('screenSize', new BABYLON.Vector2(
        engine.getRenderWidth(),
        engine.getRenderHeight()
      ));
      
      if (this.depthRenderer) {
        effect.setTexture('depthSampler', this.depthRenderer.getDepthMap());
      }
    };
    
    // Performance optimization: Run blur at half resolution
    // This reduces texture reads by 4x (from 400M+ to ~100M at 4K)
    this.blurPass = new BABYLON.PostProcess(
      'dofBlur',
      'dofBlur',
      ['screenSize', 'blurScale', 'bladeCount', 'bladeRotation', 'highlightThreshold', 'highlightGain'],
      [],  // No extra samplers - textureSampler is the output from cocPass with CoC in alpha
      0.5,  // Half resolution for performance (was 1.0)
      null,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE,
      this.scene.getEngine(),
      false
    );
    
    this.blurPass.onApply = (effect: BABYLON.Effect) => {
      const engine = this.scene.getEngine();
      // Use actual post-process size (accounts for 0.5 ratio)
      // The blur pass runs at half resolution, so use actual render size
      const ppWidth = this.blurPass!.width;
      const ppHeight = this.blurPass!.height;
      effect.setVector2('screenSize', new BABYLON.Vector2(ppWidth, ppHeight));
      
      // Blur scale for artistic control
      effect.setFloat('blurScale', 3.0);
      
      // Bokeh quality settings
      effect.setFloat('bladeCount', this.bokehSettings.bladeCount);      // 0=circular, 5-9=polygonal
      effect.setFloat('bladeRotation', this.bokehSettings.bladeRotation); // Blade rotation angle
      effect.setFloat('highlightThreshold', this.bokehSettings.highlightThreshold); // Brightness for bokeh balls
      effect.setFloat('highlightGain', this.bokehSettings.highlightGain);  // Intensity of highlight bloom
    };
    
    const state = useAutoFocusStore.getState();
    this.setEnabled(state.dofEnabled);
  }
  
  public setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
    
    if (enabled) {
      if (this.cocPass) {
        const postProcesses = (this.camera as any)._postProcesses || [];
        if (!postProcesses.includes(this.cocPass)) {
          this.camera.attachPostProcess(this.cocPass);
        }
      }
      if (this.blurPass) {
        const postProcesses = (this.camera as any)._postProcesses || [];
        if (!postProcesses.includes(this.blurPass)) {
          this.camera.attachPostProcess(this.blurPass);
        }
      }
    } else {
      if (this.cocPass) {
        this.camera.detachPostProcess(this.cocPass);
      }
      if (this.blurPass) {
        this.camera.detachPostProcess(this.blurPass);
      }
    }
    
    console.log(`[PhysicsBasedDOF] ${enabled ? 'Enabled' : 'Disabled'}`);
  }
  
  public updateSettings(settings: Partial<DOFCameraSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }
  
  public isEnabled(): boolean {
    return this._isEnabled;
  }
  
  public getAperture(): number {
    return this.settings.fStop;
  }
  
  public setAperture(fStop: number): void {
    this.settings.fStop = fStop;
    // Also update virtualStudio.cameraSettings which is used by shader onApply
    const studio = (window as any).virtualStudio;
    if (studio?.cameraSettings) {
      studio.cameraSettings.aperture = fStop;
    }
    // Dispatch event to sync UI
    window.dispatchEvent(new CustomEvent('vs-dof-aperture-updated', { 
      detail: { aperture: fStop } 
    }));
  }
  
  public getFocusDistance(): number {
    const focusState = useFocusStore.getState();
    return focusState.focusDistance || 3.0;
  }
  
  public setFocusDistance(distance: number): void {
    useFocusStore.getState().setFocusDistance(distance);
    // Dispatch event to sync UI
    window.dispatchEvent(new CustomEvent('vs-dof-focus-updated', { 
      detail: { focusDistance: distance } 
    }));
  }
  
  public enable(): void {
    this.setEnabled(true);
  }
  
  public disable(): void {
    this.setEnabled(false);
  }
  
  public dispose(): void {
    if (this.cocPass) {
      this.camera.detachPostProcess(this.cocPass);
      this.cocPass.dispose();
      this.cocPass = null;
    }
    if (this.blurPass) {
      this.camera.detachPostProcess(this.blurPass);
      this.blurPass.dispose();
      this.blurPass = null;
    }
    
    console.log('[PhysicsBasedDOF] Disposed');
  }
}
