import Foundation
import Testing
import SceneDocument
@testable import Storyboard

/// The board, checked against the web studio.
///
/// A board is a working document: people edit it by hand, machines write it badly,
/// and both editions read and write the same one. So the parser is what has to
/// agree exactly — what it keeps, what it fills in, what it drops — and the fixture
/// feeds it the sort of nonsense a real file contains, including text past every
/// limit and emoji that are two UTF-16 units each.
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

// MARK: - The fixture file

private struct Fixture: Decodable {
    struct BoardCase: Decodable { let input: JSONValue; let parsed: JSONValue }
    struct Rounding: Decodable { let value: Double; let digits: Int; let fixed: String }
    struct Clock: Decodable { let seconds: Double; let clock: String }
    struct Duration: Decodable { let seconds: Double; let clock: String }
    struct Summary: Decodable { let id: String; let focalLength: Double; let summary: String }
    struct Line: Decodable { let number: Int; let name: String; let who: String; let action: String }
    struct CallSheet: Decodable { let markId: String; let lines: [Line] }
    struct Person: Decodable { let markId: String; let who: String }
    struct Undirected: Decodable { let id: String; let marks: [String] }
    struct Usable: Decodable { let action: String; let usable: Bool }
    struct Broken: Decodable { let name: String; let raw: JSONValue; let parsed: JSONValue }
    struct Renumbered: Decodable { let before: [Int]; let after: [Int] }

    let empty: JSONValue
    let board: BoardCase
    let rounding: [Rounding]
    let clock: [Clock]
    let duration: Duration
    let summaries: [Summary]
    let callSheets: [CallSheet]
    let people: [Person]
    let undirected: [Undirected]
    let usable: [Usable]
    let broken: [Broken]
    let renumbered: Renumbered
}

private let fixture: Fixture = {
    guard let url = Bundle.module.url(forResource: "storyboard", withExtension: "json", subdirectory: "Fixtures") else {
        fatalError("storyboard.json is missing. Generate it with UPDATE_FIXTURES=1 npm test -- storyboard.fixtures")
    }
    // swiftlint:disable:next force_try
    return try! JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
}()

/// A board as JSON, so a parse can be compared against the browser's own output
/// field by field rather than through a hand-written list of expectations.
private func asJSON(_ board: Storyboard) throws -> JSONValue {
    let encoder = JSONEncoder()
    return try JSONDecoder().decode(JSONValue.self, from: try encoder.encode(board))
}

private let parsedBoard = parseStoryboard(fixture.board.input)

// MARK: - Reading a board

@Test("a real board parses to exactly what the browser parses it to")
func boardMatches() throws {
    #expect(try asJSON(parsedBoard) == fixture.board.parsed)
}

@Test("every badly written board is read back the same way")
func brokenBoards() throws {
    // Thirteen ways a file arrives wrong: shots that are not objects, a camera
    // with a string for a coordinate, a direction addressed to nobody, a duration
    // of zero, a frame that is a link rather than an image, text past every limit,
    // and titles that are only whitespace.
    for entry in fixture.broken {
        let parsed = parseStoryboard(entry.raw)
        let actual = try asJSON(parsed)
        if actual != entry.parsed {
            Issue.record("\(entry.name):\n  got      \(actual)\n  expected \(entry.parsed)")
        }
    }
}

@Test("an empty board is the same empty board")
func emptyBoard() throws {
    #expect(try asJSON(Storyboard.empty) == fixture.empty)
}

@Test("shots are renumbered 1, 2, 3 without disturbing the input")
func renumbering() {
    let input = parseStoryboard(.object(["shots": .array([
        .object(["id": .string("a"), "number": .number(7)]),
        .object(["id": .string("b"), "number": .number(7)]),
    ])])).shots
    #expect(input.map(\.number) == fixture.renumbered.before)
    #expect(numberShots(input).map(\.number) == fixture.renumbered.after)
    // And the input is untouched by the renumbering.
    #expect(input.map(\.number) == fixture.renumbered.before)
}

// MARK: - The clock and the crew line

@Test("the clock reads the same at every boundary")
func clockReads() {
    for row in fixture.clock {
        #expect(asClock(row.seconds) == row.clock, "\(row.seconds) s")
    }
}

@Test("the board runs for the same length")
func boardRuns() {
    expectClose(boardDuration(parsedBoard.shots), fixture.duration.seconds, "total")
    #expect(asClock(boardDuration(parsedBoard.shots)) == fixture.duration.clock)
}

@Test("the line the crew reads is the same line")
func summaries() throws {
    for row in fixture.summaries {
        let shot = try #require(parsedBoard.shots.first { $0.id == row.id })
        expectClose(shotFocalLength(shot), row.focalLength, "\(row.id) lens")
        // Millimetres, aperture, move and length — and the length with a comma,
        // formatted through the C locale so a device in another language cannot
        // change what a saved sheet says.
        #expect(shotSummary(shot) == row.summary, "\(row.id)")
    }
}

// MARK: - The sheet each person gets

@Test("every person's own sheet has the same lines on it")
func callSheets() {
    for row in fixture.callSheets {
        let lines = callSheetFor(parsedBoard.shots, markId: row.markId)
        #expect(lines.count == row.lines.count, "\(row.markId)")
        for (line, expected) in zip(lines, row.lines) {
            #expect(line.number == expected.number, "\(row.markId) shot number")
            #expect(line.name == expected.name, "\(row.markId) shot name")
            #expect(line.who == expected.who, "\(row.markId) who")
            #expect(line.action == expected.action, "\(row.markId) action")
        }
    }
}

@Test("the board asks for the same people, in the order they first appear")
func peopleAsked() {
    let found = peopleOnBoard(parsedBoard.shots)
    #expect(found.count == fixture.people.count)
    for (person, expected) in zip(found, fixture.people) {
        #expect(person.markId == expected.markId)
        #expect(person.who == expected.who, "\(expected.markId)")
    }
}

@Test("the same people are named as having nothing to do")
func undirectedPeople() throws {
    let occupied = ["ovnen", "servering", "bordet", "gjest2", "disken", "inngangen"]
    for row in fixture.undirected {
        let shot = try #require(parsedBoard.shots.first { $0.id == row.id })
        #expect(undirected(shot, occupiedMarks: occupied) == row.marks, "\(row.id)")
    }
}

@Test("the failure this whole feature exists to prevent is named, not summed")
func undirectedIsPerShot() throws {
    // A person on set, in costume, in frame, who was never told what the shot
    // needs from them. "Somebody is undirected" is useless without knowing in
    // which shot, so it is reported per shot.
    let occupied = ["ovnen", "servering", "bordet", "gjest2", "disken", "inngangen"]
    let wide = try #require(parsedBoard.shots.first { $0.id == "shot-wide" })
    #expect(undirected(wide, occupiedMarks: occupied) == ["ovnen", "servering", "inngangen"])
    let oven = try #require(parsedBoard.shots.first { $0.id == "shot-oven" })
    #expect(undirected(oven, occupiedMarks: occupied).count == 5)
}

@Test("the same directions count as instructions rather than labels")
func usableDirections() {
    for row in fixture.usable {
        #expect(isUsableDirection(row.action) == row.usable, "\"\(row.action)\"")
    }
}

// MARK: - Text limits

@Test("long text is cut where the browser cuts it, in UTF-16 units")
func utf16Limits() {
    // A limit counted in characters would keep 240 emoji, which is 480 units, and
    // the same board would then differ between the two editions.
    let board = parseStoryboard(.object(["shots": .array([.object([
        "directions": .array([.object([
            "markId": .string("ovnen"),
            "action": .string(String(repeating: "🔥", count: 200)),
        ])]),
    ])])]))
    #expect(board.shots[0].directions[0].action.utf16.count == 240)
    // 240 units of a two-unit character is 120 of them, and nothing is split in
    // half into an unpaired surrogate.
    #expect(board.shots[0].directions[0].action.count == 120)
}

@Test("a direction with no name to address takes the mark's own id")
func directionFallsBackToTheMark() {
    let board = parseStoryboard(.object(["shots": .array([.object([
        "directions": .array([.object(["markId": .string(" ovnen ")])]),
    ])])]))
    let direction = board.shots[0].directions[0]
    #expect(direction.markId == "ovnen")
    #expect(direction.who == "ovnen")
    // And an action nobody wrote is empty rather than invented, so
    // `isUsableDirection` can catch it.
    #expect(direction.action.isEmpty)
    #expect(!isUsableDirection(direction.action))
}

@Test("a duration rounds the way the browser rounds it, not the way printf does")
func roundingMatches() {
    // The divergence the fixture caught. `String(format: "%.1f", 6.25)` is "6.2"
    // because C rounds a tie to even; JavaScript's toFixed takes the larger one
    // and says "6.3". Two different call sheets for the same shot.
    #expect(String(format: "%.1f", 6.25) == "6.2", "if this ever changes, the port can be simplified")
    for row in fixture.rounding {
        #expect(toFixed(row.value, row.digits) == row.fixed, "\(row.value) to \(row.digits)")
    }
    // And the ones that are not ties still go the nearest way: 0.15 is really
    // 0.1499999999999999944, so it goes down in both languages, for the same
    // reason. 1.005 is really 1.00499999999999989, so it does too.
    #expect(fixture.rounding.contains { $0.value == 0.15 && $0.fixed == "0.1" })
    #expect(fixture.rounding.contains { $0.value == 1.005 && $0.fixed == "1.00" })
}

@Test("a stray array in the shot list is not a shot")
func arrayIsNotAShot() {
    // `typeof [] === 'object'`, so the web parser used to accept an array as a
    // shot and put a fully defaulted "Opptak 1" on the board — camera and all,
    // ready to be printed on a call sheet and handed to somebody. Swift dropped
    // it, the fixture disagreed, and the web parser was fixed. This is the guard
    // that keeps them agreeing.
    let board = parseStoryboard(.object(["title": .string("Rart"), "shots": .array([
        .number(1), .string("to"), .null, .array([]),
    ])]))
    #expect(board.shots.isEmpty)
    #expect(board.title == "Rart")
}
