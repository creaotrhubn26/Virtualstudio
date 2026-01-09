import * as THREE from 'three';

export interface LightSourceConfig {
  power: number;
  wattage?: number;
  efficacy?: number;
  position: THREE.Vector3;
  beamAngle?: number;
  distance: number;
}

class PhotometricCalculator {
  calculateIlluminance(
    lightConfig: LightSourceConfig,
    targetPoint: THREE.Vector3,
    surfaceNormal: THREE.Vector3
  ): number {
    const distance = lightConfig.distance;
    if (distance <= 0) return 0;
    
    const lumens = lightConfig.wattage 
      ? lightConfig.wattage * (lightConfig.efficacy || 100)
      : lightConfig.power * 100;
    
    const beamAngle = lightConfig.beamAngle || 120;
    const steradians = 2 * Math.PI * (1 - Math.cos((beamAngle * Math.PI) / 360));
    const candela = lumens / steradians;
    
    const lux = candela / (distance * distance);
    
    const lightDirection = targetPoint.clone().sub(lightConfig.position).normalize();
    const cosAngle = Math.max(0, -lightDirection.dot(surfaceNormal));
    
    return lux * cosAngle;
  }

  luxToFootCandles(lux: number): number {
    return lux / 10.764;
  }

  footCandlesToLux(fc: number): number {
    return fc * 10.764;
  }
}

export const photometricCalculator = new PhotometricCalculator();
