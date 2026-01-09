import * as THREE from 'three';

export type AreaLightType = 'softbox' | 'umbrella' | 'strip' | 'ring' | 'panel';

export interface AreaLightConfig {
  type: AreaLightType;
  width: number;
  height: number;
  power: number;
  temperature: number;
  diffusion: number;
  grid: boolean;
  gridAngle: number;
}

export interface AreaLightOptions {
  type: AreaLightType;
  width: number;
  height: number;
  power: number;
  temperature: number;
  diffusion: number;
  grid: boolean;
  gridAngle: number;
}

export class AreaLight {
  public type: AreaLightType;
  public width: number;
  public height: number;
  public power: number;
  public temperature: number;
  public diffusion: number;
  public grid: boolean;
  public gridAngle: number;
  public position: THREE.Vector3;
  public visible: boolean = true;

  public config: AreaLightConfig;

  constructor(options: AreaLightOptions) {
    this.type = options.type;
    this.width = options.width;
    this.height = options.height;
    this.power = options.power;
    this.temperature = options.temperature;
    this.diffusion = options.diffusion;
    this.grid = options.grid;
    this.gridAngle = options.gridAngle;
    this.position = new THREE.Vector3(0, 0, 0);
    
    this.config = {
      type: options.type,
      width: options.width,
      height: options.height,
      power: options.power,
      temperature: options.temperature,
      diffusion: options.diffusion,
      grid: options.grid,
      gridAngle: options.gridAngle,
    };
  }

  updateIntensity(power?: number): void {
    if (power !== undefined) {
      this.power = power;
      this.config.power = power;
    } else {
      this.power = this.config.power;
    }
  }

  updateColor(temperature?: number): void {
    if (temperature !== undefined) {
      this.temperature = temperature;
      this.config.temperature = temperature;
    } else {
      this.temperature = this.config.temperature;
    }
  }

  lookAt(x: number, y: number, z: number): void {
  }

  dispose(): void {
  }
}
