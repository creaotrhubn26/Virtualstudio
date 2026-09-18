import Foundation

/// Named moves, in the words a film crew already uses.
///
/// A port of `src/services/movePresets.ts`. Nobody should have to write keyframes
/// to push the camera in or make a bulb fail. A move is chosen by name — "dolly
/// inn", "lyset svikter" — and becomes an ordinary cue: the same tracks, on the
/// same timeline, editable afterwards by anyone who wants to. The simple way in
/// and the detailed one are the same thing underneath, so nothing has to be
/// rebuilt to go from one to the other.
///
/// Every builder is pure: it reads where things are now and returns a cue. That
/// makes the whole vocabulary testable without a scene, on either platform.

public struct Keyframe: Equatable, Sendable, Codable {
    public let time: Double
    public let value: Vec3Value
}

/// One driven channel: where a thing stands, how it turns, how it burns.
public struct AnimationTrack: Equatable, Sendable, Codable {
    public let id: String
    public let nodeId: String
    /// `position`, `rotation`, `intensity`, `color` or `target`.
    public let type: String
    public let keyframes: [Keyframe]
}

/// A named beat, placed on the scene's clock by its own start time, so retiming
/// one moves everything in it together.
public struct AnimationCue: Equatable, Sendable, Codable {
    public let id: String
    public let name: String
    public let start: Double
    public let enabled: Bool
    public let tracks: [AnimationTrack]
}

public struct CameraPose: Equatable, Sendable {
    public let position: Vec3Value
    /// What the camera is pointed at.
    public let target: Vec3Value
    public init(position: Vec3Value, target: Vec3Value) {
        self.position = position
        self.target = target
    }
}

public struct MoveRequest: Equatable, Sendable {
    /// Where the cue sits on the scene's clock, in seconds.
    public let start: Double
    /// How long the move takes, in seconds.
    public let duration: Double
    /// Distinguishes this cue from others of the same kind.
    public let id: String
    public init(start: Double, duration: Double, id: String) {
        self.start = start
        self.duration = duration
        self.id = id
    }
}

/// How far a dolly, truck or pedestal travels, as a share of the shot distance.
private let TRAVEL = 0.35
/// How far a pan, tilt or orbit turns.
private let TURN = Double.pi / 6

private func add(_ a: Vec3Value, _ b: Vec3Value) -> Vec3Value {
    Vec3Value(x: a.x + b.x, y: a.y + b.y, z: a.z + b.z)
}
private func subtract(_ a: Vec3Value, _ b: Vec3Value) -> Vec3Value {
    Vec3Value(x: a.x - b.x, y: a.y - b.y, z: a.z - b.z)
}
private func scaled(_ a: Vec3Value, _ k: Double) -> Vec3Value {
    Vec3Value(x: a.x * k, y: a.y * k, z: a.z * k)
}
private func length(_ a: Vec3Value) -> Double {
    (a.x * a.x + a.y * a.y + a.z * a.z).squareRoot()
}
private func unit(_ a: Vec3Value, fallback: Vec3Value = Vec3Value(x: 0, y: 0, z: 1)) -> Vec3Value {
    let len = length(a)
    return len > 1e-9 ? scaled(a, 1 / len) : fallback
}

/// Rotate about the vertical axis, which is what a pan or an orbit does.
private func turnY(_ point: Vec3Value, about: Vec3Value, angle: Double) -> Vec3Value {
    let offset = subtract(point, about)
    let c = cos(angle), s = sin(angle)
    return add(about, Vec3Value(
        x: offset.x * c + offset.z * s,
        y: offset.y,
        z: -offset.x * s + offset.z * c
    ))
}

private func makeTrack(_ id: String, _ nodeId: String, _ type: String, _ frames: [(Double, Vec3Value)]) -> AnimationTrack {
    AnimationTrack(id: id, nodeId: nodeId, type: type,
                   keyframes: frames.map { Keyframe(time: $0.0, value: $0.1) })
}

private func makeCue(_ request: MoveRequest, _ name: String, _ tracks: [AnimationTrack]) -> AnimationCue {
    AnimationCue(id: request.id, name: name, start: request.start, enabled: true, tracks: tracks)
}

/// Build a camera move.
///
/// Distances are relative to how far the camera stands from its subject, so the
/// same button reads the same on a tight portrait and across a hangar.
public func buildCameraMove(
    _ move: String,
    request: MoveRequest,
    camera: CameraPose,
    cameraNodeId node: String
) -> AnimationCue? {
    let duration = request.duration
    let toTarget = subtract(camera.target, camera.position)
    let distance = max(0.2, length(toTarget))
    let forward = unit(toTarget)
    let right = unit(Vec3Value(x: forward.z, y: 0, z: -forward.x), fallback: Vec3Value(x: 1, y: 0, z: 0))
    let travel = distance * TRAVEL

    func positionTo(_ end: Vec3Value) -> [AnimationTrack] {
        [makeTrack("\(request.id)-position", node, "position", [(0, camera.position), (duration, end)])]
    }
    func targetTo(_ end: Vec3Value) -> [AnimationTrack] {
        [makeTrack("\(request.id)-target", node, "target", [(0, camera.target), (duration, end)])]
    }

    switch move {
    case "dolly-in":
        // Stop short of the subject: arriving on top of it is never the shot.
        return makeCue(request, "Dolly inn",
                       positionTo(add(camera.position, scaled(forward, min(travel, distance * 0.8)))))
    case "dolly-out":
        return makeCue(request, "Dolly ut", positionTo(subtract(camera.position, scaled(forward, travel))))
    case "truck-left":
        return makeCue(request, "Truck venstre",
                       positionTo(subtract(camera.position, scaled(right, travel)))
                       // The subject stays framed: a truck slides, it does not swing away.
                       + targetTo(subtract(camera.target, scaled(right, travel))))
    case "truck-right":
        return makeCue(request, "Truck høyre",
                       positionTo(add(camera.position, scaled(right, travel)))
                       + targetTo(add(camera.target, scaled(right, travel))))
    case "pedestal-up":
        return makeCue(request, "Pedestal opp",
                       positionTo(add(camera.position, Vec3Value(x: 0, y: travel, z: 0)))
                       + targetTo(add(camera.target, Vec3Value(x: 0, y: travel, z: 0))))
    case "pedestal-down":
        return makeCue(request, "Pedestal ned",
                       positionTo(add(camera.position, Vec3Value(x: 0, y: -travel, z: 0)))
                       + targetTo(add(camera.target, Vec3Value(x: 0, y: -travel, z: 0))))
    case "pan-left":
        return makeCue(request, "Panorer venstre", targetTo(turnY(camera.target, about: camera.position, angle: TURN)))
    case "pan-right":
        return makeCue(request, "Panorer høyre", targetTo(turnY(camera.target, about: camera.position, angle: -TURN)))
    case "tilt-up":
        return makeCue(request, "Tilt opp", targetTo(add(camera.target, Vec3Value(x: 0, y: distance * 0.25, z: 0))))
    case "tilt-down":
        return makeCue(request, "Tilt ned", targetTo(add(camera.target, Vec3Value(x: 0, y: -distance * 0.25, z: 0))))
    case "orbit-left":
        // The camera travels, the subject does not: an arc keeps it framed.
        return makeCue(request, "Sirkle venstre", positionTo(turnY(camera.position, about: camera.target, angle: TURN)))
    case "orbit-right":
        return makeCue(request, "Sirkle høyre", positionTo(turnY(camera.position, about: camera.target, angle: -TURN)))
    default:
        return nil
    }
}

private func level(_ value: Double) -> Vec3Value {
    Vec3Value(x: max(0, value), y: 0, z: 0)
}

/// A repeating on-off pattern, used by flicker, pulse and failing.
private func pattern(
    _ id: String,
    _ node: String,
    _ duration: Double,
    steps: Int,
    valueAt: (Int, Double) -> Double
) -> AnimationTrack {
    var frames: [(Double, Vec3Value)] = []
    for step in 0...steps {
        let fraction = Double(step) / Double(steps)
        frames.append((duration * fraction, level(valueAt(step, fraction))))
    }
    return makeTrack(id, node, "intensity", frames)
}

/// Build a light move against what the fixture is doing now.
public func buildLightMove(
    _ move: String,
    request: MoveRequest,
    lightNodeId node: String,
    /// The fixture's output now, as a fraction of its own full power.
    intensity: Double,
    /// Its colour now, red green blue, each 0 to 1.
    color: Vec3Value
) -> AnimationCue? {
    let duration = request.duration
    let id = "\(request.id)-intensity"
    let full = max(intensity, 0.05)

    switch move {
    case "fade-up":
        return makeCue(request, "Tenn opp", [makeTrack(id, node, "intensity", [(0, level(0)), (duration, level(full))])])
    case "fade-down":
        return makeCue(request, "Dimme ned", [makeTrack(id, node, "intensity", [(0, level(full)), (duration, level(0))])])
    case "flicker":
        // Unsteady but alive: never fully out, and never twice the same.
        return makeCue(request, "Flimre", [pattern(id, node, duration, steps: 24) { step, _ in
            full * (step % 3 == 0 ? 0.35 : step % 4 == 0 ? 0.85 : 1)
        }])
    case "failing":
        // Gets worse as it goes, and ends dark.
        return makeCue(request, "Svikte", [pattern(id, node, duration, steps: 28) { step, fraction in
            step % 2 == 0 ? full * (1 - fraction) : full * (1 - fraction) * 0.15
        }])
    case "pulse":
        return makeCue(request, "Pulsere", [pattern(id, node, duration, steps: 16) { _, fraction in
            full * (0.5 + 0.5 * cos(fraction * .pi * 8))
        }])
    case "lightning":
        // Two hard strikes against darkness, the second the harder.
        return makeCue(request, "Lyn", [makeTrack(id, node, "intensity", [
            (0, level(0)),
            (duration * 0.08, level(full * 3)),
            (duration * 0.16, level(0)),
            (duration * 0.52, level(0)),
            (duration * 0.58, level(full * 4)),
            (duration * 0.62, level(full * 0.6)),
            (duration * 0.70, level(full * 3)),
            (duration * 0.80, level(0)),
            (duration, level(0)),
        ])])
    case "to-warm":
        return makeCue(request, "Mot varmt", [makeTrack("\(request.id)-color", node, "color", [
            (0, color), (duration, Vec3Value(x: 1, y: 0.62, z: 0.28)),
        ])])
    case "to-cold":
        return makeCue(request, "Mot kaldt", [makeTrack("\(request.id)-color", node, "color", [
            (0, color), (duration, Vec3Value(x: 0.62, y: 0.76, z: 1)),
        ])])
    default:
        return nil
    }
}
