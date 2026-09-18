import Foundation
import Metal
import os
import RealityKit
import simd
import Photometry

/// The shadow pass RealityKit does not have.
///
/// `docs/measurements/README.md` records the finding this exists to answer: a
/// 90 × 120 cm softbox and a 10 cm snoot render an identical shadow in RealityKit,
/// to the last bit, across three million pixels. The product's whole claim is that
/// those two look nothing alike. So the shadow is drawn here, in a compute pass
/// hung on `renderingEffects.customPostProcessing`, from the same
/// `modifierSizeMetres` the web renderer meters with.
///
/// The occluders are handed in as a short list because this stage is a short list.
/// Arbitrary geometry needs a depth map rendered from the light, which is this same
/// pass with a texture in front of it; what is being established first is that the
/// pipeline works at all — depth in, world position out, source size drives the
/// edge, composited back.
enum SoftShadow {
    /// Mirrors `ShadowUniforms` in `SoftShadow.metal`. Both sides are padded to
    /// Metal's rules, which is why the halves are `SIMD4` with an unused `w`.
    struct Occluder {
        var centre: SIMD4<Float>
        /// Half extents. Not `half`: that is a type name in Metal, and the two
        /// sides of this struct have to agree.
        var halfExtent: SIMD4<Float>
        var kind: UInt32
        /// Three separate words, not a `SIMD3<UInt32>`.
        ///
        /// `SIMD3<UInt32>` is sixteen-byte aligned in Swift, which pushes this
        /// struct to 64 bytes; Metal's is 48. The shader then reads every occluder
        /// after the first from the wrong place, and the only sign of it is a
        /// shadow that does not move when the light changes size. Nothing warns
        /// about this — the two layouts are simply believed.
        var pad: (UInt32, UInt32, UInt32) = (0, 0, 0)
    }

    struct Uniforms {
        var inverseViewProjection: float4x4
        var cameraPosition: SIMD4<Float>
        var lightPosition: SIMD4<Float>
        var lightRadius: Float
        var shadowDepth: Float
        var occluderCount: UInt32
        var debugMode: UInt32 = 0
        var occluders: (Occluder, Occluder, Occluder, Occluder, Occluder, Occluder, Occluder, Occluder)
    }

    /// What the pass is told each frame. Written on the main actor by the stage,
    /// read here on whatever thread the renderer calls back on.
    final class State: @unchecked Sendable {
        private let lock = NSLock()
        private var value = Settings()

        struct Settings {
            var lightPosition = SIMD3<Float>(2, 2.5, -2)
            /// The modifier's real emitting size, in metres.
            var lightRadius: Float = 0.9
            var occluders: [Occluder] = []
            var view = float4x4(1)
            var enabled = false
            var debugMode: UInt32 = 0
        }

        var settings: Settings {
            get { lock.withLock { value } }
            set { lock.withLock { value = newValue } }
        }

        /// A private copy of the depth texture.
        ///
        /// RealityKit hands over a depth texture whose usage is
        /// `shaderRead | renderTarget` — and it is still the render pass's own depth
        /// attachment. Reading it where it lies discards the whole encoder without a
        /// word: every instruction before the first access runs, everything after is
        /// gone, and the frame arrives unchanged. Copying it first costs a blit and
        /// makes it an ordinary texture.
        func depthCopy(device: any MTLDevice, like source: any MTLTexture) -> (any MTLTexture)? {
            lock.withLock {
                if let copy, copy.width == source.width, copy.height == source.height { return copy }
                let descriptor = MTLTextureDescriptor.texture2DDescriptor(
                    pixelFormat: source.pixelFormat,
                    width: source.width,
                    height: source.height,
                    mipmapped: false
                )
                descriptor.usage = [.shaderRead]
                descriptor.storageMode = .private
                let made = device.makeTexture(descriptor: descriptor)
                copy = made
                return made
            }
        }
        private var copy: (any MTLTexture)?

        /// The render pipeline, built on the first frame rather than in
        /// `prepare(for:)`.
        ///
        /// A render pipeline has to name the pixel format it writes, and
        /// `prepare(for:)` is handed a device and nothing else. Guessing the format
        /// produces a pipeline that builds without complaint and a draw that is
        /// then discarded in silence — another failure that looks exactly like a
        /// shader whose logic is wrong. The target texture knows its own format, so
        /// the pipeline waits until there is one.
        func pipeline(device: any MTLDevice, format: MTLPixelFormat) -> MTLRenderPipelineState? {
            lock.withLock {
                if let built, builtFormat == format { return built }
                guard let library = device.makeDefaultLibrary() else { return nil }
                let descriptor = MTLRenderPipelineDescriptor()
                descriptor.vertexFunction = library.makeFunction(name: "fullScreenTriangle")
                descriptor.fragmentFunction = library.makeFunction(name: "softShadow")
                descriptor.colorAttachments[0].pixelFormat = format
                let made = try? device.makeRenderPipelineState(descriptor: descriptor)
                built = made
                builtFormat = format
                Logger(subsystem: "no.holycrust.virtualstudio", category: "shadow")
                    .notice("pipeline for format \(format.rawValue): \(made != nil)")
                return made
            }
        }
        private var built: MTLRenderPipelineState?
        private var builtFormat: MTLPixelFormat?

        /// True once, so the pass can say what it was given without filling the log
        /// sixty times a second.
        func firstCall() -> Bool {
            lock.withLock {
                defer { reported = true }
                return !reported
            }
        }
        private var reported = false
    }

}

/// The pass itself. `customPostProcessing` arrived in iOS 26, so everything that
/// touches it is gated; the settings above are plain data and are not, or the
/// stage could not fill them in.
@available(iOS 26.0, *)
struct SoftShadowPass: PostProcessEffect {
    let state: SoftShadow.State

    init(state: SoftShadow.State) {
        self.state = state
    }

    static let log = Logger(subsystem: "no.holycrust.virtualstudio", category: "shadow")

    mutating func prepare(for device: any MTLDevice) {
        // 48 bytes an occluder, 496 the whole block. If either changes, the shader
        // is reading the wrong bytes and the picture will not say so.
        assert(MemoryLayout<SoftShadow.Occluder>.stride == 48,
               "occluder layout drifted from SoftShadow.metal")
        assert(MemoryLayout<SoftShadow.Uniforms>.stride == 496,
               "uniform layout drifted from SoftShadow.metal")
    }

    func postProcess(context: borrowing PostProcessEffectContext<any MTLCommandBuffer>) {
        let settings = state.settings
        let target = context.targetColorTexture
        let descriptor = MTLRenderPassDescriptor()
        descriptor.colorAttachments[0].texture = target
        descriptor.colorAttachments[0].loadAction = .dontCare
        descriptor.colorAttachments[0].storeAction = .store

        // Out of the render pass's own attachment and into a texture of our own,
        // before anything tries to read it.
        let depth = state.depthCopy(device: context.device, like: context.sourceDepthTexture)
        if let depth, let blit = context.commandBuffer.makeBlitCommandEncoder() {
            blit.copy(from: context.sourceDepthTexture, to: depth)
            blit.endEncoding()
        }

        guard settings.enabled,
              let pipeline = state.pipeline(device: context.device, format: target.pixelFormat),
              let encoder = context.commandBuffer.makeRenderCommandEncoder(descriptor: descriptor) else {
            // Nothing to add, but the frame still has to arrive: the target is a
            // separate texture from the source, so a pass that does nothing must
            // still copy. A pass that returns early leaves a black screen.
            copy(context: context)
            return
        }

        var uniforms: SoftShadow.Uniforms = makeUniforms(settings: settings, projection: context.projection)

        encoder.setRenderPipelineState(pipeline)
        encoder.setFragmentTexture(context.sourceColorTexture, index: 0)
        encoder.setFragmentTexture(depth ?? context.sourceDepthTexture, index: 1)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<SoftShadow.Uniforms>.stride, index: 0)
        // One triangle that covers the screen; no vertex buffer needed.
        encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
        encoder.endEncoding()

        let width = target.width
        let height = target.height

        if state.firstCall() {
            let radius = settings.lightRadius
            let count = settings.occluders.count
            let mode = settings.debugMode
            let stride = MemoryLayout<SoftShadow.Uniforms>.stride
            Self.log.notice("dispatched \(width)x\(height) radius=\(radius) occluders=\(count) mode=\(mode) stride=\(stride)")

            // What the depth texture actually is. A shader that reads a texture
            // whose usage does not include shaderRead is discarded without a word,
            // and that is indistinguishable from a shader whose logic is wrong.
            let depth = context.sourceDepthTexture
            let colour = context.sourceColorTexture
            let depthUsage = depth.usage.rawValue
            let depthFormat = depth.pixelFormat.rawValue
            let depthType = depth.textureType.rawValue
            let colourUsage = colour.usage.rawValue
            Self.log.notice("depth \(depth.width)x\(depth.height) format=\(depthFormat) usage=\(depthUsage) type=\(depthType) samples=\(depth.sampleCount) colourUsage=\(colourUsage)")
        }
    }

    private func copy(context: borrowing PostProcessEffectContext<any MTLCommandBuffer>) {
        guard let blit = context.commandBuffer.makeBlitCommandEncoder() else { return }
        blit.copy(from: context.sourceColorTexture, to: context.targetColorTexture)
        blit.endEncoding()
    }

    private func makeUniforms(settings: SoftShadow.State.Settings, projection: float4x4) -> SoftShadow.Uniforms {
        let empty = SoftShadow.Occluder(centre: .zero, halfExtent: .zero, kind: 0)
        var list = settings.occluders
        while list.count < 8 { list.append(empty) }

        return SoftShadow.Uniforms(
            inverseViewProjection: (projection * settings.view).inverse,
            cameraPosition: SIMD4(settings.lightPosition, 1),
            lightPosition: SIMD4(settings.lightPosition, 1),
            lightRadius: settings.lightRadius,
            // Not zero. A real set has bounce, and this pass models none of it, so
            // a fully shadowed pixel keeps a little of its light rather than
            // claiming a darkness the room would never have.
            shadowDepth: 0.18,
            occluderCount: UInt32(min(settings.occluders.count, 8)),
            debugMode: settings.debugMode,
            occluders: (list[0], list[1], list[2], list[3], list[4], list[5], list[6], list[7])
        )
    }
}

extension NSLock {
    func withLock<T>(_ body: () -> T) -> T {
        lock()
        defer { unlock() }
        return body()
    }
}
