import Foundation
import Testing
@testable import StudioContent

/// The content and the arithmetic around it, checked against the web studio.
///
/// The catalogue is not asserted value by value — it is the *same file* the
/// TypeScript wrote, so there is nothing to disagree about. What is asserted is
/// that it decodes completely, and that every function built on it lands in the
/// same place: 234 resolved fixture positions across twelve looks, three
/// subjects and three camera angles, and 48 built cues.
private let tolerance = 1e-12

private func expectClose(
    _ actual: Double,
    _ expected: Double,
    _ label: String,
    sourceLocation: SourceLocation = #_sourceLocation
) {
    let scale = max(abs(expected), 1)
    #expect(
        abs(actual - expected) <= tolerance * scale,
        "\(label): got \(actual), fixture says \(expected)",
        sourceLocation: sourceLocation
    )
}

private func expectClose(
    _ actual: Vec3Value,
    _ expected: Vec3Value,
    _ label: String,
    sourceLocation: SourceLocation = #_sourceLocation
) {
    expectClose(actual.x, expected.x, "\(label).x", sourceLocation: sourceLocation)
    expectClose(actual.y, expected.y, "\(label).y", sourceLocation: sourceLocation)
    expectClose(actual.z, expected.z, "\(label).z", sourceLocation: sourceLocation)
}

// MARK: - The fixture file

private struct Fixture: Decodable {
    struct Facing: Decodable {
        let location: String, mark: String
        let radians: Double, radiansAcrossAll: Double
    }
    struct Wardrobe: Decodable {
        let role: StudioRole
        let available: [String]
        let garment: String?
    }
    struct Placement: Decodable {
        struct Stand: Decodable { let x: Double, z: Double, eyeHeight: Double }
        struct Camera: Decodable { let x: Double, y: Double, z: Double }
        let look: String, fixture: String, subject: String, camera: String
        let placement: PolarPlacement
        let subjectStand: Stand
        let cameraAt: Camera
        let bounds: RoomBounds?
        let resolved: Vec3Value, aim: Vec3Value, clear: Vec3Value, walked: Vec3Value
        let illuminance: Double
    }
    struct Key: Decodable { let look: String, keyStops: Double, lux: Double }
    struct Cue: Decodable {
        let move: String, shot: String
        let camera: CameraPoseJSON?
        let intensity: Double?
        let cue: AnimationCue?
    }
    struct CameraPoseJSON: Decodable {
        let position: Vec3Value, target: Vec3Value
        var pose: CameraPose { CameraPose(position: position, target: target) }
    }
    struct Unknown: Decodable {
        let id: String
        let camera: AnimationCue?
        let light: AnimationCue?
    }

    let facing: [Facing]
    let wardrobe: [Wardrobe]
    let placement: [Placement]
    let keyIlluminance: [Key]
    let cues: [Cue]
    let unknownMoves: [Unknown]
}

private let fixture: Fixture = {
    guard let url = Bundle.module.url(forResource: "studioContent", withExtension: "json", subdirectory: "Fixtures") else {
        fatalError("studioContent.json is missing. Generate it with UPDATE_FIXTURES=1 npm test -- studioContent.fixtures")
    }
    // swiftlint:disable:next force_try
    return try! JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
}()

private let catalogue = StudioCatalogue.shipped

// MARK: - The catalogue itself

@Test("the shipped catalogue decodes completely")
func catalogueDecodes() throws {
    // Not "does it match" — it is the same file the TypeScript wrote. What can
    // still go wrong is a field this package forgot to declare, which would be
    // dropped in silence.
    #expect(catalogue.locations.count == 5)
    #expect(catalogue.looks.count == 12)
    #expect(catalogue.moves.count == 20)
    #expect(catalogue.cameraMoves.count == 12)
    #expect(catalogue.lightMoves.count == 8)
    #expect(catalogue.roleWardrobe.count == StudioRole.allCases.count)
    #expect(catalogue.defaultLocationId == "studio")
    #expect(catalogue.defaultLookId == "studio-portrett")

    // Every place is reachable by id and by room, and names a look that exists.
    #expect(catalogue.unknownLooks.isEmpty)
    for location in catalogue.locations {
        #expect(catalogue.location(id: location.id)?.label == location.label)
        #expect(catalogue.location(room: location.room) != nil, "\(location.room)")
        // A button that has to explain itself needs something to say.
        #expect(location.hint.count > 20, "\(location.id) has no explanation")
    }
    for look in catalogue.looks {
        #expect(!look.fixtures.isEmpty, "\(look.id) lights nothing")
        #expect(look.hint.count > 20, "\(look.id) has no explanation")
        for fixture in look.fixtures {
            // A fixture is placed by angle or it is a source in the room. Never
            // neither, or it would stand at the origin.
            let placed = fixture.placement != nil || fixture.position != nil || fixture.anchor != nil
            #expect(placed, "\(look.id) · \(fixture.name) has nowhere to stand")
            // Only a motivating source is placed by coordinate.
            if fixture.position != nil {
                #expect(fixture.motivating == true, "\(look.id) · \(fixture.name) is placed by coordinate but is not motivating")
            }
        }
    }
    for move in catalogue.moves {
        #expect(move.hint.count > 10, "\(move.id) has no explanation")
        #expect(["camera", "light"].contains(move.kind), "\(move.id)")
    }

    // Marks carry a role and an explanation, because a staffed room without them
    // is four identical people waiting for instructions.
    let marks = catalogue.locations.flatMap { $0.marks ?? [] }
    #expect(marks.count == 13)
    for mark in marks {
        #expect(mark.hint.count > 20, "\(mark.id) has no explanation")
        #expect(mark.role != nil, "\(mark.id) has no role")
    }
    // A seated mark says how high its seat is, or the studio would put a stool on
    // top of the chair the room already built.
    for mark in marks where mark.seated == true {
        #expect(mark.seatHeight != nil, "\(mark.id) sits on nothing")
    }
}

// MARK: - Facing

@Test("everybody in every place faces the same way as in the browser")
func facing() throws {
    let all = catalogue.locations.flatMap { $0.marks ?? [] }
    for row in fixture.facing {
        let location = try #require(catalogue.location(id: row.location))
        let marks = location.marks ?? []
        let mark = try #require(marks.first { $0.id == row.mark })
        expectClose(facingFor(mark, marks: marks), row.radians, "\(row.location) · \(row.mark)")
        expectClose(facingFor(mark, marks: all), row.radiansAcrossAll, "\(row.location) · \(row.mark) across all")
    }
}

@Test("two people at the same table face each other, not the compass")
func peopleFaceEachOther() throws {
    // The property behind the numbers: a mark with `facesMark` must turn towards
    // that mark, whatever its own `facingDeg` says.
    let pizzeria = try #require(catalogue.location(id: "pizzeria"))
    let marks = try #require(pizzeria.marks)
    let first = try #require(marks.first { $0.id == "bordet" })
    let second = try #require(marks.first { $0.id == "gjest2" })
    #expect(first.facesMark == "gjest2")
    #expect(second.facesMark == "bordet")

    // Facing each other means their bearings differ by about half a turn, less
    // the few degrees of offset that is the difference between talking and
    // confronting.
    let between = abs(facingFor(first, marks: marks) - facingFor(second, marks: marks))
    #expect(abs(between - .pi) < 0.25, "they are \(between) rad apart")
}

// MARK: - Wardrobe

@Test("every role dresses from the same wardrobe, including an empty one")
func wardrobe() {
    for row in fixture.wardrobe {
        let garment = garmentForRole(row.role, available: row.available, wardrobe: catalogue.roleWardrobe)
        #expect(garment == row.garment, "\(row.role.rawValue) out of \(row.available)")
    }
}

// MARK: - Placement

@Test("every fixture in every look lands in the same place")
func placement() {
    #expect(fixture.placement.count == 234)
    for row in fixture.placement {
        let label = "\(row.look) · \(row.fixture) · \(row.subject) · \(row.camera)"
        let subject = SubjectStand(x: row.subjectStand.x, z: row.subjectStand.z, eyeHeight: row.subjectStand.eyeHeight)
        let resolved = resolvePlacement(row.placement, subject: subject, camera: (x: row.cameraAt.x, z: row.cameraAt.z))
        expectClose(resolved.position, row.resolved, "\(label) resolved")
        expectClose(resolved.aim, row.aim, "\(label) aim")

        let cameraAt = Vec3Value(x: row.cameraAt.x, y: row.cameraAt.y, z: row.cameraAt.z)
        let clear = clearOfCamera(position: resolved.position, aim: resolved.aim, camera: cameraAt)
        expectClose(clear, row.clear, "\(label) clear of the lens")

        let walked = row.bounds.map { insideRoom(position: clear, aim: resolved.aim, bounds: $0) } ?? clear
        expectClose(walked, row.walked, "\(label) inside the room")
    }
}

@Test("no working light ever ends up in front of the lens")
func nothingInTheShot() throws {
    // The rule the angles exist to guarantee, asserted rather than trusted.
    for row in fixture.placement {
        let aim = row.aim
        let cameraAt = Vec3Value(x: row.cameraAt.x, y: row.cameraAt.y, z: row.cameraAt.z)
        let toLight = (x: row.clear.x - aim.x, z: row.clear.z - aim.z)
        let toCamera = (x: cameraAt.x - aim.x, z: cameraAt.z - aim.z)
        let lightAngle = atan2(toLight.z, toLight.x)
        let cameraAngle = atan2(toCamera.z, toCamera.x)
        var difference = lightAngle - cameraAngle
        while difference > .pi { difference -= 2 * .pi }
        while difference < -.pi { difference += 2 * .pi }
        #expect(abs(difference) >= 25 * .pi / 180 - 1e-9,
                "\(row.look) · \(row.fixture) is \(abs(difference) * 180 / .pi)° off the lens axis")
    }
}

@Test("a look's key reads the same, and its ratios hold")
func illuminance() throws {
    for row in fixture.keyIlluminance {
        let look = try #require(catalogue.look(id: row.look))
        expectClose(lookKeyIlluminance(look, studioKey: catalogue.studioKeyIlluminance), row.lux, row.look)
    }
    for row in fixture.placement {
        let look = try #require(catalogue.look(id: row.look))
        let fixtureEntry = try #require(look.fixtures.first { $0.name == row.fixture })
        expectClose(
            fixtureIlluminance(look, fixture: fixtureEntry, studioKey: catalogue.studioKeyIlluminance),
            row.illuminance,
            "\(row.look) · \(row.fixture)"
        )
    }
}

@Test("a look is stated in stops, so doubling the studio key changes no ratio")
func ratiosSurviveRecalibration() throws {
    // The reason a look is written in stops rather than scene units. If this ever
    // fails, the native renderer's own calibration constant would silently
    // change every lighting ratio in the product.
    let look = try #require(catalogue.look(id: "studio-portrett"))
    for key in [catalogue.studioKeyIlluminance, catalogue.studioKeyIlluminance * 2, 1.0] {
        let levels = look.fixtures.map { fixtureIlluminance(look, fixture: $0, studioKey: key) }
        let ratios = levels.map { $0 / levels[0] }
        let reference = look.fixtures.map { pow(2, -$0.stops) / pow(2, -look.fixtures[0].stops) }
        for (actual, expected) in zip(ratios, reference) {
            expectClose(actual, expected, "ratio at key \(key)")
        }
    }
}

// MARK: - Moves

@Test("every named move builds the same cue")
func cues() throws {
    #expect(fixture.cues.count == 48)
    for row in fixture.cues {
        let request = MoveRequest(start: 1.5, duration: 4, id: "cue-\(row.move)")
        let built: AnimationCue?
        if let camera = row.camera {
            built = buildCameraMove(row.move, request: request, camera: camera.pose, cameraNodeId: "takingCamera")
        } else {
            built = buildLightMove(
                row.move, request: request, lightNodeId: "light_key",
                intensity: try #require(row.intensity),
                color: Vec3Value(x: 1, y: 0.95, z: 0.9)
            )
        }
        let expected = try #require(row.cue, "\(row.move) built nothing in the browser")
        let actual = try #require(built, "\(row.move) · \(row.shot) built nothing here")

        let label = "\(row.move) · \(row.shot)"
        #expect(actual.id == expected.id, "\(label) id")
        #expect(actual.name == expected.name, "\(label) name")
        expectClose(actual.start, expected.start, "\(label) start")
        #expect(actual.enabled == expected.enabled, "\(label) enabled")
        #expect(actual.tracks.count == expected.tracks.count, "\(label) track count")
        for (track, expectedTrack) in zip(actual.tracks, expected.tracks) {
            #expect(track.id == expectedTrack.id, "\(label) track id")
            #expect(track.nodeId == expectedTrack.nodeId, "\(label) node")
            #expect(track.type == expectedTrack.type, "\(label) channel")
            #expect(track.keyframes.count == expectedTrack.keyframes.count, "\(label) keyframe count")
            for (index, pair) in zip(track.keyframes, expectedTrack.keyframes).enumerated() {
                expectClose(pair.0.time, pair.1.time, "\(label) frame \(index) time")
                expectClose(pair.0.value, pair.1.value, "\(label) frame \(index) value")
            }
        }
    }
}

@Test("an unknown move is refused rather than answered with an empty cue")
func unknownMoves() {
    for row in fixture.unknownMoves {
        #expect(row.camera == nil, "the browser built something for \(row.id)")
        #expect(buildCameraMove(row.id, request: MoveRequest(start: 0, duration: 1, id: "cue-x"),
                                camera: CameraPose(position: Vec3Value(x: 0, y: 1.5, z: -3),
                                                   target: Vec3Value(x: 0, y: 1.5, z: 0)),
                                cameraNodeId: "takingCamera") == nil, "\(row.id) as a camera move")
        #expect(buildLightMove(row.id, request: MoveRequest(start: 0, duration: 1, id: "cue-x"),
                               lightNodeId: "light_key", intensity: 0.8,
                               color: Vec3Value(x: 1, y: 1, z: 1)) == nil, "\(row.id) as a light move")
    }
}

@Test("a dolly reads the same on a portrait and across a room")
func travelIsRelative() throws {
    // The property: travel is a share of the shot distance, so one button suits a
    // tight portrait and a hangar. A fixed distance in metres would shove the
    // camera through the subject in the first case and barely move in the second.
    func dollyDistance(from position: Vec3Value, to target: Vec3Value) throws -> Double {
        let cue = try #require(buildCameraMove(
            "dolly-in",
            request: MoveRequest(start: 0, duration: 4, id: "cue-dolly"),
            camera: CameraPose(position: position, target: target),
            cameraNodeId: "takingCamera"
        ))
        let frames = try #require(cue.tracks.first).keyframes
        let start = frames[0].value, end = frames[1].value
        return ((end.x - start.x) * (end.x - start.x)
                + (end.y - start.y) * (end.y - start.y)
                + (end.z - start.z) * (end.z - start.z)).squareRoot()
    }

    let tight = try dollyDistance(from: Vec3Value(x: 0, y: 1.5, z: -2.4), to: Vec3Value(x: 0, y: 1.5, z: 0))
    let wide = try dollyDistance(from: Vec3Value(x: 0, y: 1.5, z: -24), to: Vec3Value(x: 0, y: 1.5, z: 0))
    expectClose(wide / tight, 10, "ten times the distance, ten times the travel")
    // And it stops short of the subject rather than arriving on top of it.
    #expect(tight < 2.4)
}

@Test("nothing in the catalogue is dropped on the way in")
func nothingIsDropped() throws {
    // `Codable` decodes the keys it declares and forgets the rest, so a field
    // this package forgot to model would vanish without a word — a mark's
    // `seatHeight`, say, and the figure would sit on air. Re-encode what was
    // decoded and compare it against the file key by key.
    let original = try JSONSerialization.jsonObject(with: StudioCatalogue.shippedJSON)
    let reencoded = try JSONSerialization.jsonObject(with: try JSONEncoder().encode(catalogue))

    var missing: [String] = []
    compareKeys(original, reencoded, path: "", missing: &missing)
    #expect(missing.isEmpty, "dropped on decode: \(missing.joined(separator: ", "))")
}

/// Every key the file has, the model has too. Extra keys in the model are fine;
/// `note` is documentation for a reader of the file, not content.
private func compareKeys(_ original: Any, _ reencoded: Any, path: String, missing: inout [String]) {
    if let originalObject = original as? [String: Any] {
        guard let reencodedObject = reencoded as? [String: Any] else {
            missing.append("\(path) is not an object any more")
            return
        }
        for (key, value) in originalObject where key != "note" {
            guard let match = reencodedObject[key] else {
                missing.append(path.isEmpty ? key : "\(path).\(key)")
                continue
            }
            compareKeys(value, match, path: path.isEmpty ? key : "\(path).\(key)", missing: &missing)
        }
    } else if let originalArray = original as? [Any] {
        guard let reencodedArray = reencoded as? [Any], reencodedArray.count == originalArray.count else {
            missing.append("\(path) changed length")
            return
        }
        for (index, value) in originalArray.enumerated() {
            compareKeys(value, reencodedArray[index], path: "\(path)[\(index)]", missing: &missing)
        }
    }
}
