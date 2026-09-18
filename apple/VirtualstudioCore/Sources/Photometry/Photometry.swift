import Foundation

/// Photometric conversions for studio fixtures.
///
/// A port of `src/core/rendering/photometry.ts`, kept deliberately literal: the
/// same names, the same order, the same refusals. Anyone comparing the two
/// should be able to read them side by side, because a divergence here is a
/// photograph that comes out a stop off.
///
/// Everything is pure arithmetic on documented photographic units:
///
///  - candela (cd)  : on-axis luminous intensity of a fixture
///  - lux (lx)      : illuminance arriving at a surface, E = I / d²
///  - EV            : exposure value at ISO 100
///
/// ISO 2720:1974 incident metering with a flat receptor uses C = 250, giving
/// E = (C / S) · 2^EV. At ISO 100 that is E = 2.5 · 2^EV.
///
/// Invalid input throws rather than returning a number. A reading that is
/// silently wrong is worse than no reading, which is the same reason the
/// scene meter reports nothing at a dark point instead of a plausible value.
public enum PhotometryError: Error, Equatable {
    case beamAngle(Double)
    case guideNumber(Double)
    case shutter(Double)
    case distance(Double)
    case candela(Double)
    case illuminance(Double)
    case iso(Double)
    case sourceSize(Double)
}

/// Manufacturer figures for one fixture, as the catalogue carries them.
public struct FixturePhotometrics: Sendable, Equatable {
    /// Manufacturer-measured illuminance at 1 m, on axis. Most reliable.
    public var lux1m: Double?
    /// Total luminous flux. Converted through the beam solid angle.
    public var lumens: Double?
    /// Beam angle in degrees (full angle, not half).
    public var beamAngleDeg: Double?
    /// Guide number at ISO 100, in metres. The only honest figure for a strobe.
    public var guideNumber: Double?
    /// Fixture type from the catalogue; decides flash versus continuous.
    public var type: String?

    public init(
        lux1m: Double? = nil,
        lumens: Double? = nil,
        beamAngleDeg: Double? = nil,
        guideNumber: Double? = nil,
        type: String? = nil
    ) {
        self.lux1m = lux1m
        self.lumens = lumens
        self.beamAngleDeg = beamAngleDeg
        self.guideNumber = guideNumber
        self.type = type
    }
}

/// ISO 2720:1974 incident-light constant for a flat receptor.
public let INCIDENT_METER_CONSTANT_C: Double = 250

/// Scene intensity per candela.
///
/// Calibrated on the Aputure LS 300d II: lux@1m = 45000 maps to the scene
/// intensity 450 the hand-tuned studio rig was built around. The web renderer
/// applies this to `Light.intensity` under physical falloff. A native renderer
/// will need its own constant measured the same way — against one known
/// fixture — because RealityKit's intensity unit is not this one. Keep the
/// value here so both are stated in the same place, and so a scene document
/// written by either edition means the same light.
public let SCENE_INTENSITY_PER_CANDELA: Double = 0.01

/// Fallback beam angle (degrees) when a fixture publishes no beam data.
public let DEFAULT_BEAM_ANGLE_DEG: Double = 120

/// Shutter the preview normalises flash against.
///
/// A flash is over long before the shutter closes, so its exposure depends on
/// aperture and ISO alone. The renderer still has one global exposure for the
/// whole frame, so flash output is expressed as the continuous intensity that
/// would deposit the same light during this shutter time, and
/// `flashShutterCompensation` cancels the shutter term again at render time.
public let REFERENCE_SHUTTER_SECONDS: Double = 1.0 / 125.0

/// Catalogue types whose light is a flash rather than a continuous source.
private let FLASH_TYPES: Set<String> = ["strobe", "flash", "speedlight"]

public func isFlashFixture(_ type: String?) -> Bool {
    guard let type else { return false }
    return FLASH_TYPES.contains(type)
}

/// The widest cone a spot light can describe, just under a full hemisphere.
///
/// A spot angle is a cone aperture, and a cone cannot open past π. A bare bulb,
/// a tube or a window is published at 180° or 360°, which is a statement about
/// how it spreads light, not a cone — handed straight to a spot it produces a
/// light with no valid shadow arithmetic at all.
public let MAX_SPOT_CONE_RAD: Double = .pi * 0.98

/// A published beam angle as a spot cone, in radians.
///
/// Only the cone is capped. A fixture's output still comes from its real
/// published angle, because that is what its lumens are spread over.
public func spotConeRadians(_ beamAngleDeg: Double) throws -> Double {
    guard beamAngleDeg.isFinite, beamAngleDeg > 0 else {
        throw PhotometryError.beamAngle(beamAngleDeg)
    }
    return min(beamAngleDeg * .pi / 180, MAX_SPOT_CONE_RAD)
}

/// Solid angle of a cone in steradian: Ω = 2π(1 − cos(θ/2)).
public func coneSolidAngle(_ beamAngleDeg: Double) throws -> Double {
    guard beamAngleDeg.isFinite, beamAngleDeg > 0 else {
        throw PhotometryError.beamAngle(beamAngleDeg)
    }
    let full = min(beamAngleDeg, 360)
    return 2 * .pi * (1 - cos((full / 2) * (.pi / 180)))
}

/// Luminous exposure a flash delivers at 1 m, in lux·seconds, at ISO 100.
///
/// The guide number is defined by f = GN / d, and a flash meter with constant
/// C = 250 reads f² = H · S / C. At d = 1 m that gives H = (C / S) · GN².
public func flashLuminousExposureAt1m(_ guideNumber: Double) throws -> Double {
    guard guideNumber.isFinite, guideNumber > 0 else {
        throw PhotometryError.guideNumber(guideNumber)
    }
    return (INCIDENT_METER_CONSTANT_C / 100) * guideNumber * guideNumber
}

/// The continuous intensity that would deposit a flash's light in one shutter.
///
/// A preview convenience, not a claim that a strobe burns continuously:
/// `flashShutterCompensation` removes the shutter term again so the rendered
/// flash exposure stays independent of shutter speed, as it is on a real set.
public func flashEquivalentCandela(
    _ guideNumber: Double,
    shutterSeconds: Double = REFERENCE_SHUTTER_SECONDS
) throws -> Double {
    guard shutterSeconds.isFinite, shutterSeconds > 0 else {
        throw PhotometryError.shutter(shutterSeconds)
    }
    return try flashLuminousExposureAt1m(guideNumber) / shutterSeconds
}

/// Factor that cancels the frame's shutter term for a flash fixture.
public func flashShutterCompensation(_ shutterSeconds: Double) throws -> Double {
    guard shutterSeconds.isFinite, shutterSeconds > 0 else {
        throw PhotometryError.shutter(shutterSeconds)
    }
    return REFERENCE_SHUTTER_SECONDS / shutterSeconds
}

/// On-axis luminous intensity of a fixture, in candela.
///
/// A strobe's guide number comes first, because it is measured for the flash
/// itself; a strobe's published lumens usually describe its modelling lamp and
/// would make a 1000 Ws head read like a small LED. For continuous fixtures
/// lux@1m wins, since manufacturers measure it directly, and lumens spread over
/// the beam solid angle is the fallback. Returns nil when nothing usable is
/// present — an absence, not a zero.
public func fixtureCandela(_ spec: FixturePhotometrics) throws -> Double? {
    if isFlashFixture(spec.type), let guideNumber = spec.guideNumber, guideNumber > 0 {
        return try flashEquivalentCandela(guideNumber)
    }
    if let lux1m = spec.lux1m, lux1m > 0 {
        return lux1m
    }
    if let lumens = spec.lumens, lumens > 0 {
        let beam = (spec.beamAngleDeg ?? 0) > 0 ? spec.beamAngleDeg! : DEFAULT_BEAM_ANGLE_DEG
        let solidAngle = try coneSolidAngle(beam)
        return solidAngle > 1e-6 ? lumens / solidAngle : lumens
    }
    if let guideNumber = spec.guideNumber, guideNumber > 0 {
        return try flashEquivalentCandela(guideNumber)
    }
    return nil
}

/// Aperture a flash meter reads at ISO 100: f = GN / d.
public func flashApertureAt(_ guideNumber: Double, metres: Double, iso: Double = 100) throws -> Double {
    guard metres.isFinite, metres > 0 else { throw PhotometryError.distance(metres) }
    guard iso.isFinite, iso > 0 else { throw PhotometryError.iso(iso) }
    return (guideNumber / metres) * (iso / 100).squareRoot()
}

/// Inverse-square law: E = I / d².
public func illuminanceAt(_ candela: Double, metres: Double, minMetres: Double = 0.05) throws -> Double {
    guard candela.isFinite, candela >= 0 else { throw PhotometryError.candela(candela) }
    let d = max(metres, minMetres)
    return candela / (d * d)
}

/// Distance at which a source of `candela` delivers `lux`: d = √(I / E).
public func distanceForIlluminance(_ candela: Double, lux: Double) throws -> Double {
    guard candela.isFinite, candela > 0 else { throw PhotometryError.candela(candela) }
    guard lux.isFinite, lux > 0 else { throw PhotometryError.illuminance(lux) }
    return (candela / lux).squareRoot()
}

/// Stops between two illuminances (positive when `to` is brighter).
public func stopsBetween(_ from: Double, _ to: Double) throws -> Double {
    guard from > 0, to > 0 else { throw PhotometryError.illuminance(min(from, to)) }
    return log2(to / from)
}

/// Incident EV at ISO 100 for a measured illuminance.
public func evAtIso100(_ lux: Double) throws -> Double {
    guard lux.isFinite, lux > 0 else { throw PhotometryError.illuminance(lux) }
    return log2((lux * 100) / INCIDENT_METER_CONSTANT_C)
}

/// Aperture that exposes `lux` correctly: f = √(E · t · S / C).
public func apertureForIlluminance(_ lux: Double, iso: Double, shutterSeconds: Double) throws -> Double {
    guard lux.isFinite, lux > 0 else { throw PhotometryError.illuminance(lux) }
    guard iso.isFinite, iso > 0 else { throw PhotometryError.iso(iso) }
    guard shutterSeconds.isFinite, shutterSeconds > 0 else { throw PhotometryError.shutter(shutterSeconds) }
    return ((lux * shutterSeconds * iso) / INCIDENT_METER_CONSTANT_C).squareRoot()
}

/// Renderer light intensity for a fixture's real candela. Linear, never clamped.
///
/// An earlier ceiling in the web renderer made every fixture above 8000 cd
/// render identically, which was treated as a bug rather than a look. The same
/// standard holds here: whatever a native renderer's unit turns out to be, the
/// mapping from candela stays linear and unbounded.
public func sceneIntensityFromCandela(_ candela: Double) throws -> Double {
    guard candela.isFinite, candela >= 0 else { throw PhotometryError.candela(candela) }
    return candela * SCENE_INTENSITY_PER_CANDELA
}

// MARK: - Modifier size

/// The modifier's actual width and height in metres, not its equal-area square.
///
/// `modifierSizeMetres` collapses a rectangle to the square that softens the
/// same way, which is right for shadow arithmetic and wrong for drawing the
/// thing: a 30 × 120 stripbox and a 60 × 60 softbox have the same mean and look
/// nothing alike. What is drawn should be the modifier the maths is using, so
/// both come from the same label.
public func modifierRectangleMetres(_ label: String, glbFile: String? = nil) -> (width: Double, height: Double) {
    if let pair = firstPair(in: label, unit: "cm") {
        return (pair.0 / 100, pair.1 / 100)
    }
    if let pair = firstPair(in: label, unit: "ft") {
        return (pair.0 * 0.3048, pair.1 * 0.3048)
    }
    // Anything that names one measurement is round or square at that size.
    let side = modifierSizeMetres(label, glbFile: glbFile)
    return (side, side)
}

/// Effective emitting size of a fixture or modifier, in metres.
///
/// The catalogue labels carry real dimensions ("Softboks 90×120 cm",
/// "Oktaboks 120 cm", "Diffusjonsramme 4×4 ft", "Fresnel 12\""), so the label
/// is the source of truth and the model file is only the fallback. Penumbra
/// width scales with this, which is the whole reason a 150 cm octabox looks
/// different from a snoot.
///
/// A rectangular source casts a different penumbra along each axis; a 30×120 cm
/// stripbox is soft down its length and crisp across it. One scalar cannot hold
/// both, so we take the geometric mean — the size of the square source with the
/// same area. Taking the larger side instead would rank a stripbox as softer
/// than a 90 cm softbox, which is backwards.
public func modifierSizeMetres(_ label: String, glbFile: String? = nil) -> Double {
    if let pair = firstPair(in: label, unit: "cm") {
        return geometricMean(pair.0, pair.1) / 100
    }
    if let single = firstSingle(in: label, unit: "cm") {
        return single / 100
    }
    if let pair = firstPair(in: label, unit: "ft") {
        return geometricMean(pair.0, pair.1) * 0.3048
    }
    if let inches = firstInches(in: label) {
        return inches * 0.0254
    }
    return glbFallbackSizeMetres(glbFile)
}

/// Sizes for bare fixtures whose label carries no dimension.
private let GLB_FALLBACK_SIZE_METRES: [String: Double] = [
    "softbox-stand.glb": 0.9,
    "octabox-stand.glb": 0.9,
    "stripbox-stand.glb": 0.3,
    "beauty-dish-stand.glb": 0.42,
    "ring-light-stand.glb": 0.35,
    "led-panel-stand.glb": 0.4,
    "hmi-fresnel-stand.glb": 0.25,
    "snoot-stand.glb": 0.1,
    "parabolic-stand.glb": 0.9,
    "umbrella-stand.glb": 1.0,
    "umbrella-shootthrough.glb": 1.0,
    "umbrella-gold.glb": 1.0,
    "chimera-frame.glb": 0.9,
    "lantern-globe.glb": 0.6,
    "kino-flo-bank.glb": 0.6,
    "diffusion-frame.glb": 1.2,
    "open-reflector.glb": 0.3,
]

public func glbFallbackSizeMetres(_ glbFile: String?) -> Double {
    guard let glbFile else { return 0.3 }
    let file = glbFile.split(separator: "/").last.map(String.init) ?? ""
    return GLB_FALLBACK_SIZE_METRES[file] ?? 0.3
}

/// Light size in shadow-map UV space for a source of the given size.
///
/// Percentage-closer soft shadows read the light size in shadow-map UV space,
/// and the shadow map spans the spot cone at its far plane: width ≈ 2·far·tan(θ/2).
/// So the ratio is the source's share of that width, which makes a big modifier
/// produce a wide penumbra and a snoot a crisp edge — the same relationship as
/// the real set.
///
/// This is the one number RealityKit has nowhere to put. Its
/// `SpotLightComponent.Shadow` takes a depth bias, a cull mode and two clipping
/// planes; nothing anywhere in the framework describes how soft an edge is.
/// Keeping the maths here means a custom shadow pass has something exact to
/// consume, rather than a constant somebody tuned.
public func contactHardeningRatio(
    sourceSizeMetres: Double,
    beamAngleRad: Double,
    shadowFarMetres: Double = 30,
    minRatio: Double = 0.002,
    maxRatio: Double = 0.5
) throws -> Double {
    guard sourceSizeMetres.isFinite, sourceSizeMetres > 0 else {
        throw PhotometryError.sourceSize(sourceSizeMetres)
    }
    guard beamAngleRad.isFinite, beamAngleRad > 0, beamAngleRad < .pi else {
        throw PhotometryError.beamAngle(beamAngleRad)
    }
    let mapWidth = 2 * shadowFarMetres * tan(beamAngleRad / 2)
    return min(maxRatio, max(minRatio, sourceSizeMetres / mapWidth))
}

// MARK: - Label parsing

/// Side of the square with the same area as an a × b source.
private func geometricMean(_ a: Double, _ b: Double) -> Double {
    (a * b).squareRoot()
}

private func number(_ raw: Substring) -> Double {
    Double(raw.replacingOccurrences(of: ",", with: ".")) ?? .nan
}

private func firstPair(in label: String, unit: String) -> (Double, Double)? {
    let pattern = "(\\d+(?:[.,]\\d+)?)\\s*[×x]\\s*(\\d+(?:[.,]\\d+)?)\\s*\(unit)"
    guard let match = firstMatch(pattern, in: label), match.count == 3 else { return nil }
    return (number(match[1]), number(match[2]))
}

private func firstSingle(in label: String, unit: String) -> Double? {
    let pattern = "(\\d+(?:[.,]\\d+)?)\\s*\(unit)"
    guard let match = firstMatch(pattern, in: label), match.count == 2 else { return nil }
    return number(match[1])
}

private func firstInches(in label: String) -> Double? {
    guard let match = firstMatch("(\\d+(?:[.,]\\d+)?)\\s*\"", in: label), match.count == 2 else { return nil }
    return number(match[1])
}

/// One regular-expression match, as its whole text plus capture groups.
///
/// `NSRegularExpression` rather than a Swift `Regex` literal, because the same
/// patterns have to stay recognisably the patterns in `photometry.ts`; a reader
/// comparing the two files should see the same expression on both sides.
private func firstMatch(_ pattern: String, in text: String) -> [Substring]? {
    guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return nil }
    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    guard let match = regex.firstMatch(in: text, options: [], range: range) else { return nil }
    return (0..<match.numberOfRanges).compactMap { index in
        guard let range = Range(match.range(at: index), in: text) else { return nil }
        return text[range]
    }
}
