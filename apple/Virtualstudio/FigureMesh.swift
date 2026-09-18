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
        guard let url = Bundle.main.url(forResource: "wardrobe", withExtension: "json"),
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
    ) -> ModelEntity? {
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
        // Plain materials for now: the builder writes textures beside the models
        // rather than inside them, and none of them are in the app bundle yet.
        let colour: UIColor = switch surface.name {
        case "Eyes": .init(white: 0.9, alpha: 1)
        case "Hair": .init(red: 0.24, green: 0.18, blue: 0.14, alpha: 1)
        case "Skin": .init(red: 0.78, green: 0.66, blue: 0.58, alpha: 1)
        default: .init(red: 0.32, green: 0.34, blue: 0.40, alpha: 1)
        }
        let model = ModelEntity(mesh: mesh, materials: [
            SimpleMaterial(color: colour, roughness: surface.name == "Eyes" ? 0.2 : 0.75, isMetallic: false)
        ])
        model.name = name
        model.components.set(GroundingShadowComponent(castsShadow: true, receivesShadow: true))
        return model
    }

    private static func covered(body: String, garment: String) -> [(start: Int, end: Int)] {
        let entry = catalogue?.garments.first { $0.id == garment && $0.body == body }
        return (entry?.hidesBodyTriangles ?? []).map { (start: $0[0], end: $0[1]) }
    }

    private static func read(_ name: String, in subdirectory: String? = nil) -> StudioFigure? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "glb", subdirectory: subdirectory),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? StudioFigure(glb: data)
    }

    /// Load a figure, dress it, strike a pose, and ground it.
    ///
    /// `garments` are catalogue ids. Each is its own file skinned to a copy of the
    /// same rig, so it takes the body's pose and rides along; the body then draws
    /// only the triangles no garment covers, which is what keeps skin from showing
    /// through a sleeve without deleting it from the body for good.
    static func entity(named name: String, pose poseName: String, wearing garments: [String] = []) -> Entity? {
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
            guard let model = Self.model(surface, in: figure, pose: pose, name: surface.name, hiding: hiding) else { continue }
            root.addChild(model)
        }

        // The clothes, on the body's own pose.
        for garment in worn {
            for surface in garment.figure.surfaces {
                guard let model = Self.model(surface, in: garment.figure, pose: pose, name: garment.id, hiding: []) else { continue }
                root.addChild(model)
            }
        }

        guard !root.children.isEmpty, let skin = figure.surfaces.first else { return nil }
        // The clips do not ground anybody; see `groundOffset`.
        root.position.y = figure.groundOffset(skin, pose: pose)
        return root
    }
}
