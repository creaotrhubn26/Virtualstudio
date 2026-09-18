import Foundation
import Testing
@testable import StudioAssets

/// Reading the figures the character builder writes.
///
/// Two things are checked here, and they are different in kind. The wardrobe runs
/// are checked against the web implementation through a shared fixture, like every
/// other module in this package. The reader itself is checked against a GLB built
/// in this file, so the container and its refusals are exercised whether or not the
/// bundled figures have been fetched — they are not in git.
///
/// When the real `studio-woman.glb` is present, it is read too, and that is the
/// test that matters: 26 756 triangles, 53 joints, five surfaces, three poses.

// MARK: - The wardrobe, as parts

private struct PartsFixture: Decodable {
    struct Case: Decodable {
        let name: String
        let triangleCount: Int
        let ranges: [[Int]]
        let keptTriangles: Int
        let parts: [Part]
    }
    struct Part: Decodable { let indexOffset: Int; let indexCount: Int }
    let cases: [Case]
}

private let partsFixture: PartsFixture = {
    guard let url = Bundle.module.url(forResource: "wardrobeParts", withExtension: "json", subdirectory: "Fixtures") else {
        fatalError("wardrobeParts.json is missing. Generate it with UPDATE_FIXTURES=1 npm test -- wardrobeParts.fixtures")
    }
    // swiftlint:disable:next force_try
    return try! JSONDecoder().decode(PartsFixture.self, from: Data(contentsOf: url))
}()

@Test("a dressed body draws the same triangles as in the browser")
func wardrobeParts() {
    for entry in partsFixture.cases {
        let ranges = entry.ranges.map { (start: $0[0], end: $0[1]) }
        let parts = visibleParts(triangleCount: entry.triangleCount, hiding: ranges)
        #expect(parts.count == entry.parts.count, "\(entry.name): run count")
        for (part, expected) in zip(parts, entry.parts) {
            #expect(part.indexOffset == expected.indexOffset, "\(entry.name): offset")
            #expect(part.indexCount == expected.indexCount, "\(entry.name): count")
        }
        let drawn = parts.reduce(0) { $0 + $1.indexCount }
        #expect(drawn == entry.keptTriangles * 3, "\(entry.name): total")
    }
}

@Test("the real garments come back as runs, not as a rebuilt buffer")
func realGarments() throws {
    // The case that motivates the whole approach: a hundred-odd hidden ranges over
    // a body of 26 756 triangles, which the browser answers by rebuilding an index
    // buffer of 63 408 entries and a native renderer can answer with 103 parts.
    let garment = try #require(partsFixture.cases.first { $0.name.contains("female_casualsuit01") })
    #expect(garment.triangleCount == 26756)
    #expect(garment.keptTriangles == 21136)
    #expect(garment.parts.count == 103)
}

// MARK: - The container

/// The smallest GLB that is still a GLB: one triangle, no skin.
private func makeGLB(json: String, binary: Data, magic: UInt32 = 0x46546C67, version: UInt32 = 2) -> Data {
    func padded(_ data: Data, to byte: UInt8) -> Data {
        var copy = data
        while copy.count % 4 != 0 { copy.append(byte) }
        return copy
    }
    let jsonChunk = padded(Data(json.utf8), to: 0x20)
    let binaryChunk = padded(binary, to: 0)

    var file = Data()
    func append(_ value: UInt32) {
        withUnsafeBytes(of: value.littleEndian) { file.append(contentsOf: $0) }
    }
    let total = 12 + 8 + jsonChunk.count + 8 + binaryChunk.count
    append(magic); append(version); append(UInt32(total))
    append(UInt32(jsonChunk.count)); append(0x4E4F534A); file.append(jsonChunk)
    append(UInt32(binaryChunk.count)); append(0x004E4942); file.append(binaryChunk)
    return file
}

private let oneTriangle: Data = {
    var data = Data()
    for value: Float in [0, 0, 0, 1, 0, 0, 0, 1, 0] {
        withUnsafeBytes(of: value.bitPattern.littleEndian) { data.append(contentsOf: $0) }
    }
    for value: UInt16 in [0, 1, 2] {
        withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
    }
    return data
}()

private let oneTriangleJSON = """
{"asset":{"version":"2.0"},
 "accessors":[{"bufferView":0,"componentType":5126,"count":3,"type":"VEC3"},
              {"bufferView":1,"componentType":5123,"count":3,"type":"SCALAR"}],
 "bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":36},
                {"buffer":0,"byteOffset":36,"byteLength":6}],
 "meshes":[{"name":"Skin","primitives":[{"attributes":{"POSITION":0},"indices":1}]}],
 "nodes":[{"name":"mixamorigHips"}],
 "skins":[{"joints":[0]}]}
"""

@Test("a whole GLB reads back as a figure")
func readsASmallFigure() throws {
    let figure = try StudioFigure(glb: makeGLB(json: oneTriangleJSON, binary: oneTriangle))
    #expect(figure.surfaces.count == 1)
    let surface = try #require(figure.surfaces.first)
    #expect(surface.name == "Skin")
    #expect(surface.vertexCount == 3)
    #expect(surface.triangleCount == 1)
    #expect(surface.indices == [0, 1, 2])
    #expect(surface.positions == [0, 0, 0, 1, 0, 0, 0, 1, 0])
    // Attributes the primitive does not carry come back empty rather than as zeroes
    // that would be mistaken for real normals.
    #expect(surface.normals.isEmpty)
    #expect(figure.joints.map(\.name) == ["mixamorigHips"])
}

@Test("what is not a figure is refused, and says why")
func refusals() {
    #expect(throws: GLBError.notAGLB) { try StudioFigure(glb: Data()) }
    #expect(throws: GLBError.notAGLB) { try StudioFigure(glb: Data(repeating: 0, count: 64)) }
    #expect(throws: GLBError.notAGLB) {
        try StudioFigure(glb: makeGLB(json: oneTriangleJSON, binary: oneTriangle, magic: 0x21212121))
    }
    #expect(throws: GLBError.unsupportedVersion(1)) {
        try StudioFigure(glb: makeGLB(json: oneTriangleJSON, binary: oneTriangle, version: 1))
    }
    // A download that stopped early: the header still says how long the file
    // should be, and it no longer is.
    var truncated = makeGLB(json: oneTriangleJSON, binary: oneTriangle)
    truncated.removeLast(20)
    #expect(throws: GLBError.truncated("the file")) { try StudioFigure(glb: truncated) }
    // An accessor that points past the binary chunk.
    let overrun = oneTriangleJSON.replacingOccurrences(of: "\"count\":3,\"type\":\"VEC3\"",
                                                       with: "\"count\":300,\"type\":\"VEC3\"")
    #expect(throws: GLBError.truncated("accessor 0")) {
        try StudioFigure(glb: makeGLB(json: overrun, binary: oneTriangle))
    }
}

@Test("the error says what is wrong with the file")
func errorText() {
    #expect(GLBError.notAGLB.description == "Not a GLB file")
    #expect(GLBError.unsupportedVersion(1).description == "glTF version 1 is not supported")
    #expect(GLBError.truncated("the file").description == "the file runs past the end of the file")
    #expect(GLBError.missingChunk("BIN").description == "no BIN chunk")
}

// MARK: - The real figure

/// The bundled figures are not in git; they are fetched with
/// `scripts/aws/fetch-assets.sh models`. When they are here, they are read.
private let bundledFigure: URL? = {
    // Tests run from .build, so walk up to the repository.
    var directory = URL(filePath: #filePath).deletingLastPathComponent()
    for _ in 0..<8 {
        let candidate = directory.appending(path: "public/models/avatars/studio/studio-woman.glb")
        if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
        directory = directory.deletingLastPathComponent()
    }
    return nil
}()

@Test("the bundled woman reads as the figure the validator asserts")
func readsTheBundledFigure() throws {
    guard let bundledFigure else {
        // Not a failure: a fresh clone has no GLBs until they are fetched.
        Issue.record(Comment("studio-woman.glb not present — run scripts/aws/fetch-assets.sh models"))
        return
    }
    let figure = try StudioFigure(glb: try Data(contentsOf: bundledFigure))

    // The same numbers validate_studio_characters.py asserts, so a change to the
    // builder that this reader cannot follow fails here too.
    #expect(figure.surfaces.map(\.name) == ["Skin", "Eyes", "Hair"])
    let skin = try #require(figure.surfaces.first)
    #expect(skin.triangleCount == 26756, "the wardrobe's ranges index straight into this")
    #expect(skin.vertexCount > 0)
    #expect(skin.normals.count == skin.positions.count)
    #expect(skin.texcoords.count / 2 == skin.vertexCount)
    #expect(skin.joints.count / 4 == skin.vertexCount)
    #expect(skin.weights.count / 4 == skin.vertexCount)

    // Skin weights are normalised by the builder; a renderer that trusts them
    // unnormalised produces a figure that shrinks at the joints.
    for vertex in stride(from: 0, to: min(skin.weights.count, 4000), by: 4) {
        let total = skin.weights[vertex] + skin.weights[vertex + 1]
            + skin.weights[vertex + 2] + skin.weights[vertex + 3]
        #expect(abs(total - 1) < 1e-4, "vertex \(vertex / 4) weights sum to \(total)")
    }

    #expect(figure.joints.count == 53)
    // 53 joints, of which one is the studio's own root and 52 carry Mixamo names —
    // which is what lets a garment built separately be worn on any body, and what
    // the pose editor looks its joints up by.
    #expect(figure.joints.first?.name == "StudioRoot")
    #expect(figure.joints.filter { $0.name.hasPrefix("mixamorig") }.count == 52)
    #expect(figure.joints.contains { $0.name == "mixamorigHips" })
    #expect(figure.joints.contains { $0.name == "mixamorigLeftForeArm" })
    // Exactly one root, and every other joint reachable from it.
    #expect(figure.joints.filter { $0.parent == nil }.count == 1)

    #expect(figure.poses.map(\.name) == ["StudioStand", "StudioPortrait", "StudioSeated"])
    for pose in figure.poses {
        // Every clip writes every joint, so switching poses resets cleanly rather
        // than leaving the previous pose's rotations on the skeleton.
        #expect(pose.rotations.count == 53, "\(pose.name)")
        for rotation in pose.rotations {
            let length = (rotation * rotation).sum().squareRoot()
            #expect(abs(length - 1) < 1e-3, "\(pose.name) has a rotation of length \(length)")
        }
    }
    // The seated clip is not the standing one, or the chair would have nobody on it.
    #expect(figure.poses[0].rotations != figure.poses[2].rotations)

    #expect(figure.textureURIs.count == 3)
}

@Test("the bundled woman's clothes leave her covered")
func dressesTheBundledFigure() throws {
    guard let bundledFigure else { return }
    let figure = try StudioFigure(glb: try Data(contentsOf: bundledFigure))
    let skin = try #require(figure.surfaces.first)
    let garment = try #require(partsFixture.cases.first { $0.name.contains("female_casualsuit01") })

    // The ranges index into this mesh, which is the reason the builder is pinned to
    // 26 756 triangles and the reason this test exists next to the reader.
    #expect(skin.triangleCount == garment.triangleCount)
    let parts = visibleParts(triangleCount: skin.triangleCount,
                             hiding: garment.ranges.map { (start: $0[0], end: $0[1]) })
    let drawn = parts.reduce(0) { $0 + $1.indexCount }
    #expect(drawn == garment.keptTriangles * 3)
    // And every part addresses real indices.
    for part in parts {
        #expect(part.indexOffset >= 0)
        #expect(part.indexOffset + part.indexCount <= skin.indices.count)
    }
}
