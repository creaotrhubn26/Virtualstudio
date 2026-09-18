import Foundation

/// The places, the looks and the moves — as data, not as transcribed code.
///
/// `lightingLooks.ts`, `studioLocations.ts` and `movePresets.ts` are mostly
/// tables: twelve looks, five places with their marks, twenty named moves. Those
/// tables are the content of the product, and hand-copying them into Swift would
/// buy nothing and risk a mistyped azimuth that no test would notice, because the
/// test would be written from the same typo.
///
/// So the tables stay in TypeScript and are exported into `content.json`, which
/// this package carries as a resource and decodes. One source of truth: add a
/// look on the web, regenerate, and the same look is on the iPad — labels, hints,
/// stops and all. "Kjøkken · morgen" means the same thing on both platforms
/// rather than the iPad inventing separate content.
///
/// The arithmetic around the tables — where a fixture stands, which way a person
/// faces, what a move does — is ported as code, and checked against the
/// TypeScript through golden fixtures like every other module here.

public struct Vec3Value: Equatable, Sendable, Codable {
    public var x: Double
    public var y: Double
    public var z: Double
    public init(x: Double, y: Double, z: Double) { self.x = x; self.y = y; self.z = z }
}

// MARK: - Places

/// What the person at a mark is doing there.
public enum StudioRole: String, Sendable, Codable, CaseIterable {
    /// Kitchen, oven, workshop.
    case arbeid
    /// Front of house.
    case vert
    /// Somebody who came to eat.
    case gjest
    /// Clinical.
    case fag
}

/// A place a person naturally stands in this room.
///
/// Dragging a figure around with a keyboard and hoping is not how anybody decides
/// where someone should stand: in a kitchen you stand at the counter, at the
/// table, or by the window, and that is the whole list. A mark is that list,
/// written by the room that built the counter — and on a touchscreen it is not a
/// convenience but the entire placement interface, because nobody drags a figure
/// to x: 2.4, z: −1.8 with a finger.
public struct StudioMark: Equatable, Sendable, Codable {
    public let id: String
    /// Where to stand, as someone would say it.
    public let label: String
    /// Plain explanation of what the shot is from there.
    public let hint: String
    public let x: Double
    public let z: Double
    /// Which way the person faces, in degrees. Zero faces the camera's usual
    /// place at negative z, turning the way a compass does.
    public let facingDeg: Double
    /// Another mark to turn towards, instead of a compass bearing.
    ///
    /// People in a room are not oriented to north; they are oriented to each
    /// other. A waiter faces the table they are serving, two guests face each
    /// other. Without this a staffed room is a set of individuals who happen to
    /// be standing near one another, which is exactly how it looked.
    public let facesMark: String?
    /// How far the head and shoulders turn from the body, in degrees. A few
    /// degrees of offset is the difference between talking and confronting.
    public let turnDeg: Double?
    /// Sitting there rather than standing, for a chair or a bed.
    public let seated: Bool?
    /// How high the seat at this mark is, in metres. A restaurant already has
    /// chairs at their own height; putting a stool on top of one is not sitting
    /// down.
    public let seatHeight: Double?
    public let role: StudioRole?
}

public struct RoomBounds: Equatable, Sendable, Codable {
    public let halfWidth: Double
    public let halfDepth: Double
    public let height: Double
    public init(halfWidth: Double, halfDepth: Double, height: Double) {
        self.halfWidth = halfWidth
        self.halfDepth = halfDepth
        self.height = height
    }
}

public struct StudioLocation: Equatable, Sendable, Codable {
    public let id: String
    /// The place, as someone would ask for it.
    public let label: String
    /// Plain explanation, for a button that has to explain itself.
    public let hint: String
    /// Which room the studio builds.
    public let room: String
    public let furnishings: Bool
    public let practicals: Bool
    /// The look it is lit with on arrival.
    public let look: String
    /// The room's inside, in metres from the origin, or absent for open ground.
    ///
    /// A look is written for a studio with room to back a light into. In a 5.4 m
    /// kitchen the same key stands through the wall, so a place that has walls
    /// says where they are and the rig is walked in until it is inside them.
    public let bounds: RoomBounds?
    /// Where a person stands in this room, if it has anywhere in particular.
    public let marks: [StudioMark]?
}

// MARK: - Looks

/// Where a fixture stands, said the way lighting is actually written down.
///
/// A position in metres is a coordinate, not a lighting instruction: it belongs
/// to one room, one subject height and one camera angle, and has to be corrected
/// the moment any of those change. An angle survives all three.
public struct PolarPlacement: Equatable, Sendable, Codable {
    /// Degrees around the subject from the camera axis. Positive is camera left
    /// as the camera sees it; 0 is dead front, 180 is directly behind.
    public let azimuthDeg: Double
    /// Degrees above the subject's eye line. Negative is from below.
    public let elevationDeg: Double
    /// Metres from the subject.
    public let distance: Double
    public init(azimuthDeg: Double, elevationDeg: Double, distance: Double) {
        self.azimuthDeg = azimuthDeg
        self.elevationDeg = elevationDeg
        self.distance = distance
    }
}

public struct LookFixture: Equatable, Sendable, Codable {
    /// Catalogue id.
    public let fixture: String
    /// What this light is on set, in the words used on set.
    public let name: String
    /// Where it stands, as an angle from the camera. Working lights only.
    public let placement: PolarPlacement?
    /// Where it stands in metres, for a source that is a thing in the room.
    public let position: Vec3Value?
    /// What it points at. Only for a fixture placed by position.
    public let aim: Vec3Value?
    /// The lamp in the room this fixture is: `pendant`, `window`, `oven`,
    /// `ceiling`, `candle`. When the room has built one by that name, that is
    /// where this light goes.
    public let anchor: String?
    /// Level below the look's key, in stops. The key itself is 0.
    public let stops: Double
    /// Colour temperature it is gelled or set to, kelvin.
    public let cct: Double
    /// Cone angle, degrees. Ignored by fixtures that are not spots.
    public let beamDeg: Double?
    /// Spot falloff exponent; higher is a tighter hotspot.
    public let exponent: Double?
    public let bias: Double?
    public let normalBias: Double?
    /// A source that is meant to be seen — a lamp, a window, a candle.
    ///
    /// It stays exactly where it is put. A working light may be walked in or out
    /// to make its level; a table candle cannot be moved two metres closer
    /// because the level asks for it, so `stops` is a ceiling for these rather
    /// than a reading to hit, and it burns at whatever it can give from there.
    public let motivating: Bool?
}

public struct LightingLook: Equatable, Sendable, Codable {
    public let id: String
    /// The place or situation, as someone would ask for it.
    public let label: String
    /// Plain explanation for anyone who does not know the term.
    public let hint: String
    public let group: String
    /// The look's key reading, in stops from the studio portrait key.
    public let keyStops: Double
    public let fixtures: [LookFixture]
}

// MARK: - Moves

public struct MoveDescription: Equatable, Sendable, Codable {
    public let id: String
    /// What the button says.
    public let label: String
    /// What it looks like, for someone who does not know the word.
    public let hint: String
    /// `camera` or `light`.
    public let kind: String
}

// MARK: - The catalogue

public struct StudioCatalogue: Sendable, Codable {
    public let source: String
    public let defaultLocationId: String
    public let defaultLookId: String
    /// The studio portrait key, in scene illuminance units. Every look is
    /// described as so many stops from this.
    public let studioKeyIlluminance: Double
    public let locations: [StudioLocation]
    public let looks: [LightingLook]
    public let moves: [MoveDescription]
    /// What a role wears, chosen from whatever the body's wardrobe actually has.
    ///
    /// The keywords match garment ids rather than naming files, so a body with a
    /// different set of clothes still dresses as close to the role as it can
    /// instead of arriving undressed.
    public let roleWardrobe: [String: [String]]
}

public extension StudioCatalogue {
    /// The catalogue file this package ships, exactly as the TypeScript wrote it.
    ///
    /// Exposed because a test in another target cannot reach this one's resource
    /// bundle, and the check that matters is that nothing in the file is dropped
    /// on the way into the model.
    static let shippedJSON: Data = {
        guard let url = Bundle.module.url(forResource: "content", withExtension: "json", subdirectory: "Resources") else {
            fatalError("content.json is missing. Generate it with UPDATE_FIXTURES=1 npm test -- studioContent.fixtures")
        }
        do {
            return try Data(contentsOf: url)
        } catch {
            fatalError("content.json could not be read: \(error)")
        }
    }()

    /// The catalogue this package ships, generated from the TypeScript tables.
    static let shipped: StudioCatalogue = {
        do {
            return try JSONDecoder().decode(StudioCatalogue.self, from: shippedJSON)
        } catch {
            fatalError("content.json could not be decoded: \(error)")
        }
    }()

    func location(id: String) -> StudioLocation? { locations.first { $0.id == id } }
    func look(id: String) -> LightingLook? { looks.first { $0.id == id } }
    func move(id: String) -> MoveDescription? { moves.first { $0.id == id } }

    /// The location whose room this state is showing, if any names it.
    func location(room: String) -> StudioLocation? { locations.first { $0.room == room } }

    var cameraMoves: [MoveDescription] { moves.filter { $0.kind == "camera" } }
    var lightMoves: [MoveDescription] { moves.filter { $0.kind == "light" } }

    /// A location asking for a look that does not exist would arrive unlit.
    var unknownLooks: [String] {
        locations.filter { look(id: $0.look) == nil }.map(\.look)
    }
}
