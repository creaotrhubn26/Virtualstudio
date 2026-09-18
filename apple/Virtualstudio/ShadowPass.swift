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
    private var pipeline: MTLComputePipelineState?

    init(state: SoftShadow.State) {
        self.state = state
    }

    static let log = Logger(subsystem: "no.holycrust.virtualstudio", category: "shadow")

    mutating func prepare(for device: any MTLDevice) {
        guard pipeline == nil else { return }
        // 48 bytes an occluder, 496 the whole block. If either changes, the shader
        // is reading the wrong bytes and the picture will not say so.
        assert(MemoryLayout<SoftShadow.Occluder>.stride == 48,
               "occluder layout drifted from SoftShadow.metal")
        assert(MemoryLayout<SoftShadow.Uniforms>.stride == 496,
               "uniform layout drifted from SoftShadow.metal")
        guard let library = device.makeDefaultLibrary() else {
            Self.log.error("no default Metal library")
            return
        }
        guard let function = library.makeFunction(name: "softShadow") else {
            Self.log.error("softShadow is not in the library")
            return
        }
        let built = try? device.makeComputePipelineState(function: function)
        pipeline = built
        Self.log.notice("prepared: \(built != nil)")
    }

    func postProcess(context: borrowing PostProcessEffectContext<any MTLCommandBuffer>) {
        let settings = state.settings
        guard settings.enabled,
              let pipeline,
              let encoder = context.commandBuffer.makeComputeCommandEncoder() else {
            Self.log.notice("pass skipped: enabled=\(settings.enabled) pipeline=\(self.pipeline != nil)")
            // Nothing to add, but the frame still has to arrive: the target is a
            // separate texture from the source, so a pass that does nothing must
            // still copy. A pass that returns early leaves a black screen.
            copy(context: context)
            return
        }

        var uniforms: SoftShadow.Uniforms = makeUniforms(settings: settings, projection: context.projection)

        encoder.setComputePipelineState(pipeline)
        encoder.setTexture(context.sourceColorTexture, index: 0)
        encoder.setTexture(context.sourceDepthTexture, index: 1)
        encoder.setTexture(context.targetColorTexture, index: 2)
        encoder.setBytes(&uniforms, length: MemoryLayout<SoftShadow.Uniforms>.stride, index: 0)

        let width = context.targetColorTexture.width
        let height = context.targetColorTexture.height
        let group = MTLSize(width: 16, height: 16, depth: 1)
        let grid = MTLSize(
            width: (width + group.width - 1) / group.width,
            height: (height + group.height - 1) / group.height,
            depth: 1
        )
        encoder.dispatchThreadgroups(grid, threadsPerThreadgroup: group)
        encoder.endEncoding()

        if state.firstCall() {
            let radius = settings.lightRadius
            let count = settings.occluders.count
            let mode = settings.debugMode
            let stride = MemoryLayout<SoftShadow.Uniforms>.stride
            Self.log.notice("dispatched \(width)x\(height) radius=\(radius) occluders=\(count) mode=\(mode) stride=\(stride)")
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
