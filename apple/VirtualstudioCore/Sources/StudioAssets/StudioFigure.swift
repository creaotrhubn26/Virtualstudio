import Foundation

/// The figure, as the studio understands it.
///
/// A glTF document is a graph of accessors and buffer views. What the studio wants
/// is five surfaces, a 53-joint skeleton with Mixamo names, and three pose clips —
/// so this reads the graph once and hands over the arrays a renderer can upload,
/// with nothing left to interpret.
///
/// Renderer-free on purpose: this can be unit-tested against the real bundled GLB
/// with `swift test`, with no device, no simulator and no RealityKit.
public struct StudioFigure: Sendable {
    public struct Surface: Sendable {
        /// `Skin`, `Eyes`, `Hair`, or a garment's own id.
        public let name: String
        public let positions: [Float]
        public let normals: [Float]
        public let texcoords: [Float]
        /// Four joint indices per vertex, as the exporter wrote them.
        public let joints: [UInt16]
        /// Four weights per vertex, normalised by the builder.
        public let weights: [Float]
        public let indices: [UInt32]

        public var vertexCount: Int { positions.count / 3 }
        public var triangleCount: Int { indices.count / 3 }
    }

    public struct Joint: Sendable {
        public let name: String
        /// Rest translation and rotation, from the node.
        public let translation: SIMD3<Float>
        public let rotation: SIMD4<Float>
        /// The joint's parent, or nil for the root of the rig.
        public let parent: Int?
    }

    /// One fixed-pose clip. Every clip writes every joint, so switching poses
    /// resets cleanly rather than leaving the previous pose's rotations behind.
    public struct Pose: Sendable {
        public let name: String
        /// One rotation per joint, in the skeleton's own order.
        public let rotations: [SIMD4<Float>]
    }

    public let surfaces: [Surface]
    public let joints: [Joint]
    public let poses: [Pose]
    /// Texture files the surfaces refer to, relative to the studio directory.
    public let textureURIs: [String]

    public init(glb data: Data) throws {
        let container = try GLBContainer(data: data)
        let document: GLTFDocument
        do {
            document = try JSONDecoder().decode(GLTFDocument.self, from: container.json)
        } catch {
            throw GLBError.badJSON(String(describing: error))
        }
        let binary = container.binary

        surfaces = try document.meshes.map { mesh in
            guard let primitive = mesh.primitives.first else {
                throw GLBError.badJSON("a mesh with no primitives")
            }
            func floats(_ attribute: String) throws -> [Float] {
                guard let index = primitive.attributes[attribute] else { return [] }
                return try Self.floats(document, binary, index)
            }
            return Surface(
                name: mesh.name ?? "surface",
                positions: try floats("POSITION"),
                normals: try floats("NORMAL"),
                texcoords: try floats("TEXCOORD_0"),
                joints: try primitive.attributes["JOINTS_0"]
                    .map { try Self.integers(document, binary, $0).map(UInt16.init(truncatingIfNeeded:)) } ?? [],
                weights: try floats("WEIGHTS_0"),
                indices: try primitive.indices
                    .map { try Self.integers(document, binary, $0).map(UInt32.init(truncatingIfNeeded:)) } ?? []
            )
        }

        // The skeleton, in the order the skin lists it. That order is the order the
        // builder writes and is identical in every file — which is the whole reason
        // a garment built separately can be worn on any body.
        let jointIndices = document.skins?.first?.joints ?? []
        var parents: [Int: Int] = [:]
        for (index, node) in document.nodes.enumerated() {
            for child in node.children ?? [] { parents[child] = index }
        }
        joints = jointIndices.map { nodeIndex in
            let node = document.nodes[nodeIndex]
            return Joint(
                name: node.name ?? "joint\(nodeIndex)",
                translation: Self.vector3(node.translation),
                rotation: Self.vector4(node.rotation, fallback: SIMD4(0, 0, 0, 1)),
                parent: parents[nodeIndex].flatMap { jointIndices.firstIndex(of: $0) }
            )
        }

        poses = try (document.animations ?? []).map { animation in
            var rotations = [SIMD4<Float>](repeating: SIMD4(0, 0, 0, 1), count: jointIndices.count)
            for channel in animation.channels where channel.target.path == "rotation" {
                guard let node = channel.target.node,
                      let slot = jointIndices.firstIndex(of: node),
                      channel.sampler < animation.samplers.count else { continue }
                let output = animation.samplers[channel.sampler].output
                let values = try Self.floats(document, binary, output)
                guard values.count >= 4 else { continue }
                // Every clip is a fixed pose: both keyframes carry the same
                // rotation, so the first is the pose.
                rotations[slot] = SIMD4(values[0], values[1], values[2], values[3])
            }
            return Pose(name: animation.name ?? "pose", rotations: rotations)
        }

        textureURIs = (document.images ?? []).compactMap(\.uri)
    }

    // MARK: - Reading accessors

    private static func raw(_ document: GLTFDocument, _ binary: Data, _ index: Int) throws -> (GLTFDocument.Accessor, Data) {
        guard index < document.accessors.count else { throw GLBError.badJSON("accessor \(index) does not exist") }
        let accessor = document.accessors[index]
        guard let viewIndex = accessor.bufferView, viewIndex < document.bufferViews.count else {
            // An accessor with no view is all zeroes, which the specification allows.
            return (accessor, Data())
        }
        let view = document.bufferViews[viewIndex]
        let start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
        guard let type = GLTFDocument.ComponentType(rawValue: accessor.componentType) else {
            throw GLBError.badJSON("component type \(accessor.componentType)")
        }
        let length = accessor.count * GLTFDocument.components(of: accessor.type) * type.size
        guard start >= 0, start + length <= binary.count else {
            throw GLBError.truncated("accessor \(index)")
        }
        return (accessor, binary.subdata(in: (binary.startIndex + start)..<(binary.startIndex + start + length)))
    }

    static func floats(_ document: GLTFDocument, _ binary: Data, _ index: Int) throws -> [Float] {
        let (accessor, bytes) = try raw(document, binary, index)
        guard let type = GLTFDocument.ComponentType(rawValue: accessor.componentType) else { return [] }
        let count = accessor.count * GLTFDocument.components(of: accessor.type)
        guard !bytes.isEmpty else { return [Float](repeating: 0, count: count) }
        switch type {
        case .float:
            return bytes.withUnsafeBytes { Array($0.bindMemory(to: Float32.self).prefix(count)) }
        default:
            // The builder writes floats for everything the studio reads as one.
            throw GLBError.badJSON("accessor \(index) is not floating point")
        }
    }

    static func integers(_ document: GLTFDocument, _ binary: Data, _ index: Int) throws -> [Int] {
        let (accessor, bytes) = try raw(document, binary, index)
        guard let type = GLTFDocument.ComponentType(rawValue: accessor.componentType) else { return [] }
        let count = accessor.count * GLTFDocument.components(of: accessor.type)
        guard !bytes.isEmpty else { return [Int](repeating: 0, count: count) }
        switch type {
        case .unsignedByte:
            return bytes.prefix(count).map(Int.init)
        case .unsignedShort:
            return bytes.withUnsafeBytes { $0.bindMemory(to: UInt16.self).prefix(count).map(Int.init) }
        case .unsignedInt:
            return bytes.withUnsafeBytes { $0.bindMemory(to: UInt32.self).prefix(count).map(Int.init) }
        default:
            throw GLBError.badJSON("accessor \(index) is not an unsigned integer")
        }
    }

    private static func vector3(_ values: [Double]?) -> SIMD3<Float> {
        guard let values, values.count >= 3 else { return .zero }
        return SIMD3(Float(values[0]), Float(values[1]), Float(values[2]))
    }

    private static func vector4(_ values: [Double]?, fallback: SIMD4<Float>) -> SIMD4<Float> {
        guard let values, values.count >= 4 else { return fallback }
        return SIMD4(Float(values[0]), Float(values[1]), Float(values[2]), Float(values[3]))
    }
}

// MARK: - The wardrobe, as mesh parts

/// A run of the index buffer to draw, which is what `LowLevelMesh.Part` takes.
public struct MeshPart: Equatable, Sendable {
    public let indexOffset: Int
    public let indexCount: Int
}

/// The body's index buffer with the covered triangles left out, expressed as runs.
///
/// The web renderer rebuilds the whole index buffer every time a garment changes.
/// A native renderer does not have to: a garment hides *sorted ranges* of
/// triangles, so what is left is a handful of runs, and a run is exactly what a
/// mesh part is. Changing clothes becomes a change of parts over the same buffer
/// rather than a new buffer.
///
/// Same rules as `bodyIndicesWearing` in `wardrobeService.ts`: ranges are clamped
/// to the mesh, may overlap, and may arrive in any order.
public func visibleParts(triangleCount: Int, hiding ranges: [(start: Int, end: Int)]) -> [MeshPart] {
    guard triangleCount > 0 else { return [] }
    var hidden = [Bool](repeating: false, count: triangleCount)
    for range in ranges {
        let from = max(0, min(triangleCount, range.start))
        let to = max(from, min(triangleCount, range.end))
        for triangle in from..<to { hidden[triangle] = true }
    }

    var parts: [MeshPart] = []
    var runStart: Int?
    for triangle in 0...triangleCount {
        let visible = triangle < triangleCount && !hidden[triangle]
        if visible, runStart == nil { runStart = triangle }
        if !visible, let start = runStart {
            parts.append(MeshPart(indexOffset: start * 3, indexCount: (triangle - start) * 3))
            runStart = nil
        }
    }
    return parts
}
