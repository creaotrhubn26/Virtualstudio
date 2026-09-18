import Foundation
import RealityKit
import simd
import Photometry
import StudioContent

/// A rig on a stage, built from the same catalogue the web studio uses.
///
/// Nothing here invents content. The place, the look, every fixture's angle and
/// every level in stops come out of `StudioContent`, which is the table the
/// TypeScript wrote; the conversion from a level in stops to something a light can
/// be told is `Photometry`. So what this renders is the studio's own lighting, and
/// a disagreement is a disagreement about RealityKit rather than about taste.
///
/// **What it is for.** `docs/ipad-plan.md` asks four questions of a device, and
/// this stage is built to answer the two that need geometry: does a modifier's size
/// change the shadow, and does one stop of difference render as a factor of two.
/// Everything in it is a measuring instrument first and a scene second — which is
/// why there is a bare rod standing in front of the wall.
@MainActor
final class StudioStage {
    let root = Entity()

    /// Where the taking camera stands. The same shot the web studio opens on.
    /// Far enough back to hold the figure, the floor it stands on and the rod: a
    /// full-body frame, because everything being measured is an edge somewhere in
    /// the picture rather than a face.
    static let cameraPosition = SIMD3<Float>(-0.9, 1.45, -5.2)
    static let cameraTarget = SIMD3<Float>(0.25, 1.0, 0.4)

    /// A subject 1.72 m tall, like the bundled woman.
    ///
    /// Eye height is 0.936 × stature, which is the figure the web studio meters to
    /// and the height every `PolarPlacement` elevation is measured from.
    static let stature: Double = 1.72
    static var eyeHeight: Double { stature * 0.936 }

    /// The taking camera, which the renderer is pointed at.
    private(set) var camera = PerspectiveCamera()

    private var lights: [Entity] = []
    private let catalogue = StudioCatalogue.shipped

    /// What the custom shadow pass is told. See `SoftShadowPass`.
    let shadowState = SoftShadow.State()

    /// The things on the stage that stop light, as the shadow pass understands
    /// them: boxes and one sphere. Recorded when the stage is built, because they
    /// do not move.
    private var occluders: [SoftShadow.Occluder] = []

    /// The camera's view matrix.
    ///
    /// The post-process is handed a projection matrix and no view matrix, so the
    /// pass cannot turn a depth value back into a place in the room on its own.
    /// This camera does not move, so the studio can simply say where it is.
    static var view: float4x4 {
        let forward = simd_normalize(cameraPosition - cameraTarget)
        let right = simd_normalize(simd_cross(SIMD3<Float>(0, 1, 0), forward))
        let up = simd_cross(forward, right)
        let translation = SIMD3<Float>(
            -simd_dot(right, cameraPosition),
            -simd_dot(up, cameraPosition),
            -simd_dot(forward, cameraPosition)
        )
        return float4x4(columns: (
            SIMD4(right.x, up.x, forward.x, 0),
            SIMD4(right.y, up.y, forward.y, 0),
            SIMD4(right.z, up.z, forward.z, 0),
            SIMD4(translation.x, translation.y, translation.z, 1)
        ))
    }

    /// What each fixture was asked to deliver, so the panel can show the rig in the
    /// units it was written in instead of the units it was given to RealityKit.
    private(set) var report: [FixtureReport] = []

    struct FixtureReport: Identifiable {
        let id: String
        let name: String
        /// Level below the look's key, in stops.
        let stops: Double
        /// Metres from the subject, after being walked into the room.
        let distance: Double
        /// Degrees off the lens axis. Never under 25.
        let offAxisDegrees: Double
        /// On-axis intensity, candela.
        let candela: Double
        /// What RealityKit was told, lumens.
        let lumens: Double
        /// What the shadow edge would be worth, if RealityKit could be told.
        let hardeningRatio: Double
    }

    init() {
        buildStage()
    }

    /// The bundled figure, loaded and dressed, once the textures are in.
    ///
    /// Reading three PNGs is not instant, so the stage is built and shown first and
    /// she arrives into it. A stand-in box stands where she will be until she does —
    /// the empty state, so the screen is never a blank waiting for a file.
    func addFigure() async {
        // The USDZ first, because RealityKit draws its materials correctly and the
        // hand-built ones do not. The glTF path stays as the fallback: a figure that
        // has not been rebuilt since the USD export was added still has a GLB.
        FigureEntity.prepare("studio-woman")
        let dressed = FigureEntity.defaultWardrobe
        var loaded = await FigureEntity.load(named: "studio-woman", pose: "StudioStand", wearing: dressed)
        if loaded == nil {
            loaded = await FigureMesh.entity(named: "studio-woman", pose: "StudioStand",
                                             wearing: FigureMesh.defaultWardrobe(for: "studio-woman"))
        }
        guard let woman = loaded else { return }
        // The body is modelled facing positive z; the camera stands at negative z,
        // where a camera stands. Half a turn puts them face to face.
        woman.orientation = simd_quatf(angle: .pi, axis: [0, 1, 0])
        standIn?.removeFromParent()
        standIn = nil
        root.addChild(woman)
    }

    private var standIn: Entity?

    /// Nothing but the rig.
    ///
    /// RealityKit lights a scene from an image-based light whether or not you ask,
    /// and that ambient is flat: it fills every shadow, so the ratio a look was
    /// written in never reaches the picture. An empty image-based light, declared on
    /// a holder that everything points at, is how it is switched off.
    ///
    /// This is a real difference from the web renderer, where ambient is a light you
    /// add. Here it has to be taken away.
    private func removeAmbient() {
        let holder = Entity()
        holder.name = "noAmbient"
        holder.components.set(ImageBasedLightComponent(source: .none))
        root.addChild(holder)
        for entity in root.children where entity !== holder {
            apply(ImageBasedLightReceiverComponent(imageBasedLight: holder), to: entity)
        }
    }

    private func apply(_ component: ImageBasedLightReceiverComponent, to entity: Entity) {
        entity.components.set(component)
        for child in entity.children { apply(component, to: child) }
    }

    // MARK: - The stage

    /// Floor, wall, a figure and a gauge.
    ///
    /// The rod is the instrument: a 2 cm bar standing 30 cm off the wall throws a
    /// shadow whose edge is wide or narrow in direct proportion to the source, which
    /// is the one thing being measured. A figure alone would not show it — a face has
    /// no straight edge to read a penumbra against.
    private func buildStage() {
        let concrete = SimpleMaterial(color: .init(white: 0.55, alpha: 1), roughness: 0.9, isMetallic: false)

        let floor = ModelEntity(mesh: .generatePlane(width: 16, depth: 17), materials: [concrete])
        floor.name = "floor"
        // A floor casts nothing and catches everything: the shadow is the reading.
        floor.components.set(GroundingShadowComponent(castsShadow: false, receivesShadow: true))
        root.addChild(floor)

        let wall = ModelEntity(mesh: .generatePlane(width: 16, height: 4), materials: [concrete])
        wall.name = "wall"
        wall.position = [0, 2, 3]
        wall.components.set(GroundingShadowComponent(castsShadow: false, receivesShadow: true))
        root.addChild(wall)

        // The figure. The bundled woman when she is in the app bundle, and a
        // stand-in when she is not: the GLBs are fetched rather than committed, so a
        // fresh clone builds and runs without them and shows a box.
        //
        // `female_casualsuit01` is what she opens wearing in the studio, and the
        // ranges it hides are the catalogue's own.

        let skin = SimpleMaterial(color: .init(red: 0.78, green: 0.66, blue: 0.58, alpha: 1), roughness: 0.7, isMetallic: false)
        let torso = ModelEntity(
            mesh: .generateBox(width: 0.42, height: 0.92, depth: 0.24, cornerRadius: 0.1),
            materials: [skin]
        )
        torso.position = [0, 1.02, 0]
        let legs = ModelEntity(
            mesh: .generateBox(width: 0.34, height: 0.86, depth: 0.22, cornerRadius: 0.08),
            materials: [skin]
        )
        legs.position = [0, 0.44, 0]
        let head = ModelEntity(mesh: .generateSphere(radius: 0.115), materials: [skin])
        head.position = [0, 1.62, 0]
        let figure = Entity()
        figure.name = "standIn"
        for part in [legs, torso, head] {
            part.components.set(GroundingShadowComponent(castsShadow: true, receivesShadow: true))
            figure.addChild(part)
        }
        root.addChild(figure)
        standIn = figure

        occluders = [
            box(centre: [0, 0.44, 0], size: [0.34, 0.86, 0.22]),
            box(centre: [0, 1.02, 0], size: [0.42, 0.92, 0.24]),
            sphere(centre: [0, 1.62, 0], radius: 0.115),
        ]

        buildGauge()
        buildCamera()
        removeAmbient()
    }

    /// The instrument: a 2 cm bar standing 30 cm off the wall throws a shadow whose
    /// edge is wide or narrow in direct proportion to the source, which is the one
    /// thing being measured. A figure alone would not show it — a face has no
    /// straight edge to read a penumbra against.
    private func buildGauge() {
        // Plain white so nothing about the material affects the reading.
        let white = SimpleMaterial(color: .white, roughness: 1, isMetallic: false)
        let rod = ModelEntity(mesh: .generateBox(width: 0.02, height: 2.0, depth: 0.02), materials: [white])
        rod.name = "penumbraGauge"
        rod.position = [1.1, 1.0, 2.7]
        rod.components.set(GroundingShadowComponent(castsShadow: true, receivesShadow: false))
        root.addChild(rod)
        occluders.append(box(centre: [1.1, 1.0, 2.7], size: [0.02, 2.0, 0.02]))

    }

    private func buildCamera() {
        camera.name = "takingCamera"
        // 35 mm on full frame: 2·atan(24 / (2·35)) = 37.8° vertically, which is
        // what RealityKit's field of view means and what the web studio computes.
        camera.camera.fieldOfViewInDegrees = 37.8
        camera.camera.near = 0.05
        camera.camera.far = 120
        camera.look(at: Self.cameraTarget, from: Self.cameraPosition, relativeTo: nil)
        root.addChild(camera)
    }

    // MARK: - The rig

    /// Light the stage the way a named place is lit.
    ///
    /// `modifierLabel` is the key's modifier, and it is the point of the exercise:
    /// the two labels the panel offers have the same area to within a few per cent
    /// and very different shapes, so `contactHardeningRatio` separates them by a
    /// factor of three. If the rendered shadow does not change between them, the
    /// product's central claim has no RealityKit primitive to stand on.
    /// `keyOffsetStops` dims or lifts the whole rig by that many stops.
    ///
    /// Question two of the plan: does one stop render as a factor of two? The web
    /// renderer's answer is exactly yes, because an earlier ceiling that made every
    /// bright fixture identical was treated as a bug rather than a look. Whether
    /// RealityKit answers the same is measured by rendering the same frame twice.
    /// What the shadow pass should draw instead of the picture, for diagnosis.
    var shadowDebugMode: UInt32 = 0

    /// Override the key's emitting size, in metres, ignoring the modifier.
    ///
    /// A catalogue softbox and a snoot are 1.04 m and 0.10 m apart, and against a
    /// figure standing on the floor that is a contact shadow either way: the
    /// penumbra of a source is proportional to how far the occluder is from what
    /// catches its shadow, and at the feet that distance is nothing. An absurd
    /// value separates "the size does not reach the rays" from "the scene cannot
    /// show the difference".
    var shadowRadiusOverride: Double?

    /// When the custom pass draws the key's shadow, the key must give up its own.
    ///
    /// Two shadows over the same light multiply, and RealityKit's is hard: wherever
    /// its shadow falls the floor is already dark, so a penumbra drawn on top has
    /// nothing left to darken and every modifier looks the same. That is not a
    /// second finding about RealityKit — it is how any two shadow terms compose —
    /// but it cost a round of measurement to see, so it is written down here.
    var softShadowKey = true

    func light(locationId: String, modifierLabel: String, keyOffsetStops: Double = 0) {
        for light in lights { light.removeFromParent() }
        lights.removeAll()
        report.removeAll()

        guard let location = catalogue.location(id: locationId),
              let look = catalogue.look(id: location.look) else { return }

        let subject = SubjectStand(x: 0, z: 0, eyeHeight: Self.eyeHeight)
        let cameraAt = Vec3Value(
            x: Double(Self.cameraPosition.x),
            y: Double(Self.cameraPosition.y),
            z: Double(Self.cameraPosition.z)
        )

        for (index, fixture) in look.fixtures.enumerated() {
            // Only the working lights. A motivating source is a lamp in the room,
            // and the room is not built here.
            guard let placement = fixture.placement else { continue }

            let resolved = resolvePlacement(placement, subject: subject, camera: (x: cameraAt.x, z: cameraAt.z))
            var position = clearOfCamera(position: resolved.position, aim: resolved.aim, camera: cameraAt)
            if let bounds = location.bounds {
                position = insideRoom(position: position, aim: resolved.aim, bounds: bounds)
            }

            let distance = metres(from: position, to: resolved.aim)
            let beamDeg = fixture.beamDeg ?? DEFAULT_BEAM_ANGLE_DEG
            // The level a look asks for, as an intensity a light can be given.
            //
            // A look is written in stops from the studio key, in the web renderer's
            // scene units. Undo that calibration to get candela, then spread the
            // candela over the beam to get the lumens RealityKit wants. The ratios
            // between fixtures are exact whatever the absolute scale turns out to
            // be; the scale itself is the thing to calibrate on device, against one
            // known fixture, exactly as SCENE_INTENSITY_PER_CANDELA was.
            let sceneUnits = fixtureIlluminance(look, fixture: fixture, studioKey: catalogue.studioKeyIlluminance)
                * pow(2, keyOffsetStops)
            let candela = (sceneUnits / SCENE_INTENSITY_PER_CANDELA) * distance * distance
            let solidAngle = (try? coneSolidAngle(beamDeg)) ?? 1
            let lumens = candela * solidAngle

            let entity = Entity()
            entity.name = "light-\(fixture.name)"
            var spot = SpotLightComponent(
                color: .white,
                intensity: Float(lumens),
                innerAngleInDegrees: Float(beamDeg * 0.6),
                outerAngleInDegrees: Float(beamDeg),
                attenuationRadius: 60
            )
            // Physical falloff, so doubling the distance costs exactly two stops.
            // The radius above is far past the set so the windowed cut-off never
            // bites inside it.
            spot.attenuationFalloffExponent = 2
            entity.components.set(spot)

            // Everything the shadow can be told. Depth and clipping only: there is
            // nothing anywhere in RealityKit about how soft the edge is, which is
            // what this app exists to demonstrate.
            //
            // The key keeps its own shadow only when the custom pass is not drawing
            // one for it. See `softShadowKey`.
            if index != 0 || !softShadowKey {
                var shadow = SpotLightComponent.Shadow()
                shadow.zNear = .fixed(0.2)
                shadow.zFar = .fixed(20)
                shadow.depthBias = 1
                entity.components.set(shadow)
            }

            entity.look(
                at: SIMD3(Float(resolved.aim.x), Float(resolved.aim.y), Float(resolved.aim.z)),
                from: SIMD3(Float(position.x), Float(position.y), Float(position.z)),
                relativeTo: nil
            )
            root.addChild(entity)
            lights.append(entity)

            // The key carries the modifier being compared; the others keep their own.
            let label = index == 0 ? modifierLabel : fixture.name
            let size = modifierSizeMetres(label)
            if index == 0, softShadowKey {
                // The key is the light whose shadow is drawn by hand, because it is
                // the one whose modifier the photographer is choosing.
                shadowState.settings = SoftShadow.State.Settings(
                    lightPosition: SIMD3(Float(position.x), Float(position.y), Float(position.z)),
                    lightRadius: Float(shadowRadiusOverride ?? size),
                    occluders: occluders,
                    view: Self.view,
                    enabled: true,
                    debugMode: shadowDebugMode
                )
            }
            let hardening = (try? contactHardeningRatio(
                sourceSizeMetres: size,
                beamAngleRad: (try? spotConeRadians(beamDeg)) ?? 1
            )) ?? 0

            report.append(FixtureReport(
                id: "\(look.id)-\(index)",
                name: index == 0 ? "\(fixture.name) · \(label)" : fixture.name,
                stops: fixture.stops,
                distance: distance,
                offAxisDegrees: offAxisDegrees(position: position, aim: resolved.aim, camera: cameraAt),
                candela: candela,
                lumens: lumens,
                hardeningRatio: hardening
            ))
        }
    }

    private func box(centre: SIMD3<Float>, size: SIMD3<Float>) -> SoftShadow.Occluder {
        SoftShadow.Occluder(centre: SIMD4(centre, 1), halfExtent: SIMD4(size / 2, 0), kind: 0)
    }

    private func sphere(centre: SIMD3<Float>, radius: Float) -> SoftShadow.Occluder {
        SoftShadow.Occluder(centre: SIMD4(centre, 1), halfExtent: SIMD4(repeating: radius), kind: 1)
    }

    private func metres(from position: Vec3Value, to aim: Vec3Value) -> Double {
        let dx = position.x - aim.x, dy = position.y - aim.y, dz = position.z - aim.z
        return (dx * dx + dy * dy + dz * dz).squareRoot()
    }

    private func offAxisDegrees(position: Vec3Value, aim: Vec3Value, camera: Vec3Value) -> Double {
        let light = atan2(position.z - aim.z, position.x - aim.x)
        let lens = atan2(camera.z - aim.z, camera.x - aim.x)
        var difference = light - lens
        while difference > .pi { difference -= 2 * .pi }
        while difference < -.pi { difference += 2 * .pi }
        return abs(difference) * 180 / .pi
    }
}
