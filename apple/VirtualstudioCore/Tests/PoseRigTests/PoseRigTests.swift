import Foundation
import Testing
@testable import PoseRig

/// The joint table and its limits, checked against the web studio.
///
/// 816 clamp cases: every one of the seventeen joints, against four bone axes,
/// against twelve rotations — resting, folded, twisted, past its limit, a half
/// turn, unnormalised, all zero, and not a number at all. Quaternion code looks
/// the same whatever it computes, which is exactly why a port of it has to be
/// checked against the original rather than against fresh tests written from the
/// same intuition.
private let tolerance = 1e-12

private func expectClose(
    _ actual: Double,
    _ expected: Double,
    _ label: String,
    sourceLocation: SourceLocation = #_sourceLocation
) {
    if actual.isNaN && expected.isNaN { return }
    let scale = max(abs(expected), 1)
    #expect(
        abs(actual - expected) <= tolerance * scale,
        "\(label): got \(actual), fixture says \(expected)",
        sourceLocation: sourceLocation
    )
}

private func expectClose(
    _ actual: Quat,
    _ expected: Quat,
    _ label: String,
    sourceLocation: SourceLocation = #_sourceLocation
) {
    expectClose(actual.x, expected.x, "\(label).x", sourceLocation: sourceLocation)
    expectClose(actual.y, expected.y, "\(label).y", sourceLocation: sourceLocation)
    expectClose(actual.z, expected.z, "\(label).z", sourceLocation: sourceLocation)
    expectClose(actual.w, expected.w, "\(label).w", sourceLocation: sourceLocation)
}

private func expectClose(
    _ actual: Vec3,
    _ expected: Vec3,
    _ label: String,
    sourceLocation: SourceLocation = #_sourceLocation
) {
    expectClose(actual.x, expected.x, "\(label).x", sourceLocation: sourceLocation)
    expectClose(actual.y, expected.y, "\(label).y", sourceLocation: sourceLocation)
    expectClose(actual.z, expected.z, "\(label).z", sourceLocation: sourceLocation)
}

// MARK: - The fixture file

/// A number as JSON can carry it. `JSON.stringify(NaN)` is `null`, so a null here
/// means the case was deliberately fed something that is not a number.
private struct MaybeNumber: Decodable {
    let value: Double
    init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        value = container.decodeNil() ? .nan : try container.decode(Double.self)
    }
}

private struct QuatJSON: Decodable {
    let x: MaybeNumber, y: MaybeNumber, z: MaybeNumber, w: MaybeNumber
    var quat: Quat { Quat(x: x.value, y: y.value, z: z.value, w: w.value) }
}

private struct Vec3JSON: Decodable {
    let x: Double, y: Double, z: Double
    var vec: Vec3 { Vec3(x: x, y: y, z: z) }
}

private struct Fixture: Decodable {
    struct Limits: Decodable {
        let kind: String
        let min: Double?
        let max: Double?
        let cone: Double?
        let twist: Double?
    }
    struct Joint: Decodable {
        let id: String, node: String, label: String
        let limits: Limits
        let freeAxes: [String]
    }
    struct Chain: Decodable {
        let id: String, label: String, rootJoint: String, midJoint: String, endNode: String
        let bendSign: Double
    }
    struct Unit: Decodable { let name: String; let axis: Vec3JSON; let unit: Vec3JSON }
    struct Angle: Decodable { let name: String; let q: QuatJSON; let radians: MaybeNumber }
    struct Product: Decodable { let a: QuatJSON; let b: QuatJSON; let product: QuatJSON; let conjugateOfA: QuatJSON }
    struct Split: Decodable {
        let rotation: String, axis: String
        let axisVector: Vec3JSON, q: QuatJSON, swing: QuatJSON, twist: QuatJSON
    }
    struct Limited: Decodable { let name: String; let q: QuatJSON; let maxAngle: Double; let limited: QuatJSON }
    struct Twist: Decodable { let rotation: String, axis: String; let axisVector: Vec3JSON, q: QuatJSON; let radians: MaybeNumber }
    struct Clamped: Decodable {
        let joint: String, rotation: String, axis: String
        let axisVector: Vec3JSON, q: QuatJSON, clamped: QuatJSON
        let within: Bool
    }
    struct Euler: Decodable { let angles: Vec3JSON; let q: QuatJSON; let back: Vec3JSON }

    let source: String
    let DEG: Double
    let joints: [Joint]
    let limbChains: [Chain]
    let unitVector: [Unit]
    let quatAngle: [Angle]
    let multiplyQuat: [Product]
    let swingTwist: [Split]
    let limitQuatAngle: [Limited]
    let twistAngle: [Twist]
    let clamped: [Clamped]
    let euler: [Euler]
}

private let fixture: Fixture = {
    guard let url = Bundle.module.url(forResource: "poseRig", withExtension: "json", subdirectory: "Fixtures") else {
        fatalError("poseRig.json is missing. Generate it with UPDATE_FIXTURES=1 npm test -- poseRig.fixtures")
    }
    // swiftlint:disable:next force_try
    return try! JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
}()

// MARK: - The table

@Test("the same seventeen joints, in the same order, with the same limits")
func jointTable() throws {
    #expect(EDITABLE_JOINTS.count == fixture.joints.count)
    for (joint, expected) in zip(EDITABLE_JOINTS, fixture.joints) {
        #expect(joint.id == expected.id)
        #expect(joint.node == expected.node, "\(joint.id)")
        #expect(joint.label == expected.label, "\(joint.id)")
        #expect(freeAxes(joint) == expected.freeAxes, "\(joint.id)")
        switch joint.limits {
        case let .hinge(minimum, maximum):
            #expect(expected.limits.kind == "hinge", "\(joint.id)")
            expectClose(minimum, try #require(expected.limits.min), "\(joint.id) min")
            expectClose(maximum, try #require(expected.limits.max), "\(joint.id) max")
        case let .ball(cone, twist):
            #expect(expected.limits.kind == "ball", "\(joint.id)")
            expectClose(cone, try #require(expected.limits.cone), "\(joint.id) cone")
            expectClose(twist, try #require(expected.limits.twist), "\(joint.id) twist")
        }
        // And both lookups find it, which is how the pose editor addresses a joint.
        #expect(jointById(joint.id)?.node == joint.node)
        #expect(jointByNode(joint.node)?.id == joint.id)
    }
    expectClose(DEG, fixture.DEG, "DEG")
}

@Test("the same four limbs, folding the same way")
func limbChains() {
    #expect(LIMB_CHAINS.count == fixture.limbChains.count)
    for (chain, expected) in zip(LIMB_CHAINS, fixture.limbChains) {
        #expect(chain.id == expected.id)
        #expect(chain.label == expected.label, "\(chain.id)")
        #expect(chain.rootJoint == expected.rootJoint, "\(chain.id)")
        #expect(chain.midJoint == expected.midJoint, "\(chain.id)")
        #expect(chain.endNode == expected.endNode, "\(chain.id)")
        // An elbow folds forward and a knee folds back. Getting this backwards
        // is invisible in a unit test and obvious on screen.
        #expect(chain.bendSign == expected.bendSign, "\(chain.id)")
    }
}

// MARK: - The quaternion arithmetic

@Test("a bone axis normalises the same way, including a degenerate one")
func unitVectors() {
    for row in fixture.unitVector {
        expectClose(unitVector(row.axis.vec), row.unit.vec, row.name)
    }
}

@Test("a rotation's angle is the same angle")
func angles() {
    for row in fixture.quatAngle {
        expectClose(quatAngle(row.q.quat), row.radians.value, "\(row.name)")
    }
}

@Test("two rotations multiply in the same order")
func products() {
    for (index, row) in fixture.multiplyQuat.enumerated() {
        expectClose(multiplyQuat(row.a.quat, row.b.quat), row.product.quat, "product \(index)")
        expectClose(conjugateQuat(row.a.quat), row.conjugateOfA.quat, "conjugate \(index)")
    }
}

@Test("swing and twist split the same way about every axis")
func splits() {
    for row in fixture.swingTwist {
        let split = swingTwist(row.q.quat, axis: row.axisVector.vec)
        let label = "\(row.rotation) about \(row.axis)"
        expectClose(split.swing, row.swing.quat, "\(label) swing")
        expectClose(split.twist, row.twist.quat, "\(label) twist")
    }
}

@Test("a rotation shortens to the same limit")
func limits() {
    for row in fixture.limitQuatAngle {
        expectClose(limitQuatAngle(row.q.quat, maxAngle: row.maxAngle), row.limited.quat,
                    "\(row.name) at \(row.maxAngle)")
    }
}

@Test("the twist about an axis is the same signed angle")
func twists() {
    for row in fixture.twistAngle {
        expectClose(twistAngle(row.q.quat, axis: row.axisVector.vec), row.radians.value,
                    "\(row.rotation) about \(row.axis)")
    }
}

// MARK: - The clamp

@Test("every joint clamps every rotation to the same place")
func clamps() throws {
    #expect(fixture.clamped.count == 816)
    for row in fixture.clamped {
        let label = "\(row.joint) · \(row.rotation) · \(row.axis)"
        let clamped = try clampJointQuaternion(row.joint, rotation: row.q.quat, boneAxis: row.axisVector.vec)
        expectClose(clamped, row.clamped.quat, label)
        #expect(try isWithinLimits(row.joint, rotation: row.q.quat, boneAxis: row.axisVector.vec) == row.within, "\(label)")
    }
}

@Test("the fixture actually pushes joints out of range, or it would prove nothing")
func fixtureIsNotDegenerate() {
    // A fixture where every rotation happened to be legal would assert only that
    // the clamp returns its input.
    let refused = fixture.clamped.filter { !$0.within }
    #expect(refused.count > 100)
    for joint in EDITABLE_JOINTS {
        #expect(refused.contains { $0.joint == joint.id }, "\(joint.id) is never pushed out of range")
    }
}

@Test("a hinge loses sideways play entirely")
func hingesAreHinges() throws {
    // Not a golden value: the property is what keeps a drag from accumulating
    // drift, and it must hold whatever the numbers become.
    let sideways = quatFromEuler(Vec3(x: 0, y: 0.6, z: 0.4))
    for joint in EDITABLE_JOINTS where freeAxes(joint) == ["x"] {
        let clamped = try clampJointQuaternion(joint.id, rotation: sideways)
        #expect(abs(clamped.y) < 1e-12, "\(joint.id) kept a y component")
        #expect(abs(clamped.z) < 1e-12, "\(joint.id) kept a z component")
    }
}

@Test("an elbow bends one way and a knee the other")
func hingeDirections() throws {
    // The rig fact, asserted rather than trusted: the seated clip folds elbows
    // to negative X and knees to positive X.
    let wrongForElbow = quatFromEuler(Vec3(x: 1.0, y: 0, z: 0))
    let elbow = try clampJointQuaternion("leftElbow", rotation: wrongForElbow)
    expectClose(quatAngle(elbow), 0, "an elbow asked to bend backwards stays put")

    let wrongForKnee = quatFromEuler(Vec3(x: -1.0, y: 0, z: 0))
    let knee = try clampJointQuaternion("leftKnee", rotation: wrongForKnee)
    expectClose(quatAngle(knee), 0, "a knee asked to bend forwards stays put")

    // And each folds fully the way it does bend.
    // −3 rad is −172°, past the elbow's −150° limit, so it comes back at the limit.
    let folded = try clampJointQuaternion("leftElbow", rotation: quatFromEuler(Vec3(x: -3.0, y: 0, z: 0)))
    expectClose(quatAngle(folded), 150 * DEG, "an elbow folds to its limit")
    // And −2 rad is −115°, which an elbow can do, so it is kept as asked.
    let inRange = try clampJointQuaternion("leftElbow", rotation: quatFromEuler(Vec3(x: -2.0, y: 0, z: 0)))
    expectClose(quatAngle(inRange), 2.0, "an elbow inside its range is left alone")
}

@Test("euler angles survive the round trip that gimbal lock would break")
func eulerRoundTrip() {
    for row in fixture.euler {
        let q = quatFromEuler(row.angles.vec)
        expectClose(q, row.q.quat, "quat from \(row.angles.vec)")
        expectClose(eulerFromQuat(q), row.back.vec, "euler back from \(row.angles.vec)")
    }
}

@Test("an unknown joint is refused, not silently ignored")
func unknownJoint() {
    #expect(throws: PoseRigError.unknownJoint("nose")) {
        try clampJointQuaternion("nose", rotation: .identity)
    }
}
