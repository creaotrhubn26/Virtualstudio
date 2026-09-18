import Foundation

/// Reading the figures the character builder writes.
///
/// The plan said to export USD from the Blender scene the builder poses. There is
/// no Blender scene: `build_studio_characters.py` imports NumPy and nothing else
/// from Blender, and writes the glTF document by hand, accessor by accessor.
/// Blender is a Python runtime there, not a modeller. So `bpy.ops.wm.usd_export`
/// has nothing to export, and the choice is between converting the finished GLB to
/// USD — the second lossy hop the plan itself warned against — and reading the GLB.
///
/// Reading it wins, and not only by elimination. The wardrobe needs
/// `LowLevelMesh.Part` regardless, because a garment hides a sorted list of body
/// triangles and parts are how a mesh is drawn in pieces. A `MeshResource` built
/// from raw buffers is therefore required either way, and once the buffers are
/// being assembled by hand there is no reason to route them through a second file
/// format on the way. One pipeline, one set of hashes, no conversion to validate.
///
/// This file is the container and the document. It knows nothing about RealityKit.
public enum GLBError: Error, Equatable, CustomStringConvertible {
    case notAGLB
    case unsupportedVersion(UInt32)
    case truncated(String)
    case missingChunk(String)
    case badJSON(String)

    public var description: String {
        switch self {
        case .notAGLB: "Not a GLB file"
        case .unsupportedVersion(let version): "glTF version \(version) is not supported"
        case .truncated(let what): "\(what) runs past the end of the file"
        case .missingChunk(let what): "no \(what) chunk"
        case .badJSON(let why): "the glTF document could not be read: \(why)"
        }
    }
}

/// A GLB container: a header, a JSON chunk and a binary chunk.
public struct GLBContainer: Sendable {
    public let json: Data
    public let binary: Data

    private static let magic: UInt32 = 0x46546C67   // "glTF"
    private static let jsonChunk: UInt32 = 0x4E4F534A  // "JSON"
    private static let binaryChunk: UInt32 = 0x004E4942 // "BIN\0"

    public init(data: Data) throws {
        guard data.count >= 12 else { throw GLBError.notAGLB }
        guard Self.word(data, 0) == Self.magic else { throw GLBError.notAGLB }
        let version = Self.word(data, 4)
        guard version == 2 else { throw GLBError.unsupportedVersion(version) }

        // The header's length is the file's own account of itself. Trusting the
        // file's length instead would read a truncated download as a short model.
        let declared = Int(Self.word(data, 8))
        guard declared <= data.count else { throw GLBError.truncated("the file") }

        var offset = 12
        var json: Data?
        var binary: Data?
        while offset + 8 <= declared {
            let length = Int(Self.word(data, offset))
            let kind = Self.word(data, offset + 4)
            let start = offset + 8
            guard start + length <= declared else { throw GLBError.truncated("a chunk") }
            let chunk = data.subdata(in: start..<(start + length))
            if kind == Self.jsonChunk, json == nil { json = chunk }
            if kind == Self.binaryChunk, binary == nil { binary = chunk }
            // Chunks are four-byte aligned, and the padding is not part of the length.
            offset = start + length + (4 - length % 4) % 4
        }

        guard let json else { throw GLBError.missingChunk("JSON") }
        guard let binary else { throw GLBError.missingChunk("BIN") }
        self.json = json
        self.binary = binary
    }

    private static func word(_ data: Data, _ offset: Int) -> UInt32 {
        var value: UInt32 = 0
        for byte in 0..<4 {
            value |= UInt32(data[data.startIndex + offset + byte]) << (8 * UInt32(byte))
        }
        return value
    }
}

/// The parts of the glTF document this studio's own files use.
///
/// Not the whole specification: the builder writes a known, narrow subset, and a
/// reader that accepts more than the writer produces is a reader with untested
/// branches in it. Anything unrecognised is ignored rather than refused, so a
/// field added to the builder later does not stop an older app from opening the
/// figure.
public struct GLTFDocument: Decodable, Sendable {
    public struct Asset: Decodable, Sendable {
        public let version: String
        public let generator: String?
    }
    public struct Accessor: Decodable, Sendable {
        public let bufferView: Int?
        public let byteOffset: Int?
        public let componentType: Int
        public let count: Int
        public let type: String
        public let min: [Double]?
        public let max: [Double]?
    }
    public struct BufferView: Decodable, Sendable {
        public let buffer: Int
        public let byteOffset: Int?
        public let byteLength: Int
        public let byteStride: Int?
    }
    public struct Primitive: Decodable, Sendable {
        public let attributes: [String: Int]
        public let indices: Int?
        public let material: Int?
    }
    public struct Mesh: Decodable, Sendable {
        public let name: String?
        public let primitives: [Primitive]
    }
    public struct Node: Decodable, Sendable {
        public let name: String?
        public let mesh: Int?
        public let skin: Int?
        public let children: [Int]?
        public let translation: [Double]?
        public let rotation: [Double]?
        public let scale: [Double]?
    }
    public struct Skin: Decodable, Sendable {
        public let joints: [Int]
        public let inverseBindMatrices: Int?
        public let skeleton: Int?
    }
    public struct AnimationTarget: Decodable, Sendable {
        public let node: Int?
        public let path: String
    }
    public struct AnimationChannel: Decodable, Sendable {
        public let sampler: Int
        public let target: AnimationTarget
    }
    public struct AnimationSampler: Decodable, Sendable {
        public let input: Int
        public let output: Int
        public let interpolation: String?
    }
    public struct Animation: Decodable, Sendable {
        public let name: String?
        public let channels: [AnimationChannel]
        public let samplers: [AnimationSampler]
    }
    public struct Image: Decodable, Sendable {
        public let uri: String?
        public let bufferView: Int?
        public let mimeType: String?
    }
    public struct TextureRef: Decodable, Sendable {
        public let index: Int
        public let texCoord: Int?
    }
    public struct Texture: Decodable, Sendable {
        public let source: Int?
        public let sampler: Int?
    }
    public struct PBR: Decodable, Sendable {
        public let baseColorTexture: TextureRef?
        public let baseColorFactor: [Double]?
        public let metallicFactor: Double?
        public let roughnessFactor: Double?
    }
    public struct Material: Decodable, Sendable {
        public let name: String?
        public let pbrMetallicRoughness: PBR?
        public let normalTexture: TextureRef?
        public let occlusionTexture: TextureRef?
        /// `OPAQUE`, `MASK` or `BLEND`. Hair is a cutout, and drawn as opaque it
        /// comes out as a helmet.
        public let alphaMode: String?
        public let alphaCutoff: Double?
        public let doubleSided: Bool?
    }

    public let asset: Asset
    public let accessors: [Accessor]
    public let bufferViews: [BufferView]
    public let meshes: [Mesh]
    public let nodes: [Node]
    public let skins: [Skin]?
    public let animations: [Animation]?
    public let images: [Image]?
    public let textures: [Texture]?
    public let materials: [Material]?
}

public extension GLTFDocument {
    /// Component types, by their glTF numbers.
    enum ComponentType: Int, Sendable {
        case byte = 5120, unsignedByte = 5121, short = 5122
        case unsignedShort = 5123, unsignedInt = 5125, float = 5126

        public var size: Int {
            switch self {
            case .byte, .unsignedByte: 1
            case .short, .unsignedShort: 2
            case .unsignedInt, .float: 4
            }
        }
    }

    /// How many components one element of this accessor has.
    static func components(of type: String) -> Int {
        switch type {
        case "SCALAR": 1
        case "VEC2": 2
        case "VEC3": 3
        case "VEC4": 4
        case "MAT4": 16
        default: 0
        }
    }
}
