import Foundation
import RealityKit
import UIKit
import StudioAssets

/// The bundled figure, on the stage.
///
/// `StudioAssets` reads the GLB the character builder writes and poses it on the
/// processor; this turns the result into something RealityKit will draw. The
/// vertices are skinned here rather than by the renderer, which is not how a figure
/// should be animated — but the studio's three clips are fixed poses, struck once
/// and held, so a figure that changes pose a few times a minute costs nothing to
/// skin on the processor and needs no skeletal API at all.
///
/// Live joint editing is what needs `jointTransforms`, and that comes after.
@MainActor
enum FigureMesh {
    /// Where the staged assets land in the bundle.
    ///
    /// `scripts/apple/stage-assets.py` writes `apple/Assets`, and the project
    /// carries it as a folder rather than a flattened group — both bodies own a
    /// `shoes01.glb`, and the textures keep their own directory. So everything the
    /// figure asks for is under this, with its relative path intact.
    private static let assets = "Assets"

    /// The wardrobe catalogue the builder writes beside the figures.
    private struct Catalogue: Decodable {
        struct Garment: Decodable {
            let id: String
            let body: String
            let slot: String
            let hidesBodyTriangles: [[Int]]
        }
        let garments: [Garment]
        let defaults: [String: [String]]
    }

    private static let catalogue: Catalogue? = {
        guard let url = Bundle.main.url(forResource: "wardrobe", withExtension: "json", subdirectory: assets),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(Catalogue.self, from: data)
    }()

    /// What a body opens wearing, so a figure arrives dressed rather than bare.
    static func defaultWardrobe(for body: String) -> [String] {
        catalogue?.defaults[body] ?? []
    }

    /// One surface, posed and ready to draw.
    private static func model(
        _ surface: StudioFigure.Surface,
        in figure: StudioFigure,
        pose: StudioFigure.Pose,
        name: String,
        hiding: [(start: Int, end: Int)]
    ) async -> ModelEntity? {
        guard surface.vertexCount > 0, !surface.indices.isEmpty else { return nil }
        let posed = figure.skinned(surface, pose: pose)

        var descriptor = MeshDescriptor(name: name)
        descriptor.positions = MeshBuffer(stride(from: 0, to: posed.count, by: 3).map {
            SIMD3(posed[$0], posed[$0 + 1], posed[$0 + 2])
        })
        if surface.normals.count == posed.count {
            // The rest pose's normals, unrotated: good enough to light a held pose,
            // wrong for a moving one. The renderer's own skinning fixes that when it
            // takes over.
            descriptor.normals = MeshBuffer(stride(from: 0, to: surface.normals.count, by: 3).map {
                SIMD3(surface.normals[$0], surface.normals[$0 + 1], surface.normals[$0 + 2])
            })
        }

        // The body draws only the triangles no garment covers.
        let indices: [UInt32] = hiding.isEmpty
            ? surface.indices
            : visibleParts(triangleCount: surface.triangleCount, hiding: hiding)
                .flatMap { part in surface.indices[part.indexOffset..<(part.indexOffset + part.indexCount)] }
        descriptor.primitives = .triangles(indices)

        guard let mesh = try? MeshResource.generate(from: [descriptor]) else { return nil }
        let model = ModelEntity(mesh: mesh, materials: [await Self.material(for: surface)])
        model.name = name
        model.components.set(GroundingShadowComponent(castsShadow: true, receivesShadow: true))
        return model
    }

    /// The surface painted the way the builder said it should be.
    ///
    /// The five authored surfaces are the point: skin, eyes, hair and cloth do not
    /// look alike, and flattening them to one material is a failure the web renderer
    /// already had once. A surface whose texture will not load falls back to a flat
    /// colour rather than to nothing, so a missing file is a dull figure and not an
    /// invisible one.
    private static func material(for surface: StudioFigure.Surface) async -> RealityKit.Material {
        guard let look = surface.appearance,
              let base = look.baseColour,
              let colour = await texture(look.baseColour, semantic: .color) else {
            return SimpleMaterial(color: Self.fallback(surface.name), roughness: 0.75, isMetallic: false)
        }
        _ = base

        var material = PhysicallyBasedMaterial()
        material.baseColor = .init(texture: .init(colour))
        material.roughness = .init(floatLiteral: look.roughness)
        material.metallic = .init(floatLiteral: 0)
        if let normal = await texture(look.normal, semantic: .normal) {
            material.normal = .init(texture: .init(normal))
        }
        if let occlusion = await texture(look.occlusion, semantic: .scalar) {
            material.ambientOcclusion = .init(texture: .init(occlusion))
        }
        // Hair is an alpha cutout: drawn as opaque it is a helmet, and blended it
        // sorts wrongly against itself. A threshold is what the file asks for.
        if look.isCutout {
            // Hair is an alpha cutout: opaque it is a helmet, blended it sorts
            // wrongly against itself, so a threshold is what the file asks for.
            //
            // It does not work yet. With this, and with `blending` pointed at the
            // base colour's own alpha instead, the hair does not draw at all. The
            // reader resolves it correctly — a test asserts the surface names
            // `textures/dcb3….png` and is marked as a cutout — so the fault is in
            // how the material is configured here, not in what it was told. Left
            // visible rather than papered over with an opaque helmet.
            material.opacityThreshold = 0.5
            material.faceCulling = .none
        }
        return material
    }

    private static func texture(_ uri: String?, semantic: TextureResource.Semantic) async -> TextureResource? {
        guard let uri else { return nil }
        // The URI is relative to the studio directory and is written into the
        // bundle with its folders kept, so "textures/abc.png" stays that.
        let path = (uri as NSString).deletingPathExtension
        guard let url = Bundle.main.url(
            forResource: (path as NSString).lastPathComponent,
            withExtension: (uri as NSString).pathExtension,
            subdirectory: "\(assets)/\((path as NSString).deletingLastPathComponent)"
        ) else { return nil }
        return try? await TextureResource(contentsOf: url, options: .init(semantic: semantic))
    }

    private static func fallback(_ surface: String) -> UIColor {
        switch surface {
        case "Eyes": .init(white: 0.9, alpha: 1)
        case "Hair": .init(red: 0.24, green: 0.18, blue: 0.14, alpha: 1)
        case "Skin": .init(red: 0.78, green: 0.66, blue: 0.58, alpha: 1)
        default: .init(red: 0.32, green: 0.34, blue: 0.40, alpha: 1)
        }
    }

    private static func covered(body: String, garment: String) -> [(start: Int, end: Int)] {
        let entry = catalogue?.garments.first { $0.id == garment && $0.body == body }
        return (entry?.hidesBodyTriangles ?? []).map { (start: $0[0], end: $0[1]) }
    }

    private static func read(_ name: String, in subdirectory: String? = nil) -> StudioFigure? {
        let folder = subdirectory.map { "\(assets)/\($0)" } ?? assets
        guard let url = Bundle.main.url(forResource: name, withExtension: "glb", subdirectory: folder),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? StudioFigure(glb: data)
    }

    /// Load a figure, dress it, strike a pose, and ground it.
    ///
    /// `garments` are catalogue ids. Each is its own file skinned to a copy of the
    /// same rig, so it takes the body's pose and rides along; the body then draws
    /// only the triangles no garment covers, which is what keeps skin from showing
    /// through a sleeve without deleting it from the body for good.
    static func entity(named name: String, pose poseName: String, wearing garments: [String] = []) async -> Entity? {
        guard let figure = read(name) else { return nil }
        let pose = figure.poses.first { $0.name == poseName } ?? figure.poses.first
        guard let pose else { return nil }

        // A garment is cut per body shape, so it lives under that body's own folder
        // — and both bodies own a shoes01.
        let worn = garments.compactMap { id in
            read(id, in: "wardrobe/\(name)").map { (id: id, figure: $0) }
        }
        let hidden = worn.flatMap { Self.covered(body: name, garment: $0.id) }

        let root = Entity()
        root.name = name

        for surface in figure.surfaces {
            let hiding = surface.name == "Skin" ? hidden : []
            guard let model = await Self.model(surface, in: figure, pose: pose, name: surface.name, hiding: hiding)
            else { continue }
            root.addChild(model)
        }

        // The clothes, on the body's own pose.
        for garment in worn {
            for surface in garment.figure.surfaces {
                guard let model = await Self.model(surface, in: garment.figure, pose: pose, name: garment.id, hiding: [])
                else { continue }
                root.addChild(model)
            }
        }

        guard !root.children.isEmpty, let skin = figure.surfaces.first else { return nil }
        // The clips do not ground anybody; see `groundOffset`.
        root.position.y = figure.groundOffset(skin, pose: pose)
        return root
    }
}
