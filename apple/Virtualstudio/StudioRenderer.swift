import Foundation
import Metal
import MetalKit
import RealityKit
import SwiftUI

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
    private var colour: (any MTLTexture)?
    private var output: RealityRenderer.CameraOutput?
    private var last = CACurrentMediaTime()

    init?(stage: StudioStage, report: DeviceReport) {
        guard let device = MTLCreateSystemDefaultDevice(),
              let queue = device.makeCommandQueue(),
              let renderer = try? RealityRenderer() else { return nil }
        self.device = device
        self.queue = queue
        self.renderer = renderer
        self.report = report
        super.init()

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

        // Straight through for now. The soft shadow's composite belongs here, which
        // is the point of rendering into our own texture rather than the drawable.
        if let blit = buffer.makeBlitCommandEncoder() {
            blit.copy(from: colour, to: drawable.texture)
            blit.endEncoding()
        }
        buffer.present(drawable)
        buffer.commit()
    }
}

/// The Metal view the studio is drawn into.
struct StudioView: UIViewRepresentable {
    let stage: StudioStage
    let report: DeviceReport

    func makeCoordinator() -> StudioRenderer? {
        StudioRenderer(stage: stage, report: report)
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
        view.preferredFramesPerSecond = 60
        view.delegate = context.coordinator
        context.coordinator?.mtkView(view, drawableSizeWillChange: view.drawableSize)
        return view
    }

    func updateUIView(_ view: MTKView, context: Context) {}
}
