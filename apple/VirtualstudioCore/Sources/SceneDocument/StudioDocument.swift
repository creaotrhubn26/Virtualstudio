import Foundation

/// Validation of a scene document, before anything is cleared.
///
/// A port of `src/services/studioDocument.ts`, and held to the contract written
/// down in `src/services/studioDocument.test.ts`. The rules matter more than the
/// code: this runs before the current scene is replaced, so what it accepts and
/// refuses decides whether a photographer loses their work to a bad file.
///
/// Two departures from the TypeScript, both deliberate:
///
///  - The error says which field was wrong. The web version throws one Norwegian
///    sentence, which is all a file picker needed; a native app has to be able to
///    tell the photographer what is wrong with the file they just opened.
///  - Unknown fields are carried in the document's own tree rather than by a
///    schema option, because Swift's `Codable` would otherwise drop them. See
///    `JSONValue`.
public enum DocumentError: Error, Equatable, CustomStringConvertible {
    case notAnObject
    case missing(String)
    case wrongType(String, expected: String)
    case notFinite(String)
    case outOfRange(String, String)
    case unknownValue(String, String)
    case empty(String)
    case badShutter(String)

    public var description: String {
        switch self {
        case .notAnObject: "The file is not a studio setup"
        case .missing(let path): "\(path) is missing"
        case .wrongType(let path, let expected): "\(path) is not \(expected)"
        case .notFinite(let path): "\(path) is not a finite number"
        case .outOfRange(let path, let rule): "\(path) \(rule)"
        case .unknownValue(let path, let value): "\(path) does not know \"\(value)\""
        case .empty(let path): "\(path) may not be empty"
        case .badShutter(let value): "\"\(value)\" is not a shutter speed"
        }
    }
}

/// A validated scene document.
///
/// `json` is the whole file as it arrived, including anything this version does
/// not understand. The typed properties are views onto it, read once at
/// validation time, so reading them cannot fail.
public struct StudioDocument: Equatable, Sendable {
    public let json: JSONValue

    public let id: String
    public let name: String
    public let createdAt: String
    public let updatedAt: String
    public let cameras: [Camera]
    public let cameraSettings: CameraSettings
    public let room: Room?

    public struct Camera: Equatable, Sendable {
        public let id: String
        public let alpha: Double
        public let beta: Double
        public let radius: Double
        public let target: Vector3
        /// Vertical field of view in radians. Longer focal lengths narrow it.
        public let fov: Double
    }

    public struct Vector3: Equatable, Sendable {
        public let x: Double
        public let y: Double
        public let z: Double
    }

    public struct CameraSettings: Equatable, Sendable {
        public let aperture: Double
        public let iso: Double
        public let focalLength: Double
        /// As written: "1/125", "2", "0.5".
        public let shutter: String
        public let nd: Double

        /// The shutter as seconds. Validation has already refused "1/0".
        public var shutterSeconds: Double {
            let parts = shutter.split(separator: "/").map { Double($0) ?? .nan }
            if parts.count == 2 { return parts[0] / parts[1] }
            return parts.first ?? .nan
        }
    }

    /// The places this studio builds. A document naming any other is refused,
    /// because there would be nothing to build.
    public enum RoomKind: String, CaseIterable, Sendable {
        case none, industrial, kitchen, hospital, pizzeria
    }

    public struct Room: Equatable, Sendable {
        public let kind: RoomKind
        public let furnishings: Bool
        public let practicals: Bool
        public let brandName: String?
    }

    /// The channels a track can drive. Anything else is refused: a document
    /// asking for a channel the studio cannot address would move nothing and
    /// say nothing about it.
    public enum TrackChannel: String, CaseIterable, Sendable {
        case position, rotation, intensity, color, target
    }
}

/// Validate a document before the current scene is cleared.
public func parseStudioDocument(_ value: JSONValue) throws -> StudioDocument {
    guard let root = value.objectValue else { throw DocumentError.notAnObject }

    let id = try string(root, "id")
    let name = try string(root, "name")
    let createdAt = try string(root, "createdAt")
    let updatedAt = try string(root, "updatedAt")

    // Everything else can be empty; without a camera there is no photograph.
    let cameraList = try array(root, "cameras")
    if cameraList.isEmpty { throw DocumentError.empty("cameras") }
    let cameras = try cameraList.enumerated().map { index, entry -> StudioDocument.Camera in
        let path = "cameras[\(index)]"
        guard let camera = entry.objectValue else { throw DocumentError.wrongType(path, expected: "an object") }
        return StudioDocument.Camera(
            id: try string(camera, "id", at: path),
            alpha: try finite(camera, "alpha", at: path),
            beta: try finite(camera, "beta", at: path),
            radius: try positive(camera, "radius", at: path),
            target: try vector3(camera, "target", at: path),
            fov: try belowPi(camera, "fov", at: path)
        )
    }

    for (index, entry) in try array(root, "lights").enumerated() {
        let path = "lights[\(index)]"
        guard let light = entry.objectValue else { throw DocumentError.wrongType(path, expected: "an object") }
        _ = try string(light, "id", at: path)
        _ = try string(light, "name", at: path)
        _ = try string(light, "type", at: path)
        for key in ["position", "rotation", "scale"] { _ = try triple(light, key, at: path) }
        _ = try nonNegative(light, "intensity", at: path)
        _ = try positive(light, "cct", at: path)
        _ = try bool(light, "visible", at: path)
        _ = try string(light, "modifier", at: path)
    }

    for key in ["actors", "props"] {
        for (index, entry) in try array(root, key).enumerated() {
            try validateNode(entry, at: "\(key)[\(index)]")
        }
    }
    _ = try array(root, "layers")

    // Objects the photographer took hold of. A malformed list is refused here,
    // not after the scene has been thrown away.
    if let claimed = root["studioProps"], !claimed.isNull {
        guard let entries = claimed.arrayValue else { throw DocumentError.wrongType("studioProps", expected: "an array") }
        for (index, entry) in entries.enumerated() {
            let path = "studioProps[\(index)]"
            guard let prop = entry.objectValue else { throw DocumentError.wrongType(path, expected: "an object") }
            try nonEmpty(prop, "id", at: path)
            _ = try string(prop, "name", at: path)
            guard let source = prop["source"]?.objectValue else {
                throw DocumentError.missing("\(path).source")
            }
            switch source["kind"]?.stringValue {
            case "model": try nonEmpty(source, "url", at: "\(path).source")
            case "scene": try nonEmpty(source, "mesh", at: "\(path).source")
            case let kind: throw DocumentError.unknownValue("\(path).source.kind", kind ?? "nothing")
            }
            try validateTransform(prop["transform"], at: path)
            _ = try bool(prop, "visible", at: path)
            _ = try bool(prop, "locked", at: path)
        }
    }

    // Movement over time. A timeline naming a node this scene cannot supply is
    // harmless — it moves nothing — but a keyframe with a broken time or value
    // would throw whatever it addresses somewhere unreachable.
    if let animation = root["animation"], !animation.isNull {
        guard let timeline = animation.objectValue else {
            throw DocumentError.wrongType("animation", expected: "an object")
        }
        _ = try nonNegative(timeline, "duration", at: "animation")
        for (index, entry) in try array(timeline, "tracks", at: "animation").enumerated() {
            try validateTrack(entry, at: "animation.tracks[\(index)]")
        }
        if let cues = timeline["cues"], !cues.isNull {
            guard let entries = cues.arrayValue else {
                throw DocumentError.wrongType("animation.cues", expected: "an array")
            }
            for (index, entry) in entries.enumerated() {
                let path = "animation.cues[\(index)]"
                guard let cue = entry.objectValue else { throw DocumentError.wrongType(path, expected: "an object") }
                try nonEmpty(cue, "id", at: path)
                _ = try string(cue, "name", at: path)
                _ = try nonNegative(cue, "start", at: path)
                if let duration = cue["duration"], !duration.isNull {
                    guard let seconds = duration.numberValue, seconds.isFinite else {
                        throw DocumentError.notFinite("\(path).duration")
                    }
                    if seconds <= 0 { throw DocumentError.outOfRange("\(path).duration", "must be positive") }
                }
                _ = try bool(cue, "enabled", at: path)
                for (trackIndex, track) in try array(cue, "tracks", at: path).enumerated() {
                    try validateTrack(track, at: "\(path).tracks[\(trackIndex)]")
                }
            }
        }
    }

    guard let settings = root["cameraSettings"]?.objectValue else {
        throw DocumentError.missing("cameraSettings")
    }
    let shutter = try string(settings, "shutter", at: "cameraSettings")
    let cameraSettings = StudioDocument.CameraSettings(
        aperture: try positive(settings, "aperture", at: "cameraSettings"),
        iso: try positive(settings, "iso", at: "cameraSettings"),
        focalLength: try positive(settings, "focalLength", at: "cameraSettings"),
        shutter: try validShutter(shutter),
        // ND is a filter strength, and zero is a real answer.
        nd: try finite(settings, "nd", at: "cameraSettings")
    )

    var room: StudioDocument.Room?
    if let environment = root["environment"], !environment.isNull {
        guard let place = environment.objectValue else {
            throw DocumentError.wrongType("environment", expected: "an object")
        }
        _ = try array(place, "walls", at: "environment")
        _ = try array(place, "floors", at: "environment")
        if let value = place["room"], !value.isNull {
            guard let entry = value.objectValue else {
                throw DocumentError.wrongType("environment.room", expected: "an object")
            }
            let type = try string(entry, "type", at: "environment.room")
            guard let kind = StudioDocument.RoomKind(rawValue: type) else {
                throw DocumentError.unknownValue("environment.room.type", type)
            }
            room = StudioDocument.Room(
                kind: kind,
                furnishings: try bool(entry, "furnishings", at: "environment.room"),
                practicals: try bool(entry, "practicals", at: "environment.room"),
                // Whose place it is. Every brand field is optional, so a
                // half-written brand opens with a plain sign rather than none.
                brandName: entry["brand"]?["name"]?.stringValue
            )
        }
    }

    return StudioDocument(
        json: value,
        id: id, name: name, createdAt: createdAt, updatedAt: updatedAt,
        cameras: cameras, cameraSettings: cameraSettings, room: room
    )
}

/// Validate a document straight from a file.
public func parseStudioDocument(data: Data) throws -> StudioDocument {
    try parseStudioDocument(try JSONDecoder().decode(JSONValue.self, from: data))
}

// MARK: - Pieces

private func validateNode(_ value: JSONValue, at path: String) throws {
    guard let node = value.objectValue else { throw DocumentError.wrongType(path, expected: "an object") }
    _ = try string(node, "id", at: path)
    _ = try string(node, "name", at: path)
    _ = try string(node, "type", at: path)
    try validateTransform(node["transform"], at: path)
    _ = try bool(node, "visible", at: path)
    _ = try bool(node, "locked", at: path)
    if let userData = node["userData"], !userData.isNull, userData.objectValue == nil {
        throw DocumentError.wrongType("\(path).userData", expected: "an object")
    }
}

private func validateTransform(_ value: JSONValue?, at path: String) throws {
    guard let transform = value?.objectValue else { throw DocumentError.missing("\(path).transform") }
    for key in ["position", "rotation", "scale"] {
        _ = try triple(transform, key, at: "\(path).transform")
    }
}

private func validateTrack(_ value: JSONValue, at path: String) throws {
    guard let track = value.objectValue else { throw DocumentError.wrongType(path, expected: "an object") }
    try nonEmpty(track, "id", at: path)
    try nonEmpty(track, "nodeId", at: path)
    let type = try string(track, "type", at: path)
    guard StudioDocument.TrackChannel(rawValue: type) != nil else {
        throw DocumentError.unknownValue("\(path).type", type)
    }
    for (index, entry) in try array(track, "keyframes", at: path).enumerated() {
        let framePath = "\(path).keyframes[\(index)]"
        guard let frame = entry.objectValue else { throw DocumentError.wrongType(framePath, expected: "an object") }
        let time = try finite(frame, "time", at: framePath)
        if time < 0 { throw DocumentError.outOfRange("\(framePath).time", "may not be negative") }
        _ = try vector3(frame, "value", at: framePath)
    }
}

/// A shutter as the document writes it, refusing what cannot be a shutter.
///
/// The pattern accepts "125", "0.5" and "1/125". "1/0" passes the pattern and is
/// not a shutter speed, so the denominator is checked as well — the same second
/// check the TypeScript makes, for the same reason.
private func validShutter(_ value: String) throws -> String {
    let parts = value.split(separator: "/", omittingEmptySubsequences: false)
    guard parts.count <= 2 else { throw DocumentError.badShutter(value) }
    let numbers = parts.map { part -> Double? in
        guard !part.isEmpty, part.allSatisfy({ $0.isNumber || $0 == "." }) else { return nil }
        return Double(part)
    }
    guard numbers.allSatisfy({ $0 != nil }) else { throw DocumentError.badShutter(value) }
    let values = numbers.map { $0! }
    guard values.allSatisfy({ $0.isFinite }), values[0] > 0 else { throw DocumentError.badShutter(value) }
    if values.count == 2, !(values[1] > 0) { throw DocumentError.badShutter(value) }
    return value
}

// MARK: - Field readers

private func field(_ object: [String: JSONValue], _ key: String, at path: String?) throws -> JSONValue {
    let full = path.map { "\($0).\(key)" } ?? key
    guard let value = object[key] else { throw DocumentError.missing(full) }
    return value
}

private func string(_ object: [String: JSONValue], _ key: String, at path: String? = nil) throws -> String {
    let full = path.map { "\($0).\(key)" } ?? key
    guard let value = try field(object, key, at: path).stringValue else {
        throw DocumentError.wrongType(full, expected: "text")
    }
    return value
}

private func nonEmpty(_ object: [String: JSONValue], _ key: String, at path: String) throws {
    if try string(object, key, at: path).isEmpty { throw DocumentError.empty("\(path).\(key)") }
}

private func bool(_ object: [String: JSONValue], _ key: String, at path: String? = nil) throws -> Bool {
    let full = path.map { "\($0).\(key)" } ?? key
    guard let value = try field(object, key, at: path).boolValue else {
        throw DocumentError.wrongType(full, expected: "true or false")
    }
    return value
}

private func array(_ object: [String: JSONValue], _ key: String, at path: String? = nil) throws -> [JSONValue] {
    let full = path.map { "\($0).\(key)" } ?? key
    guard let value = try field(object, key, at: path).arrayValue else {
        throw DocumentError.wrongType(full, expected: "an array")
    }
    return value
}

private func finite(_ object: [String: JSONValue], _ key: String, at path: String? = nil) throws -> Double {
    let full = path.map { "\($0).\(key)" } ?? key
    guard let value = try field(object, key, at: path).numberValue else {
        throw DocumentError.wrongType(full, expected: "a number")
    }
    guard value.isFinite else { throw DocumentError.notFinite(full) }
    return value
}

private func positive(_ object: [String: JSONValue], _ key: String, at path: String? = nil) throws -> Double {
    let value = try finite(object, key, at: path)
    guard value > 0 else {
        throw DocumentError.outOfRange(path.map { "\($0).\(key)" } ?? key, "must be positive")
    }
    return value
}

private func nonNegative(_ object: [String: JSONValue], _ key: String, at path: String? = nil) throws -> Double {
    let value = try finite(object, key, at: path)
    guard value >= 0 else {
        throw DocumentError.outOfRange(path.map { "\($0).\(key)" } ?? key, "may not be negative")
    }
    return value
}

/// A field angle, which has to be a real cone: positive and under π.
private func belowPi(_ object: [String: JSONValue], _ key: String, at path: String) throws -> Double {
    let value = try positive(object, key, at: path)
    guard value < .pi else { throw DocumentError.outOfRange("\(path).\(key)", "must be below π") }
    return value
}

private func triple(_ object: [String: JSONValue], _ key: String, at path: String) throws -> [Double] {
    let entries = try array(object, key, at: path)
    guard entries.count == 3 else {
        throw DocumentError.outOfRange("\(path).\(key)", "must have three components")
    }
    return try entries.enumerated().map { index, entry in
        guard let value = entry.numberValue else {
            throw DocumentError.wrongType("\(path).\(key)[\(index)]", expected: "a number")
        }
        guard value.isFinite else { throw DocumentError.notFinite("\(path).\(key)[\(index)]") }
        return value
    }
}

private func vector3(_ object: [String: JSONValue], _ key: String, at path: String) throws -> StudioDocument.Vector3 {
    guard let entry = try field(object, key, at: path).objectValue else {
        throw DocumentError.wrongType("\(path).\(key)", expected: "an object")
    }
    return StudioDocument.Vector3(
        x: try finite(entry, "x", at: "\(path).\(key)"),
        y: try finite(entry, "y", at: "\(path).\(key)"),
        z: try finite(entry, "z", at: "\(path).\(key)")
    )
}
