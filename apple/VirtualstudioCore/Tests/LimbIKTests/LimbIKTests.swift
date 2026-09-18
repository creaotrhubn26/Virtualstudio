import Foundation
import Testing
import PoseRig
@testable import LimbIK

/// The two-bone solve, checked against the web studio.
///
/// Two facts cost real debugging time in the web version and are the ones a port
/// is most likely to lose: a limb must not lock straight, and a solved limb must
/// keep the bend plane its clip gave it or the elbow flips behind the body. Both
/// are cases in the fixture, not prose.
private let tolerance = 1e-12

private func expectClose(
    _ actual: Double,
    _ expected: Double,
    _ label: String,
    sourceLocation: SourceLocation = #_sourceLocation
) {
    let scale = max(abs(expected), 1)
    #expect(
        abs(actual - expected) <= tolerance * scale,
        "\(label): got \(actual), fixture says \(expected)",
        sourceLocation: sourceLocation
    )
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

private struct Vec3JSON: Decodable {
    let x: Double, y: Double, z: Double
    var vec: Vec3 { Vec3(x: x, y: y, z: z) }
}

private struct ChainJSON: Decodable {
    let root: Vec3JSON, mid: Vec3JSON, end: Vec3JSON
    var chain: TwoBoneChain { TwoBoneChain(root: root.vec, mid: mid.vec, end: end.vec) }
}

private struct Fixture: Decodable {
    struct Pole: Decodable { let chain: Int; let pole: Vec3JSON }
    struct Vectors: Decodable {
        let a: Vec3JSON, b: Vec3JSON, unit: Vec3JSON
        let lengthOfA: Double
        let rejected: Vec3JSON, crossed: Vec3JSON
    }
    struct Solution: Decodable {
        struct Result: Decodable {
            let mid: Vec3JSON, end: Vec3JSON
            let overextended: Bool
            let bend: Double
        }
        let name: String
        let chain: ChainJSON
        let target: Vec3JSON
        let pole: Vec3JSON?
        let solution: Result
    }

    let source: String
    let MAX_EXTENSION: Double
    let chainPole: [Pole]
    let vectors: [Vectors]
    let solutions: [Solution]
}

private let fixture: Fixture = {
    guard let url = Bundle.module.url(forResource: "limbIk", withExtension: "json", subdirectory: "Fixtures") else {
        fatalError("limbIk.json is missing. Generate it with UPDATE_FIXTURES=1 npm test -- limbIk.fixtures")
    }
    // swiftlint:disable:next force_try
    return try! JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
}()

@Test("a limb stops short of straight at the same place")
func maxExtension() {
    expectClose(MAX_EXTENSION, fixture.MAX_EXTENSION, "MAX_EXTENSION")
}

@Test("the vector arithmetic agrees, including a zero-length vector")
func vectors() {
    for (index, row) in fixture.vectors.enumerated() {
        expectClose(normalize(row.a.vec), row.unit.vec, "unit \(index)")
        expectClose(length(row.a.vec), row.lengthOfA, "length \(index)")
        expectClose(reject(row.a.vec, axis: normalize(row.b.vec)), row.rejected.vec, "reject \(index)")
        expectClose(cross(row.a.vec, row.b.vec), row.crossed.vec, "cross \(index)")
    }
}

@Test("every solved limb puts its elbow in the same place")
func solutions() throws {
    for row in fixture.solutions {
        let solved = try solveTwoBoneIk(row.chain.chain, target: row.target.vec, pole: row.pole?.vec)
        expectClose(solved.mid, row.solution.mid.vec, "\(row.name) elbow")
        expectClose(solved.end, row.solution.end.vec, "\(row.name) hand")
        expectClose(solved.bend, row.solution.bend, "\(row.name) bend")
        #expect(solved.overextended == row.solution.overextended, "\(row.name)")
    }
}

@Test("the fixture covers a target within reach and one beyond it")
func fixtureIsNotDegenerate() {
    #expect(fixture.solutions.contains { $0.solution.overextended })
    #expect(fixture.solutions.contains { !$0.solution.overextended })
}

@Test("the segment lengths are preserved, which is what makes it a limb")
func segmentsKeepTheirLength() throws {
    // Not a golden value. A solve that stretched the bones would still land the
    // hand on the target and would look wrong on every frame.
    for row in fixture.solutions {
        let chain = row.chain.chain
        let upper = length(subtract(chain.mid, chain.root))
        let lower = length(subtract(chain.end, chain.mid))
        let solved = try solveTwoBoneIk(chain, target: row.target.vec, pole: row.pole?.vec)
        expectClose(length(subtract(solved.mid, chain.root)), upper, "\(row.name) upper arm")
        // The lower segment is only exact when the target is reachable; when it
        // is not, the hand stops at the limb's reach and the triangle closes.
        let solvedLower = length(subtract(solved.end, solved.mid))
        #expect(abs(solvedLower - lower) < 1e-9, "\(row.name) forearm: \(solvedLower) vs \(lower)")
    }
}

@Test("no limb ever locks straight, whatever it is asked for")
func neverLocks() throws {
    for row in fixture.solutions {
        let solved = try solveTwoBoneIk(row.chain.chain, target: row.target.vec, pole: row.pole?.vec)
        #expect(solved.bend < .pi, "\(row.name) locked straight")
        #expect(solved.bend > 0, "\(row.name) folded through itself")
    }
}

@Test("a chain with no length is refused rather than solved")
func degenerateChain() {
    let flat = TwoBoneChain(
        root: Vec3(x: 0, y: 1, z: 0),
        mid: Vec3(x: 0, y: 1, z: 0),
        end: Vec3(x: 0, y: 0.5, z: 0)
    )
    #expect(throws: LimbIKError.degenerateChain) {
        try solveTwoBoneIk(flat, target: Vec3(x: 0.2, y: 0.8, z: 0))
    }
}
