import Foundation
import Observation
import os

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
    /// Milliseconds per frame, smoothed. A 60 Hz frame is 16.7 ms.
    private(set) var frameMilliseconds: Double = 0
    /// The worst frame in the last second, because an average hides a stutter.
    private(set) var worstMilliseconds: Double = 0
    private(set) var thermal: ProcessInfo.ThermalState = .nominal
    /// Megabytes this process has resident. The number jetsam looks at.
    private(set) var footprintMegabytes: Double = 0
    /// Megabytes it may still take before it is killed.
    ///
    /// Not the device's RAM: that is the wrong number to reason from. Under Stage
    /// Manager, with other apps resident, this is what actually runs out.
    private(set) var availableMegabytes: Double = 0
    private(set) var seconds: Double = 0

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
            windowStart = seconds
            thermal = ProcessInfo.processInfo.thermalState
            footprintMegabytes = Double(Self.footprint()) / 1_048_576
            availableMegabytes = Double(os_proc_available_memory()) / 1_048_576
        }
    }

    /// The process's physical footprint, which is what the memory limit is applied
    /// to — not virtual size, and not the resident size a task_basic_info reports.
    private static func footprint() -> UInt64 {
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
