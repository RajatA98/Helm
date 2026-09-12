import SwiftUI
import HelmCore

/// Long-press the clock to get here. Shows what the app and the scene are saying to each
/// other, and lets you drive the ship's condition and the time of day by hand.
struct DebugScreen: View {
    let bridge: SceneBridge
    @Binding var session: HelmSession
    @Environment(\.dismiss) private var dismiss

    @State private var followClock = true
    @State private var overrideHours = 12.0

    var body: some View {
        NavigationStack {
            Form {
                Section("Scene") {
                    LabeledContent("Load state", value: loadStateText)
                    LabeledContent("Frame rate", value: bridge.latestStats.map { String(format: "%.1f fps", $0.fps) } ?? "no reading yet")
                    LabeledContent("Load time", value: bridge.latestStats.map { String(format: "%.0f ms", $0.loadMs) } ?? "no reading yet")
                    LabeledContent("Contract", value: "v\(SceneContract.version)")
                }

                Section("Drive the ship") {
                    Stepper(value: Binding(get: { session.openLeaks }, set: { session.setOpenLeaks($0) }), in: 0...6) {
                        LabeledContent("Open leaks", value: "\(session.openLeaks), \(ShipCondition(openLeaks: session.openLeaks).rawValue)")
                    }
                    .accessibilityLabel("Open leaks, \(session.openLeaks)")

                    Toggle("Follow the clock", isOn: $followClock)
                        .onChange(of: followClock) { _, follow in
                            session.timeOverride = follow ? nil : overrideHours
                        }
                    if !followClock {
                        VStack(alignment: .leading) {
                            Text("Time of day: \(hoursLabel(overrideHours))")
                            Slider(value: $overrideHours, in: 0...23.9, step: 0.1)
                                .onChange(of: overrideHours) { _, h in session.timeOverride = h }
                                .accessibilityLabel("Time of day")
                                .accessibilityValue(hoursLabel(overrideHours))
                        }
                    }
                }

                Section("Bridge log, newest first") {
                    if bridge.log.isEmpty {
                        Text("Nothing yet").foregroundStyle(.secondary)
                    }
                    ForEach(bridge.log.reversed()) { entry in
                        HStack(alignment: .top, spacing: 8) {
                            Text(entry.direction == .toScene ? "→" : "←")
                                .foregroundStyle(entry.direction == .toScene ? Color(red: 0.95, green: 0.70, blue: 0.35) : .secondary)
                                .accessibilityLabel(entry.direction == .toScene ? "to scene" : "from scene")
                            VStack(alignment: .leading, spacing: 2) {
                                Text(entry.summary).font(.footnote.monospaced())
                                Text(entry.at, format: .dateTime.hour().minute().second())
                                    .font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Debug")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .onAppear {
                if let override = session.timeOverride { followClock = false; overrideHours = override }
            }
        }
    }

    private var loadStateText: String {
        switch bridge.loadState {
        case .loading: return "loading"
        case .ready: return "ready"
        case let .failed(reason): return "failed: \(reason)"
        }
    }

    private func hoursLabel(_ h: Double) -> String {
        let hour = Int(h), minute = Int((h - Double(hour)) * 60)
        return String(format: "%02d:%02d", hour, minute)
    }
}
