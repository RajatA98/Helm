import Foundation

/// The contract between the native app and the Three.js scene.
///
/// The app sends a `SceneState` (the whole picture, every time). The scene sends
/// back `SceneEvent`s (taps and stats). Both carry `version` so either side can
/// notice when the other is out of date. Human-readable copy: docs/scene-contract.md.
public enum SceneContract {
    public static let version = 1
}

// MARK: - State the app sends to the scene

/// How the ship looks, derived from open leaks. There is no hull score.
public enum ShipCondition: String, Codable, Equatable, Sendable, CaseIterable {
    case clean, puddles, listing, sinking

    public init(openLeaks: Int) {
        switch max(0, openLeaks) {
        case 0: self = .clean
        case 1...2: self = .puddles
        case 3...4: self = .listing
        default: self = .sinking
        }
    }
}

public struct Island: Codable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var goalName: String
    /// Compass bearing from the ship's home heading, in degrees. 0 is dead ahead.
    public var bearingDeg: Double

    public init(id: String, name: String, goalName: String, bearingDeg: Double) {
        self.id = id
        self.name = name
        self.goalName = goalName
        self.bearingDeg = bearingDeg
    }
}

/// Colors are CSS hex strings so the scene can apply them directly.
public struct AvatarOptions: Codable, Equatable, Sendable {
    public var skinColor: String
    public var hairColor: String
    public var hairStyle: String
    public var headwear: String
    public var headwearColor: String
    public var coat: String
    public var coatColor: String

    public init(skinColor: String, hairColor: String, hairStyle: String, headwear: String,
                headwearColor: String, coat: String, coatColor: String) {
        self.skinColor = skinColor
        self.hairColor = hairColor
        self.hairStyle = hairStyle
        self.headwear = headwear
        self.headwearColor = headwearColor
        self.coat = coat
        self.coatColor = coatColor
    }
}

public struct ShipDesign: Codable, Equatable, Sendable {
    public var hullColor: String
    public var sailColor: String
    public var flagEmblem: String

    public init(hullColor: String, sailColor: String, flagEmblem: String) {
        self.hullColor = hullColor
        self.sailColor = sailColor
        self.flagEmblem = flagEmblem
    }
}

public struct SceneState: Codable, Equatable, Sendable {
    public var version: Int
    public var openLeaks: Int {
        didSet { shipCondition = ShipCondition(openLeaks: openLeaks) }
    }
    /// Always derived from `openLeaks`; stored so the scene never has to recompute it.
    public private(set) var shipCondition: ShipCondition
    public var headingGoalID: String
    /// Local time as hours, 0 to just under 24 (14.25 is 2:15 pm).
    public var timeOfDay: Double
    /// When set, the scene draws this hour instead of `timeOfDay` (debug and previews).
    public var timeOverride: Double?
    public var islands: [Island]
    public var crewName: String
    public var crewLine: String
    public var avatar: AvatarOptions
    public var shipDesign: ShipDesign

    public init(openLeaks: Int, headingGoalID: String, timeOfDay: Double, timeOverride: Double? = nil,
                islands: [Island], crewName: String, crewLine: String,
                avatar: AvatarOptions, shipDesign: ShipDesign) {
        self.version = SceneContract.version
        self.openLeaks = openLeaks
        self.shipCondition = ShipCondition(openLeaks: openLeaks)
        self.headingGoalID = headingGoalID
        self.timeOfDay = timeOfDay
        self.timeOverride = timeOverride
        self.islands = islands
        self.crewName = crewName
        self.crewLine = crewLine
        self.avatar = avatar
        self.shipDesign = shipDesign
    }

    /// Deterministic JSON: sorted keys, no whitespace. The scene renders identically for identical input.
    public func jsonData() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }

    public func jsonString() throws -> String {
        String(decoding: try jsonData(), as: UTF8.self)
    }
}

// MARK: - Events the scene sends to the app

/// Where an object in the scene is on screen, in points (the web view is laid out 1:1 with the app).
public struct SceneAnchor: Codable, Equatable, Sendable {
    public var x: Double
    public var y: Double
    /// False when the object is behind the camera or off screen; the app hides its button.
    public var visible: Bool

    public init(x: Double, y: Double, visible: Bool) {
        self.x = x
        self.y = y
        self.visible = visible
    }
}

public enum SceneEvent: Equatable, Sendable {
    case sceneReady
    case sceneStats(fps: Double, loadMs: Double)
    case wheelTurned
    case barrelTapped
    case crateTapped
    case lighthouseTapped
    case islandTapped(id: String)
    /// Screen positions of the barrel, crate, lighthouse and wheel, keyed by name. Sent when they move.
    case anchors([String: SceneAnchor])
    /// An event type this build doesn't know. Logged, never fatal.
    case unknown(type: String)
}

public struct SceneEventEnvelope: Equatable, Sendable {
    public let version: Int
    public let event: SceneEvent

    public var isCompatible: Bool { version == SceneContract.version }

    public init(version: Int, event: SceneEvent) {
        self.version = version
        self.event = event
    }

    public init(json data: Data) throws {
        let raw = try JSONDecoder().decode(RawEvent.self, from: data)
        version = raw.version
        switch raw.type {
        case "sceneReady": event = .sceneReady
        case "wheelTurned": event = .wheelTurned
        case "barrelTapped": event = .barrelTapped
        case "crateTapped": event = .crateTapped
        case "lighthouseTapped": event = .lighthouseTapped
        case "islandTapped":
            guard let id = raw.id else {
                throw DecodingError.keyNotFound(
                    RawEvent.CodingKeys.id,
                    .init(codingPath: [], debugDescription: "islandTapped needs an id"))
            }
            event = .islandTapped(id: id)
        case "sceneStats":
            event = .sceneStats(fps: raw.fps ?? 0, loadMs: raw.loadMs ?? 0)
        case "anchors":
            // A point missing its coordinates is dropped; the rest still arrive.
            var points: [String: SceneAnchor] = [:]
            for (name, p) in raw.points ?? [:] {
                if let x = p.x, let y = p.y { points[name] = SceneAnchor(x: x, y: y, visible: p.visible ?? false) }
            }
            event = .anchors(points)
        default:
            event = .unknown(type: raw.type)
        }
    }

    private struct RawEvent: Decodable {
        enum CodingKeys: String, CodingKey { case version, type, id, fps, loadMs, points }
        let version: Int
        let type: String
        let id: String?
        let fps: Double?
        let loadMs: Double?
        let points: [String: RawPoint]?
    }

    private struct RawPoint: Decodable {
        let x: Double?
        let y: Double?
        let visible: Bool?
    }
}
