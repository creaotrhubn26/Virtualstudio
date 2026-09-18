import Foundation
import simd

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
    /// How a surface is meant to look, by the files the builder wrote beside it.
    ///
    /// The textures are not in the GLB: the builder writes them once, next to the
    /// models, and refers to them by a relative path. A garment is mostly texture
    /// and the same cloth is worn by every body cut for it, so embedding would
    /// multiply one fabric across every figure that wears it.
    public struct Appearance: Sendable {
        public let name: String
        /// Relative to the studio directory, as written.
        public let baseColour: String?
        public let normal: String?
        public let occlusion: String?
        public let roughness: Float
        /// True for hair, which is an alpha cutout. Drawn as opaque it is a helmet.
        public let isCutout: Bool
        public let isDoubleSided: Bool
    }

    public struct Surface: Sendable {
        /// `Skin`, `Eyes`, `Hair`, or a garment's own id.
        public let name: String
        public let appearance: Appearance?
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
        /// The matrix that takes a vertex from model space into this joint's space.
        ///
        /// Without it a posed figure comes out folded around the origin: the pose
        /// says where the joint goes, and this says where the skin was when the
        /// joint was where it started.
        public let inverseBind: float4x4
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
                appearance: Self.appearance(document, primitive.material),
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
        let binds: [Float]
        if let accessor = document.skins?.first?.inverseBindMatrices {
            binds = try Self.floats(document, binary, accessor)
        } else {
            binds = []
        }
        joints = jointIndices.enumerated().map { slot, nodeIndex in
            let node = document.nodes[nodeIndex]
            return Joint(
                name: node.name ?? "joint\(nodeIndex)",
                translation: Self.vector3(node.translation),
                rotation: Self.vector4(node.rotation, fallback: SIMD4(0, 0, 0, 1)),
                parent: parents[nodeIndex].flatMap { jointIndices.firstIndex(of: $0) },
                inverseBind: Self.matrix(binds, slot)
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

    /// What a primitive's material says, resolved to file names.
    private static func appearance(_ document: GLTFDocument, _ index: Int?) -> Appearance? {
        guard let index, let material = document.materials?[safe: index] else { return nil }
        func uri(_ reference: GLTFDocument.TextureRef?) -> String? {
            guard let reference,
                  let texture = document.textures?[safe: reference.index],
                  let source = texture.source,
                  let image = document.images?[safe: source] else { return nil }
            return image.uri
        }
        return Appearance(
            name: material.name ?? "material",
            baseColour: uri(material.pbrMetallicRoughness?.baseColorTexture),
            normal: uri(material.normalTexture),
            occlusion: uri(material.occlusionTexture),
            roughness: Float(material.pbrMetallicRoughness?.roughnessFactor ?? 0.8),
            isCutout: material.alphaMode == "MASK",
            isDoubleSided: material.doubleSided ?? false
        )
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

    /// One column-major 4x4 out of a flat accessor, or the identity when the file
    /// carries none — which the specification allows and means "already there".
    private static func matrix(_ values: [Float], _ index: Int) -> float4x4 {
        let start = index * 16
        guard start + 16 <= values.count else { return matrix_identity_float4x4 }
        return float4x4(
            SIMD4(values[start], values[start + 1], values[start + 2], values[start + 3]),
            SIMD4(values[start + 4], values[start + 5], values[start + 6], values[start + 7]),
            SIMD4(values[start + 8], values[start + 9], values[start + 10], values[start + 11]),
            SIMD4(values[start + 12], values[start + 13], values[start + 14], values[start + 15])
        )
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

// MARK: - Posing

public extension StudioFigure {
    /// Where every joint ends up when a pose is struck, in model space.
    ///
    /// The clip gives each joint a rotation relative to its bind pose; the rest of
    /// the transform is the node's own. Walking the chain from the root gives the
    /// world matrix, and multiplying by the inverse bind gives the matrix that
    /// moves skin rather than bone.
    ///
    /// The joints arrive in the order the skin lists them, and a parent always
    /// appears before its children in the builder's output — but that is the
    /// builder's habit, not a rule of the format, so the walk is explicit rather
    /// than assumed.
    func skinMatrices(pose: Pose) -> [float4x4] {
        var world = [float4x4?](repeating: nil, count: joints.count)

        func resolve(_ index: Int, depth: Int = 0) -> float4x4 {
            if let known = world[index] { return known }
            // A cycle in the parent chain would otherwise hang the app rather than
            // draw a wrong figure, which is the worse of the two failures.
            guard depth < joints.count else { return matrix_identity_float4x4 }

            let joint = joints[index]
            let rotation = pose.rotations.indices.contains(index) ? pose.rotations[index] : joint.rotation
            let local = float4x4(translation: joint.translation, rotation: rotation)
            let matrix = joint.parent.map { resolve($0, depth: depth + 1) * local } ?? local
            world[index] = matrix
            return matrix
        }

        return joints.indices.map { resolve($0) * joints[$0].inverseBind }
    }

    /// The surface's vertices with a pose applied, on the processor.
    ///
    /// Not how a figure should be drawn every frame — that is the renderer's
    /// skinning — but it is how a figure can be *checked*: the result is an array of
    /// numbers a test can measure, so "the seated clip puts the hands on the thighs"
    /// becomes an assertion rather than a screenshot. It is also enough to put a
    /// posed figure on screen before any skinning is wired up at all.
    func skinned(_ surface: Surface, pose: Pose) -> [Float] {
        let matrices = skinMatrices(pose: pose)
        guard surface.joints.count == surface.vertexCount * 4,
              surface.weights.count == surface.vertexCount * 4 else {
            return surface.positions
        }

        var posed = [Float](repeating: 0, count: surface.positions.count)
        for vertex in 0..<surface.vertexCount {
            let rest = SIMD4<Float>(
                surface.positions[vertex * 3],
                surface.positions[vertex * 3 + 1],
                surface.positions[vertex * 3 + 2],
                1
            )
            var moved = SIMD4<Float>.zero
            for influence in 0..<4 {
                let weight = surface.weights[vertex * 4 + influence]
                guard weight > 0 else { continue }
                let joint = Int(surface.joints[vertex * 4 + influence])
                guard joint < matrices.count else { continue }
                moved += (matrices[joint] * rest) * weight
            }
            posed[vertex * 3] = moved.x
            posed[vertex * 3 + 1] = moved.y
            posed[vertex * 3 + 2] = moved.z
        }
        return posed
    }

    /// The tallest and lowest point of a surface in a pose, in metres.
    ///
    /// The studio grounds a figure by measuring it, so the measurement is here.
    func extent(_ surface: Surface, pose: Pose) -> (low: Float, high: Float) {
        let posed = skinned(surface, pose: pose)
        var low = Float.greatestFiniteMagnitude
        var high = -Float.greatestFiniteMagnitude
        for vertex in stride(from: 1, to: posed.count, by: 3) {
            low = min(low, posed[vertex])
            high = max(high, posed[vertex])
        }
        return (low, high)
    }
}

private extension float4x4 {
    /// A transform from a translation and a quaternion, as glTF stores them.
    init(translation: SIMD3<Float>, rotation: SIMD4<Float>) {
        let q = simd_quatf(ix: rotation.x, iy: rotation.y, iz: rotation.z, r: rotation.w)
        var matrix = float4x4(q.normalized)
        matrix.columns.3 = SIMD4(translation, 1)
        self = matrix
    }
}

public extension StudioFigure {
    /// How far to drop a posed figure so its soles meet the floor.
    ///
    /// The pose clips do not ground anybody. `StudioStand` happens to have the
    /// soles at zero because that is the rest stance the body was built in, but
    /// `StudioSeated` bends the knees and hips and leaves the figure sitting in the
    /// air with its feet a third of a metre up. In the web studio `applyStudioPose`
    /// measures the skinned bounds and drops the figure afterwards — and it waits
    /// for the next rendered frame first, because measuring before the skin matrices
    /// update reads the previous pose and leaves the feet floating.
    ///
    /// A native renderer skins on the GPU and has the same problem, so the
    /// measurement lives here where it can be taken without a frame at all.
    ///
    /// `soles` is where the bottom of the shoe should end up: about 16 mm, which is
    /// the sole's own thickness.
    func groundOffset(_ surface: Surface, pose: Pose, soles: Float = 0.016) -> Float {
        soles - extent(surface, pose: pose).low
    }
}


private extension Array {
    /// The element, or nothing — a file may name a material that is not there.
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
