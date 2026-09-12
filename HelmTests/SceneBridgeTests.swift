import XCTest
@testable import Helm
import HelmCore

/// SceneBridge is the native side of the contract: it turns SceneState into the JavaScript
/// call the web view runs, and turns messages from the web view into SceneEvents.
/// These tests never touch WKWebView; they exercise the pure parts.
@MainActor
final class SceneBridgeTests: XCTestCase {

    private func makeState(openLeaks: Int = 2) -> SceneState {
        SceneState(
            openLeaks: openLeaks, headingGoalID: "fit", timeOfDay: 14.25,
            islands: [Island(id: "fit", name: "Heal the Shoulders", goalName: "Get Fit", bearingDeg: 0)],
            crewName: "Bran", crewLine: "Legs \"before\" sundown.\nNow.",
            avatar: AvatarOptions(skinColor: "#b07a55", hairColor: "#17110d", hairStyle: "short",
                                  headwear: "bandana", headwearColor: "#23958a", coat: "long", coatColor: "#1b2842"),
            shipDesign: ShipDesign(hullColor: "#3a2a1e", sailColor: "#d9d0bd", flagEmblem: "anchor"))
    }

    // MARK: App → scene

    func testSetStateScriptWrapsJSONAsAJavaScriptStringLiteral() throws {
        let script = try SceneBridge.setStateScript(for: makeState())
        XCTAssertTrue(script.hasPrefix("window.helmScene && window.helmScene.setState("))
        XCTAssertTrue(script.hasSuffix(")"))
        // The JSON is passed as a string, so its quotes are escaped and newlines never appear raw.
        XCTAssertTrue(script.contains("\\\"openLeaks\\\":2"))
        XCTAssertFalse(script.contains("\n"))
        XCTAssertTrue(script.contains("\\\\n"), "a newline inside crewLine survives as an escaped sequence")
    }

    func testSendingStateIsLoggedAsOutbound() throws {
        let bridge = SceneBridge()
        var ran: [String] = []
        bridge.evaluate = { ran.append($0) }
        try bridge.send(makeState(openLeaks: 3))
        XCTAssertEqual(ran.count, 1)
        XCTAssertEqual(bridge.log.last?.direction, .toScene)
        XCTAssertTrue(bridge.log.last?.summary.contains("setState") ?? false)
        XCTAssertTrue(bridge.log.last?.summary.contains("listing") ?? false)
    }

    // MARK: Scene → app

    func testSceneReadyMarksTheSceneReady() {
        let bridge = SceneBridge()
        XCTAssertEqual(bridge.loadState, .loading)
        bridge.receive(body: ["version": 1, "type": "sceneReady"])
        XCTAssertEqual(bridge.loadState, .ready)
    }

    func testStatsUpdateTheLatestReading() {
        let bridge = SceneBridge()
        bridge.receive(body: ["version": 1, "type": "sceneStats", "fps": 58.5, "loadMs": 812])
        XCTAssertEqual(bridge.latestStats?.fps, 58.5)
        XCTAssertEqual(bridge.latestStats?.loadMs, 812)
    }

    func testTapEventsAreForwarded() {
        let bridge = SceneBridge()
        var received: [SceneEvent] = []
        bridge.onEvent = { received.append($0) }
        bridge.receive(body: ["version": 1, "type": "wheelTurned"])
        bridge.receive(body: ["version": 1, "type": "islandTapped", "id": "hired"])
        XCTAssertEqual(received, [.wheelTurned, .islandTapped(id: "hired")])
    }

    func testUnknownEventTypeIsLoggedAndForwardedAsUnknown() {
        let bridge = SceneBridge()
        var received: [SceneEvent] = []
        bridge.onEvent = { received.append($0) }
        bridge.receive(body: ["version": 1, "type": "sceneError", "message": "boom"])
        XCTAssertEqual(received, [.unknown(type: "sceneError")])
        XCTAssertTrue(bridge.log.last?.summary.contains("sceneError") ?? false)
    }

    func testIncompatibleVersionIsLoggedAndNotForwarded() {
        let bridge = SceneBridge()
        var received: [SceneEvent] = []
        bridge.onEvent = { received.append($0) }
        bridge.receive(body: ["version": 2, "type": "wheelTurned"])
        XCTAssertTrue(received.isEmpty)
        XCTAssertTrue(bridge.log.last?.summary.lowercased().contains("incompatible") ?? false)
    }

    func testMalformedBodyIsLoggedNotFatal() {
        let bridge = SceneBridge()
        var received: [SceneEvent] = []
        bridge.onEvent = { received.append($0) }
        bridge.receive(body: "not a dictionary")
        bridge.receive(body: ["type": "wheelTurned"])
        XCTAssertTrue(received.isEmpty)
        XCTAssertEqual(bridge.log.count, 2)
        XCTAssertEqual(bridge.log.last?.direction, .fromScene)
    }

    func testLoadFailureIsRecorded() {
        let bridge = SceneBridge()
        bridge.markLoadFailed("timed out after 4 s")
        XCTAssertEqual(bridge.loadState, .failed("timed out after 4 s"))
        // A late sceneReady still recovers the scene.
        bridge.receive(body: ["version": 1, "type": "sceneReady"])
        XCTAssertEqual(bridge.loadState, .ready)
    }

    func testLogKeepsOnlyTheLastFiftyEntries() {
        let bridge = SceneBridge()
        for i in 0..<60 { bridge.receive(body: ["version": 1, "type": "sceneStats", "fps": Double(i), "loadMs": 1]) }
        XCTAssertEqual(bridge.log.count, 50)
        XCTAssertTrue(bridge.log.first?.summary.contains("10") ?? false, "oldest surviving entry is the 11th")
    }
}
