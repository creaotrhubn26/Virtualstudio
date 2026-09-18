import Foundation
import PoseRig

/// Two-bone inverse kinematics for arms and legs.
///
/// A port of `src/core/rendering/limbIk.ts`. Placing a hand by rotating the
/// shoulder and then the elbow is how a rig works, not how a photographer
/// thinks. This solves the other way round: give it where the hand should be and
/// it returns where the elbow has to go.
///
/// The same analytic solve already produces the seated pose in
/// `scripts/characters/build_studio_characters.py`, where the arms are placed
/// onto the thighs from the real limb lengths. Keeping the runtime on the same
/// construction means a posed limb and a bundled clip bend the same way.

public struct TwoBoneChain: Equatable, Sendable {
    /// Shoulder or hip, in world space.
    public var root: Vec3
    /// Elbow or knee, in world space. Sets the limb lengths and the rest bend.
    public var mid: Vec3
    /// Hand or foot, in world space.
    public var end: Vec3

    public init(root: Vec3, mid: Vec3, end: Vec3) {
        self.root = root
        self.mid = mid
        self.end = end
    }
}

public struct TwoBoneSolution: Equatable, Sendable {
    /// Where the elbow or knee ends up.
    public let mid: Vec3
    /// Where the hand or foot ends up — the target, unless it is out of reach.
    public let end: Vec3
    /// True when the target was further away than the limb can stretch.
    public let overextended: Bool
    /// Interior angle at the elbow or knee, radians: π is straight.
    public let bend: Double
}

public enum LimbIKError: Error, Equatable {
    case degenerateChain
}

/// How close to straight a limb may lock.
///
/// A fully extended limb has no plane left to bend in, so the elbow position
/// becomes undefined and the joint snaps about. Real limbs stop short of straight
/// too.
public let MAX_EXTENSION: Double = 0.995

public func add(_ a: Vec3, _ b: Vec3) -> Vec3 { Vec3(x: a.x + b.x, y: a.y + b.y, z: a.z + b.z) }
public func subtract(_ a: Vec3, _ b: Vec3) -> Vec3 { Vec3(x: a.x - b.x, y: a.y - b.y, z: a.z - b.z) }
public func scale(_ a: Vec3, _ factor: Double) -> Vec3 { Vec3(x: a.x * factor, y: a.y * factor, z: a.z * factor) }
public func dot(_ a: Vec3, _ b: Vec3) -> Double { a.x * b.x + a.y * b.y + a.z * b.z }

public func cross(_ a: Vec3, _ b: Vec3) -> Vec3 {
    Vec3(
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    )
}

public func length(_ a: Vec3) -> Double { dot(a, a).squareRoot() }

public func normalize(_ a: Vec3, fallback: Vec3 = Vec3(x: 0, y: 0, z: 1)) -> Vec3 {
    let len = length(a)
    return len > 1e-9 ? scale(a, 1 / len) : fallback
}

/// The part of `a` that is perpendicular to the unit vector `axis`.
public func reject(_ a: Vec3, axis: Vec3) -> Vec3 {
    subtract(a, scale(axis, dot(a, axis)))
}

/// The plane the limb currently bends in, as a unit vector from the root-to-end
/// line towards the elbow.
///
/// Used when the caller gives no preference, so a solved limb keeps bending the
/// way it already does instead of flipping its elbow behind the body.
public func chainPole(_ chain: TwoBoneChain, fallback: Vec3 = Vec3(x: 0, y: 0, z: 1)) -> Vec3 {
    let axis = normalize(subtract(chain.end, chain.root), fallback: fallback)
    let towardsMid = reject(subtract(chain.mid, chain.root), axis: axis)
    if length(towardsMid) > 1e-6 { return normalize(towardsMid) }

    // A straight limb has no plane of its own; take any direction across it.
    let seed = abs(axis.y) < 0.9 ? Vec3(x: 0, y: 1, z: 0) : Vec3(x: 1, y: 0, z: 0)
    return normalize(reject(seed, axis: axis), fallback: fallback)
}

/// Place the hand or foot at `target` and work out where the elbow or knee goes.
///
/// Law of cosines on the triangle root–mid–end: the distance along the line to
/// the target fixes how far down that line the elbow sits, and the remaining side
/// of the triangle fixes how far out. `pole` chooses which way "out" is; without
/// one the limb keeps its current bend plane.
///
/// No joint limits of its own. The caller clamps the rotations it derives, which
/// is where the limits live.
public func solveTwoBoneIk(
    _ chain: TwoBoneChain,
    target: Vec3,
    pole: Vec3? = nil
) throws -> TwoBoneSolution {
    let upper = length(subtract(chain.mid, chain.root))
    let lower = length(subtract(chain.end, chain.mid))
    guard upper > 1e-9, lower > 1e-9 else { throw LimbIKError.degenerateChain }

    let toTarget = subtract(target, chain.root)
    let reach = length(toTarget)
    let maxReach = (upper + lower) * MAX_EXTENSION
    let minReach = abs(upper - lower) * 1.001 + 1e-4

    let fallbackAxis = normalize(subtract(chain.end, chain.root))
    let direction = reach > 1e-9 ? scale(toTarget, 1 / reach) : fallbackAxis
    let overextended = reach > maxReach
    let distance = min(max(reach, minReach), maxReach)

    // Distance from the root to the foot of the elbow's perpendicular.
    let along = (upper * upper - lower * lower + distance * distance) / (2 * distance)
    let offset = max(0, upper * upper - along * along).squareRoot()

    let preferred = pole ?? chainPole(chain, fallback: fallbackAxis)
    let planar = reject(preferred, axis: direction)
    let bendDirection: Vec3
    if length(planar) > 1e-6 {
        bendDirection = normalize(planar)
    } else {
        var straightened = chain
        straightened.end = add(chain.root, scale(direction, distance))
        bendDirection = chainPole(straightened, fallback: fallbackAxis)
    }

    let mid = add(chain.root, add(scale(direction, along), scale(bendDirection, offset)))
    let end = add(chain.root, scale(direction, distance))

    // Interior angle at the elbow, from the triangle's three sides.
    let cosBend = (upper * upper + lower * lower - distance * distance) / (2 * upper * lower)
    let bend = acos(min(1, max(-1, cosBend)))

    return TwoBoneSolution(mid: mid, end: end, overextended: overextended, bend: bend)
}
