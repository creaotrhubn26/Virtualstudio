/**
 * Real-world lighting for LocationScene.
 *
 * Given a (lat, lon, datetime, timeOfDay) the director chose, returns:
 *   • A sun-light spec — direction (Babylon X=east, Y=up, Z=north),
 *     colour temperature, intensity. NIGHT scenes get a moonlight
 *     spec instead (cool, dim).
 *   • An ambient/sky spec — top colour, ground colour, intensity,
 *     suitable for Babylon's HemisphericLight.
 *   • A scene exposure multiplier so the photogrammetric tiles sit at
 *     the right brightness band for the time of day.
 *
 * All values are deterministic for a given input — no randomness, so
 * the same beat always renders identically.
 */

import SunCalc from 'suncalc';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';

export type TimeOfDay = 'DAY' | 'DUSK' | 'DAWN' | 'MAGIC HOUR' | 'NIGHT';

export interface SunSpec {
  /** Babylon-RH direction the sun POINTS from sky → ground. Already negated. */
  direction: Vector3;
  /** Colour temperature in Kelvin → diffuse Color3 conversion baked in. */
  diffuse: Color3;
  /** PBR-friendly intensity (~0.0 dark, ~3.0 noon-equator-direct). */
  intensity: number;
  /** Solar altitude in degrees. Negative = below horizon (use moonlight). */
  altitudeDeg: number;
  /** Solar azimuth in degrees clockwise from north. */
  azimuthDeg: number;
  /** True when this is moonlight, not sun (altitude < 0 or NIGHT override). */
  isMoonlight: boolean;
}

export interface AmbientSpec {
  /** "Sky" colour — what the HemisphericLight uses for upward-facing surfaces. */
  diffuse: Color3;
  /** "Ground" colour — what downward-facing surfaces pick up. */
  groundColor: Color3;
  /** Intensity ~0.05 (deep night) to ~0.8 (overcast noon). */
  intensity: number;
}

export interface SceneEnvSpec {
  /** scene.clearColor (sky behind transparent areas of the photogrammetry). */
  clearColor: Color3;
  /** scene.imageProcessingConfiguration.exposure multiplier. */
  exposure: number;
  /** Optional fog density (0 = off). Higher for night/dawn for atmosphere. */
  fogDensity: number;
}

/**
 * Convert a colour temperature (Kelvin) to a Babylon Color3.
 *
 * Algorithm: Tanner Helland's piecewise approximation. Accurate to ~5%
 * across 1000–40000 K and dependency-free. Used for sun colour, moon
 * colour, and any practical-light source where a CCT is the only spec.
 *
 * Reference: http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
 */
export function kelvinToColor3(tempK: number): Color3 {
  const t = Math.max(1000, Math.min(40000, tempK)) / 100;
  let r: number, g: number, b: number;
  // Red
  if (t <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
  }
  // Green
  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }
  // Blue
  if (t >= 66) {
    b = 255;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }
  return new Color3(
    Math.max(0, Math.min(255, r)) / 255,
    Math.max(0, Math.min(255, g)) / 255,
    Math.max(0, Math.min(255, b)) / 255,
  );
}

/**
 * Turn SunCalc's (azimuth, altitude) into a Babylon-RH direction
 * vector pointing FROM the sun TOWARD the ground (i.e. what
 * Babylon's DirectionalLight expects).
 *
 * Coordinate frame in our LocationScene: +X = east, +Y = up, +Z = north.
 * SunCalc's azimuth is measured clockwise from south (in radians) by
 * default; altitude is angle above horizon. To get the sun's POSITION
 * vector pointing from origin OUTWARD to the sun we use:
 *
 *   x = sin(azFromNorth) · cos(altitude)         // east component
 *   y = sin(altitude)                             // up component
 *   z = cos(azFromNorth) · cos(altitude)         // north component
 *
 * SunCalc returns azimuth measured from south, so we add π to get
 * azimuth-from-north before applying the formula above.
 */
function sunDirectionFromAltAz(altitudeRad: number, azimuthRadFromSouth: number): Vector3 {
  const azFromNorth = azimuthRadFromSouth + Math.PI;
  const cosA = Math.cos(altitudeRad);
  // Position vector pointing TO the sun.
  const px = Math.sin(azFromNorth) * cosA;
  const py = Math.sin(altitudeRad);
  const pz = Math.cos(azFromNorth) * cosA;
  // DirectionalLight wants the direction the photons travel — that's
  // the negation of "to-sun".
  const dir = new Vector3(-px, -py, -pz);
  return dir.normalize();
}

export interface LightingSpec {
  sun: SunSpec;
  ambient: AmbientSpec;
  scene: SceneEnvSpec;
}

/**
 * Build a complete lighting spec for a real-world location at a given
 * time of day. `datetime` defaults to "now" so previz reflects current
 * conditions; pass an explicit Date for repeatable demo shots.
 *
 * `timeOfDay` lets the director override astronomy. If they pick
 * "NIGHT" but the actual datetime is high-noon, we still produce a
 * night spec — the director is staging a scene, not reporting weather.
 * Astronomical sun direction is still useful in NIGHT mode because
 * even at night you'd want stage moon coming from the same hemisphere
 * as the sun would in daytime — i.e. consistent with the camera angle
 * the director picked.
 */
export function buildLightingSpec(
  lat: number,
  lon: number,
  timeOfDay: TimeOfDay = 'DAY',
  datetime: Date = new Date(),
): LightingSpec {
  const sunPos = SunCalc.getPosition(datetime, lat, lon);

  // SunCalc returns altitude/azimuth at the given moment. For DAY we
  // honour it; for DUSK/DAWN we clamp the altitude to a low band so
  // the rim-lit golden look reads correctly even if Claude picked a
  // beat at a moment when the real sun is high.
  let altDeg = (sunPos.altitude * 180) / Math.PI;
  switch (timeOfDay) {
    case 'DAWN':
      // ~10° altitude, just after sunrise
      altDeg = Math.min(Math.max(altDeg, 5), 12);
      break;
    case 'DUSK':
    case 'MAGIC HOUR':
      // ~5° altitude, just before sunset
      altDeg = Math.min(Math.max(altDeg, 2), 8);
      break;
    case 'NIGHT':
      altDeg = Math.min(altDeg, -5); // force below horizon
      break;
    case 'DAY':
    default:
      altDeg = Math.max(altDeg, 25); // force a properly lit day
      break;
  }
  const altRad = (altDeg * Math.PI) / 180;
  const direction = sunDirectionFromAltAz(altRad, sunPos.azimuth);

  // Sun colour temperature — warmer when low, cooler when high. Below
  // horizon means moonlight territory.
  const isMoon = altDeg < 0;
  let sunCct: number;
  let sunIntensity: number;
  if (isMoon) {
    sunCct = 4100;          // moonlight ~4100K (looks "cool blue" by contrast)
    sunIntensity = 0.18;    // dim — the scene is mostly ambient + practicals
  } else if (altDeg < 8) {
    // Golden hour: warm, low intensity
    sunCct = 2400 + altDeg * 200;     // 2400K @ horizon → 4000K @ 8°
    sunIntensity = 0.5 + (altDeg / 8) * 0.7;  // 0.5 → 1.2
  } else if (altDeg < 25) {
    // Soft morning / late afternoon
    sunCct = 4000 + (altDeg - 8) * 100;   // 4000K → 5700K
    sunIntensity = 1.2 + ((altDeg - 8) / 17) * 0.6; // 1.2 → 1.8
  } else {
    // Daylight to full noon
    sunCct = 5700 + Math.min(altDeg - 25, 40) * 12; // 5700K → ~6180K
    sunIntensity = 1.8 + Math.min(altDeg - 25, 40) / 40 * 0.8; // 1.8 → 2.6
  }

  const sun: SunSpec = {
    direction,
    diffuse: kelvinToColor3(sunCct),
    intensity: sunIntensity,
    altitudeDeg: altDeg,
    azimuthDeg: ((sunPos.azimuth * 180) / Math.PI + 180 + 360) % 360,
    isMoonlight: isMoon,
  };

  // Ambient ("sky → ground") fill. Per time-of-day baseline, then
  // scaled gently by sun altitude so it matches the sun spec.
  const ambient = ambientForTimeOfDay(timeOfDay, altDeg);

  // Scene tone: clear colour + exposure + fog. clearColor matters for
  // the sliver of "sky" visible past the photogrammetry edges; fog
  // softens the receding tile horizon.
  const sceneEnv = sceneEnvForTimeOfDay(timeOfDay, altDeg);

  return { sun, ambient, scene: sceneEnv };
}

function ambientForTimeOfDay(time: TimeOfDay, altDeg: number): AmbientSpec {
  switch (time) {
    case 'NIGHT':
      return {
        diffuse: new Color3(0.05, 0.07, 0.13),     // deep cobalt sky bounce
        groundColor: new Color3(0.04, 0.04, 0.06),  // near-black urban ground
        intensity: 0.18,
      };
    case 'DUSK':
      return {
        diffuse: new Color3(0.55, 0.4, 0.45),      // dusty pink sky bounce
        groundColor: new Color3(0.18, 0.13, 0.13),  // warm shadows
        intensity: 0.32,
      };
    case 'DAWN':
      return {
        diffuse: new Color3(0.4, 0.45, 0.6),       // cool-blue dawn sky
        groundColor: new Color3(0.15, 0.13, 0.16),
        intensity: 0.3,
      };
    case 'MAGIC HOUR':
      return {
        diffuse: new Color3(0.85, 0.6, 0.4),       // intensified golden bounce
        groundColor: new Color3(0.3, 0.18, 0.13),
        intensity: 0.45,
      };
    case 'DAY':
    default: {
      // Scale slightly with sun altitude so noon is a touch flatter.
      const t = Math.min(Math.max((altDeg - 20) / 40, 0), 1);
      return {
        diffuse: new Color3(0.7, 0.78, 0.92),
        groundColor: new Color3(0.4, 0.35, 0.3),
        intensity: 0.45 + t * 0.25,
      };
    }
  }
}

function sceneEnvForTimeOfDay(time: TimeOfDay, _altDeg: number): SceneEnvSpec {
  switch (time) {
    case 'NIGHT':
      return {
        clearColor: new Color3(0.02, 0.03, 0.06), // near-black night sky
        exposure: 0.55,                            // crush down so practicals pop
        fogDensity: 0.012,
      };
    case 'DUSK':
      return {
        clearColor: new Color3(0.3, 0.18, 0.22),
        exposure: 0.85,
        fogDensity: 0.006,
      };
    case 'DAWN':
      return {
        clearColor: new Color3(0.35, 0.42, 0.5),
        exposure: 0.85,
        fogDensity: 0.008,
      };
    case 'MAGIC HOUR':
      return {
        clearColor: new Color3(0.6, 0.4, 0.35),
        exposure: 1.0,
        fogDensity: 0.005,
      };
    case 'DAY':
    default:
      return {
        clearColor: new Color3(0.55, 0.7, 0.85),
        exposure: 1.0,
        fogDensity: 0,
      };
  }
}
