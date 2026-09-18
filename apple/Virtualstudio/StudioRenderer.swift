import Foundation
import Metal
import MetalKit
import RealityKit
import SwiftUI
import UIKit

/// The studio, rendered by hand instead of by `RealityView`.
///
/// `RealityView` is the easy host and it is the wrong one for a light meter. Two
/// measurements say so: one stop of light arrives on screen as three quarters of a
/// stop, because a tone-mapping curve sits between the rig and the pixels and
/// `RealityView` exposes no way to turn it off; and the shadow pass needs to render
/// the scene a second time, which `RealityView` has no seam for.
///
/// `RealityRenderer` has both. `cameraSettings.isToneMappingEnabled` is a Boolean,
/// and a second `CameraOutput` into a texture the app owns is how the Campfire
/// Games project gets a depth buffer that RealityKit will not hand over. So the
/// frame is rendered into a texture here and composited to the drawable, which is
/// also where that second pass will hang.
@MainActor
final class StudioRenderer: NSObject, MTKViewDelegate {
    private let device: any MTLDevice
    private let queue: any MTLCommandQueue
    private let renderer: RealityRenderer
    private let report: DeviceReport
    private let stage: StudioStage
    private var colour: (any MTLTexture)?
    private var output: RealityRenderer.CameraOutput?
    private var positions: StudioPositionPass?
    private var composite: (any MTLRenderPipelineState)?
    private var factorPipeline: (any MTLRenderPipelineState)?
    private var factor: (any MTLTexture)?
    /// How much coarser the shadow term is than the picture. `--shadow-scale 1`
    /// renders it at full resolution, which is what it cost thirteen milliseconds
    /// to do.
    private let shadowScale: Int
    private var last = CACurrentMediaTime()

    /// `--hard-shadows` leaves RealityKit's own shadow alone and skips both extra
    /// passes, which is how their cost is measured rather than guessed.
    private let softShadows: Bool

    init?(stage: StudioStage, report: DeviceReport, softShadows: Bool, shadowScale: Int) {
        self.softShadows = softShadows
        self.shadowScale = max(1, shadowScale)
        guard let device = MTLCreateSystemDefaultDevice(),
              let queue = device.makeCommandQueue(),
              let renderer = try? RealityRenderer() else { return nil }
        self.device = device
        self.queue = queue
        self.renderer = renderer
        self.report = report
        self.stage = stage
        super.init()

        // The shadow RealityKit will not draw, and the pass that makes it possible.
        // The position pass renders the same scene into a texture of its own; the
        // composite traces from those positions to the light and darkens what cannot
        // see it. Neither is possible against `RealityView`, which is why the studio
        // is rendered by hand.
        if #available(iOS 18.0, *), softShadows {
            positions = StudioPositionPass(source: stage.root, camera: stage.camera, device: device)
        }
        if softShadows, let library = device.makeDefaultLibrary() {
            let descriptor = MTLRenderPipelineDescriptor()
            descriptor.vertexFunction = library.makeFunction(name: "fullScreenTriangle")
            descriptor.fragmentFunction = library.makeFunction(name: "softShadow")
            descriptor.colorAttachments[0].pixelFormat = .rgba16Float
            composite = try? device.makeRenderPipelineState(descriptor: descriptor)

            let term = MTLRenderPipelineDescriptor()
            term.vertexFunction = library.makeFunction(name: "fullScreenTriangle")
            term.fragmentFunction = library.makeFunction(name: "shadowFactor")
            term.colorAttachments[0].pixelFormat = .r16Float
            factorPipeline = try? device.makeRenderPipelineState(descriptor: term)
        }

        renderer.entities.append(stage.root)
        renderer.activeCamera = stage.camera
        // The whole reason for being here. A photographer judging a two-to-one ratio
        // needs the ratio to arrive as two to one; a filmic curve makes it 1.5.
        renderer.cameraSettings.isToneMappingEnabled = false
        renderer.cameraSettings.colorBackground = .color(UIColor.black.cgColor)
    }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
        // The render target is ours rather than the drawable's, so the second pass
        // has something stable to read. It follows the drawable's size.
        guard size.width > 0, size.height > 0 else { return }
        let descriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: view.colorPixelFormat,
            width: Int(size.width), height: Int(size.height), mipmapped: false
        )
        descriptor.usage = [.renderTarget, .shaderRead]
        descriptor.storageMode = .private
        guard let texture = device.makeTexture(descriptor: descriptor) else { return }
        texture.label = "Studio — the frame before it is composited"
        colour = texture
        output = try? RealityRenderer.CameraOutput(.singleProjection(colorTexture: texture))
        // Full resolution, not half: the whole point of the pass is the width of an
        // edge, and a half-resolution position map would put a two-pixel step in it.
        positions?.resize(to: size, format: .rgba16Float)

        // The term at its own resolution. One channel, because it is one number.
        let coarse = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .r16Float,
            width: max(1, Int(size.width) / shadowScale),
            height: max(1, Int(size.height) / shadowScale),
            mipmapped: false
        )
        coarse.usage = [.renderTarget, .shaderRead]
        coarse.storageMode = .private
        factor = device.makeTexture(descriptor: coarse)
        factor?.label = "Studio — how much of the light each place can see"
    }

    func draw(in view: MTKView) {
        let now = CACurrentMediaTime()
        let delta = now - last
        last = now
        report.tick(deltaTime: delta)

        guard let output, let colour,
              let drawable = view.currentDrawable,
              let buffer = queue.makeCommandBuffer() else { return }

        do {
            try renderer.updateAndRender(deltaTime: delta, cameraOutput: output)
        } catch {
            return
        }

        positions?.render(deltaTime: delta)

        if let composite, let factorPipeline, let factor,
           let surface = positions?.texture {
            var uniforms = stage.shadowUniforms

            // The term first, at its own resolution.
            if let encoder = shadowEncoder(buffer: buffer, into: factor) {
                encoder.setRenderPipelineState(factorPipeline)
                encoder.setFragmentTexture(surface, index: 0)
                encoder.setFragmentBytes(&uniforms, length: MemoryLayout<SoftShadow.Uniforms>.stride, index: 0)
                encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
                encoder.endEncoding()
            }

            // Then the picture, darkened by it.
            if let encoder = shadowEncoder(buffer: buffer, into: drawable.texture) {
                encoder.setRenderPipelineState(composite)
                encoder.setFragmentTexture(colour, index: 0)
                encoder.setFragmentTexture(factor, index: 1)
                encoder.setFragmentTexture(surface, index: 2)
                encoder.setFragmentBytes(&uniforms, length: MemoryLayout<SoftShadow.Uniforms>.stride, index: 0)
                encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
                encoder.endEncoding()
            }
        } else if let blit = buffer.makeBlitCommandEncoder() {
            // No shadow to add, but the frame still has to arrive.
            blit.copy(from: colour, to: drawable.texture)
            blit.endEncoding()
        }
        // What the frame actually cost the GPU, as opposed to when the next
        // callback happened to arrive.
        buffer.addCompletedHandler { [report] finished in
            let cost = finished.gpuEndTime - finished.gpuStartTime
            Task { @MainActor in report.recordGPU(seconds: cost) }
        }
        buffer.present(drawable)
        buffer.commit()
    }

    private func shadowEncoder(buffer: any MTLCommandBuffer, into target: any MTLTexture) -> (any MTLRenderCommandEncoder)? {
        let pass = MTLRenderPassDescriptor()
        pass.colorAttachments[0].texture = target
        pass.colorAttachments[0].loadAction = .dontCare
        pass.colorAttachments[0].storeAction = .store
        return buffer.makeRenderCommandEncoder(descriptor: pass)
    }
}

/// The Metal view the studio is drawn into.
struct StudioView: UIViewRepresentable {
    let stage: StudioStage
    let report: DeviceReport
    let softShadows: Bool
    let shadowScale: Int

    func makeCoordinator() -> StudioRenderer? {
        StudioRenderer(stage: stage, report: report, softShadows: softShadows, shadowScale: shadowScale)
    }

    func makeUIView(context: Context) -> MTKView {
        let view = MTKView()
        view.device = MTLCreateSystemDefaultDevice()
        // Half-float, so the frame keeps its range until the moment it is shown.
        // An eight-bit target would clip the highlights this studio exists to judge
        // before anything had a chance to meter them.
        view.colorPixelFormat = .rgba16Float
        view.framebufferOnly = false
        view.isOpaque = true
        // The display's own maximum, not a cap of ours: an iPad Pro runs at 120 Hz,
        // and a frame time pinned to 16.67 ms says only that the renderer met a
        // limit somebody else set. What is being measured is how long a frame
        // actually costs.
        // 120, not 60 and not 0: an iPad Pro's display runs at 120 Hz, a frame time
        // pinned to 16.67 ms says only that the renderer met a limit somebody else
        // set, and zero stops MTKView drawing altogether rather than meaning "as
        // fast as it can".
        view.preferredFramesPerSecond = 120
        view.delegate = context.coordinator
        // A studio on a stand does not fall asleep between two lighting decisions.
        // The seventeen-minute measurement was interrupted twice by the screen
        // locking, which is what a photographer setting up a shot would get too.
        UIApplication.shared.isIdleTimerDisabled = true
        context.coordinator?.mtkView(view, drawableSizeWillChange: view.drawableSize)
        return view
    }

    func updateUIView(_ view: MTKView, context: Context) {}
}
