import * as BABYLON from '@babylonjs/core';
import { useFocusPeakingStore, FocusPeakingColor } from '../state/store';
import { useFocusStore } from '../state/store';

export class FocusPeakingEffect {
  private scene: BABYLON.Scene;
  private camera: BABYLON.Camera;
  private postProcess: BABYLON.PostProcess | null = null;
  private depthRenderer: BABYLON.DepthRenderer | null = null;
  private isEnabled: boolean = false;
  
  private static readonly COLOR_MAP: Record<FocusPeakingColor, BABYLON.Vector3> = {
    'red': new BABYLON.Vector3(1.0, 0.2, 0.2),
    'green': new BABYLON.Vector3(0.2, 1.0, 0.2),
    'blue': new BABYLON.Vector3(0.3, 0.5, 1.0),
    'yellow': new BABYLON.Vector3(1.0, 1.0, 0.2),
    'white': new BABYLON.Vector3(1.0, 1.0, 1.0),
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
      if (state.enabled && this.postProcess) {
        this.updateUniforms();
      }
    });
    
    console.log('[FocusPeakingEffect] Initialized');
  }
  
  private createPostProcess(): void {
    const fragmentShader = `
      precision highp float;
      
      varying vec2 vUV;
      uniform sampler2D textureSampler;
      uniform sampler2D depthSampler;
      
      uniform vec3 peakColor;
      uniform float intensity;
      uniform float threshold;
      uniform float focusDistance;
      uniform float aperture;
      uniform float depthAware;
      uniform vec2 screenSize;
      
      float getDepth(vec2 uv) {
        return texture2D(depthSampler, uv).r;
      }
      
      float getLuminance(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }
      
      void main(void) {
        vec4 color = texture2D(textureSampler, vUV);
        
        vec2 texelSize = 1.0 / screenSize;
        
        float centerLum = getLuminance(color.rgb);
        float topLum = getLuminance(texture2D(textureSampler, vUV + vec2(0.0, texelSize.y)).rgb);
        float bottomLum = getLuminance(texture2D(textureSampler, vUV - vec2(0.0, texelSize.y)).rgb);
        float leftLum = getLuminance(texture2D(textureSampler, vUV - vec2(texelSize.x, 0.0)).rgb);
        float rightLum = getLuminance(texture2D(textureSampler, vUV + vec2(texelSize.x, 0.0)).rgb);
        
        float topLeftLum = getLuminance(texture2D(textureSampler, vUV + vec2(-texelSize.x, texelSize.y)).rgb);
        float topRightLum = getLuminance(texture2D(textureSampler, vUV + vec2(texelSize.x, texelSize.y)).rgb);
        float bottomLeftLum = getLuminance(texture2D(textureSampler, vUV + vec2(-texelSize.x, -texelSize.y)).rgb);
        float bottomRightLum = getLuminance(texture2D(textureSampler, vUV + vec2(texelSize.x, -texelSize.y)).rgb);
        
        float sobelX = -topLeftLum - 2.0 * leftLum - bottomLeftLum + topRightLum + 2.0 * rightLum + bottomRightLum;
        float sobelY = -topLeftLum - 2.0 * topLum - topRightLum + bottomLeftLum + 2.0 * bottomLum + bottomRightLum;
        
        float edge = sqrt(sobelX * sobelX + sobelY * sobelY);
        
        float depthMask = 1.0;
        if (depthAware > 0.5) {
          float depth = getDepth(vUV);
          float depthDiff = abs(depth - focusDistance);
          float dofRange = 0.1 + (aperture / 22.0) * 0.3;
          depthMask = 1.0 - smoothstep(0.0, dofRange, depthDiff);
        }
        
        float edgeStrength = smoothstep(threshold * 0.5, threshold, edge) * intensity * depthMask;
        
        vec3 finalColor = mix(color.rgb, peakColor, edgeStrength * 0.8);
        
        gl_FragColor = vec4(finalColor, color.a);
      }
    `;
    
    BABYLON.Effect.ShadersStore['focusPeakingFragmentShader'] = fragmentShader;
    
    this.postProcess = new BABYLON.PostProcess(
      'focusPeaking',
      'focusPeaking',
      ['peakColor', 'intensity', 'threshold', 'focusDistance', 'aperture', 'depthAware', 'screenSize'],
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
      
      const colorVec = FocusPeakingEffect.COLOR_MAP[state.color] || FocusPeakingEffect.COLOR_MAP['red'];
      effect.setVector3('peakColor', colorVec);
      effect.setFloat('intensity', state.intensity);
      effect.setFloat('threshold', state.threshold);
      effect.setFloat('focusDistance', focusState.focusDistance / 100);
      
      const studio = (window as any).virtualStudio;
      const aperture = studio?.cameraSettings?.aperture || 2.8;
      effect.setFloat('aperture', aperture);
      effect.setFloat('depthAware', state.depthAware ? 1.0 : 0.0);
      
      const engine = this.scene.getEngine();
      effect.setVector2('screenSize', new BABYLON.Vector2(
        engine.getRenderWidth(),
        engine.getRenderHeight()
      ));
      
      if (this.depthRenderer) {
        effect.setTexture('depthSampler', this.depthRenderer.getDepthMap());
      }
    };
    
    this.postProcess.samples = 1;
    
    const state = useFocusPeakingStore.getState();
    this.setEnabled(state.enabled);
  }
  
  private updateUniforms(): void {
  }
  
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (this.postProcess) {
      if (enabled) {
        const isAttached = this.postProcess.isReusable() ? 
          this.postProcess.getCamera() !== null : 
          (this.camera as any)._postProcesses?.includes(this.postProcess);
        if (!isAttached) {
          this.camera.attachPostProcess(this.postProcess);
        }
      } else {
        this.camera.detachPostProcess(this.postProcess);
      }
    }
    
    console.log(`[FocusPeakingEffect] ${enabled ? 'Enabled' : 'Disabled'}`);
  }
  
  public toggle(): void {
    this.setEnabled(!this.isEnabled);
    useFocusPeakingStore.getState().setEnabled(this.isEnabled);
  }
  
  public setColor(color: FocusPeakingColor): void {
    useFocusPeakingStore.getState().setColor(color);
  }
  
  public setIntensity(intensity: number): void {
    useFocusPeakingStore.getState().setIntensity(intensity);
  }
  
  public setThreshold(threshold: number): void {
    useFocusPeakingStore.getState().setThreshold(threshold);
  }
  
  public dispose(): void {
    if (this.postProcess) {
      this.camera.detachPostProcess(this.postProcess);
      this.postProcess.dispose();
      this.postProcess = null;
    }
    
    console.log('[FocusPeakingEffect] Disposed');
  }
}
