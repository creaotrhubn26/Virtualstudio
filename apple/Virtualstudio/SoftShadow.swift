import Foundation
import simd

/// The block the soft-shadow composite reads.
///
/// Mirrors `ShadowUniforms` in `SoftShadow.metal`, and the two layouts are simply
/// believed by both sides — nothing checks them but the assertion below. 48 bytes an
/// occluder and 496 the whole block: `SIMD3<UInt32>` is sixteen-byte aligned in
/// Swift and would silently make the occluder 64, after which every occluder but the
/// first is read from the wrong place and the only symptom is a shadow that does not
/// move.
enum SoftShadow {
    struct Occluder {
        var centre: SIMD4<Float>
        /// Half extents. Not `half`: that is a type name in Metal, and the two sides
        /// of this struct have to agree.
        var halfExtent: SIMD4<Float>
        /// 0 is a box, 1 a sphere.
        var kind: UInt32
        var pad: (UInt32, UInt32, UInt32) = (0, 0, 0)
    }

    struct Uniforms {
        /// World to the light's clip space. A surface is tested by projecting it
        /// into this and asking the shadow map what the light can see there.
        var lightViewProjection: float4x4
        var cameraPosition: SIMD4<Float>
        var lightPosition: SIMD4<Float>
        /// The emitting source's real size, in metres. The number everything follows.
        var lightRadius: Float
        /// How dark a fully shadowed pixel becomes.
        var shadowDepth: Float
        var lightNear: Float
        var lightFar: Float
        var occluderCount: UInt32
        /// 0 draws the picture, 1 the shadow factor, 2 the position map.
        var debugMode: UInt32 = 0
        var occluders: (Occluder, Occluder, Occluder, Occluder, Occluder, Occluder, Occluder, Occluder)
    }

    /// What the stage tells the pass. Written on the main actor, read on whatever
    /// thread the renderer calls back on.
    final class State: @unchecked Sendable {
        private let lock = NSLock()
        private var value = Settings()

        struct Settings {
            var lightPosition = SIMD3<Float>(2, 2.5, -2)
            /// Where the key is pointed. The shadow map is rendered from the light
            /// looking at this.
            var lightAim = SIMD3<Float>(0, 1.6, 0)
            /// The beam's full angle in degrees, which is the field of view the
            /// shadow map is rendered with.
            var lightBeamDeg: Float = 60
            var lightRadius: Float = 0.9
            var occluders: [Occluder] = []
            var view = matrix_identity_float4x4
            var enabled = false
            var debugMode: UInt32 = 0
        }

        var settings: Settings {
            get { lock.withLock { value } }
            set { lock.withLock { value = newValue } }
        }
    }

    static func assertLayout() {
        assert(MemoryLayout<Occluder>.stride == 48, "occluder layout drifted from SoftShadow.metal")
        assert(MemoryLayout<Uniforms>.stride == 512, "uniform layout drifted from SoftShadow.metal")
    }
}

extension NSLock {
    func withLock<T>(_ body: () -> T) -> T {
        lock()
        defer { unlock() }
        return body()
    }
}
