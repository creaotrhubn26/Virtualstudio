import Foundation
import SceneDocument

/// Shots, and what to tell the people in them.
///
/// A port of `src/services/storyboard.ts`. Everything else in the studio makes a
/// picture. This makes the thing you hand to somebody: a numbered shot with one
/// sentence per person, in words they can act on without the director standing
/// next to them.
///
/// The distinction that matters is between a *scene* and a *shot*. The document
/// holds one scene — a place, a rig, a crew standing on marks. A commercial is six
/// shots of that scene, each with its own frame, its own length and its own
/// instruction to each person. A mark says where somebody stands; a direction says
/// what they do there, and without it a mark is an X on the floor.
///
/// Nothing here renders or touches the scene: it is the sheet, not the set. That
/// is also why it is the first thing a device edition can be useful for — the
/// board is what you turn the screen around and show an extra.

public struct ShotDirection: Equatable, Sendable, Codable {
    /// The mark the person is standing on.
    public let markId: String
    /// Who they are, as the shot calls them: "Servitør", "Gjest ved bordet".
    public let who: String
    /// What they do, in one sentence, addressed to them.
    ///
    /// "Du setter fra deg pizzaen og ser opp på gjesten." Second person, present
    /// tense, one action — the way a direction is actually given on a floor.
    public let action: String

    public init(markId: String, who: String, action: String) {
        self.markId = markId
        self.who = who
        self.action = action
    }
}

public struct ShotCamera: Equatable, Sendable, Codable {
    public let position: Vector3
    public let target: Vector3
    public let focalLength: Double
    public let aperture: Double

    public struct Vector3: Equatable, Sendable, Codable {
        public let x: Double
        public let y: Double
        public let z: Double
        public init(x: Double, y: Double, z: Double) { self.x = x; self.y = y; self.z = z }
    }

    public init(position: Vector3, target: Vector3, focalLength: Double, aperture: Double) {
        self.position = position
        self.target = target
        self.focalLength = focalLength
        self.aperture = aperture
    }
}

public struct StudioShot: Equatable, Sendable, Codable {
    public let id: String
    /// What people call it on the day. Renumbered by `numberShots`.
    public var number: Int
    /// A short name: "Nært på hendene ved ovnen".
    public let name: String
    /// Where it is and how it is lit, by the ids the studio already uses.
    public let locationId: String
    public let lookId: String
    public let camera: ShotCamera
    /// The named camera move, if the shot moves at all.
    public let move: String?
    /// Who does what. One line each.
    public let directions: [ShotDirection]
    /// A note for the crew rather than the cast.
    public let note: String?
    /// Seconds on screen.
    public let duration: Double
    /// A still from the taking camera, as a data URL.
    ///
    /// This is the visual idea — the reason an extra understands in two seconds
    /// what a paragraph would not convey. Held apart from the rest so a board can
    /// be edited, saved and reordered without carrying megabytes around.
    public let frame: String?
}

public struct Storyboard: Equatable, Sendable, Codable {
    public let title: String
    /// Who it is for, printed on the sheet.
    public let forWhom: String?
    public let shots: [StudioShot]

    public init(title: String, forWhom: String? = nil, shots: [StudioShot]) {
        self.title = title
        self.forWhom = forWhom
        self.shots = shots
    }

    public static let empty = Storyboard(title: "Uten navn", shots: [])
}

/// Shots numbered 1, 2, 3 in the order they are in, without disturbing the input.
public func numberShots(_ shots: [StudioShot]) -> [StudioShot] {
    shots.enumerated().map { index, shot in
        var renumbered = shot
        renumbered.number = index + 1
        return renumbered
    }
}

/// How long the whole board runs, in seconds.
public func boardDuration(_ shots: [StudioShot]) -> Double {
    shots.reduce(0) { $0 + max(0, $1.duration) }
}

/// Seconds as a shooting clock: 1:05, not 65.
public func asClock(_ seconds: Double) -> String {
    let whole = Int(max(0, seconds.rounded()))
    return "\(whole / 60):\(String(format: "%02d", whole % 60))"
}

/// The lens this shot is on.
public func shotFocalLength(_ shot: StudioShot) -> Double {
    shot.camera.focalLength
}

/// The line the crew reads: lens, aperture, move and length.
///
/// Deliberately not the same line the cast reads. A camera assistant needs
/// millimetres; an extra needs a sentence about what to do with their hands.
public func shotSummary(_ shot: StudioShot) -> String {
    var parts = [
        "\(Int(shotFocalLength(shot).rounded())) mm",
        "f/\(trimmedNumber(shot.camera.aperture))",
    ]
    if let move = shot.move { parts.append(move) }
    // One decimal, with a comma, because the interface is Norwegian — and rounded
    // and formatted without asking the device what language it is in, so a saved
    // sheet says the same thing wherever it is opened.
    parts.append("\(toFixed(shot.duration, 1).replacingOccurrences(of: ".", with: ",")) s")
    return parts.joined(separator: " · ")
}

/// A number the way JavaScript prints one: 2.8 stays 2.8, 4 stays 4 — not "4.0".
private func trimmedNumber(_ value: Double) -> String {
    if value == value.rounded(), abs(value) < 1e15 { return String(Int(value)) }
    // Swift's own description is the shortest string that round-trips, which is
    // what JavaScript prints too.
    return "\(value)"
}

/// `Number.prototype.toFixed`, which is not what `printf` does.
///
/// JavaScript takes the nearest representation and, on an exact tie, the larger
/// one. C's `printf` rounds a tie to even. So a 6.25-second shot comes out "6,3"
/// in the browser and "6,2" through `String(format:)` — the same shot, two
/// different sheets, and nobody would ever look for the cause there.
///
/// Found by the fixture, which is what it is for.
func toFixed(_ value: Double, _ digits: Int) -> String {
    guard value.isFinite else { return "\(value)" }
    let negative = value < 0
    // Far enough past the cut to see the exact decimal expansion of any tie: a
    // value that lands exactly halfway is a dyadic rational and terminates.
    let exact = String(format: "%.\(digits + 20)f", abs(value))
    let parts = exact.split(separator: ".", maxSplits: 1)
    var kept = Array(parts[0]) + Array(parts.count > 1 ? parts[1].prefix(digits) : "")
    let dropped = parts.count > 1 ? Array(parts[1].dropFirst(digits)) : []

    // Nearest, ties up: the first dropped digit decides the whole remainder.
    if let first = dropped.first, first >= "5" {
        var index = kept.count - 1
        while index >= 0 {
            if kept[index] == "9" {
                kept[index] = "0"
                index -= 1
            } else {
                kept[index] = Character(String(kept[index].wholeNumberValue! + 1))
                break
            }
        }
        if index < 0 { kept.insert("1", at: 0) }
    }

    let wholeCount = kept.count - digits
    let whole = String(kept[0..<wholeCount])
    let fraction = digits > 0 ? "." + String(kept[wholeCount...]) : ""
    return (negative ? "-" : "") + whole + fraction
}

/// Everything one person is asked to do, across the whole board.
///
/// This is the sheet you actually hand to an extra: their shots, in order, with
/// their own line in each. Nobody should have to read six shots to find the two
/// they are in.
public struct CallSheetLine: Equatable, Sendable {
    public let number: Int
    public let name: String
    public let who: String
    public let action: String
}

public func callSheetFor(_ shots: [StudioShot], markId: String) -> [CallSheetLine] {
    shots.compactMap { shot in
        guard let direction = shot.directions.first(where: { $0.markId == markId }) else { return nil }
        return CallSheetLine(number: shot.number, name: shot.name, who: direction.who, action: direction.action)
    }
}

/// Every person the board asks for, in the order they first appear.
public func peopleOnBoard(_ shots: [StudioShot]) -> [(markId: String, who: String)] {
    var order: [String] = []
    var names: [String: String] = [:]
    for shot in shots {
        for direction in shot.directions where names[direction.markId] == nil {
            names[direction.markId] = direction.who
            order.append(direction.markId)
        }
    }
    return order.map { (markId: $0, who: names[$0]!) }
}

/// Marks with somebody standing on them and nothing to do.
///
/// This is the failure the whole feature exists to prevent: a person on set, in
/// costume, in frame, who was never told what the shot needs from them. It is
/// reported per shot rather than summed, because "somebody is undirected" is
/// useless without knowing in which shot.
public func undirected(_ shot: StudioShot, occupiedMarks: [String]) -> [String] {
    let directed = Set(shot.directions.map(\.markId))
    return occupiedMarks.filter { !directed.contains($0) }
}

/// A direction worth giving: addressed to somebody, and about something.
public func isUsableDirection(_ action: String) -> Bool {
    let trimmed = action.trimmingCharacters(in: .whitespacesAndNewlines)
    // Two words is not an instruction; it is a label. The length is counted the
    // way the web edition counts it, in UTF-16 units, so the two agree on a
    // sentence with an emoji in it.
    return trimmed.utf16.count >= 8 && trimmed.split(whereSeparator: \.isWhitespace).count >= 2
}

// MARK: - Reading a board back

/// Text, trimmed, with a fallback and a limit.
///
/// The limit is counted and cut in UTF-16 units, because `String.prototype.slice`
/// is, and a board is a document both editions write. Cutting at a different unit
/// would make the same long sentence come out differently on the two.
private func text(_ value: JSONValue?, fallback: String, limit: Int = 240) -> String {
    let candidate = (value?.stringValue ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !candidate.isEmpty else { return fallback }
    return sliced(candidate, limit)
}

private func sliced(_ value: String, _ limit: Int) -> String {
    let units = Array(value.utf16)
    guard units.count > limit else { return value }
    return String(decoding: units[0..<limit], as: UTF16.self)
}

private func vec(_ raw: JSONValue?, fallback: ShotCamera.Vector3) -> ShotCamera.Vector3 {
    let object = raw?.objectValue ?? [:]
    func read(_ key: String, _ backup: Double) -> Double {
        guard let value = object[key]?.numberValue, value.isFinite else { return backup }
        return value
    }
    return ShotCamera.Vector3(
        x: read("x", fallback.x),
        y: read("y", fallback.y),
        z: read("z", fallback.z)
    )
}

private func parseShot(_ raw: JSONValue, index: Int) -> StudioShot? {
    guard let value = raw.objectValue else { return nil }
    let camera = value["camera"]?.objectValue ?? [:]

    var directions: [ShotDirection] = []
    for entry in value["directions"]?.arrayValue ?? [] {
        guard let direction = entry.objectValue else { continue }
        let markId = (direction["markId"]?.stringValue ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        // A direction addressed to nobody cannot be handed to anybody.
        if markId.isEmpty { continue }
        directions.append(ShotDirection(
            markId: markId,
            who: text(direction["who"], fallback: markId, limit: 60),
            action: text(direction["action"], fallback: "", limit: 240)
        ))
    }

    let duration: Double
    if let seconds = value["duration"]?.numberValue, seconds.isFinite, seconds > 0 {
        duration = min(seconds, 600)
    } else {
        duration = 4
    }

    let move = value["move"]?.stringValue
    let note = value["note"]?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines)
    let frame = value["frame"]?.stringValue

    return StudioShot(
        id: (value["id"]?.stringValue).flatMap { $0.isEmpty ? nil : $0 } ?? "shot-\(index + 1)",
        number: index + 1,
        name: text(value["name"], fallback: "Opptak \(index + 1)", limit: 120),
        locationId: text(value["locationId"], fallback: "studio", limit: 60),
        lookId: text(value["lookId"], fallback: "studio-portrett", limit: 60),
        camera: ShotCamera(
            position: vec(camera["position"], fallback: ShotCamera.Vector3(x: 0, y: 1.5, z: -3)),
            target: vec(camera["target"], fallback: ShotCamera.Vector3(x: 0, y: 1.4, z: 0)),
            focalLength: (camera["focalLength"]?.numberValue).flatMap { $0 > 0 ? $0 : nil } ?? 50,
            aperture: (camera["aperture"]?.numberValue).flatMap { $0 > 0 ? $0 : nil } ?? 2.8
        ),
        move: (move?.isEmpty ?? true) ? nil : move,
        directions: directions,
        note: (note?.isEmpty ?? true) ? nil : sliced(note!, 240),
        duration: duration,
        frame: (frame?.hasPrefix("data:image") ?? false) ? frame : nil
    )
}

/// Read a board back, keeping whatever is usable.
///
/// A board is a working document that people edit by hand and machines write
/// badly. A shot that cannot be read is dropped rather than half-restored, and
/// everything else is renumbered so the sheet is still 1, 2, 3.
public func parseStoryboard(_ raw: JSONValue) -> Storyboard {
    guard let value = raw.objectValue else { return Storyboard(title: Storyboard.empty.title, shots: []) }

    var shots: [StudioShot] = []
    for entry in value["shots"]?.arrayValue ?? [] {
        if let shot = parseShot(entry, index: shots.count) { shots.append(shot) }
    }

    let forWhom = value["forWhom"]?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines)
    return Storyboard(
        title: text(value["title"], fallback: Storyboard.empty.title, limit: 120),
        forWhom: (forWhom?.isEmpty ?? true) ? nil : sliced(forWhom!, 120),
        shots: numberShots(shots)
    )
}
