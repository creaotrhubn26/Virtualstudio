import Foundation
import Metal
import RealityKit
import UIKit

/// A second render of the same scene, writing where every surface is.
///
/// Mesh resources are shared with the colour pass; entities never are. The clone
/// carries the same transforms, the same joint poses and the same enabled flags,
/// updated once a frame, so what the shadow is computed against is the figure as
/// she is posed rather than as she was bound.
///
/// The shape is the Campfire Games project's `ForestDepthPass`, narrowed: this one
/// wants position rather than depth, and the studio has no glass to keep out of an
/// opaque prepass.
@available(iOS 18.0, *)
@MainActor
final class StudioPositionPass {
    /// Where the world position is written, in the same size as the colour frame.
    private(set) var texture: (any MTLTexture)?

    private let renderer: RealityRenderer
    private let camera = PerspectiveCamera()
    /// The camera this pass follows, or nil when it is placed by hand — which is
    /// what the shadow map does, standing at the light rather than at the lens.
    private let source: PerspectiveCamera?

    /// Where this pass renders from, for a pass that is placed rather than following.
    var viewpoint: PerspectiveCamera { camera }
    private let device: any MTLDevice
    private let root = Entity()
    private var pairs: [(source: Entity, copy: Entity)] = []
    private var skins: [(source: ModelEntity, copy: ModelEntity)] = []
    private var output: RealityRenderer.CameraOutput?

    init?(source scene: Entity, camera: PerspectiveCamera?, device: any MTLDevice) {
        guard let renderer = try? RealityRenderer(),
              let library = device.makeDefaultLibrary(),
              let shader = try? CustomMaterial.SurfaceShader(named: "studioPosition", in: library) else { return nil }
        self.renderer = renderer
        self.source = camera
        self.device = device

        // One material per cutoff, not one per mesh: position never samples anything
        // but the alpha it might have to cut against.
        var cache: [Float: CustomMaterial] = [:]
        func material(for pbr: PhysicallyBasedMaterial?) -> CustomMaterial? {
            let cutoff = pbr?.opacityThreshold ?? 0
            if let known = cache[cutoff] { return known }
            guard var custom = try? CustomMaterial(surfaceShader: shader, lightingModel: .unlit) else { return nil }
            custom.opacityThreshold = nil
            custom.blending = .opaque
            custom.faceCulling = pbr?.faceCulling ?? .back
            if cutoff > 0, let colour = pbr?.baseColor.texture {
                custom.baseColor = .init(texture: .init(colour.resource))
            }
            custom.custom.value = [cutoff, 0, 0, 0]
            cache[cutoff] = custom
            return custom
        }

        func visit(_ entity: Entity, parent: Entity) {
            let copy: Entity
            if let model = entity as? ModelEntity, var component = model.model {
                let clone = model.clone(recursive: false)
                component.materials = component.materials.map { existing in
                    material(for: existing as? PhysicallyBasedMaterial) ?? existing
                }
                clone.model = component
                if !model.jointNames.isEmpty { skins.append((model, clone)) }
                copy = clone
            } else {
                // No lights, no camera, no helpers: this pass answers "where", and
                // a light contributes nothing to that.
                copy = Entity()
            }
            copy.name = entity.name
            copy.transform = entity.transform
            copy.isEnabled = entity.isEnabled
            parent.addChild(copy)
            pairs.append((entity, copy))
            for child in entity.children { visit(child, parent: copy) }
        }
        visit(scene, parent: root)

        root.addChild(self.camera)
        renderer.entities.append(root)
        renderer.activeCamera = self.camera
        renderer.cameraSettings.isToneMappingEnabled = false
        // Black is outside the cube the position is encoded over, so a pixel nothing
        // was drawn into reads as "no surface" rather than as a place.
        renderer.cameraSettings.colorBackground = .color(UIColor.black.cgColor)
        synchronise()
    }

    func resize(to size: CGSize, format: MTLPixelFormat) {
        guard size.width > 0, size.height > 0 else { return }
        let descriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: format, width: Int(size.width), height: Int(size.height), mipmapped: false
        )
        descriptor.usage = [.renderTarget, .shaderRead]
        descriptor.storageMode = .private
        guard let made = device.makeTexture(descriptor: descriptor) else { return }
        made.label = "Studio — where every surface is"
        texture = made
        output = try? RealityRenderer.CameraOutput(.singleProjection(colorTexture: made))
    }

    /// Follow the colour scene: transforms, poses and what is switched on.
    func synchronise() {
        for (source, copy) in pairs {
            if copy.transform != source.transform { copy.transform = source.transform }
            if copy.isEnabled != source.isEnabled { copy.isEnabled = source.isEnabled }
        }
        for (source, copy) in skins where source.isEnabledInHierarchy {
            copy.jointTransforms = source.jointTransforms
        }
        if let source {
            camera.camera = source.camera
            camera.transform = Transform(matrix: source.transformMatrix(relativeTo: nil))
        }
    }

    func render(deltaTime: TimeInterval) {
        guard let output else { return }
        synchronise()
        try? renderer.updateAndRender(deltaTime: deltaTime, cameraOutput: output)
    }
}
