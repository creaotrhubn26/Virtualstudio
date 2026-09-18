import Foundation
import RealityKit
import simd

/// The figure, drawn by RealityKit from the package the builder writes.
///
/// `FigureMesh` builds meshes and materials by hand out of the glTF. It works for
/// skin and cloth and does not work for hair or eyes, because a cutout has to be
/// told where its opacity comes from and a hand-built `PhysicallyBasedMaterial`
/// was never told. The USDZ says it in one line — `opacity` connected to the
/// texture's alpha, `opacityThreshold` beside it — and RealityKit's own loader
/// obeys it.
///
/// So this hands the whole job over: geometry, materials and skinning. What stays
/// on this side is the pose, because a USD skeleton binds one animation source at
/// a time and the studio's three stances are things to switch between, not an
/// animation to play. They travel as rotations in a JSON file beside the package
/// and are written to `jointTransforms`, which is how the Campfire Games project
/// drives its characters too.
@MainActor
enum FigureEntity {
    private static let assets = "Assets"

    struct Poses: Decodable {
        let name: String
        /// In the skeleton's own order, by the names the runtime looks them up by.
        let joints: [String]
        let poses: [String: [[Float]]]
    }

    /// Load a figure, dress it, strike a pose and ground it.
    static func load(named name: String, pose: String, wearing garments: [String] = []) async -> Entity? {
        guard let figure = await entity(name, in: nil) else { return nil }

        let root = Entity()
        root.name = name
        root.addChild(figure)

        for garment in garments {
            if let cloth = await entity(garment, in: "wardrobe/\(name)") {
                cloth.name = garment
                root.addChild(cloth)
            }
        }

        if let rotations = poses(for: name)?.poses[pose] {
            // Every skinned model in the package and in the clothes takes the same
            // stance: a garment carries a copy of the rig and no clips of its own.
            apply(rotations, to: root)
        }

        // The clips do not ground anybody — `StudioStand` happens to have the soles
        // at zero, and `StudioSeated` leaves the figure sitting in the air. Measure
        // what is there and drop it, which is what the web studio does after the
        // next rendered frame.
        let bounds = root.visualBounds(relativeTo: nil)
        if bounds.min.y.isFinite {
            root.position.y = 0.016 - bounds.min.y
        }
        return root
    }

    private static func entity(_ name: String, in subdirectory: String?) async -> Entity? {
        let folder = subdirectory.map { "\(assets)/\($0)" } ?? assets
        guard let url = Bundle.main.url(forResource: name, withExtension: "usdz", subdirectory: folder) else {
            return nil
        }
        return try? await Entity(contentsOf: url)
    }

    private static func poses(for name: String) -> Poses? {
        guard let url = Bundle.main.url(forResource: "\(name)-poses", withExtension: "json", subdirectory: assets),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(Poses.self, from: data)
    }

    /// Write a stance onto every skinned model under `root`.
    ///
    /// `jointNames` comes back as full USD paths — `StudioRoot/mixamorigHips/…` —
    /// so a lookup by plain name against that list finds nothing, silently, and the
    /// figure stands in its bind pose wondering what the fuss was about.
    private static func apply(_ rotations: [[Float]], to root: Entity) {
        for model in models(under: root) where !model.jointNames.isEmpty {
            var transforms = model.jointTransforms
            for (slot, path) in model.jointNames.enumerated() {
                let name = String(path.split(separator: "/").last ?? "")
                guard let index = order.firstIndex(of: name), index < rotations.count,
                      slot < transforms.count else { continue }
                let q = rotations[index]
                guard q.count == 4 else { continue }
                // The clip's rotation replaces the joint's own; the translation is
                // the rig's and stays.
                transforms[slot].rotation = simd_quatf(ix: q[0], iy: q[1], iz: q[2], r: q[3])
            }
            model.jointTransforms = transforms
        }
    }

    /// The joint order the rotations are in, set when a figure is loaded.
    private nonisolated(unsafe) static var order: [String] = []

    /// What the body opens wearing, read from the same catalogue the glTF path uses.
    static var defaultWardrobe: [String] = []

    static func prepare(_ name: String) {
        defaultWardrobe = FigureMesh.defaultWardrobe(for: name)
        order = poses(for: name)?.joints ?? []
    }

    private static func models(under entity: Entity) -> [ModelEntity] {
        var found: [ModelEntity] = []
        if let model = entity as? ModelEntity { found.append(model) }
        for child in entity.children { found += models(under: child) }
        return found
    }
}
