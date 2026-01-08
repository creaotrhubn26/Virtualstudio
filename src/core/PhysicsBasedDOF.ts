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
  private isEnabled: boolean = false;
  
  private settings: DOFCameraSettings = {
    focalLength: 50,
    fStop: 2.8,
    sensorWidth: 36,        // Full-frame sensor
    cocLimit: 0.03          // Standard CoC for full-frame
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
        return nearPlane * farPlane / (farPlane - depth * (farPlane - nearPlane));
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
      uniform sampler2D textureSampler;  // Output from cocPass (color.rgb + CoC in alpha)
      
      uniform vec2 screenSize;
      uniform float blurScale;
      
      const int SAMPLE_COUNT = 22;
      const vec2 poissonDisk[22] = vec2[](
        vec2(-0.94201624, -0.39906216),
        vec2(0.94558609, -0.76890725),
        vec2(-0.094184101, -0.92938870),
        vec2(0.34495938, 0.29387760),
        vec2(-0.91588581, 0.45771432),
        vec2(-0.81544232, -0.87912464),
        vec2(-0.38277543, 0.27676845),
        vec2(0.97484398, 0.75648379),
        vec2(0.44323325, -0.97511554),
        vec2(0.53742981, -0.47373420),
        vec2(-0.26496911, -0.41893023),
        vec2(0.79197514, 0.19090188),
        vec2(-0.24188840, 0.99706507),
        vec2(-0.81409955, 0.91437590),
        vec2(0.19984126, 0.78641367),
        vec2(0.14383161, -0.14100790),
        vec2(-0.44451373, -0.67137458),
        vec2(0.76634861, 0.53573570),
        vec2(-0.50000000, 0.50000000),
        vec2(0.10000000, -0.60000000),
        vec2(-0.70000000, -0.20000000),
        vec2(0.30000000, 0.80000000)
      );
      
      // Read signed CoC from alpha channel (encoded as (signedCoC + 40) / 80)
      float getCoC(vec2 uv) {
        float encoded = texture2D(textureSampler, uv).a;
        return (encoded * 80.0) - 40.0;
      }
      
      void main(void) {
        vec2 texelSize = 1.0 / screenSize;
        float centerCoC = getCoC(vUV);
        float absCoC = abs(centerCoC);
        
        // Skip blur for sharp areas
        if (absCoC < 0.5) {
          vec4 color = texture2D(textureSampler, vUV);
          gl_FragColor = vec4(color.rgb, 1.0);
          return;
        }
        
        vec4 colorSum = vec4(0.0);
        float weightSum = 0.0;
        
        float blurRadius = absCoC * blurScale;
        
        for (int i = 0; i < SAMPLE_COUNT; i++) {
          vec2 offset = poissonDisk[i] * blurRadius * texelSize;
          vec2 sampleUV = vUV + offset;
          
          if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) continue;
          
          vec4 sampleData = texture2D(textureSampler, sampleUV);
          vec3 sampleColor = sampleData.rgb;
          float sampleCoC = (sampleData.a * 80.0) - 40.0;
          
          float weight = 1.0;
          
          // Prevent background (positive CoC) from bleeding into foreground (negative CoC)
          if (centerCoC < 0.0 && sampleCoC > 0.0) {
            weight *= 0.1;
          }
          
          // Reduce influence of sharp samples when blurring
          if (abs(sampleCoC) < absCoC * 0.5) {
            weight *= 0.5;
          }
          
          colorSum += vec4(sampleColor, 1.0) * weight;
          weightSum += weight;
        }
        
        vec3 blurredColor = colorSum.rgb / max(weightSum, 0.001);
        
        vec3 sharpColor = texture2D(textureSampler, vUV).rgb;
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
      
      const engine = this.scene.getEngine();
      effect.setVector2('screenSize', new BABYLON.Vector2(
        engine.getRenderWidth(),
        engine.getRenderHeight()
      ));
      
      if (this.depthRenderer) {
        effect.setTexture('depthSampler', this.depthRenderer.getDepthMap());
      }
    };
    
    this.blurPass = new BABYLON.PostProcess(
      'dofBlur',
      'dofBlur',
      ['screenSize', 'blurScale'],
      [],  // No extra samplers - textureSampler is the output from cocPass with CoC in alpha
      1.0,
      null,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE,
      this.scene.getEngine(),
      false
    );
    
    this.blurPass.onApply = (effect: BABYLON.Effect) => {
      const engine = this.scene.getEngine();
      effect.setVector2('screenSize', new BABYLON.Vector2(
        engine.getRenderWidth(),
        engine.getRenderHeight()
      ));
      
      // Blur scale for artistic control
      effect.setFloat('blurScale', 3.0); // Increased for more visible blur
    };
    
    const state = useAutoFocusStore.getState();
    this.setEnabled(state.dofEnabled);
  }
  
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
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
