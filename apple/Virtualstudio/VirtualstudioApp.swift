import SwiftUI

/// The iPad edition, at the stage the plan calls a measurement rather than a
/// prototype.
///
/// `docs/ipad-plan.md` says the expensive decision — RealityKit, RealityKit with a
/// custom Metal shadow pass, or Metal — is taken last, on numbers from a physical
/// device. This app is the instrument that produces those numbers, and it is built
/// out of the same domain packages the web studio's logic was ported into, so what
/// it measures is the real thing and not a mock-up of it.
///
/// It therefore has no document, no library and no editing yet. It puts a rig on a
/// stage, lets the place and the modifier be changed, and reports what the device
/// is doing while it renders.
@main
struct VirtualstudioApp: App {
    var body: some Scene {
        WindowGroup {
            StageView()
                // Landscape on a stand, portrait in one hand: the studio is a wide
                // picture, but a call sheet is a tall one.
                .preferredColorScheme(.dark)
                .statusBarHidden()
        }
    }
}
