import Foundation

/// A JSON value, kept whole.
///
/// The scene document is the one thing both editions of this studio share, and
/// its rule is that a reader must carry forward fields it does not know about:
/// an older reader that drops what a newer writer added destroys work silently.
/// A plain `Codable` struct does exactly that — it decodes the keys it declares
/// and forgets the rest — so the document is held as its whole tree and the
/// typed accessors read out of it.
///
/// Object keys are unordered here, as they are in any dictionary, so a
/// re-encoded document is equal to the original rather than byte-identical.
/// Nothing is lost; the keys may come back in another order.
public enum JSONValue: Equatable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])
}

extension JSONValue: Codable {
    public init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Not a JSON value")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case .bool(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        }
    }
}

public extension JSONValue {
    var objectValue: [String: JSONValue]? {
        if case .object(let value) = self { return value }
        return nil
    }
    var arrayValue: [JSONValue]? {
        if case .array(let value) = self { return value }
        return nil
    }
    var stringValue: String? {
        if case .string(let value) = self { return value }
        return nil
    }
    var numberValue: Double? {
        if case .number(let value) = self { return value }
        return nil
    }
    var boolValue: Bool? {
        if case .bool(let value) = self { return value }
        return nil
    }
    var isNull: Bool { self == .null }

    subscript(key: String) -> JSONValue? { objectValue?[key] }
}
