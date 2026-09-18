import Foundation

/// Where things stand, and which way people face.
///
/// A port of the pure geometry in `src/services/studioLocations.ts` and the two
/// stop conversions in `src/services/lightingLooks.ts`. These are the functions
/// that make a named place usable: they turn "key 45 degrees camera left, 35 up,
/// two and a half metres out" into a position in whatever room the scene is in,
/// and they refuse to put a light through a wall or in front of the lens.
///
/// On a touchscreen they stop being a safeguard and become the placement
/// interface itself.

/// Which way somebody at `mark` should be facing, in radians.
///
/// Turning towards another mark when there is one, and to the mark's own bearing
/// when there is not — so a room with one person in it still faces sensibly, and
/// a room with a crew faces each other.
public func facingFor(_ mark: StudioMark, marks: [StudioMark]) -> Double {
    let towards = mark.facesMark.flatMap { id in marks.first { $0.id == id } }
    let turn = (mark.turnDeg ?? 0) * .pi / 180
    guard let towards else { return mark.facingDeg * .pi / 180 + turn }

    // Zero faces the camera's usual place at negative z and turns like a compass,
    // so the bearing to the other person is measured the same way.
    let bearing = atan2(towards.x - mark.x, -(towards.z - mark.z))
    return bearing + turn
}

/// The garment a body owns that comes closest to a role.
public func garmentForRole(_ role: StudioRole, available: [String], wardrobe: [String: [String]]) -> String? {
    for keyword in wardrobe[role.rawValue] ?? [] {
        if let match = available.first(where: { $0.contains(keyword) }) { return match }
    }
    return available.first
}

/// A stand position walked in until it is inside the room.
///
/// The direction from the aim point is kept, so the modelling and the shadow
/// angle a look was written for survive; only the distance changes. A margin
/// keeps the stand off the wall rather than embedded in it.
public func insideRoom(
    position: Vec3Value,
    aim: Vec3Value,
    bounds: RoomBounds,
    margin: Double = 0.35
) -> Vec3Value {
    let limitX = max(0.2, bounds.halfWidth - margin)
    let limitZ = max(0.2, bounds.halfDepth - margin)
    let limitY = max(0.4, bounds.height - margin)

    let dx = position.x - aim.x, dy = position.y - aim.y, dz = position.z - aim.z
    // How far along the line from the aim point the first wall is met. The aim
    // point is inside the room by construction, so every ratio is positive.
    var scale = 1.0
    if abs(position.x) > limitX, dx != 0 {
        scale = min(scale, ((dx < 0 ? -1 : 1) * limitX - aim.x) / dx)
    }
    if abs(position.z) > limitZ, dz != 0 {
        scale = min(scale, ((dz < 0 ? -1 : 1) * limitZ - aim.z) / dz)
    }
    if position.y > limitY, dy != 0 {
        scale = min(scale, (limitY - aim.y) / dy)
    }
    scale = max(0, min(1, scale))

    return Vec3Value(
        x: aim.x + dx * scale,
        y: max(0.15, aim.y + dy * scale),
        z: aim.z + dz * scale
    )
}

public struct SubjectStand: Equatable, Sendable {
    /// Where the subject is on the floor.
    public let x: Double
    public let z: Double
    /// The height the light is aimed at: the eye line.
    public let eyeHeight: Double
    public init(x: Double, z: Double, eyeHeight: Double) {
        self.x = x
        self.z = z
        self.eyeHeight = eyeHeight
    }
}

/// Resolve a placement against the subject and the camera.
///
/// The camera's own bearing is what "camera left" is measured from, so turning
/// the camera around the subject carries the whole rig with it — which is what a
/// photographer means when they say the key is at 45 degrees.
public func resolvePlacement(
    _ placement: PolarPlacement,
    subject: SubjectStand,
    camera: (x: Double, z: Double)
) -> (position: Vec3Value, aim: Vec3Value) {
    let cameraBearing = atan2(camera.z - subject.z, camera.x - subject.x)
    let bearing = cameraBearing + placement.azimuthDeg * .pi / 180
    let elevation = placement.elevationDeg * .pi / 180

    let ground = max(0.2, placement.distance) * cos(elevation)
    let rise = max(0.2, placement.distance) * sin(elevation)

    return (
        position: Vec3Value(
            x: subject.x + cos(bearing) * ground,
            y: max(0.12, subject.eyeHeight + rise),
            z: subject.z + sin(bearing) * ground
        ),
        aim: Vec3Value(x: subject.x, y: subject.eyeHeight, z: subject.z)
    )
}

/// Swing a fixture out of the camera's line of sight to the subject.
///
/// Walking a light in to fit a small room keeps its direction, and in a kitchen
/// that direction can put a metre-wide softbox between the lens and the face. No
/// gaffer has ever done that. The fixture is turned around the subject, keeping
/// its distance and its height, until it is clear of the shot by at least
/// `minAngleDeg`; it turns the shorter way, so a key stays on the side of the
/// face it was written for.
public func clearOfCamera(
    position: Vec3Value,
    aim: Vec3Value,
    camera: Vec3Value,
    minAngleDeg: Double = 25
) -> Vec3Value {
    let toLightX = position.x - aim.x, toLightZ = position.z - aim.z
    let toCameraX = camera.x - aim.x, toCameraZ = camera.z - aim.z
    let lightLen = (toLightX * toLightX + toLightZ * toLightZ).squareRoot()
    let cameraLen = (toCameraX * toCameraX + toCameraZ * toCameraZ).squareRoot()
    // A light directly overhead has no direction to swing, and a camera on top of
    // the subject gives nothing to swing away from.
    if lightLen < 1e-6 || cameraLen < 1e-6 { return position }

    let lightAngle = atan2(toLightZ, toLightX)
    let cameraAngle = atan2(toCameraZ, toCameraX)
    var difference = lightAngle - cameraAngle
    while difference > .pi { difference -= 2 * .pi }
    while difference < -.pi { difference += 2 * .pi }

    let minimum = minAngleDeg * .pi / 180
    if abs(difference) >= minimum { return position }

    // Away from the camera axis, the way it was already leaning. A fixture dead
    // on the axis goes left, which is where a key usually lives.
    let away: Double = difference == 0 ? 1 : (difference < 0 ? -1 : 1)
    let turned = cameraAngle + away * minimum
    return Vec3Value(
        x: aim.x + cos(turned) * lightLen,
        y: position.y,
        z: aim.z + sin(turned) * lightLen
    )
}

// MARK: - Stops

/// The reading a look's key should give at the subject, in scene units.
public func lookKeyIlluminance(_ look: LightingLook, studioKey: Double) -> Double {
    studioKey * pow(2, look.keyStops)
}

/// What one fixture in a look should read at its aim point, in scene units.
public func fixtureIlluminance(_ look: LightingLook, fixture: LookFixture, studioKey: Double) -> Double {
    lookKeyIlluminance(look, studioKey: studioKey) * pow(2, -fixture.stops)
}
