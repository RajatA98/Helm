import Foundation
import Observation
import HelmCore

/// The native end of the scene contract (docs/scene-contract.md).
///
/// Outbound: turns a `SceneState` into the JavaScript call the web view runs.
/// Inbound: turns raw messages from the web view into `SceneEvent`s, tracks whether
/// the scene has loaded, keeps the latest stats, and logs everything in a ring buffer
/// for the debug screen. It knows nothing about WKWebView; `SceneView` plugs in `evaluate`.
@MainActor
@Observable
final class SceneBridge {
    enum LoadState: Equatable {
        case loading
        case ready
        case failed(String)
    }

    enum Direction: Equatable {
        case toScene
        case fromScene
    }

    struct LogEntry: Identifiable, Equatable {
        let id = UUID()
        let at: Date
        let direction: Direction
        let summary: String
    }

    struct Stats: Equatable {
        var fps: Double
        var loadMs: Double
    }

    static let logCapacity = 50
    static let loadTimeout: TimeInterval = 4

    private(set) var loadState: LoadState = .loading
    private(set) var latestStats: Stats?
    private(set) var log: [LogEntry] = []
    private(set) var lastSentState: SceneState?

    /// Called with each compatible event from the scene.
    var onEvent: ((SceneEvent) -> Void)?
    /// Runs JavaScript in the web view. Set by `SceneView`; nil in tests.
    var evaluate: ((String) -> Void)?

    // MARK: App → scene

    /// `window.helmScene.setState("<json>")`, with the JSON passed as a JavaScript string literal.
    static func setStateScript(for state: SceneState) throws -> String {
        let json = try state.jsonString()
        return "window.helmScene && window.helmScene.setState(\(javaScriptStringLiteral(json)))"
    }

    func send(_ state: SceneState) throws {
        let script = try Self.setStateScript(for: state)
        lastSentState = state
        evaluate?(script)
        append(.toScene, "setState leaks=\(state.openLeaks) condition=\(state.shipCondition.rawValue) heading=\(state.headingGoalID)")
    }

    func pause() {
        evaluate?("window.helmScene && window.helmScene.pause()")
        append(.toScene, "pause")
    }

    func resume() {
        evaluate?("window.helmScene && window.helmScene.resume()")
        append(.toScene, "resume")
    }

    // MARK: Scene → app

    /// Handles the raw body of a `WKScriptMessage`. Never throws; problems are logged.
    func receive(body: Any) {
        guard let dict = body as? [String: Any], JSONSerialization.isValidJSONObject(dict),
              let data = try? JSONSerialization.data(withJSONObject: dict) else {
            append(.fromScene, "malformed message (\(type(of: body)))")
            return
        }
        let envelope: SceneEventEnvelope
        do {
            envelope = try SceneEventEnvelope(json: data)
        } catch {
            append(.fromScene, "undecodable message: \(error)")
            return
        }
        guard envelope.isCompatible else {
            append(.fromScene, "incompatible version \(envelope.version), expected \(SceneContract.version)")
            return
        }
        switch envelope.event {
        case .sceneReady:
            loadState = .ready
            append(.fromScene, "sceneReady")
        case let .sceneStats(fps, loadMs):
            latestStats = Stats(fps: fps, loadMs: loadMs)
            append(.fromScene, "sceneStats fps=\(fps) loadMs=\(loadMs)")
        case let .islandTapped(id):
            append(.fromScene, "islandTapped \(id)")
        case let .unknown(type):
            append(.fromScene, "unknown event \(type)")
        case .wheelTurned, .barrelTapped, .crateTapped, .lighthouseTapped:
            append(.fromScene, "\(envelope.event)")
        }
        onEvent?(envelope.event)
    }

    func markLoadFailed(_ reason: String) {
        loadState = .failed(reason)
        append(.fromScene, "load failed: \(reason)")
    }

    // MARK: Helpers

    private func append(_ direction: Direction, _ summary: String) {
        log.append(LogEntry(at: Date(), direction: direction, summary: summary))
        if log.count > Self.logCapacity {
            log.removeFirst(log.count - Self.logCapacity)
        }
    }

    /// Escapes a string so it can be dropped into JavaScript source between double quotes.
    static func javaScriptStringLiteral(_ s: String) -> String {
        var out = "\""
        out.reserveCapacity(s.utf8.count + 2)
        for scalar in s.unicodeScalars {
            switch scalar {
            case "\"": out += "\\\""
            case "\\": out += "\\\\"
            case "\n": out += "\\n"
            case "\r": out += "\\r"
            case "\t": out += "\\t"
            case "\u{2028}": out += "\\u2028"
            case "\u{2029}": out += "\\u2029"
            default:
                if scalar.value < 0x20 {
                    out += String(format: "\\u%04x", scalar.value)
                } else {
                    out.unicodeScalars.append(scalar)
                }
            }
        }
        out += "\""
        return out
    }
}
