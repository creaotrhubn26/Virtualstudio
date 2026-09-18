import Foundation
import Observation
import os

private let log = Logger(subsystem: "no.holycrust.virtualstudio", category: "device")

/// What the device is actually doing.
///
/// The three numbers stage 2 of the plan asks for, and they are deliberately on
/// screen rather than in a profiler: the failure that matters for an on-location
/// tool is not a crash but the preview quietly ceasing to match what was set, and
/// a photographer will not notice that until the shoot. If the frame time doubles
/// and the thermal state goes serious, it should be visible in the room.
@MainActor
@Observable
final class DeviceReport {
    /// Milliseconds the GPU spent on the last frame, smoothed.
    ///
    /// Not the same number as `frameMilliseconds`, and the more useful one. The
    /// wall clock between two draws says when the next callback arrived, which on a
    /// variable-refresh display is quantised to whatever interval the system chose;
    /// this says how long the work actually took. "Is it affordable" is a question
    /// about the work.
    fileprivate(set) var gpuMilliseconds: Double = 0

    /// Milliseconds per frame, smoothed. A 60 Hz frame is 16.7 ms.
    private(set) var frameMilliseconds: Double = 0
    /// The worst frame in the last second, because an average hides a stutter.
    private(set) var worstMilliseconds: Double = 0
    private(set) var thermal: ProcessInfo.ThermalState = .nominal
    /// Megabytes this process has resident. The number jetsam looks at.
    fileprivate(set) var footprintMegabytes: Double = 0
    /// Megabytes it may still take before it is killed.
    ///
    /// Not the device's RAM: that is the wrong number to reason from. Under Stage
    /// Manager, with other apps resident, this is what actually runs out.
    fileprivate(set) var availableMegabytes: Double = 0
    private(set) var seconds: Double = 0

    /// What the last frame's command buffer reported, from the render thread.
    func recordGPU(seconds: Double) {
        guard seconds > 0, seconds < 1 else { return }
        let milliseconds = seconds * 1000
        smoothedGPU = smoothedGPU == 0 ? milliseconds : smoothedGPU * 0.9 + milliseconds * 0.1
        gpuMilliseconds = smoothedGPU
        worstGPU = max(worstGPU, milliseconds)
    }

    private var smoothedGPU: Double = 0
    private var worstGPU: Double = 0
    private var reportedWorstGPU: Double = 0
    private var smoothed: Double = 0
    private var windowWorst: Double = 0
    private var windowStart: Double = 0

    func tick(deltaTime: Double) {
        seconds += deltaTime
        let milliseconds = deltaTime * 1000
        // A first-order filter, not a running mean: it answers "what is it doing
        // now" rather than "what has it done since launch".
        smoothed = smoothed == 0 ? milliseconds : smoothed * 0.9 + milliseconds * 0.1
        frameMilliseconds = smoothed
        windowWorst = max(windowWorst, milliseconds)

        if seconds - windowStart >= 1 {
            worstMilliseconds = windowWorst
            windowWorst = 0
            reportedWorstGPU = worstGPU
            worstGPU = 0
            windowStart = seconds
            thermal = ProcessInfo.processInfo.thermalState
            // Off the render thread as well. `task_info` with `TASK_VM_INFO` walks
            // the process's whole virtual memory map to produce a footprint, and
            // that walk was the worst frame — a steady 23 ms once a second, which
            // is the shape of a cost on a clock rather than a stutter in a scene.
            measure()
            // Off the render thread. Writing a line was the worst frame: a
            // steady 23.5 ms once a second at 120 Hz, which is the shape of a
            // cost that happens on a clock rather than a stutter that happens on
            // a scene. Reporting a frame time from inside the frame it is
            // reporting on is a good way to measure the reporting.
            //
            // On screen for the photographer, and in the log for the measurement:
            // a sustained reading is the one that matters, and nobody watches a
            // panel for thirty minutes.
            let frame = self.frameMilliseconds, worst = self.worstMilliseconds
            let gpu = self.gpuMilliseconds, gpuWorst = self.reportedWorstGPU
            let used = Int(self.footprintMegabytes), free = Int(self.availableMegabytes)
            let state = self.thermal.rawValue, elapsed = Int(self.seconds)
            Task.detached(priority: .utility) {
                log.notice("t=\(elapsed)s frame=\(frame, format: .fixed(precision: 2))ms worst=\(worst, format: .fixed(precision: 1))ms thermal=\(state) used=\(used)MB free=\(free)MB")
            // And on standard output, so `devicectl device process launch --console`
            // carries the measurement off the iPad without a screenshot. The reading
            // that matters is the sustained one, and nobody watches a panel for half
            // an hour.
                print("STUDIO t=\(elapsed)s frame=\(String(format: "%.2f", frame))ms worst=\(String(format: "%.1f", worst))ms gpu=\(String(format: "%.2f", gpu))ms gpuworst=\(String(format: "%.2f", gpuWorst))ms thermal=\(state) used=\(used)MB free=\(free)MB")
            }
        }
    }

    /// Read the memory figures away from the frame, and hand them back when done.
    private func measure() {
        Task.detached(priority: .utility) {
            let used = Double(Self.footprint()) / 1_048_576
            let free = Double(os_proc_available_memory()) / 1_048_576
            await MainActor.run {
                self.footprintMegabytes = used
                self.availableMegabytes = free
            }
        }
    }

    /// The process's physical footprint, which is what the memory limit is applied
    /// to — not virtual size, and not the resident size a task_basic_info reports.
    nonisolated private static func footprint() -> UInt64 {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size) / 4
        let result = withUnsafeMutablePointer(to: &info) { pointer in
            pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        return result == KERN_SUCCESS ? info.phys_footprint : 0
    }
}

extension ProcessInfo.ThermalState {
    /// The state in the language the interface is in, and in words that say what it
    /// means for the picture rather than naming an enum case.
    var label: String {
        switch self {
        case .nominal: "Kjølig"
        case .fair: "Lun"
        case .serious: "Varm · bildet kan henge etter"
        case .critical: "For varm · bildet er ikke til å stole på"
        @unknown default: "Ukjent"
        }
    }

    var isWarning: Bool {
        self == .serious || self == .critical
    }
}
