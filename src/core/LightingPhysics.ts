/**
 * LightingPhysics.ts - Research-Backed Physically Accurate Lighting Calculations
 * 
 * Based on:
 * - SIGGRAPH 2024 research on physically-based rendering
 * - ISO 2720:1974 photographic light meter standards
 * - Real-world luminance measurements and studio photography practices
 * - Inverse square law with proper radiometric/photometric units
 * 
 * Key References:
 * - "Physically Based Rendering: From Theory to Implementation" (Pharr, Jakob, Humphreys)
 * - "From Microfacets to Participating Media" (SIGGRAPH 2024 Best Paper)
 * - Standard photography exposure calculations (EV, f-stop, ISO)
 */

export interface LightSourceParams {
  lumens?: number;
  lux1m?: number;
  guideNumber?: number;
  power?: number;
  powerUnit?: 'W' | 'Ws';
  beamAngle?: number;
  sourceSize?: number;
  colorTemp?: number;
  cri?: number;
}

export interface ExposureSettings {
  aperture: number;
  shutterSpeed: number;
  iso: number;
}

export interface LightMeterResult {
  luxAtSubject: number;
  ev: number;
  evAtISO100: number;
  recommendedAperture: number;
  recommendedShutter: number;
  stopsDifference: number;
  percentIntensity: number;
  distanceFromSource: number;
}

export interface InverseSquareResult {
  intensityRatio: number;
  percentRemaining: number;
  stopsLost: number;
  luxAtDistance: number;
}

/**
 * LightingPhysics - Professional lighting calculations for photography/video
 * 
 * This class implements physically accurate light calculations based on
 * radiometric and photometric principles used in professional photography.
 */
export class LightingPhysics {
  
  /**
   * Physical Constants
   */
  static readonly CALIBRATION_CONSTANT_K = 12.5;
  static readonly REFLECTED_LIGHT_CONSTANT_C = 250;
  static readonly INCIDENT_LIGHT_CONSTANT_C = 250;
  
  static readonly FULL_FRAME_SENSOR_WIDTH = 36;
  static readonly FULL_FRAME_COC_LIMIT = 0.03;
  
  static readonly REFERENCE_DISTANCES = [1, 1.5, 2, 3, 4, 5, 7, 10];
  
  /**
   * Calculate inverse square law falloff
   * 
   * Physical formula: I = I₀ × (d₀/d)²
   * 
   * Key insight from research:
   * - Doubling distance = 25% intensity remaining (2 stops lost)
   * - 1.4x distance = 50% intensity (1 stop lost)
   * - Light drops rapidly close to source, gradually farther away
   * 
   * @param initialDistance - Reference distance (usually 1m)
   * @param newDistance - Target distance
   * @param initialLux - Light intensity at reference distance (lux)
   * @param minDistance - Minimum distance to prevent division by zero (default 0.01m = 1cm)
   */
  static calculateInverseSquareFalloff(
    initialDistance: number,
    newDistance: number,
    initialLux: number = 1000,
    minDistance: number = 0.01
  ): InverseSquareResult {
    const safeDistance = Math.max(newDistance, minDistance);
    const safeInitialDistance = Math.max(initialDistance, minDistance);
    
    const distanceRatio = safeInitialDistance / safeDistance;
    const intensityRatio = distanceRatio * distanceRatio;
    
    const percentRemaining = intensityRatio * 100;
    
    const stopsLost = newDistance > initialDistance 
      ? 2 * Math.log2(newDistance / initialDistance)
      : -2 * Math.log2(initialDistance / newDistance);
    
    const luxAtDistance = initialLux * intensityRatio;
    
    return {
      intensityRatio,
      percentRemaining,
      stopsLost,
      luxAtDistance
    };
  }
  
  /**
   * Calculate distance needed for desired f-stop change
   * 
   * Formula: d₂ = d₁ × 2^(stops/2)
   * 
   * @param currentDistance - Current distance from light
   * @param stopChange - Desired stop change (positive = darker, negative = brighter)
   */
  static calculateDistanceForStopChange(
    currentDistance: number,
    stopChange: number
  ): number {
    return currentDistance * Math.pow(2, stopChange / 2);
  }
  
  /**
   * Calculate luminous intensity (candela) from lumens
   * 
   * For point source: cd = lm / (4π) ≈ lm / 12.566
   * For spotlight with beam angle: cd = lm / (2π × (1 - cos(θ/2)))
   * 
   * Based on solid angle calculation:
   * Ω = 2π × (1 - cos(θ/2)) steradians
   * 
   * @param lumens - Total luminous flux
   * @param beamAngle - Beam angle in degrees (default 360 for omnidirectional)
   */
  static lumensToCandelaAccurate(lumens: number, beamAngle: number = 360): number {
    if (beamAngle >= 360) {
      return lumens / (4 * Math.PI);
    }
    
    const halfAngleRad = (beamAngle / 2) * (Math.PI / 180);
    const solidAngle = 2 * Math.PI * (1 - Math.cos(halfAngleRad));
    
    return lumens / solidAngle;
  }
  
  /**
   * Calculate lux at distance from candela
   * 
   * Illuminance (lux) = Intensity (candela) / distance²
   * 
   * This is the core inverse square law for illuminance
   * 
   * @param candela - Luminous intensity in candela
   * @param distance - Distance in meters
   * @param minDistance - Minimum clamp distance (prevents infinity)
   */
  static candelaToLuxAtDistance(
    candela: number,
    distance: number,
    minDistance: number = 0.01
  ): number {
    const safeDistance = Math.max(distance, minDistance);
    return candela / (safeDistance * safeDistance);
  }
  
  /**
   * Calculate lux at 1m from light source specifications
   * 
   * IMPORTANT: This returns illuminance (lux) at 1 meter distance.
   * For point sources: lux@1m = candela (since distance² = 1)
   * 
   * Priority order (most accurate first):
   * 1. Direct lux@1m measurement (manufacturers test this)
   * 2. Lumens with beam angle → candela → lux@1m
   * 3. Guide number (for strobes): GN = √(lux × distance²) at ISO 100
   * 4. Power estimation
   * 
   * @param params - Light source parameters
   */
  static calculateLux1mFromSpecs(params: LightSourceParams): number {
    if (params.lux1m) {
      return params.lux1m;
    }
    
    if (params.lumens) {
      const beamAngle = params.beamAngle || 120;
      const candela = this.lumensToCandelaAccurate(params.lumens, beamAngle);
      return candela;
    }
    
    if (params.guideNumber) {
      return params.guideNumber * params.guideNumber;
    }
    
    if (params.power) {
      if (params.powerUnit === 'Ws') {
        const estimatedLumens = params.power * 40;
        const beamAngle = params.beamAngle || 90;
        return this.lumensToCandelaAccurate(estimatedLumens, beamAngle);
      } else {
        const estimatedLumens = params.power * 100;
        const beamAngle = params.beamAngle || 120;
        return this.lumensToCandelaAccurate(estimatedLumens, beamAngle);
      }
    }
    
    return 1000;
  }
  
  /**
   * Calculate Exposure Value (EV) from illuminance
   * 
   * EV formula (incident light):
   * EV = log₂(E × S / C)
   * Where:
   * - E = illuminance in lux
   * - S = ISO speed (100 for EV₁₀₀)
   * - C = calibration constant (250 for incident meters, per ISO 2720)
   * 
   * @param lux - Illuminance at subject
   * @param iso - ISO sensitivity (default 100)
   */
  static luxToEV(lux: number, iso: number = 100): number {
    if (lux <= 0) return -10;
    return Math.log2((lux * iso) / this.INCIDENT_LIGHT_CONSTANT_C);
  }
  
  /**
   * Convert EV to lux
   * 
   * Reverse of luxToEV:
   * E = C × 2^EV / S
   * 
   * @param ev - Exposure value
   * @param iso - ISO sensitivity
   */
  static evToLux(ev: number, iso: number = 100): number {
    return (this.INCIDENT_LIGHT_CONSTANT_C * Math.pow(2, ev)) / iso;
  }
  
  /**
   * Calculate recommended camera settings from EV
   * 
   * EV = log₂(N² / t) where N = f-number, t = shutter time in seconds
   * 
   * Common EV values:
   * - EV 15-16: Bright sunlight
   * - EV 12-14: Overcast/shade
   * - EV 10-12: Well-lit studio
   * - EV 8-10: Office/indoor
   * - EV 5-7: Living room
   * - EV 0-4: Low light
   * 
   * @param ev - Exposure value at ISO 100
   * @param preferredAperture - Preferred f-stop (will calculate shutter)
   */
  static evToSettings(
    ev: number,
    preferredAperture: number = 8
  ): { aperture: number; shutterSpeed: number; shutterDisplay: string } {
    const shutterSpeed = (preferredAperture * preferredAperture) / Math.pow(2, ev);
    
    let shutterDisplay: string;
    if (shutterSpeed >= 1) {
      shutterDisplay = `${shutterSpeed.toFixed(1)}s`;
    } else if (shutterSpeed >= 0.1) {
      shutterDisplay = `1/${Math.round(1/shutterSpeed)}`;
    } else {
      shutterDisplay = `1/${Math.round(1/shutterSpeed)}`;
    }
    
    return {
      aperture: preferredAperture,
      shutterSpeed,
      shutterDisplay
    };
  }
  
  /**
   * Calculate light meter reading at subject position
   * 
   * Combines multiple light sources using inverse square law
   * Returns comprehensive exposure data
   * 
   * @param lights - Array of light sources with position and specs
   * @param subjectPosition - 3D position of subject
   * @param cameraSettings - Current camera exposure settings
   */
  static calculateLightMeter(
    lights: Array<{
      position: { x: number; y: number; z: number };
      specs: LightSourceParams;
      powerMultiplier?: number;
      enabled?: boolean;
    }>,
    subjectPosition: { x: number; y: number; z: number },
    cameraSettings: ExposureSettings
  ): LightMeterResult {
    let totalLux = 0;
    let closestDistance = Infinity;
    
    for (const light of lights) {
      if (light.enabled === false) continue;
      
      const dx = light.position.x - subjectPosition.x;
      const dy = light.position.y - subjectPosition.y;
      const dz = light.position.z - subjectPosition.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (distance < closestDistance) {
        closestDistance = distance;
      }
      
      const lux1m = this.calculateLux1mFromSpecs(light.specs);
      const powerMult = light.powerMultiplier ?? 1.0;
      
      const falloff = this.calculateInverseSquareFalloff(1, distance, lux1m * powerMult);
      totalLux += falloff.luxAtDistance;
    }
    
    const evAtISO100 = this.luxToEV(totalLux, 100);
    const ev = this.luxToEV(totalLux, cameraSettings.iso);
    
    const currentEV = Math.log2(
      (cameraSettings.aperture * cameraSettings.aperture) / cameraSettings.shutterSpeed
    );
    
    const stopsDifference = ev - currentEV;
    
    const settings = this.evToSettings(evAtISO100, cameraSettings.aperture);
    
    const targetEV = 10;
    const percentIntensity = Math.pow(2, ev - targetEV) * 100;
    
    return {
      luxAtSubject: totalLux,
      ev,
      evAtISO100,
      recommendedAperture: settings.aperture,
      recommendedShutter: settings.shutterSpeed,
      stopsDifference,
      percentIntensity: Math.min(percentIntensity, 200),
      distanceFromSource: closestDistance
    };
  }
  
  /**
   * Generate falloff visualization data
   * 
   * Returns intensity percentages at standard distance multipliers
   * Used for 2D top-view falloff rings
   * 
   * @param baseLux - Light intensity at reference distance (usually 1m)
   */
  static generateFalloffZones(baseLux: number): Array<{
    multiplier: number;
    distance: number;
    intensity: number;
    lux: number;
    stops: number;
    fstopEquivalent: string;
  }> {
    const zones = [];
    const referencePoints = [1, 1.4, 2, 2.8, 4, 5.6, 8];
    
    for (const mult of referencePoints) {
      const falloff = this.calculateInverseSquareFalloff(1, mult, baseLux);
      
      const fstopChange = Math.round(falloff.stopsLost);
      const fstopEquivalent = fstopChange === 0 ? 'f/8' 
        : fstopChange === 1 ? 'f/5.6'
        : fstopChange === 2 ? 'f/4'
        : fstopChange === 3 ? 'f/2.8'
        : fstopChange === 4 ? 'f/2'
        : `f/1.4 (${fstopChange} stops)`;
      
      zones.push({
        multiplier: mult,
        distance: mult,
        intensity: falloff.percentRemaining,
        lux: falloff.luxAtDistance,
        stops: falloff.stopsLost,
        fstopEquivalent
      });
    }
    
    return zones;
  }
  
  /**
   * Calculate optimal light placement for even group lighting
   * 
   * Problem: In group photos, front row is overexposed, back row underexposed
   * Solution: Move light farther away - falloff becomes more gradual at distance
   * 
   * Formula: For <1 stop difference between front and back:
   * Light distance ≥ 10 × (back row distance - front row distance)
   * 
   * @param frontRowDistance - Distance from light to front row
   * @param backRowDistance - Distance from light to back row
   * @param maxStopDifference - Maximum acceptable stop difference (default 0.5)
   */
  static calculateOptimalGroupLightDistance(
    frontRowDistance: number,
    backRowDistance: number,
    maxStopDifference: number = 0.5
  ): { 
    optimalDistance: number;
    actualStopDifference: number;
    frontRowIntensity: number;
    backRowIntensity: number;
  } {
    const rowDepth = backRowDistance - frontRowDistance;
    
    const stopDiff = 2 * Math.log2(backRowDistance / frontRowDistance);
    
    if (stopDiff <= maxStopDifference) {
      return {
        optimalDistance: frontRowDistance,
        actualStopDifference: stopDiff,
        frontRowIntensity: 100,
        backRowIntensity: Math.pow(frontRowDistance / backRowDistance, 2) * 100
      };
    }
    
    const targetRatio = Math.pow(2, maxStopDifference / 2);
    const optimalFrontDistance = rowDepth / (targetRatio - 1);
    
    const newBackDistance = optimalFrontDistance + rowDepth;
    const actualRatio = newBackDistance / optimalFrontDistance;
    const actualStops = 2 * Math.log2(actualRatio);
    
    return {
      optimalDistance: optimalFrontDistance,
      actualStopDifference: actualStops,
      frontRowIntensity: 100,
      backRowIntensity: Math.pow(optimalFrontDistance / newBackDistance, 2) * 100
    };
  }
  
  /**
   * Convert color temperature to RGB (approximate Planckian locus)
   * 
   * Based on CIE 1931 2° standard observer
   * Algorithm by Tanner Helland (approximation for 1000K-40000K)
   * 
   * @param kelvin - Color temperature in Kelvin
   */
  static kelvinToRGB(kelvin: number): { r: number; g: number; b: number } {
    const temp = kelvin / 100;
    let r: number, g: number, b: number;
    
    if (temp <= 66) {
      r = 255;
    } else {
      r = temp - 60;
      r = 329.698727446 * Math.pow(r, -0.1332047592);
      r = Math.max(0, Math.min(255, r));
    }
    
    if (temp <= 66) {
      g = temp;
      g = 99.4708025861 * Math.log(g) - 161.1195681661;
    } else {
      g = temp - 60;
      g = 288.1221695283 * Math.pow(g, -0.0755148492);
    }
    g = Math.max(0, Math.min(255, g));
    
    if (temp >= 66) {
      b = 255;
    } else if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
      b = Math.max(0, Math.min(255, b));
    }
    
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }
  
  /**
   * Calculate lighting ratio (key:fill)
   * 
   * Common ratios in photography:
   * - 1:1 - Flat lighting (no contrast)
   * - 2:1 - Subtle modeling, flattering
   * - 3:1 - Classic portrait lighting
   * - 4:1 - Dramatic, film noir
   * - 8:1+ - Very dramatic, silhouette territory
   * 
   * @param keyLightLux - Key light intensity at subject
   * @param fillLightLux - Fill light intensity at subject
   */
  static calculateLightingRatio(
    keyLightLux: number,
    fillLightLux: number
  ): {
    ratio: string;
    numericRatio: number;
    contrastLevel: string;
    stopsDifference: number;
  } {
    if (fillLightLux <= 0) {
      return {
        ratio: '∞:1',
        numericRatio: Infinity,
        contrastLevel: 'Ekstrem (silhuett)',
        stopsDifference: Infinity
      };
    }
    
    const totalOnLitSide = keyLightLux + fillLightLux;
    const shadowSide = fillLightLux;
    const numericRatio = totalOnLitSide / shadowSide;
    
    const roundedRatio = Math.round(numericRatio);
    const ratio = `${roundedRatio}:1`;
    
    const stopsDifference = Math.log2(numericRatio);
    
    let contrastLevel: string;
    if (numericRatio < 1.5) {
      contrastLevel = 'Flat (minimalt kontrast)';
    } else if (numericRatio < 2.5) {
      contrastLevel = 'Subtil (smigrende)';
    } else if (numericRatio < 4) {
      contrastLevel = 'Klassisk (naturlig)';
    } else if (numericRatio < 8) {
      contrastLevel = 'Dramatisk (film noir)';
    } else {
      contrastLevel = 'Ekstrem kontrast';
    }
    
    return {
      ratio,
      numericRatio,
      contrastLevel,
      stopsDifference
    };
  }
  
  /**
   * Calculate required power adjustment for distance change
   * 
   * If moving light farther, need to increase power to maintain same exposure
   * Power change = (new distance / old distance)²
   * 
   * @param currentDistance - Current light distance
   * @param newDistance - New light distance
   * @param currentPower - Current power setting (0-100%)
   */
  static calculatePowerForDistance(
    currentDistance: number,
    newDistance: number,
    currentPower: number
  ): { 
    newPower: number; 
    powerMultiplier: number;
    feasible: boolean;
    message: string;
  } {
    const distanceRatio = newDistance / currentDistance;
    const powerMultiplier = distanceRatio * distanceRatio;
    const newPower = currentPower * powerMultiplier;
    
    const feasible = newPower <= 100;
    
    let message: string;
    if (feasible) {
      message = `Øk styrke til ${newPower.toFixed(0)}% for samme eksponering`;
    } else {
      message = `Krever ${newPower.toFixed(0)}% - bruk sterkere lys eller flytt nærmere`;
    }
    
    return {
      newPower: Math.min(newPower, 100),
      powerMultiplier,
      feasible,
      message
    };
  }
  
  /**
   * Calculate ND filter needed for exposure compensation
   * 
   * ND filters reduce light by specific stop values:
   * - ND2 = 1 stop
   * - ND4 = 2 stops
   * - ND8 = 3 stops
   * - ND64 = 6 stops
   * - ND1000 = 10 stops
   * 
   * @param stopsToReduce - Number of stops to reduce
   */
  static calculateNDFilter(stopsToReduce: number): {
    ndValue: number;
    opticalDensity: number;
    lightTransmission: number;
    commonFilter: string;
  } {
    const ndValue = Math.pow(2, stopsToReduce);
    const opticalDensity = stopsToReduce * 0.3;
    const lightTransmission = 100 / ndValue;
    
    const commonFilters: Record<number, string> = {
      1: 'ND2',
      2: 'ND4',
      3: 'ND8',
      4: 'ND16',
      5: 'ND32',
      6: 'ND64',
      7: 'ND128',
      8: 'ND256',
      9: 'ND512',
      10: 'ND1000'
    };
    
    const roundedStops = Math.round(stopsToReduce);
    const commonFilter = commonFilters[roundedStops] || `ND${Math.round(ndValue)}`;
    
    return {
      ndValue,
      opticalDensity,
      lightTransmission,
      commonFilter
    };
  }
}

export default LightingPhysics;
