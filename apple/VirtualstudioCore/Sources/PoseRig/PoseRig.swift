import Foundation

/// Constrained joint editing on the 53-joint studio rig.
///
/// A port of `src/core/rendering/poseRig.ts`. The axis convention comes from the
/// rig itself, not from guesswork: the pose clips in
/// `scripts/characters/build_studio_characters.py` rotate a single local axis per
/// joint, and they read
///
///   upperarm (2, ±0.40)   elbow (0, −1.0)   thigh (0, −1.35)
///   calf     (0, +1.35)   head  (1, +0.22)  spine_03 (1, −0.12)
///
/// so in every joint's local frame X bends, Y twists and Z swings the limb away
/// from the body. A glTF node's rotation is already expressed relative to its
/// bind pose, so the values clamped here are anatomical angles measured from the
/// rest stance.
///
/// The ranges are conventional clinical figures, rounded and deliberately a
/// little tighter than a trained body can reach. They are not measured from a
/// subject.
///
/// `Double` throughout rather than `Float` or `simd`: these numbers are checked
/// against the TypeScript implementation to the last bits, and a joint limit is
/// arithmetic, not a hot render loop.

public struct Vec3: Equatable, Sendable, Codable {
    public var x: Double
    public var y: Double
    public var z: Double
    public init(x: Double, y: Double, z: Double) { self.x = x; self.y = y; self.z = z }
}

public struct Quat: Equatable, Sendable, Codable {
    public var x: Double
    public var y: Double
    public var z: Double
    public var w: Double
    public init(x: Double, y: Double, z: Double, w: Double) { self.x = x; self.y = y; self.z = z; self.w = w }
    public static let identity = Quat(x: 0, y: 0, z: 0, w: 1)
}

/// What a joint is allowed to do.
///
/// Per-axis Euler limits were tried first and are the wrong model. Every Euler
/// factorisation is ill-conditioned near its middle axis's ±90°, so an ordinary
/// reach decomposes into extreme numbers that a per-axis clamp then mangles — an
/// arm reaching forward came back pinned to its limits with the hand half a metre
/// off target. Swing and twist are stable everywhere, and they are what a
/// published range of motion actually describes.
public enum JointLimit: Equatable, Sendable {
    /// One axis of travel, one direction, no sideways play. Degrees about the
    /// joint's local X, measured from the bind pose.
    case hinge(min: Double, max: Double)
    /// How far the bone may point away from rest (`cone`), and how far it may
    /// twist about its own length (`twist`). Both in degrees.
    case ball(cone: Double, twist: Double)
}

public struct EditableJoint: Equatable, Sendable {
    /// Stable id used in scene documents.
    public let id: String
    /// glTF/Mixamo node name carrying the rotation.
    public let node: String
    /// Label shown in the studio interface.
    public let label: String
    public let limits: JointLimit
}

/// The joints a photographer can reach, head downwards.
///
/// Fingers, toes and the root stay out: the root is the character's own
/// transform, and the fingers are posed by the clip. Both sides share a figure,
/// because a body is symmetric.
public let EDITABLE_JOINTS: [EditableJoint] = [
    EditableJoint(id: "head", node: "mixamorigHead", label: "Hode", limits: .ball(cone: 45, twist: 70)),
    EditableJoint(id: "neck", node: "mixamorigNeck", label: "Nakke", limits: .ball(cone: 30, twist: 40)),
    EditableJoint(id: "chest", node: "mixamorigSpine2", label: "Bryst", limits: .ball(cone: 25, twist: 35)),
    EditableJoint(id: "upperBack", node: "mixamorigSpine1", label: "Øvre rygg", limits: .ball(cone: 20, twist: 20)),
    EditableJoint(id: "lowerBack", node: "mixamorigSpine", label: "Nedre rygg", limits: .ball(cone: 25, twist: 20)),

    EditableJoint(id: "leftShoulderBlade", node: "mixamorigLeftShoulder", label: "Venstre skulderblad", limits: .ball(cone: 20, twist: 15)),
    EditableJoint(id: "rightShoulderBlade", node: "mixamorigRightShoulder", label: "Høyre skulderblad", limits: .ball(cone: 20, twist: 15)),
    // The shoulder is the widest joint in the body: the arm reaches almost
    // anywhere, and rotates a long way about its own length as it does.
    EditableJoint(id: "leftShoulder", node: "mixamorigLeftArm", label: "Venstre skulder", limits: .ball(cone: 150, twist: 90)),
    EditableJoint(id: "rightShoulder", node: "mixamorigRightArm", label: "Høyre skulder", limits: .ball(cone: 150, twist: 90)),

    // The elbow only bends, and only one way: negative X, as the seated clip does.
    EditableJoint(id: "leftElbow", node: "mixamorigLeftForeArm", label: "Venstre albue", limits: .hinge(min: -150, max: 0)),
    EditableJoint(id: "rightElbow", node: "mixamorigRightForeArm", label: "Høyre albue", limits: .hinge(min: -150, max: 0)),

    EditableJoint(id: "leftHand", node: "mixamorigLeftHand", label: "Venstre hånd", limits: .ball(cone: 70, twist: 25)),
    EditableJoint(id: "rightHand", node: "mixamorigRightHand", label: "Høyre hånd", limits: .ball(cone: 70, twist: 25)),

    EditableJoint(id: "leftHip", node: "mixamorigLeftUpLeg", label: "Venstre hofte", limits: .ball(cone: 110, twist: 45)),
    EditableJoint(id: "rightHip", node: "mixamorigRightUpLeg", label: "Høyre hofte", limits: .ball(cone: 110, twist: 45)),

    // The knee bends the other way from the elbow: positive X, as the seated clip does.
    EditableJoint(id: "leftKnee", node: "mixamorigLeftLeg", label: "Venstre kne", limits: .hinge(min: 0, max: 150)),
    EditableJoint(id: "rightKnee", node: "mixamorigRightLeg", label: "Høyre kne", limits: .hinge(min: 0, max: 150)),
]

/// Limbs that can be posed by their end, rather than joint by joint.
public struct LimbChainSpec: Equatable, Sendable {
    public let id: String
    public let label: String
    /// Shoulder or hip — an editable joint.
    public let rootJoint: String
    /// Elbow or knee — the hinge.
    public let midJoint: String
    /// glTF node of the hand or foot the photographer drags.
    public let endNode: String
    /// Which way the hinge closes on its X axis: −1 for an elbow, +1 for a knee.
    ///
    /// Says which end of the joint's range to fold towards when shortening the
    /// limb, so an elbow folds forward and a knee folds back.
    public let bendSign: Double
}

public let LIMB_CHAINS: [LimbChainSpec] = [
    LimbChainSpec(id: "leftArm", label: "Venstre hånd", rootJoint: "leftShoulder", midJoint: "leftElbow", endNode: "mixamorigLeftHand", bendSign: -1),
    LimbChainSpec(id: "rightArm", label: "Høyre hånd", rootJoint: "rightShoulder", midJoint: "rightElbow", endNode: "mixamorigRightHand", bendSign: -1),
    LimbChainSpec(id: "leftLeg", label: "Venstre fot", rootJoint: "leftHip", midJoint: "leftKnee", endNode: "mixamorigLeftFoot", bendSign: 1),
    LimbChainSpec(id: "rightLeg", label: "Høyre fot", rootJoint: "rightHip", midJoint: "rightKnee", endNode: "mixamorigRightFoot", bendSign: 1),
]

private let JOINTS_BY_ID = Dictionary(uniqueKeysWithValues: EDITABLE_JOINTS.map { ($0.id, $0) })
private let JOINTS_BY_NODE = Dictionary(uniqueKeysWithValues: EDITABLE_JOINTS.map { ($0.node, $0) })

public func jointById(_ id: String) -> EditableJoint? { JOINTS_BY_ID[id] }
public func jointByNode(_ node: String) -> EditableJoint? { JOINTS_BY_NODE[node] }

public let DEG: Double = .pi / 180

/// The bone direction a ball joint's cone is measured from, when none is known.
public let DEFAULT_BONE_AXIS = Vec3(x: 0, y: 1, z: 0)

public enum PoseRigError: Error, Equatable {
    case unknownJoint(String)
}

// MARK: - Quaternion arithmetic

private func clamp(_ value: Double, _ minimum: Double, _ maximum: Double) -> Double {
    min(maximum, max(minimum, value))
}

private func finite(_ value: Double) -> Double {
    value.isFinite ? value : 0
}

public func quatLength(_ q: Quat) -> Double {
    (q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w).squareRoot()
}

public func normalizeQuat(_ q: Quat) -> Quat {
    let length = quatLength(q)
    guard length > 1e-9 else { return .identity }
    return Quat(x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length)
}

/// Hamilton product, in the same order the web renderer multiplies.
public func multiplyQuat(_ a: Quat, _ b: Quat) -> Quat {
    Quat(
        x: a.x * b.w + a.y * b.z - a.z * b.y + a.w * b.x,
        y: -a.x * b.z + a.y * b.w + a.z * b.x + a.w * b.y,
        z: a.x * b.y - a.y * b.x + a.z * b.w + a.w * b.z,
        w: -a.x * b.x - a.y * b.y - a.z * b.z + a.w * b.w
    )
}

public func conjugateQuat(_ q: Quat) -> Quat {
    Quat(x: -q.x, y: -q.y, z: -q.z, w: q.w)
}

/// Rotation of `angle` radians about a unit axis.
public func quatFromAxisAngle(_ axis: Vec3, _ angle: Double) -> Quat {
    let half = angle / 2
    let s = sin(half)
    return Quat(x: axis.x * s, y: axis.y * s, z: axis.z * s, w: cos(half))
}

public func unitVector(_ v: Vec3, fallback: Vec3 = DEFAULT_BONE_AXIS) -> Vec3 {
    let length = (v.x * v.x + v.y * v.y + v.z * v.z).squareRoot()
    guard length > 1e-9 else { return fallback }
    return Vec3(x: v.x / length, y: v.y / length, z: v.z / length)
}

/// Split a rotation into a swing away from `axis` and a twist about it.
///
/// `q = swing ⊗ twist`, with the swing's own axis perpendicular to `axis`. This
/// is the decomposition a joint limit is written in: how far the bone points away
/// from rest, and how far it has rolled about its own length.
public func swingTwist(_ q: Quat, axis: Vec3) -> (swing: Quat, twist: Quat) {
    let unit = unitVector(axis)
    let projection = q.x * unit.x + q.y * unit.y + q.z * unit.z
    var twist = normalizeQuat(Quat(
        x: unit.x * projection,
        y: unit.y * projection,
        z: unit.z * projection,
        w: q.w
    ))
    // A half turn of pure swing leaves no twist to speak of; keep it identity
    // rather than letting a vanishing projection pick an arbitrary direction.
    if abs(projection) < 1e-9 && abs(q.w) < 1e-9 { twist = .identity }
    let swing = multiplyQuat(q, conjugateQuat(twist))
    return (swing, twist)
}

/// Rotation angle of a quaternion, in radians, always in [0, π].
public func quatAngle(_ q: Quat) -> Double {
    let unit = normalizeQuat(q)
    return 2 * acos(clamp(abs(unit.w), -1, 1))
}

/// Shorten a rotation to at most `maxAngle` radians about its own axis.
public func limitQuatAngle(_ q: Quat, maxAngle: Double) -> Quat {
    let unit = normalizeQuat(q)
    let angle = quatAngle(unit)
    if angle <= maxAngle + 1e-9 { return unit }
    let sine = max(0, 1 - unit.w * unit.w).squareRoot()
    if sine < 1e-9 { return .identity }
    let sign: Double = unit.w < 0 ? -1 : 1
    let axis = Vec3(x: (unit.x / sine) * sign, y: (unit.y / sine) * sign, z: (unit.z / sine) * sign)
    return quatFromAxisAngle(axis, maxAngle)
}

/// Signed rotation about `axis`, in radians, in (−π, π].
public func twistAngle(_ twist: Quat, axis: Vec3) -> Double {
    let unit = unitVector(axis)
    let along = twist.x * unit.x + twist.y * unit.y + twist.z * unit.z
    return 2 * atan2(along, twist.w)
}

/// Clamp a joint rotation to what that joint can do.
///
/// A hinge keeps its angle about X and loses any sideways play entirely, so a
/// drag cannot accumulate drift. A ball joint keeps its swing inside its cone and
/// its twist inside its range.
///
/// `boneAxis` is the direction of the bone in the joint's own local frame — for
/// an arm, the direction from the shoulder towards the elbow at rest. Without one
/// the joint is measured about its local Y.
///
/// A circular cone, not a per-direction envelope. A shoulder is genuinely less
/// free across the body than away from it; worth splitting only if a pose that
/// passes here reads as wrong.
public func clampJointQuaternion(
    _ jointId: String,
    rotation: Quat,
    boneAxis: Vec3 = DEFAULT_BONE_AXIS
) throws -> Quat {
    guard let joint = JOINTS_BY_ID[jointId] else { throw PoseRigError.unknownJoint(jointId) }

    let q = normalizeQuat(Quat(
        x: finite(rotation.x), y: finite(rotation.y), z: finite(rotation.z), w: finite(rotation.w)
    ))

    switch joint.limits {
    case let .hinge(minimum, maximum):
        let axis = Vec3(x: 1, y: 0, z: 0)
        let angle = clamp(twistAngle(q, axis: axis), minimum * DEG, maximum * DEG)
        return quatFromAxisAngle(axis, angle)

    case let .ball(cone, twistRange):
        let split = swingTwist(q, axis: boneAxis)
        let limitedSwing = limitQuatAngle(split.swing, maxAngle: cone * DEG)
        let limitedTwist = quatFromAxisAngle(
            unitVector(boneAxis),
            clamp(twistAngle(split.twist, axis: boneAxis), -twistRange * DEG, twistRange * DEG)
        )
        return normalizeQuat(multiplyQuat(limitedSwing, limitedTwist))
    }
}

/// True when a rotation is already inside the joint's range.
public func isWithinLimits(
    _ jointId: String,
    rotation: Quat,
    boneAxis: Vec3 = DEFAULT_BONE_AXIS,
    toleranceRad: Double = 1e-6
) throws -> Bool {
    let clamped = try clampJointQuaternion(jointId, rotation: rotation, boneAxis: boneAxis)
    let q = normalizeQuat(rotation)
    // Quaternions double-cover rotations, so compare the angle between them.
    let dotProduct = abs(clamped.x * q.x + clamped.y * q.y + clamped.z * q.z + clamped.w * q.w)
    return 2 * acos(clamp(dotProduct, -1, 1)) <= toleranceRad
}

/// Which gizmo rings a joint should offer.
public func freeAxes(_ joint: EditableJoint) -> [String] {
    switch joint.limits {
    case .hinge: ["x"]
    case .ball: ["x", "y", "z"]
    }
}

/// Euler convenience, as Rz · Ry · Rx.
///
/// The limits themselves are swing and twist; these two exist so a joint can be
/// set and read in plain angles from a panel or a test. The order puts Y in the
/// middle, so X and Z keep their full range and a folded elbow survives the round
/// trip — yaw-pitch-roll would gimbal-lock it at 90°.
public func quatFromEuler(_ a: Vec3) -> Quat {
    let cx = cos(a.x / 2), sx = sin(a.x / 2)
    let cy = cos(a.y / 2), sy = sin(a.y / 2)
    let cz = cos(a.z / 2), sz = sin(a.z / 2)
    return Quat(
        x: sx * cy * cz - cx * sy * sz,
        y: cx * sy * cz + sx * cy * sz,
        z: cx * cy * sz - sx * sy * cz,
        w: cx * cy * cz + sx * sy * sz
    )
}

/// The inverse of `quatFromEuler`.
public func eulerFromQuat(_ q: Quat) -> Vec3 {
    let pitch = clamp(2 * (q.w * q.y - q.z * q.x), -1, 1)
    return Vec3(
        x: atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)),
        y: asin(pitch),
        z: atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))
    )
}
