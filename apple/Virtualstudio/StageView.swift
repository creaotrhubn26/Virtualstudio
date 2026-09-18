import SwiftUI
import RealityKit
import Photometry
import StudioContent

/// The screen.
///
/// The interface rules are the ones in `.claude/skills/virtual-studio/SKILL.md`,
/// and they matter more on a device than in a browser. Progressive disclosure is
/// enforced by the screen here rather than by discipline: there is no room for a
/// wall of buttons, so layer one is the whole screen — a place, by name — and the
/// numbers live in a panel you open on purpose.
///
/// Every control is named after what the photographer wants, and carries a plain
/// explanation. Nothing is inert: a state that cannot be reached says why.
struct StageView: View {
    @State private var stage = StudioStage()
    @State private var report = DeviceReport()
    @State private var locationId = StudioCatalogue.shipped.defaultLocationId
    @State private var modifier = Self.launchModifier
    @State private var showingRig = false
    private let keyOffsetStops = Self.launchStops
    /// `--hard-shadows` leaves RealityKit's own shadow alone, for the comparison.
    private let softShadows = !ProcessInfo.processInfo.arguments.contains("--hard-shadows")

    /// The comparison the whole spike turns on.
    ///
    /// Both are 120 cm long and their areas differ by a factor of three, but the
    /// equal-area square — which is what a penumbra actually scales with — differs
    /// by a factor of 1.7. A photographer knows these two look nothing alike.
    static let modifiers = ["Softboks 90×120 cm", "Stripbox 30×120 cm", "Snute 10 cm"]

    /// The modifier to open on, so the comparison can be driven from a script.
    ///
    /// A measurement that can only be taken by hand is a measurement that gets
    /// taken once. `--modifier "Snute 10 cm"` opens on that one, which is how the
    /// three screenshots in `docs/ipad-plan.md` are produced without a finger.
    static var launchModifier: String {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--modifier"), index + 1 < arguments.count,
              modifiers.contains(arguments[index + 1]) else { return modifiers[0] }
        return arguments[index + 1]
    }

    /// `--stops -1` opens the whole rig one stop down, which is how the linearity
    /// of the renderer is measured: the same frame, twice, and the difference read
    /// off the pixels rather than judged by eye.
    /// `--debug-shadow 1` shows the shadow factor, 2 the reconstructed world
    /// position, 3 the raw depth buffer.
    static var launchDebugMode: UInt32 {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--debug-shadow"), index + 1 < arguments.count,
              let mode = UInt32(arguments[index + 1]) else { return 0 }
        return mode
    }

    /// `--light-radius 5` makes the key an absurdly large source, to tell a shader
    /// that ignores the size from a scene that cannot show it.
    /// `--shadow-scale 2` computes the shadow term at half the picture's
    /// resolution. The default is the number the measurement chose.
    static var launchShadowScale: Int {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--shadow-scale"), index + 1 < arguments.count,
              let scale = Int(arguments[index + 1]) else { return 2 }
        return scale
    }

    static var launchRadius: Double? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--light-radius"), index + 1 < arguments.count,
              let metres = Double(arguments[index + 1]) else { return nil }
        return metres
    }

    static var launchStops: Double {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--stops"), index + 1 < arguments.count,
              let stops = Double(arguments[index + 1]) else { return 0 }
        return stops
    }

    private let catalogue = StudioCatalogue.shipped

    var body: some View {
        ZStack(alignment: .topLeading) {
            StudioView(stage: stage, report: report, softShadows: softShadows, shadowScale: Self.launchShadowScale)
                .ignoresSafeArea()
                .task {
                    // The rig first, so there is something to see while the figure's
                    // textures are read; she arrives into a lit stage rather than a
                    // blank one.
                    stage.shadowDebugMode = Self.launchDebugMode
                    stage.softShadowKey = softShadows
                    stage.shadowRadiusOverride = Self.launchRadius
                    stage.light(locationId: locationId, modifierLabel: modifier,
                                keyOffsetStops: keyOffsetStops)
                    await stage.addFigure()
                }

            controls
        }
        .background(.black)
        .onChange(of: locationId) { _, _ in
            stage.light(locationId: locationId, modifierLabel: modifier, keyOffsetStops: keyOffsetStops)
        }
        .onChange(of: modifier) { _, _ in
            stage.light(locationId: locationId, modifierLabel: modifier, keyOffsetStops: keyOffsetStops)
        }
    }

    // MARK: - Layer one: a place, by name

    private var controls: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("STED")
                .font(.system(size: 10, weight: .semibold))
                .kerning(1.6)
                .foregroundStyle(.cyan)

            // Named after the place, never after the parameter. Each carries the
            // catalogue's own explanation, so somebody who has never lit anything
            // still knows what they are choosing.
            ForEach(catalogue.locations, id: \.id) { location in
                Button {
                    locationId = location.id
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(location.label).font(.system(size: 14, weight: .medium))
                        Text(location.hint)
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 10)
                    .background(locationId == location.id ? .cyan.opacity(0.22) : .white.opacity(0.06),
                                in: .rect(cornerRadius: 7))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(locationId == location.id ? [.isSelected] : [])
            }

            Divider().overlay(.white.opacity(0.15))

            Text("LYSFORMER PÅ HOVEDLYSET")
                .font(.system(size: 10, weight: .semibold))
                .kerning(1.6)
                .foregroundStyle(.cyan)

            Picker("Lysformer", selection: $modifier) {
                ForEach(Self.modifiers, id: \.self) { label in
                    Text(label.replacingOccurrences(of: " cm", with: "")).tag(label)
                }
            }
            .pickerStyle(.segmented)
            .labelsHidden()

            measurement

            Button(showingRig ? "Skjul tallene" : "Vis tallene") { showingRig.toggle() }
                .font(.system(size: 11))
                .buttonStyle(.bordered)

            if showingRig { rig }

            Spacer()
        }
        .padding(16)
        .frame(width: 300)
        .background(.black.opacity(0.72), in: .rect(cornerRadius: 12))
        .padding(16)
    }

    // MARK: - What the device is doing

    private var measurement: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 6) {
                Text(String(format: "%.1f ms", report.frameMilliseconds))
                    .font(.system(size: 20, weight: .semibold, design: .monospaced))
                Text(String(format: "verst %.0f", report.worstMilliseconds))
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            // A frame, not a frame rate: 16.7 ms is the budget, and a number in
            // milliseconds says how much of it is left.
            Text(report.frameMilliseconds <= 17.5
                 ? "Innenfor 60 bilder i sekundet"
                 : "Over budsjettet på 16,7 ms")
                .font(.system(size: 10))
                .foregroundStyle(report.frameMilliseconds <= 17.5 ? AnyShapeStyle(.secondary) : AnyShapeStyle(Color.orange))

            Label(report.thermal.label, systemImage: "thermometer.medium")
                .font(.system(size: 11))
                .foregroundStyle(report.thermal.isWarning ? AnyShapeStyle(Color.orange) : AnyShapeStyle(.secondary))

            Text(report.availableMegabytes > 0
                 ? String(format: "%.0f MB brukt · %.0f MB igjen",
                          report.footprintMegabytes, report.availableMegabytes)
                 // os_proc_available_memory reports nothing in the simulator, and
                 // saying "0 MB igjen" would read as a warning rather than an
                 // absence. The headroom is a device number.
                 : String(format: "%.0f MB brukt · takhøyden måles på enheten",
                          report.footprintMegabytes))
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Layer three: the rig, in the units it was written in

    private var rig: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(stage.report) { fixture in
                VStack(alignment: .leading, spacing: 1) {
                    Text(fixture.name).font(.system(size: 11, weight: .medium))
                    Text(String(format: "%+.1f stopp · %.2f m · %.0f° fra linsa",
                                -fixture.stops, fixture.distance, fixture.offAxisDegrees))
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(.secondary)
                    Text(String(format: "%.0f cd · %.0f lm", fixture.candela, fixture.lumens))
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(.secondary)
                    Text(String(format: "penumbra ville vært %.4f", fixture.hardeningRatio))
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(.orange.opacity(0.85))
                }
            }

            Text("«Ville vært» er ikke en skrivefeil. RealityKit har ingen "
                 + "innstilling for hvor myk en skyggekant er — bare dybde og "
                 + "klipping — så tallet er regnet ut og ikke brukt. Det er "
                 + "nettopp dette denne appen er bygget for å vise.")
                .font(.system(size: 9))
                .foregroundStyle(.orange.opacity(0.85))
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
