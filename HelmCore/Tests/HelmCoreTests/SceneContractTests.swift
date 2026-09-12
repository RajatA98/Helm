import XCTest
@testable import HelmCore

/// The scene contract is the only thing the SwiftUI app and the Three.js scene share.
/// These tests pin its shape so either side can change independently.
final class SceneContractTests: XCTestCase {

    // MARK: Ship condition is derived from open leaks

    func testShipConditionBoundaries() {
        XCTAssertEqual(ShipCondition(openLeaks: 0), .clean)
        XCTAssertEqual(ShipCondition(openLeaks: 1), .puddles)
        XCTAssertEqual(ShipCondition(openLeaks: 2), .puddles)
        XCTAssertEqual(ShipCondition(openLeaks: 3), .listing)
        XCTAssertEqual(ShipCondition(openLeaks: 4), .listing)
        XCTAssertEqual(ShipCondition(openLeaks: 5), .sinking)
        XCTAssertEqual(ShipCondition(openLeaks: 9), .sinking)
        XCTAssertEqual(ShipCondition(openLeaks: -1), .clean, "negative leaks are treated as none")
    }

    func testStateDerivesConditionFromLeaks() {
        var state = Self.makeState(openLeaks: 0)
        XCTAssertEqual(state.shipCondition, .clean)
        state.openLeaks = 4
        XCTAssertEqual(state.shipCondition, .listing)
    }

    // MARK: State encoding

    func testStateRoundTripsThroughJSON() throws {
        let original = Self.makeState(openLeaks: 2)
        let data = try original.jsonData()
        let decoded = try JSONDecoder().decode(SceneState.self, from: data)
        XCTAssertEqual(decoded, original)
    }

    func testStateCarriesTheContractVersion() throws {
        let state = Self.makeState(openLeaks: 0)
        XCTAssertEqual(state.version, SceneContract.version)
        let json = try state.jsonString()
        XCTAssertTrue(json.contains("\"version\":\(SceneContract.version)"))
    }

    func testStateJSONKeysAreStableAndSorted() throws {
        let json = try Self.makeState(openLeaks: 2).jsonString()
        for key in ["avatar", "crewLine", "crewName", "headingGoalID", "islands", "openLeaks",
                    "shipCondition", "shipDesign", "timeOfDay", "version"] {
            XCTAssertTrue(json.contains("\"\(key)\""), "missing key \(key)")
        }
        // Sorted keys keep the payload deterministic, which the scene relies on for identical renders.
        let avatarIndex = try XCTUnwrap(json.range(of: "\"avatar\"")).lowerBound
        let versionIndex = try XCTUnwrap(json.range(of: "\"version\"")).lowerBound
        XCTAssertLessThan(avatarIndex, versionIndex)
    }

    func testTimeOverrideIsOptionalAndOmittedWhenNil() throws {
        var state = Self.makeState(openLeaks: 0)
        state.timeOverride = nil
        XCTAssertFalse(try state.jsonString().contains("timeOverride"))
        state.timeOverride = 19.5
        XCTAssertTrue(try state.jsonString().contains("\"timeOverride\":19.5"))
    }

    // MARK: Events from the scene

    func testDecodesEveryKnownEventType() throws {
        let cases: [(String, SceneEvent)] = [
            (#"{"version":1,"type":"sceneReady"}"#, .sceneReady),
            (#"{"version":1,"type":"wheelTurned"}"#, .wheelTurned),
            (#"{"version":1,"type":"barrelTapped"}"#, .barrelTapped),
            (#"{"version":1,"type":"crateTapped"}"#, .crateTapped),
            (#"{"version":1,"type":"lighthouseTapped"}"#, .lighthouseTapped),
            (#"{"version":1,"type":"islandTapped","id":"hired"}"#, .islandTapped(id: "hired")),
            (#"{"version":1,"type":"sceneStats","fps":58.5,"loadMs":812}"#, .sceneStats(fps: 58.5, loadMs: 812)),
        ]
        for (json, expected) in cases {
            let envelope = try SceneEventEnvelope(json: Data(json.utf8))
            XCTAssertEqual(envelope.event, expected, json)
            XCTAssertTrue(envelope.isCompatible)
        }
    }

    func testUnknownEventTypeIsToleratedNotThrown() throws {
        let envelope = try SceneEventEnvelope(json: Data(#"{"version":1,"type":"dance","tempo":3}"#.utf8))
        XCTAssertEqual(envelope.event, .unknown(type: "dance"))
    }

    func testVersionMismatchIsDetectable() throws {
        let envelope = try SceneEventEnvelope(json: Data(#"{"version":2,"type":"sceneReady"}"#.utf8))
        XCTAssertFalse(envelope.isCompatible)
        XCTAssertEqual(envelope.version, 2)
    }

    func testMissingVersionOrTypeThrows() {
        XCTAssertThrowsError(try SceneEventEnvelope(json: Data(#"{"type":"sceneReady"}"#.utf8)))
        XCTAssertThrowsError(try SceneEventEnvelope(json: Data(#"{"version":1}"#.utf8)))
        XCTAssertThrowsError(try SceneEventEnvelope(json: Data("not json".utf8)))
    }

    func testIslandTappedWithoutIdThrows() {
        XCTAssertThrowsError(try SceneEventEnvelope(json: Data(#"{"version":1,"type":"islandTapped"}"#.utf8)))
    }

    // MARK: Helpers

    static func makeState(openLeaks: Int) -> SceneState {
        SceneState(
            openLeaks: openLeaks,
            headingGoalID: "fit",
            timeOfDay: 14.25,
            timeOverride: nil,
            islands: [
                Island(id: "fit", name: "Heal the Shoulders", goalName: "Get Fit", bearingDeg: 0),
                Island(id: "hired", name: "Ship the Portfolio", goalName: "Get Hired", bearingDeg: 30),
            ],
            crewName: "Bran, master-at-arms",
            crewLine: "Legs before sundown, Captain.",
            avatar: AvatarOptions(skinColor: "#b07a55", hairColor: "#17110d", hairStyle: "short",
                                  headwear: "bandana", headwearColor: "#23958a", coat: "long", coatColor: "#1b2842"),
            shipDesign: ShipDesign(hullColor: "#3a2a1e", sailColor: "#d9d0bd", flagEmblem: "anchor")
        )
    }
}
